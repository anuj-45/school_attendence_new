const express = require("express");
const { signup, login, sendOtp, verifyOtp } = require("../controllers/authController");
const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 5, // limit each IP to 5 requests per windowMs
  message: { message: "Too many OTP requests, please try later" },
});

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
