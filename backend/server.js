require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const sequelize = require("./config/db");
const { runMigrations } = require("./config/runMigrations");
const { User } = require("./models");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

const app = express();
const PORT = Number(process.env.PORT);

const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://schoolattendence-kappa.vercel.app",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/api", (req, res) => {
  res.json({ message: "School Attendance API", version: "1.0.0" });
});

app.get("/api/health", (req, res) => {
  res.json({ message: "Server is healthy" });
});

// Chrome DevTools may probe this endpoint; return 204 to avoid noisy 404 logs.
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.status(204).end();
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/attendance", attendanceRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

const ensureDefaultAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@school.com";
  const adminName = process.env.ADMIN_NAME || "School Admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin12345";

  const existing = await User.findOne({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await User.create({
      name: adminName,
      email: adminEmail,
      password: passwordHash,
      role: "admin",
    });
    console.log("Default admin created:", adminEmail);
  }
};

const start = async () => {
  try {
    await sequelize.authenticate();
    await runMigrations(sequelize);
    await ensureDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed", error);
    process.exit(1);
  }
};

start();
