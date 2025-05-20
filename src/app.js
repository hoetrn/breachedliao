const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fetch = require("node-fetch");
const crypto = require("crypto");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

function hashInput(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/check", async (req, res) => {
  const email = req.body.email;
  let comparisonToken = req.cookies.comparisonToken;

  if (!comparisonToken) {
    comparisonToken = generateToken();
    res.cookie("comparisonToken", comparisonToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year
    });
  }

  const emailHash = hashInput(email);

  try {
    const hibpRes = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${email}`, {
      method: "GET",
      headers: {
        "hibp-api-key": process.env.HIBP_API_KEY,
        "User-Agent": "breachedliao-online"
      }
    });

    let breaches = [];
    if (hibpRes.status === 200) {
      breaches = await hibpRes.json();
    }

    const riskScore = Math.min(breaches.length * 20, 100);
    const recommendations = [
      "Change your password",
      "Enable two-factor authentication",
      "Check account recovery settings"
    ];

    await pool.query(
      "INSERT INTO hygiene_results (email_hash, breaches_found, risk_score, recommendations, comparison_token) VALUES ($1, $2, $3, $4, $5)",
      [emailHash, breaches.length, riskScore, recommendations, comparisonToken]
    );

    const previous = await pool.query(
      "SELECT * FROM hygiene_results WHERE comparison_token = $1 ORDER BY timestamp DESC LIMIT 2",
      [comparisonToken]
    );

    let comparison = null;
    if (previous.rows.length === 2) {
      const [latest, earlier] = previous.rows;
      comparison = {
        previousScore: earlier.risk_score,
        currentScore: latest.risk_score,
        improvement: latest.risk_score - earlier.risk_score
      };
    }

    res.render("report", {
      email,
      breaches,
      riskScore,
      recommendations,
      comparison,
      comparisonToken
    });
  } catch (error) {
    console.error(error);
    res.render("error", { message: "Something went wrong." });
  }
});

// ✅ This MUST be at the end
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
