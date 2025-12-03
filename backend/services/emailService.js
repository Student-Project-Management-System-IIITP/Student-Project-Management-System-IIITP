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
  if (!tx) {
    // In development mode, log a warning instead of silently failing
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Email sending skipped: Email service not configured');
      console.warn('   Configure EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM in .env');
    }
    throw new Error('Email service is not configured. Please check environment variables.');
  }

  const from = process.env.EMAIL_FROM;

  const mailOptions = {
    from,
    to,
    subject,
    text,
    html,
  };

  try {
    await tx.sendMail(mailOptions);
  } catch (error) {
    // Enhance error message for common Gmail issues
    if (error.code === 'EAUTH') {
      const enhancedError = new Error('Email authentication failed. For Gmail, use an App Password instead of your regular password. Enable 2-Step Verification and generate an App Password at: https://myaccount.google.com/apppasswords');
      enhancedError.code = 'EAUTH';
      enhancedError.originalError = error;
      throw enhancedError;
    }
    throw error;
  }
};

module.exports = {
  sendEmail,
};
