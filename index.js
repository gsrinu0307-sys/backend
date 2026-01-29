require("dotenv").config(); // Only used locally
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);
app.use(express.json());

/* -------------------- ROUTES -------------------- */
app.get("/", (req, res) => {
  res.send("✅ Backend running successfully");
});

/* -------------------- CREATE APPLICATION -------------------- */
app.post("/api/application", async (req, res) => {
  const client = await pool.connect();

  try {
    const formData = req.body;

    if (
      !formData?.personal?.fullName ||
      !formData?.personal?.pan ||
      !formData?.contact?.mobile ||
      !formData?.contact?.email
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }

    formData.contact.email = formData.contact.email.trim().toLowerCase();

    await client.query("BEGIN");

    const insertResult = await client.query(
      `INSERT INTO applications (application_data)
       VALUES ($1) RETURNING id`,
      [formData]
    );

    const dbId = insertResult.rows[0].id;
    const ym = new Date().toISOString().slice(0, 7).replace("-", "");
    const applicationId = `APP-${ym}-${String(dbId).padStart(5, "0")}`;

    await client.query(
      "UPDATE applications SET application_id = $1 WHERE id = $2",
      [applicationId, dbId]
    );

    await client.query("COMMIT");

    res.status(201).json({ success: true, applicationId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ DB error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
});

/* -------------------- READ ALL APPLICATIONS -------------------- */
app.get("/api/applications", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT application_id, application_data, created_at
       FROM applications
       ORDER BY id DESC`
    );

    res.json({ success: true, applications: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/* -------------------- READ SINGLE APPLICATION -------------------- */
app.get("/api/application/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM applications WHERE application_id = $1",
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, application: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/* -------------------- UPDATE APPLICATION -------------------- */
app.put("/api/application/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const result = await pool.query(
      `UPDATE applications
       SET application_data = $1
       WHERE application_id = $2
       RETURNING *`,
      [updatedData, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({
      success: true,
      message: "Application updated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/* -------------------- DELETE APPLICATION -------------------- */
app.delete("/api/application/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM applications WHERE application_id = $1 RETURNING *",
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({
      success: true,
      message: "Application deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/* -------------------- SERVER -------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
