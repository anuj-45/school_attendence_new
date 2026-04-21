const bcrypt = require("bcryptjs");
const { Op, fn, col, where } = require("sequelize");
const { User, Student, Attendance } = require("../models");

const normalizeSearch = (search = "") => search.trim().toLowerCase();
const buildClassSection = (classGrade, division) => `${String(classGrade).trim()}-${String(division).trim().toUpperCase()}`;

const addTeacher = async (req, res) => {
  try {
    const { name, email, password, class_grade, division } = req.body;

    if (!name || !email || !password || !class_grade || !division) {
      return res.status(400).json({ message: "name, email, password, class_grade and division are required" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Teacher email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    const teacher = await User.create({
      name,
      email,
      password: hash,
      role: "teacher",
      class_grade: String(class_grade).trim(),
      division: String(division).trim().toUpperCase(),
    });

    // If the creating admin is the configured super-admin (or fallback), auto-verify teacher
    try {
      const creatorEmail = req.user?.email?.toLowerCase();
      const superAdminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
      const fallbackEmail = "anujdafure@owner.in";
      if (creatorEmail && (creatorEmail === superAdminEmail || creatorEmail === fallbackEmail)) {
        teacher.email_verified = true;
        await teacher.save();
      }
    } catch (e) {
      // ignore
    }

    return res.status(201).json({ message: "Teacher created", teacher });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add teacher", error: error.message });
  }
};

const addStudent = async (req, res) => {
  try {
    const { name, roll_number, class_grade, division, parent_email } = req.body;

    if (!name || !roll_number || !class_grade || !division || !parent_email) {
      return res.status(400).json({ message: "name, roll_number, class_grade, division, parent_email are required" });
    }

    const className = buildClassSection(class_grade, division);

    const duplicate = await Student.findOne({ where: { roll_number, class: className } });
    if (duplicate) {
      return res.status(409).json({ message: "Duplicate roll number in the same class" });
    }

    const matchingTeachers = await User.findAll({
      where: {
        role: "teacher",
        class_grade: String(class_grade).trim(),
        division: String(division).trim().toUpperCase(),
      },
      order: [["createdAt", "ASC"]],
    });

    if (matchingTeachers.length === 0) {
      return res.status(400).json({
        message: `No teacher found for class section ${className}. Create teacher for this section first.`,
      });
    }

    const assignedTeacherId = matchingTeachers[0].id;

    const student = await Student.create({
      name,
      roll_number,
      class: className,
      class_grade: String(class_grade).trim(),
      division: String(division).trim().toUpperCase(),
      parent_email,
      teacher_id: assignedTeacherId,
    });

    return res.status(201).json({ message: "Student created", student });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add student", error: error.message });
  }
};

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, roll_number, class_grade, division, parent_email } = req.body;

    if (!name || !roll_number || !class_grade || !division || !parent_email) {
      return res.status(400).json({ message: "name, roll_number, class_grade, division, parent_email are required" });
    }

    const student = await Student.findByPk(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const className = buildClassSection(class_grade, division);

    const duplicate = await Student.findOne({
      where: {
        id: { [Op.ne]: student.id },
        roll_number,
        class: className,
      },
    });
    if (duplicate) {
      return res.status(409).json({ message: "Duplicate roll number in the same class" });
    }

    const matchingTeachers = await User.findAll({
      where: {
        role: "teacher",
        class_grade: String(class_grade).trim(),
        division: String(division).trim().toUpperCase(),
      },
      order: [["createdAt", "ASC"]],
    });

    if (matchingTeachers.length === 0) {
      return res.status(400).json({
        message: `No teacher found for class section ${className}. Create teacher for this section first.`,
      });
    }

    student.name = String(name).trim();
    student.roll_number = String(roll_number).trim();
    student.parent_email = String(parent_email).trim().toLowerCase();
    student.class = className;
    student.class_grade = String(class_grade).trim();
    student.division = String(division).trim().toUpperCase();
    student.teacher_id = matchingTeachers[0].id;
    await student.save();

    return res.json({ message: "Student updated", student });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update student", error: error.message });
  }
};

const removeStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findByPk(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await Attendance.destroy({ where: { student_id: student.id } });
    await student.destroy();

    return res.json({ message: "Student removed" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove student", error: error.message });
  }
};

const getTeachers = async (req, res) => {
  try {
    const search = normalizeSearch(req.query.search);
    const whereClause = { role: "teacher" };

    if (search) {
      whereClause[Op.and] = [
        {
          [Op.or]: [
            where(fn("LOWER", col("name")), { [Op.like]: `%${search}%` }),
            where(fn("LOWER", col("email")), { [Op.like]: `%${search}%` }),
            where(fn("LOWER", col("class_grade")), { [Op.like]: `%${search}%` }),
            where(fn("LOWER", col("division")), { [Op.like]: `%${search}%` }),
          ],
        },
      ];
    }

    const teachers = await User.findAll({
      where: whereClause,
      attributes: ["id", "name", "email", "role", "class_grade", "division", "createdAt"],
      order: [["class_grade", "ASC"], ["division", "ASC"], ["name", "ASC"]],
    });

    return res.json({ teachers });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch teachers", error: error.message });
  }
};

const getStudents = async (req, res) => {
  try {
    const search = normalizeSearch(req.query.search);
    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        where(fn("LOWER", col("Student.name")), { [Op.like]: `%${search}%` }),
        where(fn("LOWER", col("Student.roll_number")), { [Op.like]: `%${search}%` }),
        where(fn("LOWER", col("Student.class")), { [Op.like]: `%${search}%` }),
        where(fn("LOWER", col("Student.class_grade")), { [Op.like]: `%${search}%` }),
        where(fn("LOWER", col("Student.division")), { [Op.like]: `%${search}%` }),
      ];
    }

    const students = await Student.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "teacher",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["class_grade", "ASC"], ["division", "ASC"], ["roll_number", "ASC"]],
    });

    return res.json({ students });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch students", error: error.message });
  }
};

