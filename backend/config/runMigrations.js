const fs = require("fs");
const path = require("path");

const baseMigrationOrder = [
  "schema.sql",
  "migration.sql",
  "add_admission_no.sql",
  "add_email_settings.sql",
  "add_email_verification.sql",
  "add_gender_column.sql",
  "add_class_grade_division.sql",
  "add_messaging.sql",
  "add_school_name.sql",
];

const optionalMigrations = [
  {
    fileName: "supabase_setup.sql",
    enabled: String(process.env.ENABLE_SUPABASE_SETUP || "false").toLowerCase() === "true",
  },
  {
    fileName: "revert_to_email.sql",
    enabled: String(process.env.RUN_REVERT_TO_EMAIL || "false").toLowerCase() === "true",
  },
];

const ensureMigrationTable = async (sequelize) => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      file_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
};

const getExecutedMigrations = async (sequelize) => {
  const [rows] = await sequelize.query("SELECT file_name FROM schema_migrations");
  return new Set(rows.map((row) => row.file_name));
};

const runMigrations = async (sequelize) => {
  const migrationDir = path.join(__dirname, "..", "database");
  const migrationOrder = [
    ...baseMigrationOrder,
    ...optionalMigrations.filter((m) => m.enabled).map((m) => m.fileName),
  ];

  await ensureMigrationTable(sequelize);
  const executed = await getExecutedMigrations(sequelize);

  for (const fileName of migrationOrder) {
    const filePath = path.join(migrationDir, fileName);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    if (executed.has(fileName)) {
      continue;
    }

    const sql = fs.readFileSync(filePath, "utf8").trim();
    if (!sql) {
      await sequelize.query("INSERT INTO schema_migrations (file_name) VALUES (:fileName)", {
        replacements: { fileName },
      });
      continue;
    }

    const transaction = await sequelize.transaction();
    try {
      await sequelize.query(sql, { transaction });
      await sequelize.query("INSERT INTO schema_migrations (file_name) VALUES (:fileName)", {
        replacements: { fileName },
        transaction,
      });
      await transaction.commit();
      console.log(`Migration applied: ${fileName}`);
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Migration failed (${fileName}): ${error.message}`);
    }
  }
};

module.exports = {
  runMigrations,
};
