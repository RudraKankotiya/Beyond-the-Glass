// Fills the database with demo users, exhibitions and artifacts from seed-data.json.
// WARNING: it first DELETES all users, artifacts, exhibitions.
// Model/thumbnail files on disk are not touched.
//
// Usage (from /server):  npm run seed      (or from the repo root: npm run seed)
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Artifact from '../models/Artifact.js';
import Exhibition from '../models/Exhibition.js';
import { UPLOADS_DIR, uploadToCloudinary, USE_CLOUDINARY } from '../utils/files.js';

// URL to store for a local file in uploads/<folder>: served by Express, or (STORAGE_DRIVER=cloudinary)
// uploaded to Cloudinary first - that is how a deployed site gets its demo models.
const publicUrl = async (folder, fileName) =>
  USE_CLOUDINARY ? uploadToCloudinary(path.join(UPLOADS_DIR, folder, fileName), folder) : `/uploads/${folder}/${fileName}`;

const SEED_DATA_FILE = path.join(import.meta.dirname, 'seed-data.json');
const SALT_ROUNDS = 10;

const fileExists = (filePath) => fs.access(filePath).then(() => true, () => false);

// Returns the paths of all fields that still contain "TODO", e.g. ["credits.author"]
const findTodos = (value, prefix = '') => {
  if (typeof value === 'string') return value.includes('TODO') ? [prefix] : [];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => findTodos(child, prefix ? `${prefix}.${key}` : key));
  }
  return [];
};

const seed = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is production and seeding deletes all data.');
  }

  const data = JSON.parse(await fs.readFile(SEED_DATA_FILE, 'utf8'));
  const { users = [], exhibitions = [], artifacts = [] } = data;
  const warnings = [];

  // Catch typos in exhibition keys BEFORE anything is deleted
  const exhibitionKeys = new Set(exhibitions.map((exhibition) => exhibition.key));
  for (const artifact of artifacts) {
    if (artifact.exhibition && !exhibitionKeys.has(artifact.exhibition)) {
      throw new Error(`Artifact "${artifact.model || artifact.title}" uses unknown exhibition key "${artifact.exhibition}"`);
    }
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Seeding database "${mongoose.connection.name}" (files: ${USE_CLOUDINARY ? 'Cloudinary' : 'local disk'}) ...`);

  // 1. Start from an empty database
  await Promise.all([
    User.deleteMany({}),
    Artifact.deleteMany({}),
    Exhibition.deleteMany({}),
  ]);

  // 2. Users (passwords are hashed exactly like POST /api/auth/register does)
  for (const { password, ...user } of users) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await User.create({ ...user, passwordHash });
  }

  // 3. Exhibitions, created empty first; their artifact lists are filled in step 5
  const exhibitionsByKey = new Map();
  for (const { key, ...fields } of exhibitions) {
    exhibitionsByKey.set(key, await Exhibition.create(fields));
    findTodos(fields).forEach((field) => warnings.push(`exhibition "${key}": ${field} is still TODO`));
  }

  // 4. Artifacts
  const tourByKey = new Map([...exhibitionsByKey.keys()].map((key) => [key, []]));
  for (const { model, exhibition: key, ...fields } of artifacts) {
    const label = model || fields.title;

    // Point at the optimized model and its thumbnail, if those files exist.
    // A missing file is allowed - the app shows the artifact without a 3D model.
    const thumbnailFile = model ? `${path.parse(model).name}.webp` : '';
    const hasModel = model && (await fileExists(path.join(UPLOADS_DIR, 'models', model)));
    const hasThumbnail = model && (await fileExists(path.join(UPLOADS_DIR, 'thumbnails', thumbnailFile)));
    if (!hasModel) warnings.push(`"${label}": model file not found in uploads/models`);
    if (!hasThumbnail) warnings.push(`"${label}": no thumbnail (run npm run models:thumbnails)`);

    let artifact;
    try {
      artifact = await Artifact.create({
        ...fields,
        modelUrl: hasModel ? await publicUrl('models', model) : '',
        thumbnailUrl: hasThumbnail ? await publicUrl('thumbnails', thumbnailFile) : '',
        exhibitionId: key ? exhibitionsByKey.get(key)._id : null,
      });
    } catch (error) {
      throw new Error(`Artifact "${label}" is invalid: ${error.message}`);
    }

    if (key) tourByKey.get(key).push(artifact._id);
    findTodos(fields).forEach((field) => warnings.push(`"${label}": ${field} is still TODO`));
  }

  // 5. Guided tour order = the order the artifacts are listed in seed-data.json
  for (const [key, exhibition] of exhibitionsByKey) {
    exhibition.artifacts = tourByKey.get(key);
    await exhibition.save();
  }

  console.log(
    `Created ${users.length} users, ${exhibitionsByKey.size} exhibitions, ${artifacts.length} artifacts.\n`
  );
  console.log('Demo logins:');
  console.table(users.map(({ email, password, role }) => ({ role, email, password })));

  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s):`);
    warnings.forEach((warning) => console.log(`  - ${warning}`));
  }
};

try {
  await seed();
} catch (error) {
  console.error(`\nSeeding failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
