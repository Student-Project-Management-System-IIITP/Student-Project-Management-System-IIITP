const { BrevoClient } = require('@getbrevo/brevo');

// Initialize the Brevo API client
let brevoClient;

const getBrevoClient = () => {
  if (brevoClient) return brevoClient;

  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey || !process.env.EMAIL_FROM) {
    console.warn('Brevo environment variables are not fully configured; email sending is disabled.');
    return null;
  }

  brevoClient = new BrevoClient({ apiKey });
  return brevoClient;
};

/**
 * Send an email using Brevo.
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML body
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const client = getBrevoClient();
  
  if (!client) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Email sending skipped: Brevo service not configured');
      console.warn('   Configure BREVO_API_KEY and EMAIL_FROM in .env');
    }
    throw new Error('Email service is not configured. Please check environment variables.');
  }

  const fromEmail = process.env.EMAIL_FROM;

  // Handle single recipient or array of recipients
  const toArray = Array.isArray(to) ? to : [to];
  const toObjects = toArray.map(email => ({ email }));

  const emailPayload = {
    subject,
    sender: { email: fromEmail, name: 'SPMS Admin' },
    to: toObjects,
  };

  if (html) {
    emailPayload.htmlContent = html;
  } else if (text) {
    emailPayload.textContent = text;
  }

  try {
    await client.transactionalEmails.sendTransacEmail(emailPayload);
  } catch (error) {
    console.error('Error sending email via Brevo:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
};

