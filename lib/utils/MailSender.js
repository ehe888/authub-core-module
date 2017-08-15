
const nodemailer   = require('nodemailer');

const transporter = nodemailer.createTransport({
  port: process.env.X_SMTP_PORT || opt.email.port || 465
  ,host: process.env.X_SMTP_HOST || opt.email.host || 'smtp.mxhichina.com'
  ,secure: process.env.X_SMTP_SECURE || opt.email.secure || true
  ,debug: process.env.X_SMTP_DEBUG || opt.email.debug || false
  ,auth: {
    user: process.env.X_SMTP_USER || opt.email.user,
    pass: process.env.X_SMTP_PASS || opt.email.pass
  }
});

module.exports = function sendMail(subject, message, mailTo, mailFrom, cb){
  const mailOptions = {
      from: '"FASTCCM" ' + (mailFrom || process.env.X_SMTP_FROM  || opt.email.from), // sender address
      to: [].concat(mailTo), // list of receivers
      subject: subject, // Subject line
      html: message // html body
  };

  transporter.sendMail(mailOptions, cb);
}
