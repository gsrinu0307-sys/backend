// db.js
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
});

pool
  .query("SELECT 1")
  .then(() => console.log("✅ Connected via Supabase Session Pooler"))
  .catch(err => console.error("❌ DB error:", err.message));

module.exports = pool;

