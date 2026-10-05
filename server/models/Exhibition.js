import mongoose from 'mongoose';
import { setUniqueSlug } from '../utils/slug.js';

const exhibitionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    // Generated from the title by the pre('validate') hook below
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
      default: '',
    },
    coverImage: { type: String, trim: true, default: '' },
    theme: { type: String, trim: true, default: '' },
    // Array order = guided tour order
    artifacts: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artifact' }],
      validate: {
        validator: (ids) => new Set(ids.map(String)).size === ids.length,
        message: 'An artifact can only appear once in an exhibition',
      },
    },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

exhibitionSchema.pre('validate', setUniqueSlug);

export default mongoose.model('Exhibition', exhibitionSchema);
