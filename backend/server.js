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
const PORT = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

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

const ensureSqliteColumns = async () => {
  const [userColumns] = await sequelize.query("PRAGMA table_info(users);");
  const userColumnNames = new Set(userColumns.map((c) => c.name));

  if (!userColumnNames.has("class_grade")) {
    await sequelize.query("ALTER TABLE users ADD COLUMN class_grade VARCHAR(50);");
  }
  if (!userColumnNames.has("division")) {
    await sequelize.query("ALTER TABLE users ADD COLUMN division VARCHAR(20);");
  }

  const [studentColumns] = await sequelize.query("PRAGMA table_info(students);");
  const studentColumnNames = new Set(studentColumns.map((c) => c.name));

  if (!studentColumnNames.has("class_grade")) {
    await sequelize.query("ALTER TABLE students ADD COLUMN class_grade VARCHAR(50);");
  }
  if (!studentColumnNames.has("division")) {
    await sequelize.query("ALTER TABLE students ADD COLUMN division VARCHAR(20);");
  }

  await sequelize.query(
    "UPDATE students SET class_grade = substr(class, 1, instr(class, '-') - 1) WHERE (class_grade IS NULL OR class_grade = '') AND instr(class, '-') > 0;"
  );
  await sequelize.query(
    "UPDATE students SET division = upper(substr(class, instr(class, '-') + 1)) WHERE (division IS NULL OR division = '') AND instr(class, '-') > 0;"
  );
};

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

    const usingPostgres =
      sequelize.getDialect() === "postgres" || Boolean(process.env.DATABASE_URL);

    if (usingPostgres) {
      await runMigrations(sequelize);
    } else {
      await sequelize.sync();
      await ensureSqliteColumns();
    }

    await ensureDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed", error);
    process.exit(1);
  }
};

start();
