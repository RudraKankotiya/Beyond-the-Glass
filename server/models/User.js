import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

export const ROLES = ['visitor', 'curator', 'admin'];
// Roles that can manage museum content (upload artifacts, build exhibitions)
export const STAFF_ROLES = ['curator', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    // Only the bcrypt hash is stored, never the plain password.
    // select: false -> not returned by queries unless asked for with .select('+passwordHash')
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: { values: ROLES, message: '{VALUE} is not a valid role' },
      default: 'visitor',
    },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artifact' }],
  },
  { timestamps: true }
);

// Compares a plain password from the login form with the stored hash
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Remove sensitive/internal fields whenever a user is sent as JSON
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
