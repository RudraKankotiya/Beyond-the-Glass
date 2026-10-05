import mongoose from 'mongoose';
import { setUniqueSlug } from '../utils/slug.js';

// A 3D point [x, y, z] in the model's coordinate space
const isVector3 = (value) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

// A clickable marker placed on the 3D model
const hotspotSchema = new mongoose.Schema({
  position: {
    type: [Number],
    validate: { validator: isVector3, message: 'Hotspot position must be [x, y, z]' },
  },
  title: {
    type: String,
    required: [true, 'Hotspot title is required'],
    trim: true,
    maxlength: 80,
  },
  text: { type: String, trim: true, maxlength: 1000, default: '' },
});

const artifactSchema = new mongoose.Schema(
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
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    era: { type: String, trim: true, default: '' },
    region: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: '' },
    material: { type: String, trim: true, default: '' },
    tags: [{ type: String, trim: true, lowercase: true }],

    // URLs only - the files live in /server/uploads. Empty until a model is uploaded.
    modelUrl: { type: String, trim: true, default: '' },
    thumbnailUrl: { type: String, trim: true, default: '' },

    // Every artifact must credit its source (shown on every artifact view)
    credits: {
      author: { type: String, required: [true, 'Credits author is required'], trim: true },
      sourceUrl: { type: String, trim: true, default: '' },
      license: { type: String, required: [true, 'Credits license is required'], trim: true },
    },

    hotspots: [hotspotSchema],

    // Direction the 3D viewer's camera starts from (right, above, in front = same angle as the
    // thumbnails). The viewer adjusts the distance so the model fits on screen.
    cameraPosition: {
      type: [Number],
      default: () => [2.5, 1.5, 3],
      validate: { validator: isVector3, message: 'Camera position must be [x, y, z]' },
    },

    exhibitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exhibition', default: null },
    views: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

artifactSchema.pre('validate', setUniqueSlug);

export default mongoose.model('Artifact', artifactSchema);
