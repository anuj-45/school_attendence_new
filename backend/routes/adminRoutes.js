const express = require("express");
const {
  addTeacher,
  addStudent,
  updateStudent,
  removeStudent,
  getTeachers,
  getStudents,
  getAdminStats,
  updateTeacher,
  removeTeacher,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/", (req, res) => {
  res.json({
    message: "Admin API",
    availableEndpoints: [
      "GET /stats",
      "GET /students",
      "GET /teachers",
      "POST /add-student",
      "POST /add-teacher",
      "PUT /students/:id",
      "PUT /teachers/:id",
      "DELETE /students/:id",
      "DELETE /teachers/:id"
    ]
  });
});

router.post("/add-student", addStudent);
router.post("/add-teacher", addTeacher);
router.put("/students/:id", updateStudent);
router.delete("/students/:id", removeStudent);
router.put("/teachers/:id", updateTeacher);
router.delete("/teachers/:id", removeTeacher);
router.get("/students", getStudents);
router.get("/teachers", getTeachers);
router.get("/stats", getAdminStats);

module.exports = router;
