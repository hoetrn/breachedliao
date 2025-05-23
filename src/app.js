
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
  if (!breaches || breaches.length === 0) return 0;

  let score = 0;
  breaches.forEach(breach => {
    let breachScore = 10;
    const sensitiveFields = ["Passwords", "Credit Cards", "SSNs", "Bank Accounts", "Health records"];
    const compromisedData = breach.DataClasses || [];

    const sensitivityFactor = compromisedData.filter(data =>
      sensitiveFields.includes(data)
    ).length;

    breachScore += sensitivityFactor * 10;

    const breachDate = breach.BreachDate ? new Date(breach.BreachDate) : null;
    const now = new Date();
    if (breachDate && !isNaN(breachDate)) {
      const yearsAgo = (now - breachDate) / (1000 * 60 * 60 * 24 * 365);
      if (yearsAgo <= 1) {
        breachScore += 10;
      } else if (yearsAgo <= 3) {
        breachScore += 5;
      }
    }

    score += Math.min(breachScore, 30);
  });

  return Math.min(score, 100);
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
  let breaches = [];

  try {
    console.log("Using HIBP API Key:", process.env.HIBP_API_KEY ? "✅ Loaded" : "❌ Missing");

    const hibpRes = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, {
      method: "GET",
      headers: {
        "hibp-api-key": process.env.HIBP_API_KEY,
        "User-Agent": "breachedliao.online"
      }
    });

    console.log("HIBP response status:", hibpRes.status);

    if (hibpRes.status === 200) {
      breaches = await hibpRes.json();
    } else if (hibpRes.status === 404) {
      console.log("No breaches found.");
    } else {
      const errorText = await hibpRes.text();
      console.error(`HIBP API error: ${hibpRes.status} - ${errorText}`);
    }

    const riskScore = computeRiskScore(breaches);

    let previousScan = null;
    const prevResult = await pool.query(
      "SELECT * FROM hygiene_results WHERE email_hash = $1 AND comparison_token = $2 ORDER BY checked_at DESC LIMIT 1",
      [emailHash, comparisonToken]
    );
    if (prevResult.rows.length > 0) {
      previousScan = prevResult.rows[0];
    }

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
    console.error("Unhandled error during /check:", error);
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
