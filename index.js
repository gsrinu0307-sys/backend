require("dotenv").config(); // Load .env first

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const nodemailer = require("nodemailer");

const app = express();

// ------------------ MIDDLEWARE ------------------
// Allow requests from deployed frontend
app.use(cors({
  origin: ["https://gsrinu0307-sys.github.io"] // Your GitHub Pages frontend URL
}));
app.use(express.json());

// ------------------ EMAIL FUNCTION ------------------
const sendApplicationEmail = async (toEmail, subject, message) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Application Team" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      text: message,
    });

    console.log("📧 Email sent to:", toEmail);
  } catch (error) {
    console.error("❌ Email error:", error.message);
  }
};

// ------------------ TEST ROUTE ------------------
app.get("/", (req, res) => {
  res.send("Backend running successfully");
});

// ------------------ CREATE APPLICATION ------------------
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
      return res.status(400).json({
        success: false,
        message: "Full Name, PAN, Mobile and Email are required",
      });
    }

    formData.contact.email = formData.contact.email.trim().toLowerCase();

    await client.query("BEGIN");

    const insertResult = await client.query(
      `INSERT INTO applications (application_data)
       VALUES ($1)
       RETURNING id`,
      [formData]
    );

    const dbId = insertResult.rows[0].id;
    const yearMonth = new Date().toISOString().slice(0, 7).replace("-", "");
    const applicationId = `APP-${yearMonth}-${String(dbId).padStart(5, "0")}`;

    await client.query(
      "UPDATE applications SET application_id = $1 WHERE id = $2",
      [applicationId, dbId]
    );

    await client.query("COMMIT");

    await sendApplicationEmail(
      formData.contact.email,
      "Application Submitted Successfully",
      `Hello ${formData.personal.fullName},

Your application has been submitted successfully.

Application ID: ${applicationId}

Check your application:
${process.env.FRONTEND_URL}/application-search/${applicationId}

We will contact you further.

Thank you.`
    );

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      id: applicationId,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("DB Error:", error);

    if (error.code === "23505") {
      return res.status(400).json({
        success: false,
        message: "Duplicate data not allowed",
      });
    }

    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
});

// ------------------ READ ALL APPLICATIONS ------------------
app.get("/api/applications", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT application_id, application_data, created_at FROM applications ORDER BY id DESC"
    );
    res.json({ success: true, applications: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ------------------ READ SINGLE APPLICATION ------------------
app.get("/api/application/:applicationId", async (req, res) => {
  try {
    const { applicationId } = req.params;

    const result = await pool.query(
      "SELECT * FROM applications WHERE application_id = $1",
      [applicationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    res.json({ success: true, application: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ------------------ UPDATE APPLICATION ------------------
app.put("/api/application/:applicationId", async (req, res) => {
  try {
    const { applicationId } = req.params;
    const updatedData = req.body;

    const result = await pool.query(
      "UPDATE applications SET application_data = $1 WHERE application_id = $2 RETURNING *",
      [updatedData, applicationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    await sendApplicationEmail(
      updatedData.contact?.email,
      "Application Updated Successfully",
      `Hello ${updatedData.personal?.fullName || ""},

Your application has been updated successfully.

Application ID: ${applicationId}

We will contact you further.

Thank you.`
    );

    res.json({ success: true, message: "Application updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ------------------ DELETE APPLICATION ------------------
app.delete("/api/application/:applicationId", async (req, res) => {
  try {
    const { applicationId } = req.params;

    const findResult = await pool.query(
      "SELECT application_data FROM applications WHERE application_id = $1",
      [applicationId]
    );

    if (findResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const appData = findResult.rows[0].application_data;

    await pool.query(
      "DELETE FROM applications WHERE application_id = $1",
      [applicationId]
    );

    await sendApplicationEmail(
      appData.contact?.email,
      "Application Deleted Successfully",
      `Hello ${appData.personal?.fullName || ""},

Your application has been deleted successfully.

Application ID: ${applicationId}

We will contact you further if required.

Thank you.`
    );

    res.json({ success: true, message: "Application deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ------------------ SERVER ------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
