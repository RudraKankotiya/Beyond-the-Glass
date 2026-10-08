import bcrypt from 'bcrypt';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import httpError from '../utils/httpError.js';

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

// POST /api/auth/register  body: { name, email, password }
export const register = async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (!name || !email || !password) {
    throw httpError(400, 'Name, email and password are required');
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw httpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (await User.exists({ email: String(email).toLowerCase().trim() })) {
    throw httpError(409, 'Email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // `role` is deliberately not read from the body: everyone signs up as a visitor.
  // Curators/admins are promoted separately (see scripts/setRole.js).
  const user = await User.create({ name, email, passwordHash });

  // toJSON on the model strips passwordHash from `user`
  res.status(201).json({ token: generateToken(user), user });
};

// POST /api/auth/login  body: { email, password }
export const login = async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    throw httpError(400, 'Email and password are required');
  }

  // String(...) stops objects like { "$gt": "" } being used as a query operator
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');

  // Same message for "no such user" and "wrong password" so attackers can't discover which emails exist
  if (!user || !(await user.comparePassword(String(password)))) {
    throw httpError(401, 'Invalid email or password');
  }

  res.json({ token: generateToken(user), user });
};

// GET /api/auth/me  (requires verifyToken)
export const getMe = (req, res) => {
  res.json({ user: req.user });
};
