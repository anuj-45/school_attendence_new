const { Sequelize } = require("sequelize");

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

let sequelize;

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

module.exports = sequelize;
