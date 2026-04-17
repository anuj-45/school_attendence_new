const { Op, fn, col, where } = require("sequelize");
const { User, Student, Attendance } = require("../models");
const { sendAbsentEmail } = require("../services/emailService");

const normalizeSearch = (search = "") => search.trim().toLowerCase();
const buildClassSection = (classGrade, division) => `${String(classGrade).trim()}-${String(division).trim().toUpperCase()}`;

const buildDateFilter = ({ date, month, year }) => {
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      throw new Error("INVALID_DATE");
    }
    return { date };
  }

  if (month) {
    if (!/^\d{4}-\d{2}$/.test(String(month))) {
      throw new Error("INVALID_MONTH");
    }
    const parts = String(month).split("-");
    if (parts.length === 2) {
      const filterYear = Number(parts[0]);
      const filterMonth = Number(parts[1]);
      if (!Number.isNaN(filterYear) && !Number.isNaN(filterMonth)) {
        const start = `${filterYear}-${String(filterMonth).padStart(2, "0")}-01`;
        const nextMonth = filterMonth === 12 ? 1 : filterMonth + 1;
        const nextYear = filterMonth === 12 ? filterYear + 1 : filterYear;
        const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
        return {
          date: {
            [Op.gte]: start,
            [Op.lt]: end,
          },
        };
      }
    }
  }

  if (year) {
    if (!/^\d{4}$/.test(String(year))) {
      throw new Error("INVALID_YEAR");
    }
    const y = Number(year);
    if (!Number.isNaN(y)) {
      return {
        date: {
          [Op.gte]: `${y}-01-01`,
          [Op.lt]: `${y + 1}-01-01`,
        },
      };
    }
  }

  return {};
};

const getTeacherStudents = async (req, res) => {
  try {
    const search = normalizeSearch(req.query.search);
    const whereClause = { teacher_id: req.user.id };

    if (search) {
      whereClause[Op.and] = [
        {
          [Op.or]: [
            where(fn("LOWER", col("Student.name")), { [Op.like]: `%${search}%` }),
            where(fn("LOWER", col("Student.roll_number")), { [Op.like]: `%${search}%` }),
            where(fn("LOWER", col("Student.class")), { [Op.like]: `%${search}%` }),
            where(fn("LOWER", col("Student.class_grade")), { [Op.like]: `%${search}%` }),
            where(fn("LOWER", col("Student.division")), { [Op.like]: `%${search}%` }),
          ],
        },
      ];
    }

    const students = await Student.findAll({
      where: whereClause,
      order: [["class_grade", "ASC"], ["division", "ASC"], ["roll_number", "ASC"]],
    });

    return res.json({ students });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch students", error: error.message });
  }
};

const markAttendance = async (req, res) => {
  try {
    const { records, date } = req.body;

    if (!Array.isArray(records) || records.length === 0 || !date) {
      return res.status(400).json({ message: "records and date are required" });
    }

    const allowed = ["Present", "Absent", "Late"];
    const updates = [];

    for (const record of records) {
      const { student_id, status } = record;
      if (!student_id || !allowed.includes(status)) {
        return res.status(400).json({ message: "Invalid attendance record payload" });
      }

      const student = await Student.findOne({ where: { id: student_id, teacher_id: req.user.id } });
      if (!student) {
        return res.status(403).json({ message: "Cannot mark attendance for unassigned student" });
      }

      const existing = await Attendance.findOne({ where: { student_id, date } });

      if (existing) {
        existing.status = status;
        existing.marked_by = req.user.id;
        await existing.save();
        updates.push(existing);
      } else {
        const created = await Attendance.create({
          student_id,
          status,
          date,
          marked_by: req.user.id,
        });
        updates.push(created);
      }

      if (status === "Absent") {
        try {
          await sendAbsentEmail({
            parentEmail: student.parent_email,
            studentName: student.name,
            date,
          });
        } catch (emailError) {
          console.error("Absent email error:", emailError.message);
        }
      }
    }

    return res.json({ message: "Attendance marked successfully", updates });
  } catch (error) {
    return res.status(500).json({ message: "Failed to mark attendance", error: error.message });
  }
};

const addTeacherStudent = async (req, res) => {
  try {
    const { name, roll_number, parent_email } = req.body;

    if (!name || !roll_number || !parent_email) {
      return res.status(400).json({ message: "name, roll_number and parent_email are required" });
    }

    const teacher = await User.findOne({ where: { id: req.user.id, role: "teacher" } });
    if (!teacher) {
      return res.status(403).json({ message: "Unauthorized teacher account" });
    }

    if (!teacher.class_grade || !teacher.division) {
      return res.status(400).json({ message: "Teacher class section is not configured" });
    }

    const className = buildClassSection(teacher.class_grade, teacher.division);

    const duplicate = await Student.findOne({
      where: {
        roll_number,
        class: className,
      },
    });
    if (duplicate) {
      return res.status(409).json({ message: "Duplicate roll number in your class section" });
    }

    const student = await Student.create({
      name,
      roll_number,
      parent_email,
      class: className,
      class_grade: teacher.class_grade,
      division: teacher.division,
      teacher_id: teacher.id,
    });

    return res.status(201).json({ message: "Student added to your class", student });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add student", error: error.message });
  }
};

const updateTeacherStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, roll_number, parent_email } = req.body;

    if (!name || !roll_number || !parent_email) {
      return res.status(400).json({ message: "name, roll_number and parent_email are required" });
    }

    const student = await Student.findOne({ where: { id, teacher_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: "Student not found in your class" });
    }

    const duplicate = await Student.findOne({
      where: {
        id: { [Op.ne]: student.id },
        roll_number,
        class: student.class,
      },
    });
    if (duplicate) {
      return res.status(409).json({ message: "Duplicate roll number in your class section" });
    }

    student.name = String(name).trim();
    student.roll_number = String(roll_number).trim();
    student.parent_email = String(parent_email).trim().toLowerCase();
    await student.save();

    return res.json({ message: "Student updated", student });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update student", error: error.message });
  }
};

const removeTeacherStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findOne({ where: { id, teacher_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: "Student not found in your class" });
    }

    await Attendance.destroy({ where: { student_id: student.id } });
    await student.destroy();

    return res.json({ message: "Student removed" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove student", error: error.message });
  }
};

const getTeacherAttendance = async (req, res) => {
  try {
    const { date, month, year } = req.query;
    const studentFilter = { teacher_id: req.user.id };

    const students = await Student.findAll({ where: studentFilter, attributes: ["id"] });
    const studentIds = students.map((s) => s.id);

    if (studentIds.length === 0) {
      return res.json({ records: [] });
    }

    const whereClause = {
      student_id: { [Op.in]: studentIds },
      ...buildDateFilter({ date, month, year }),
    };

    const records = await Attendance.findAll({
      where: whereClause,
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["id", "name", "roll_number", "class", "class_grade", "division"],
        },
        {
          model: User,
          as: "marker",
          attributes: ["id", "name"],
        },
      ],
      order: [["date", "DESC"]],
    });

    return res.json({ records });
  } catch (error) {
    if (error.message === "INVALID_DATE") {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }
    if (error.message === "INVALID_MONTH") {
      return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
    }
    if (error.message === "INVALID_YEAR") {
      return res.status(400).json({ message: "Invalid year format. Use YYYY" });
    }
    return res.status(500).json({ message: "Failed to fetch attendance", error: error.message });
  }
};

const getAbsentStudentsForDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }

    const teacherStudents = await Student.findAll({
      where: { teacher_id: req.user.id },
      attributes: ["id"],
    });
    const studentIds = teacherStudents.map((student) => student.id);

    if (studentIds.length === 0) {
      return res.json({ students: [] });
    }

    const absentRecords = await Attendance.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        date,
        status: "Absent",
      },
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["id", "name", "roll_number", "class", "class_grade", "division", "parent_email"],
        },
      ],
      order: [[{ model: Student, as: "student" }, "roll_number", "ASC"]],
    });

    const students = absentRecords
      .filter((record) => record.student)
      .map((record) => ({
        student_id: record.student.id,
        name: record.student.name,
        roll_number: record.student.roll_number,
        class: record.student.class,
        class_grade: record.student.class_grade,
        division: record.student.division,
        parent_email: record.student.parent_email,
      }));

    return res.json({ students });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch absent students", error: error.message });
  }
};

const sendAbsentEmailsToSelectedParents = async (req, res) => {
  try {
    const { date, student_ids } = req.body;

    if (!date || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ message: "date and student_ids are required" });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }

    const normalizedStudentIds = student_ids
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (normalizedStudentIds.length === 0) {
      return res.status(400).json({ message: "No valid student_ids provided" });
    }

    const absentRecords = await Attendance.findAll({
      where: {
        student_id: { [Op.in]: normalizedStudentIds },
        date,
        status: "Absent",
      },
      include: [
        {
          model: Student,
          as: "student",
          where: { teacher_id: req.user.id },
          attributes: ["id", "name", "parent_email"],
          required: true,
        },
      ],
    });

    if (absentRecords.length === 0) {
      return res.status(404).json({ message: "No matching absent students found for selected date" });
    }

    let sentCount = 0;
    const skipped = [];
    const results = [];

    for (const record of absentRecords) {
      const student = record.student;
      if (!student || !student.parent_email) {
        skipped.push(student ? student.name : "Unknown Student");
        results.push({
          student_id: student ? student.id : null,
          student_name: student ? student.name : "Unknown Student",
          parent_email: student ? student.parent_email : "",
          status: "skipped",
          reason: "Parent email not found",
        });
        continue;
      }

      try {
        await sendAbsentEmail({
          parentEmail: student.parent_email,
          studentName: student.name,
          date,
        });
        sentCount += 1;
        results.push({
          student_id: student.id,
          student_name: student.name,
          parent_email: student.parent_email,
          status: "sent",
          reason: "Email accepted by SMTP server",
        });
      } catch (error) {
        skipped.push(student.name);
        results.push({
          student_id: student.id,
          student_name: student.name,
          parent_email: student.parent_email,
          status: "failed",
          reason: error.message || "Failed to send",
        });
      }
    }

    return res.json({
      message: "Email process completed",
      sentCount,
      skipped,
      results,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to send absent emails", error: error.message });
  }
};

module.exports = {
  getTeacherStudents,
  markAttendance,
  addTeacherStudent,
  updateTeacherStudent,
  removeTeacherStudent,
  getTeacherAttendance,
  getAbsentStudentsForDate,
  sendAbsentEmailsToSelectedParents,
};
