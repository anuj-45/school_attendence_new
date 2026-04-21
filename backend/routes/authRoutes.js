const express = require("express");
const { signup, login, sendOtp, verifyOtp } = require("../controllers/authController");

// Prefer express-rate-limit when installed; fall back to a lightweight in-memory limiter
let otpLimiter;
try {
  const rateLimit = require("express-rate-limit");
  otpLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 5, // limit each IP to 5 requests per windowMs
    message: { message: "Too many OTP requests, please try later" },
  });
} catch (e) {
  // Simple fallback limiter (best-effort). Not as robust as express-rate-limit but prevents crashes.
  const store = new Map();
  const WINDOW_MS = 60 * 1000;
  const MAX = 5;
  otpLimiter = (req, res, next) => {
    try {
      const ip = req.ip || req.connection?.remoteAddress || "unknown";
      const now = Date.now();
      const entry = store.get(ip) || { count: 0, ts: now };
      if (now - entry.ts > WINDOW_MS) {
        entry.count = 1;
        entry.ts = now;
      } else {
        entry.count += 1;
      }
      store.set(ip, entry);
      if (entry.count > MAX) {
        return res.status(429).json({ message: "Too many OTP requests, please try later" });
      }
      next();
    } catch (err) {
      next();
    }
  };
}

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "Auth API",
    availableEndpoints: ["POST /signup", "POST /login", "POST /send-otp", "POST /verify-otp"],
  });
});

router.post("/signup", signup);
router.post("/login", login);
router.post("/send-otp", otpLimiter, sendOtp);
router.post("/verify-otp", verifyOtp);

module.exports = router;
