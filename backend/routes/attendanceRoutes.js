const express = require("express");
const { getAttendanceHistory } = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, (req, res) => {
  res.json({
    message: "Attendance API",
    availableEndpoints: ["GET /history - Get attendance history with optional filters"]
  });
});

router.get("/history", protect, getAttendanceHistory);

module.exports = router;
