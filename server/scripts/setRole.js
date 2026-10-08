// Changes a user's role from the command line (e.g. to create the first admin).
// Usage (from /server):  npm run set-role -- someone@example.com admin
import 'dotenv/config';
import mongoose from 'mongoose';
import User, { ROLES } from '../models/User.js';

const [email, role] = process.argv.slice(2);

if (!email || !ROLES.includes(role)) {
  console.error(`Usage: npm run set-role -- <email> <${ROLES.join('|')}>`);
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);

const user = await User.findOne({ email: email.toLowerCase().trim() });
if (!user) {
  console.error(`No user found with email ${email}`);
} else {
  user.role = role;
  await user.save();
  console.log(`${user.email} is now: ${user.role}`);
}

await mongoose.disconnect();
process.exit(user ? 0 : 1);
