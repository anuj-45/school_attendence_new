const { Sequelize } = require("sequelize");
const path = require("path");

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const dialect = process.env.DB_DIALECT || (hasDatabaseUrl ? "postgres" : "sqlite");

let sequelize;

if (hasDatabaseUrl || dialect === "postgres") {
  const dialectOptions = {};

  if (String(process.env.DB_SSL || "false").toLowerCase() === "true") {
    dialectOptions.ssl = {
      require: true,
      rejectUnauthorized: false,
    };
  }

  if (hasDatabaseUrl) {
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      logging: false,
      dialectOptions,
    });
  } else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      dialect: "postgres",
      dialectOptions,
      logging: false,
    }
  );
  }
} else {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: process.env.SQLITE_STORAGE || path.join(__dirname, "..", "school_attendance.sqlite"),
    logging: false,
  });
}

module.exports = sequelize;
