const express = require("express");
const path = require('path');
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fetch = require("node-fetch");
const crypto = require("crypto");
const { Pool } = require("pg");
require("dotenv").config();

const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static(path.join(__dirname, 'public')));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

function hashInput(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

function computeRiskScore(breaches) {
  // Example: 0 if no breaches, 100 if 3+ breaches, 33/66 for 1/2 breaches
  if (!breaches || breaches.length === 0) return 0;
  if (breaches.length === 1) return 33;
  if (breaches.length === 2) return 66;
  return 100;
}

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/check", (req, res) => {
  res.render("error", { message: "Please enter your email on the homepage form to run a check." });
});

app.post("/check", async (req, res) => {
  const email = req.body.email;
  let comparisonToken = req.cookies.comparisonToken;

  if (!comparisonToken) {
    comparisonToken = generateToken();
    res.cookie("comparisonToken", comparisonToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
  }

  const emailHash = hashInput(email);

  try {
    // Fetch current breaches
    const hibpRes = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        "hibp-api-key": process.env.HIBP_API_KEY,
        "User-Agent": "breachedliao.online"
      }
    });

    let breaches = [];
    if (hibpRes.status === 200) {
      breaches = await hibpRes.json();
    } else if (hibpRes.status === 404) {
      breaches = []; // No breaches found, this is normal
    } else {
      // Log error for debugging
      const errorText = await hibpRes.text();
      console.error(`HIBP API error: ${hibpRes.status} - ${errorText}`);
      breaches = [];
    }

    // Compute risk score (your function here)
    const riskScore = computeRiskScore(breaches);

    // Fetch previous scan for this user (by emailHash and comparisonToken)
    let previousScan = null;
    const prevResult = await pool.query(
      "SELECT * FROM hygiene_results WHERE email_hash = $1 AND comparison_token = $2 ORDER BY checked_at DESC LIMIT 1",
      [emailHash, comparisonToken]
    );
    if (prevResult.rows.length > 0) {
      previousScan = prevResult.rows[0];
    }

    // Save current scan
    await pool.query(
      "INSERT INTO hygiene_results (email_hash, comparison_token, risk_score, checked_at, breach_count) VALUES ($1, $2, $3, NOW(), $4)",
      [emailHash, comparisonToken, riskScore, breaches.length]
    );

    res.render("report", {
      email,
      breaches,
      riskScore,
      previousScan
    });
  } catch (error) {
    console.error(error);
    res.render("report", {
      email,
      breaches: [],
      riskScore: 0,
      previousScan: null
    });
  }
});

app.use((req, res) => {
  res.status(404).render("error", { message: "Page not found." });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
