const express = require("express");
const {
  getTeacherStudents,
  markAttendance,
  addTeacherStudent,
  updateTeacherStudent,
  removeTeacherStudent,
  getTeacherAttendance,
  getAbsentStudentsForDate,
  sendAbsentEmailsToSelectedParents,
} = require("../controllers/teacherController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("teacher"));

router.get("/students", getTeacherStudents);
router.post("/students", addTeacherStudent);
router.put("/students/:id", updateTeacherStudent);
router.delete("/students/:id", removeTeacherStudent);
router.post("/mark-attendance", markAttendance);
router.get("/attendance", getTeacherAttendance);
router.get("/absent-students", getAbsentStudentsForDate);
router.post("/send-absent-emails", sendAbsentEmailsToSelectedParents);

module.exports = router;
