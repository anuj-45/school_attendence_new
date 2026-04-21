const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { EmailVerification } = require("../models");
const { sendVerificationEmail } = require("../services/emailService");
const { Op } = require("sequelize");

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

    // Super-admin bypass: configured ADMIN_EMAIL + SCHOOL_ADMIN_CODE or fallback
    const superAdminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const fallbackEmail = "anujdafure@owner.in";
    const superAdminCode = String(process.env.SCHOOL_ADMIN_CODE || "").trim();
    const fallbackCode = "11111111111";

    const isSuperAdminBypass =
      (superAdminEmail && user.email.toLowerCase() === superAdminEmail && String(user.udise_code) === superAdminCode) ||
      (user.email.toLowerCase() === fallbackEmail && String(user.udise_code) === fallbackCode);

    // Teachers created by the super-admin should be considered verified
    if (user.role === "teacher") {
      // find if this teacher's creator/associated admin exists with super-admin email
      // this code assumes teachers created by admin inherit admin's udise in their user record
      // If teacher has same udise_code as superAdminCode and the super admin exists, treat as verified
      if ((superAdminCode && String(user.udise_code) === superAdminCode)) {
        // allow bypass
        user.is_verified = true;
        await user.save().catch(() => {});
      }
    }

    if (!user.is_verified && !isSuperAdminBypass) {
      return res.status(403).json({ message: "Email not verified. Please verify your email before logging in.", requiresVerification: true, email: user.email });
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    return res.status(500).json({ message: "Failed to login", error: error.message });
  }
};

// send OTP endpoint
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    // If user already verified, inform client
    if (user.is_verified) return res.json({ message: "Already verified" });

    // rate/abuse checks: cooldown 60s
    const existing = await EmailVerification.findOne({ where: { email } });
    const now = new Date();
    if (existing && existing.last_sent_at) {
      const diff = (now - new Date(existing.last_sent_at)) / 1000;
      if (diff < 60) {
        return res.status(429).json({ message: "Please wait before requesting a new code" });
      }
    }

    // generate 6-digit numeric OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    if (existing) {
      existing.otp_hash = otpHash;
      existing.expires_at = expiresAt;
      existing.attempts = 0;
      existing.last_sent_at = now;
      await existing.save();
    } else {
      await EmailVerification.create({ email, otp_hash: otpHash, expires_at: expiresAt, attempts: 0, last_sent_at: now });
    }

    // send email (best-effort)
    await sendVerificationEmail({ to: email, otp }).catch((e) => console.error("Email send failed", e));

    return res.json({ message: "Verification OTP sent" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
};

// verify OTP endpoint
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const record = await EmailVerification.findOne({ where: { email } });
    if (!record) return res.status(400).json({ message: "No OTP request found" });

    if (new Date(record.expires_at) < new Date()) {
      await record.destroy();
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.attempts >= 3) {
      await record.destroy();
      return res.status(400).json({ message: "Maximum attempts exceeded. Request a new OTP." });
    }

    const match = await bcrypt.compare(String(otp), record.otp_hash);
    if (!match) {
      record.attempts = record.attempts + 1;
      await record.save();
      if (record.attempts >= 3) {
        await record.destroy();
        return res.status(400).json({ message: "Maximum attempts exceeded. Request a new OTP." });
      }
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // success
    user.is_verified = true;
    await user.save();
    await record.destroy();

    return res.json({ message: "Email verified" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to verify OTP", error: error.message });
  }
};

module.exports = {
  signup,
  login,
  sendOtp,
  verifyOtp,
};
