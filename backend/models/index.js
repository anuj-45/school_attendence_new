const User = require("./User");
const Student = require("./Student");
const Attendance = require("./Attendance");

User.hasMany(Student, { foreignKey: "teacher_id", as: "assignedStudents" });
Student.belongsTo(User, { foreignKey: "teacher_id", as: "teacher" });

Student.hasMany(Attendance, { foreignKey: "student_id", as: "records" });
Attendance.belongsTo(Student, { foreignKey: "student_id", as: "student" });

User.hasMany(Attendance, { foreignKey: "marked_by", as: "markedAttendance" });
Attendance.belongsTo(User, { foreignKey: "marked_by", as: "marker" });

module.exports = {
  User,
  Student,
  Attendance,
};
