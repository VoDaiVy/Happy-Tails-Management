/**
 * Google Auth Service
 * Verifies Google ID tokens and normalizes the returned profile.
 */

const { OAuth2Client } = require('google-auth-library');
const { createError } = require('../utils/AppError');

const getGoogleClient = () => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw createError.internal('GOOGLE_CLIENT_ID is not configured', 'GOOGLE_CLIENT_ID_MISSING');
  }

  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
};

const normalizeGoogleProfile = (payload) => {
  if (!payload?.sub || !payload?.email) {
    throw createError.unauthorized('Invalid token', 'INVALID_GOOGLE_TOKEN');
  }

  return {
    googleId: payload.sub,
    email: String(payload.email).toLowerCase().trim(),
    emailVerified: Boolean(payload.email_verified),
    fullName: payload.name || null,
    avatar: payload.picture || null,
    givenName: payload.given_name || null,
    familyName: payload.family_name || null
  };
};

const verifyGoogleIdToken = async (idToken) => {
  try {
    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    return normalizeGoogleProfile(ticket.getPayload());
  } catch (error) {
    if (error.isOperational) {
      throw error;
    }

    throw createError.unauthorized('Invalid token', 'INVALID_GOOGLE_TOKEN');
  }
};

module.exports = {
  verifyGoogleIdToken
};