const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

const buildAuthResponse = (user) => {
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const signup = async (req, res) => {
  try {
    const { schoolName, udiseCode, name, email, password } = req.body;

    if (!schoolName || !udiseCode || !name || !email || !password) {
      return res.status(400).json({ message: "schoolName, udiseCode, name, email and password are required" });
    }

    const trimmedUdiseCode = String(udiseCode).trim();
    const udiseRegex = /^\d{11}$/;
    if (!udiseRegex.test(trimmedUdiseCode)) {
      return res.status(400).json({ message: "School UDISE code must be exactly 11 digits" });
    }

    const expectedSchoolCode = String(process.env.SCHOOL_ADMIN_CODE || "").trim();
    if (expectedSchoolCode && trimmedUdiseCode !== expectedSchoolCode) {
      return res.status(403).json({ message: "Invalid school code" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hash,
      role: "admin",
      school_name: schoolName,
      udise_code: trimmedUdiseCode,
    });

    return res.status(201).json(buildAuthResponse(user));
  } catch (error) {
    return res.status(500).json({ message: "Failed to sign up", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, role, schoolCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (role === "teacher" && !schoolCode) {
      return res.status(400).json({ message: "School UDISE code is required for teachers" });
    }

    if (role === "teacher") {
      const trimmedSchoolCode = String(schoolCode).trim();
      const udiseRegex = /^\d{11}$/;
      if (!udiseRegex.test(trimmedSchoolCode)) {
        return res.status(400).json({ message: "School UDISE code must be exactly 11 digits" });
      }

      const expectedSchoolCode = String(process.env.SCHOOL_ADMIN_CODE || "").trim();
      if (expectedSchoolCode && trimmedSchoolCode !== expectedSchoolCode) {
        return res.status(403).json({ message: "Invalid school code" });
      }
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (role && !["admin", "teacher"].includes(role)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account is not registered as ${role}` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    return res.status(500).json({ message: "Failed to login", error: error.message });
  }
};

module.exports = {
  signup,
  login,
};
