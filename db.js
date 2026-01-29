const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // set this in Render env
  ssl: {
    rejectUnauthorized: false, // required for cloud Postgres like Neon
  },
});

// Optional: test connection on startup
pool.connect()
  .then(client => {
    console.log("✅ Database connected successfully");
    client.release();
  })
  .catch(err => {
    console.error("❌ Database connection error:", err.stack);
  });

module.exports = pool;
