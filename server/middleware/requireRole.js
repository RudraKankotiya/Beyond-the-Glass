import httpError from '../utils/httpError.js';

// Allows the request only if the logged-in user has one of the given roles.
// Must be used AFTER verifyToken, which sets req.user.
//
// Usage:
//   router.post('/', verifyToken, requireRole('curator', 'admin'), createArtifact);
//   router.delete('/:id', verifyToken, requireRole(['admin']), deleteArtifact);
const requireRole = (...roles) => {
  const allowedRoles = roles.flat(); // accepts separate arguments or a single array

  return (req, res, next) => {
    if (!req.user) {
      return next(httpError(401, 'Not authorized'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(httpError(403, `Access denied: requires role ${allowedRoles.join(' or ')}`));
    }
    next();
  };
};

export default requireRole;
