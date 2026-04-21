const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

const sendAbsentEmail = async ({ parentEmail, studentName, date }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return;
  }

  const subject = `Attendance Alert: ${studentName} absent on ${date}`;
  const text = `Your child ${studentName} was absent today (${date}).`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: parentEmail,
    subject,
    text,
  });
};

const sendVerificationEmail = async ({ to, otp }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return;
  }

  const subject = `Verify your email — one time code`;
  const text = `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  });
};

module.exports = {
  sendAbsentEmail,
};
