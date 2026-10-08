import rateLimit from 'express-rate-limit';

const MINUTE = 60 * 1000;

// Login: at most 10 FAILED attempts per 15 minutes from one IP address. This stops password
// guessing; successful logins don't count, so normal use is never blocked.
export const loginLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8', // tells the client how long to wait (RateLimit headers)
  legacyHeaders: false,
  message: { message: 'Too many failed login attempts. Please wait 15 minutes and try again.' },
});

// Registration: at most 20 new accounts per hour from one IP address (stops mass sign-ups)
export const registerLimiter = rateLimit({
  windowMs: 60 * MINUTE,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many accounts created from this network. Please try again later.' },
});
