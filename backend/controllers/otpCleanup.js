const { EmailVerification } = require("../models");

let intervalId = null;

const startOtpCleanup = (sequelize) => {
  if (intervalId) return;
  // every 5 minutes remove expired OTP records
  intervalId = setInterval(async () => {
    try {
      await EmailVerification.destroy({ where: { expires_at: { [require('sequelize').Op.lt]: new Date() } } });
    } catch (e) {
      console.error('OTP cleanup failed', e.message);
    }
  }, 1000 * 60 * 5);
};

module.exports = { startOtpCleanup };
