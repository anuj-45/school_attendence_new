const { Pool } = require("pg");
require("dotenv").config();
const fs = require("fs");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const sql = fs.readFileSync("combined_schema.sql", "utf-8");
    await pool.query(sql);
    console.log("✅ Tables created successfully");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    process.exit();
  }
}

run();