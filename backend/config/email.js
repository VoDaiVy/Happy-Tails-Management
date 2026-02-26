/**
 * Email Configuration
 * Setup for nodemailer transporter
 */

const nodemailer = require('nodemailer');

// Email transporter configuration
const createTransporter = () => {
  // For development, use Ethereal (fake SMTP)
  if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal_password'
      }
    });
  }

  // Production configuration
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Email templates
const emailTemplates = {
  /**
   * Welcome email template
   * @param {string} name - User's name
   * @returns {Object} Email template
   */
  welcome: (name) => ({
    subject: 'Welcome to Happy Tails! 🐾',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #D97853, #5B8C51); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🐾 Happy Tails</h1>
        </div>
        <div style="padding: 30px; background: #FDFBF7;">
          <h2 style="color: #2D3436;">Welcome, ${name}!</h2>
          <p style="color: #666; line-height: 1.6;">
            Thank you for joining Happy Tails! We're excited to help you take care of your furry friends.
          </p>
          <p style="color: #666; line-height: 1.6;">
            With our AI-powered pet care system, your pets will receive the best care possible.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}" 
               style="background: #D97853; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
              Get Started
            </a>
          </div>
        </div>
        <div style="background: #2D3436; padding: 20px; text-align: center;">
          <p style="color: #888; margin: 0; font-size: 12px;">
            © 2026 Happy Tails. All rights reserved.
          </p>
        </div>
      </div>
    `
  }),

  /**
   * Email verification template
   * @param {string} name - User's name
   * @param {string} verificationUrl - Verification link
   * @returns {Object} Email template
   */
  verification: (name, verificationUrl) => ({
    subject: 'Verify Your Email - Happy Tails 🐾',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #D97853, #5B8C51); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🐾 Happy Tails</h1>
        </div>
        <div style="padding: 30px; background: #FDFBF7;">
          <h2 style="color: #2D3436;">Verify Your Email</h2>
          <p style="color: #666; line-height: 1.6;">
            Hi ${name}, please click the button below to verify your email address.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: #5B8C51; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p style="color: #999; font-size: 12px;">
            This link will expire in 24 hours. If you didn't create an account, please ignore this email.
          </p>
        </div>
        <div style="background: #2D3436; padding: 20px; text-align: center;">
          <p style="color: #888; margin: 0; font-size: 12px;">
            © 2026 Happy Tails. All rights reserved.
          </p>
        </div>
      </div>
    `
  }),

  /**
   * Password reset template
   * @param {string} name - User's name
   * @param {string} resetUrl - Reset password link
   * @returns {Object} Email template
   */
  passwordReset: (name, resetUrl) => ({
    subject: 'Reset Your Password - Happy Tails 🐾',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #D97853, #5B8C51); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🐾 Happy Tails</h1>
        </div>
        <div style="padding: 30px; background: #FDFBF7;">
          <h2 style="color: #2D3436;">Reset Your Password</h2>
          <p style="color: #666; line-height: 1.6;">
            Hi ${name}, you requested to reset your password. Click the button below to proceed.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #D97853; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #999; font-size: 12px;">
            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          </p>
        </div>
        <div style="background: #2D3436; padding: 20px; text-align: center;">
          <p style="color: #888; margin: 0; font-size: 12px;">
            © 2026 Happy Tails. All rights reserved.
          </p>
        </div>
      </div>
    `
  }),

  /**
   * Password changed notification
   * @param {string} name - User's name
   * @returns {Object} Email template
   */
  passwordChanged: (name) => ({
    subject: 'Password Changed - Happy Tails 🐾',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #D97853, #5B8C51); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🐾 Happy Tails</h1>
        </div>
        <div style="padding: 30px; background: #FDFBF7;">
          <h2 style="color: #2D3436;">Password Changed Successfully</h2>
          <p style="color: #666; line-height: 1.6;">
            Hi ${name}, your password has been changed successfully.
          </p>
          <p style="color: #666; line-height: 1.6;">
            If you didn't make this change, please contact our support immediately.
          </p>
        </div>
        <div style="background: #2D3436; padding: 20px; text-align: center;">
          <p style="color: #888; margin: 0; font-size: 12px;">
            © 2026 Happy Tails. All rights reserved.
          </p>
        </div>
      </div>
    `
  }),

  /**
   * New login notification
   * @param {string} name - User's name
   * @param {Object} loginInfo - Login details
   * @returns {Object} Email template
   */
  newLogin: (name, loginInfo) => ({
    subject: 'New Login Detected - Happy Tails 🐾',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #D97853, #5B8C51); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🐾 Happy Tails</h1>
        </div>
        <div style="padding: 30px; background: #FDFBF7;">
          <h2 style="color: #2D3436;">New Login Detected</h2>
          <p style="color: #666; line-height: 1.6;">
            Hi ${name}, a new login was detected on your account.
          </p>
          <div style="background: white; padding: 15px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Time:</strong> ${loginInfo.time}</p>
            <p style="margin: 5px 0;"><strong>IP Address:</strong> ${loginInfo.ip}</p>
            <p style="margin: 5px 0;"><strong>Device:</strong> ${loginInfo.device}</p>
          </div>
          <p style="color: #999; font-size: 12px;">
            If this wasn't you, please change your password immediately.
          </p>
        </div>
        <div style="background: #2D3436; padding: 20px; text-align: center;">
          <p style="color: #888; margin: 0; font-size: 12px;">
            © 2026 Happy Tails. All rights reserved.
          </p>
        </div>
      </div>
    `
  })
};

module.exports = {
  createTransporter,
  emailTemplates
};
