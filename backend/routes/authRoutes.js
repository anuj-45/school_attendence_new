const express = require("express");
const { signup, login, sendOtp, verifyOtp } = require("../controllers/authController");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "Auth API",
    availableEndpoints: ["POST /signup", "POST /login", "POST /send-otp", "POST /verify-otp"]
  });
});

router.post("/signup", signup);
router.post("/login", login);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

module.exports = router;
