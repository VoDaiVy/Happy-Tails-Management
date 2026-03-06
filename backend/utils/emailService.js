/**
 * Email Service
 * Sends emails using nodemailer with configured templates
 */

const { createTransporter, emailTemplates } = require('../config/email');

// Create transporter instance
let transporter = null;

/**
 * Initialize email transporter
 */
const initializeTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} options.text - Plain text fallback
 * @returns {Promise<Object>} Email info
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const emailTransporter = initializeTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Happy Tails <noreply@happytails.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for plain text
    };

    const info = await emailTransporter.sendMail(mailOptions);
    
    console.log(`📧 Email sent: ${info.messageId}`);
    
    // For development with Ethereal
    if (process.env.NODE_ENV === 'development') {
      const previewUrl = require('nodemailer').getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`📧 Preview URL: ${previewUrl}`);
      }
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email Error:', error.message);
    // Don't throw - email failures shouldn't break the auth flow
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email
 * @param {string} to - Recipient email
 * @param {string} name - User's name
 * @returns {Promise<Object>}
 */
const sendWelcomeEmail = async (to, name) => {
  const template = emailTemplates.welcome(name);
  return sendEmail({ to, ...template });
};

/**
 * Send email verification OTP
 * @param {string} to - Recipient email
 * @param {string} name - User's name
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<Object>}
 */
const sendVerificationEmail = async (to, name, otp) => {
  const template = emailTemplates.verification(name, otp);
  return sendEmail({ to, ...template });
};

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} name - User's name
 * @param {string} token - Reset token
 * @returns {Promise<Object>}
 */
const sendPasswordResetEmail = async (to, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  const template = emailTemplates.passwordReset(name, resetUrl);
  return sendEmail({ to, ...template });
};

/**
 * Send password changed notification
 * @param {string} to - Recipient email
 * @param {string} name - User's name
 * @returns {Promise<Object>}
 */
const sendPasswordChangedEmail = async (to, name) => {
  const template = emailTemplates.passwordChanged(name);
  return sendEmail({ to, ...template });
};

/**
 * Send new login notification
 * @param {string} to - Recipient email
 * @param {string} name - User's name
 * @param {Object} loginInfo - Login details
 * @returns {Promise<Object>}
 */
const sendNewLoginAlert = async (to, name, loginInfo) => {
  const template = emailTemplates.newLogin(name, {
    time: new Date().toLocaleString(),
    ip: loginInfo.ip || 'Unknown',
    device: loginInfo.userAgent || 'Unknown device'
  });
  return sendEmail({ to, ...template });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendNewLoginAlert
};