const getAdminStats = async (req, res) => {
  try {
    const [totalStudents, totalTeachers, totalAttendance, presentCount, lateCount] = await Promise.all([
      Student.count(),
      User.count({ where: { role: "teacher" } }),
      Attendance.count(),
      Attendance.count({ where: { status: "Present" } }),
      Attendance.count({ where: { status: "Late" } }),
    ]);

    // Late students are counted as present
    const presentAndLateCount = presentCount + lateCount;
    const attendancePercent = totalAttendance > 0 ? Number(((presentAndLateCount / totalAttendance) * 100).toFixed(2)) : 0;

    return res.json({ totalStudents, totalTeachers, attendancePercent });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch stats", error: error.message });
  }
};

const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, class_grade, division } = req.body;

    const teacher = await User.findOne({ where: { id, role: "teacher" } });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    if (!name || !email || !class_grade || !division) {
      return res.status(400).json({ message: "name, email, class_grade and division are required" });
    }

    const existing = await User.findOne({
      where: {
        email,
        id: { [Op.ne]: teacher.id },
      },
    });
    if (existing) {
      return res.status(409).json({ message: "Teacher email already exists" });
    }

    teacher.name = String(name).trim();
    teacher.email = String(email).trim().toLowerCase();
    teacher.class_grade = String(class_grade).trim();
    teacher.division = String(division).trim().toUpperCase();

    if (password && String(password).trim()) {
      teacher.password = await bcrypt.hash(String(password), 10);
    }

    await teacher.save();

    return res.json({ message: "Teacher updated", teacher });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update teacher", error: error.message });
  }
};

const removeTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await User.findOne({ where: { id, role: "teacher" } });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const assignedStudents = await Student.findAll({ where: { teacher_id: teacher.id } });

    if (assignedStudents.length > 0) {
      const fallbackTeacher = await User.findOne({
        where: {
          role: "teacher",
          id: { [Op.ne]: teacher.id },
          class_grade: teacher.class_grade,
          division: teacher.division,
        },
        order: [["createdAt", "ASC"]],
      });

      if (!fallbackTeacher) {
        const studentIds = assignedStudents.map((s) => s.id);
        if (studentIds.length > 0) {
          await Attendance.destroy({ where: { student_id: { [Op.in]: studentIds } } });
          await Student.destroy({ where: { id: { [Op.in]: studentIds } } });
        }
        await teacher.destroy();
        return res.json({
          message: `Teacher removed. ${studentIds.length} assigned student(s) were also removed because no fallback teacher existed for section ${teacher.class_grade}-${teacher.division}.`,
          removedStudents: studentIds.length,
        });
      }

      await Student.update(
        { teacher_id: fallbackTeacher.id },
        { where: { teacher_id: teacher.id } }
      );
    }

    await teacher.destroy();

    return res.json({ message: "Teacher removed" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove teacher", error: error.message });
  }
};

module.exports = {
  addTeacher,
  addStudent,
  updateStudent,
  removeStudent,
  getTeachers,
  getStudents,
  getAdminStats,
  updateTeacher,
  removeTeacher,
};
