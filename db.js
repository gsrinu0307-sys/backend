const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for Supabase
  },
  max: 5, // safe for Render free tier
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Safe startup check (does NOT crash Render)
(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Database connected successfully");
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
  }
})();

module.exports = pool;
