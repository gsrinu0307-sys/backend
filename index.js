require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json());

let transporter = null;

const createTransporter = async () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

  try {
    const t = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false },
    });
    await t.verify();
    console.log("✅ Email ready on port 465");
    return t;
  } catch {
    try {
      const t = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        tls: { rejectUnauthorized: false },
      });
      await t.verify();
      console.log("✅ Email ready on port 587");
      return t;
    } catch (err) {
      console.error("❌ Email config failed:", err.message);
      return null;
    }
  }
};

(async () => {
  transporter = await createTransporter();
})();

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
    console.error("❌ Email send error:", err.message);
  }
});

// --- Routes ---
app.get("/", (req, res) => res.send("✅ Backend running"));

app.post("/api/application", async (req, res) => {
  const data = req.body;
  let client;

  if (!data?.personal?.fullName || !data?.contact?.email) {
    return res.status(400).json({ success: false, message: "Required fields missing" });
  }

  try {
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
      `Hello ${data.personal.fullName},\nYour application ID: ${applicationId}`
    );

    res.status(201).json({ success: true, applicationId });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  } finally {
    if (client) client.release();
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
