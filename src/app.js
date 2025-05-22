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

app.get("/check", (req, res) => {
  res.render("error", {
    message: "Please enter your email on the homepage form to run a check."
  });
});
app.get("/", (req, res) => {
  res.render("index", {
    message: "Welcome to BreachedLiao! Enter your email to check for breaches."
  });
});

app.post("/check", async (req, res) => {
  const email = req.body.email;
    const recaptchaToken = req.body["g-recaptcha-response"];
  if (!recaptchaToken) {
    return res.render("error", { message: "CAPTCHA not completed." });
  }

  const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${recaptchaToken}`;

  try {
    const captchaRes = await fetch(verifyURL, { method: "POST" });
    const captchaData = await captchaRes.json();

    if (!captchaData.success) {
      return res.render("error", { message: "CAPTCHA verification failed." });
    }
  } catch (err) {
    console.error("CAPTCHA verification error:", err);
    return res.render("error", { message: "Error verifying CAPTCHA." });
  }

  if (!email) {
    return res.render("error", { message: "No email provided." });
  }

  let comparisonToken = req.cookies.comparisonToken;
  if (!comparisonToken) {
    comparisonToken = crypto.randomBytes(16).toString("hex");
    res.cookie("comparisonToken", comparisonToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year
    });
    
  }

  const emailHash = crypto.createHash("sha256").update(email).digest("hex");
  let breaches = [];

  try {
    const hibpRes = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, {
      method: "GET",
      headers: {
        "hibp-api-key": process.env.HIBP_API_KEY,
        "User-Agent": "breachedliao-online"
      }
    });

    console.log(`HIBP response: ${hibpRes.status}`);

    if (hibpRes.status === 200) {
      breaches = await hibpRes.json();
    } else if (hibpRes.status === 404) {
      breaches = []; // No breach — expected for clean emails
    } else {
      throw new Error(`HIBP API error status: ${hibpRes.status}`);
    }

    const riskScore = Math.min(breaches.length * 20, 100);
    const recommendations = [
      "Change your password regularly",
      "Enable two-factor authentication",
      "Check account recovery settings",
      "Avoid reusing passwords across accounts"
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
        improvement: earlier.risk_score - latest.risk_score
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

  } catch (err) {
    console.error("Error during /check:", err.message);
    return res.render("error", { message: "Something went wrong during the scan. Please try again later." });
  }
});



// ✅ This MUST be at the end
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
