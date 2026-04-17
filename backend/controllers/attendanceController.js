const { Op } = require("sequelize");
const { Attendance, Student, User } = require("../models");

const buildDateFilter = ({ date, month, year, from, to }) => {
  if (date) {
    return { date };
  }

  if (month) {
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

  if (from || to) {
    const range = {};
    if (from) {
      range[Op.gte] = from;
    }
    if (to) {
      range[Op.lte] = to;
    }
    return { date: range };
  }

  return {};
};

const getAttendanceHistory = async (req, res) => {
  try {
    const { student_id, from, to, date, month, year } = req.query;
    const whereClause = {};

    if (req.user.role === "teacher") {
      const scopedStudents = await Student.findAll({
        where: { teacher_id: req.user.id },
        attributes: ["id"],
      });
      const scopedIds = scopedStudents.map((s) => s.id);
      if (scopedIds.length === 0) {
        return res.json({ records: [] });
      }
      whereClause.student_id = { [Op.in]: scopedIds };
    }

    if (student_id) {
      if (whereClause.student_id && whereClause.student_id[Op.in]) {
        if (whereClause.student_id[Op.in].includes(Number(student_id))) {
          whereClause.student_id = Number(student_id);
        } else {
          return res.status(403).json({ message: "Forbidden student scope" });
        }
      } else {
        whereClause.student_id = Number(student_id);
      }
    }

    Object.assign(whereClause, buildDateFilter({ date, month, year, from, to }));

    const records = await Attendance.findAll({
      where: whereClause,
      include: [
        { model: Student, as: "student", attributes: ["id", "name", "roll_number", "class", "class_grade", "division"] },
        { model: User, as: "marker", attributes: ["id", "name"] },
      ],
      order: [["date", "DESC"]],
    });

    return res.json({ records });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch attendance history", error: error.message });
  }
};

module.exports = {
  getAttendanceHistory,
};
