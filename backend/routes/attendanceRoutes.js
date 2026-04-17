const express = require("express");
const { getAttendanceHistory } = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/history", protect, getAttendanceHistory);

module.exports = router;
