// db.js
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS, // ✅ FIXED HERE
  ssl: { rejectUnauthorized: false },
});

// Test connection ON START
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Supabase DB connected");
    client.release();
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
  }
})();

module.exports = pool;
