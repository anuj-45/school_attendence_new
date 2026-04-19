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

router.get("/", (req, res) => {
  res.json({
    message: "Teacher API",
    availableEndpoints: [
      "GET /students",
      "POST /students",
      "PUT /students/:id",
      "DELETE /students/:id",
      "POST /mark-attendance",
      "GET /attendance",
      "GET /absent-students",
      "POST /send-absent-emails"
    ]
  });
});

router.get("/students", getTeacherStudents);
router.post("/students", addTeacherStudent);
router.put("/students/:id", updateTeacherStudent);
router.delete("/students/:id", removeTeacherStudent);
router.post("/mark-attendance", markAttendance);
router.get("/attendance", getTeacherAttendance);
router.get("/absent-students", getAbsentStudentsForDate);
router.post("/send-absent-emails", sendAbsentEmailsToSelectedParents);

module.exports = router;
