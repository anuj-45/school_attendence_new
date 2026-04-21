const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const EmailVerification = sequelize.define(
  "EmailVerification",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    otp_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    last_sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "email_verifications",
    timestamps: true,
  }
);

module.exports = EmailVerification;
