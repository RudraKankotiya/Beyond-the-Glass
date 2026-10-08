import jwt from 'jsonwebtoken';

// Signs a JWT containing only the user's id.
// The role is NOT stored in the token: verifyToken reloads the user from the database,
// so a role change (or a deleted account) takes effect immediately.
const generateToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export default generateToken;
