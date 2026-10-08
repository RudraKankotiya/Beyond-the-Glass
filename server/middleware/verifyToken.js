import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import httpError from '../utils/httpError.js';

// Protects a route: requires the header "Authorization: Bearer <token>".
// On success, the logged-in user document is available as req.user.
const verifyToken = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw httpError(401, 'Not authorized: no token provided');
  }

  let payload;
  try {
    // Throws if the signature is wrong or the token has expired
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw httpError(401, 'Not authorized: invalid or expired token');
  }

  const user = await User.findById(payload.id);
  if (!user) {
    throw httpError(401, 'Not authorized: user no longer exists');
  }

  req.user = user;
  next();
};

export default verifyToken;
