const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  ssl: { rejectUnauthorized: false },
});

// HARD FAIL FAST TEST
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ DB CONNECTED SUCCESSFULLY");
    client.release();
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1); // 🔥 CRASH if DB wrong
  }
})();

module.exports = pool;
