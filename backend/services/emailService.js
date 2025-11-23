const nodemailer = require('nodemailer');

// Create a reusable transporter using environment-based configuration
// Configure the following env vars in your .env file:
// EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_SECURE,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_FROM
  } = process.env;

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS || !EMAIL_FROM) {
    console.warn('Email environment variables are not fully configured; email sending is disabled.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 587,
    secure: EMAIL_SECURE === 'true',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  return transporter;
};

/**
 * Send an email using the configured transporter.
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML body
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const tx = getTransporter();
  if (!tx) return; // Email disabled due to missing config

  const from = process.env.EMAIL_FROM;

  const mailOptions = {
    from,
    to,
    subject,
    text,
    html,
  };

  await tx.sendMail(mailOptions);
};

module.exports = {
  sendEmail,
};
