import fs from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';

// Where uploaded files are kept, chosen with STORAGE_DRIVER in .env:
//   local      (default) - files stay in /server/uploads and express.static serves them.
//                          Good for development.
//   cloudinary - files are sent to Cloudinary (a file hosting service). Needed on hosts like
//                Render's free tier, whose disk is wiped on every restart.
// Either way MongoDB only stores the file's URL.
export const USE_CLOUDINARY = process.env.STORAGE_DRIVER === 'cloudinary';

// Absolute path of /server/uploads (multer always saves here first, so files can be checked)
export const UPLOADS_DIR = path.join(import.meta.dirname, '..', 'uploads');

const CLOUD_FOLDER = 'beyond-the-glass';

// The SDK reads the account from the CLOUDINARY_URL environment variable
// (cloudinary://API_KEY:API_SECRET@CLOUD_NAME). Configured on first use, after .env is loaded.
let configured = false;
const cloud = () => {
  if (!configured) {
    cloudinary.config({ secure: true });
    configured = true;
  }
  return cloudinary;
};

// Sends one local file to Cloudinary and returns its https URL.
// .glb models are "raw" files (any file type); thumbnails and covers are "image" files.
// folder: 'models' or 'thumbnails'
export const uploadToCloudinary = async (filePath, folder) => {
  const fileName = path.basename(filePath);
  const isModel = folder === 'models';
  const result = await cloud().uploader.upload(filePath, {
    resource_type: isModel ? 'raw' : 'image',
    folder: `${CLOUD_FOLDER}/${folder}`,
    // Raw files keep their extension in the id; images get it from their format
    public_id: isModel ? fileName : path.parse(fileName).name,
    overwrite: true,
  });
  return result.secure_url;
};

// Runs after the upload checks (middleware/upload.js): decides each file's public URL.
// With Cloudinary the file is uploaded there and the local copy removed.
export const storeRequestFiles = async (req, res, next) => {
  for (const file of Object.values(req.files ?? {}).flat()) {
    const folder = path.basename(file.destination); // 'models' or 'thumbnails'
    if (USE_CLOUDINARY) {
      file.url = await uploadToCloudinary(file.path, folder);
      await fs.unlink(file.path).catch(() => {});
    } else {
      file.url = `/uploads/${folder}/${file.filename}`;
    }
  }
  next();
};

// Public URL of an uploaded file, e.g. "/uploads/models/1727600000000-a1b2c3.glb" or
// "https://res.cloudinary.com/<cloud>/raw/upload/v1/beyond-the-glass/models/....glb"
export const getUploadedFileUrl = (req, fieldName) => req.files?.[fieldName]?.[0]?.url;

// "https://res.cloudinary.com/demo/raw/upload/v17/beyond-the-glass/models/a.glb"
//   -> { resourceType: 'raw', publicId: 'beyond-the-glass/models/a.glb' }
// Image ids have no extension: ".../image/upload/v17/beyond-the-glass/thumbnails/b.webp" -> ".../b"
export const parseCloudinaryUrl = (url) => {
  const match = url.match(/^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|raw)\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return null;
  const [, resourceType, rest] = match;
  const publicId = resourceType === 'raw' ? rest : rest.replace(/\.[^/.]+$/, '');
  return { resourceType, publicId: decodeURIComponent(publicId) };
};

// Deletes a previously uploaded file given its public URL (local or Cloudinary).
// Ignores empty/unknown URLs and files that are already gone.
export const deleteFileByUrl = async (url) => {
  if (!url) return;

  const cloudFile = parseCloudinaryUrl(url);
  if (cloudFile) {
    await cloud()
      .uploader.destroy(cloudFile.publicId, { resource_type: cloudFile.resourceType, invalidate: true })
      .catch((error) => console.error(`Could not delete ${url} from Cloudinary: ${error.message}`));
    return;
  }

  if (!url.startsWith('/uploads/')) return;
  const filePath = path.resolve(UPLOADS_DIR, url.slice('/uploads/'.length));
  // Safety check: never delete anything outside the uploads folder (e.g. "/uploads/../server.js")
  if (!filePath.startsWith(UPLOADS_DIR + path.sep)) return;

  await fs.unlink(filePath).catch((error) => {
    if (error.code !== 'ENOENT') console.error(`Could not delete ${filePath}: ${error.message}`);
  });
};

// Removes every file saved for a request that failed: the local copy, and the Cloudinary copy
// if it had already been uploaded
export const deleteRequestFiles = async (req) => {
  const files = Object.values(req.files ?? {}).flat();
  await Promise.all(
    files.map(async (file) => {
      await fs.unlink(file.path).catch(() => {});
      if (file.url && USE_CLOUDINARY) await deleteFileByUrl(file.url);
    })
  );
};
