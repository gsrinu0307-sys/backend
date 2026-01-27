// db.js
const { Pool } = require('pg');

// Create a pool of connections to the Supabase database
const pool = new Pool({
  user: 'postgres', // your DB username
  host: 'db.qaitilcppvcimfnthlrb.supabase.co', // your DB host
  database: 'postgres', // your DB name
  password: process.env.DB_PASSWORD, // store your password in environment variable
  port: 5432, // default Postgres port
  ssl: { rejectUnauthorized: false }, // required for Supabase
});

// Export the pool to use in your routes
module.exports = pool;
