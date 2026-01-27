// db.js
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,          // postgres
  host: process.env.DB_HOST,          // Supabase host
  database: process.env.DB_NAME,      // postgres
  password: process.env.DB_PASS,      // ✅ fixed env name
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false }, // required for Supabase
});

pool
  .query("SELECT 1")
  .then(() => console.log("✅ Database connected"))
  .catch((err) => console.error("❌ DB connection error:", err.message));

module.exports = pool;
