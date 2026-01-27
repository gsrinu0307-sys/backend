require("dotenv").config();

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const pool = require("./db");

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

/* -------------------- EMAIL SETUP -------------------- */
let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const sendEmail = async (to, subject, text) => {
  if (!transporter || !to) return;

  try {
    await transporter.sendMail({
      from: `"Application Team" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error("Email error:", err.message);
  }
};

/* -------------------- HEALTH CHECK -------------------- */
app.get("/", (req, res) => {
  res.send("✅ Backend running successfully");
});

/* -------------------- CREATE APPLICATION -------------------- */
app.post("/api/application", async (req, res) => {
  let client;

  try {
    const data = req.body;

    // basic validation
    if (
      !data?.personal?.fullName ||
      !data?.personal?.pan ||
      !data?.contact?.mobile ||
      !data?.contact?.email
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const insert = await client.query(
      "INSERT INTO applications (application_data) VALUES ($1) RETURNING id",
      [data]
    );

    const id = insert.rows[0].id;
    const ym = new Date().toISOString().slice(0, 7).replace("-", "");
    const applicationId = `APP-${ym}-${String(id).padStart(5, "0")}`;

    await client.query(
      "UPDATE applications SET application_id = $1 WHERE id = $2",
      [applicationId, id]
    );

    await client.query("COMMIT");

    await sendEmail(
      data.contact.email,
      "Application Submitted Successfully",
      `Hello ${data.personal.fullName},

Your application has been submitted successfully.
Application ID: ${applicationId}`
    );

    res.status(201).json({
      success: true,
      applicationId,
    });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  } finally {
    if (client) client.release();
  }
});

/* -------------------- GET ALL APPLICATIONS -------------------- */
app.get("/api/applications", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT application_id, application_data, created_at FROM applications ORDER BY id DESC"
    );
    res.json({ success: true, applications: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* -------------------- GET SINGLE APPLICATION -------------------- */
app.get("/api/application/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM applications WHERE application_id = $1",
      [req.params.id]
    );

    if (!result.rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Not found" });
    }

    res.json({ success: true, application: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* -------------------- UPDATE APPLICATION -------------------- */
app.put("/api/application/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE applications SET application_data = $1 WHERE application_id = $2 RETURNING *",
      [req.body, req.params.id]
    );

    if (!result.rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Not found" });
    }

    res.json({ success: true, message: "Application updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* -------------------- DELETE APPLICATION -------------------- */
app.delete("/api/application/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM applications WHERE application_id = $1 RETURNING *",
      [req.params.id]
    );

    if (!result.rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Not found" });
    }

    res.json({ success: true, message: "Application deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* -------------------- SERVER -------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
