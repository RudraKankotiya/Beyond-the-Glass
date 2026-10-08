import verifyToken from './verifyToken.js';

// For public routes that behave differently for logged-in users
// (e.g. curators also see unpublished exhibitions).
// No Authorization header -> continue as a guest (req.user stays undefined).
// A header that is present but invalid is still rejected with 401 by verifyToken.
const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) return next();
  return verifyToken(req, res, next);
};

export default optionalAuth;
