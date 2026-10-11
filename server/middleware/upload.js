import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import httpError from '../utils/httpError.js';
import { storeRequestFiles, UPLOADS_DIR } from '../utils/files.js';

const MB = 1024 * 1024;

const IMAGE_RULES = {
  folder: 'thumbnails',
  extensions: ['.jpg', '.jpeg', '.png', '.webp'],
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxSize: 2 * MB,
  label: 'jpg, png or webp image',
};

// Rules for each file field a form may send: where it is saved, allowed types, max size
const FILE_RULES = {
  model: {
    folder: 'models',
    extensions: ['.glb'],
    mimeTypes: null, // browsers report .glb inconsistently, so we check the file contents instead
    maxSize: 25 * MB,
    label: '.glb 3D model',
  },
  thumbnail: IMAGE_RULES,
  coverImage: IMAGE_RULES,
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(UPLOADS_DIR, FILE_RULES[file.fieldname].folder));
  },
  // Random, unique file name; never trust the name the user sent
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`);
  },
});

// Runs before a file is saved: reject wrong types early
const fileFilter = (req, file, cb) => {
  const rules = FILE_RULES[file.fieldname];
  if (!rules) {
    return cb(httpError(400, `Unexpected file field: ${file.fieldname}`));
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const typeAllowed =
    rules.extensions.includes(extension) && (!rules.mimeTypes || rules.mimeTypes.includes(file.mimetype));

  if (!typeAllowed) {
    return cb(httpError(400, `${file.fieldname} must be a ${rules.label}`));
  }
  cb(null, true);
};

// multer only supports one size limit for all fields, so the largest one (25MB) is used here
// and the smaller image limit is checked in checkUploadedFiles below.
const upload = multer({ storage, fileFilter, limits: { fileSize: 25 * MB } });

// The first bytes of a file ("magic numbers") show what it really is, whatever its name says
const readHeader = async (filePath, length = 12) => {
  const handle = await fs.open(filePath, 'r');
  try {
    const header = Buffer.alloc(length);
    await handle.read(header, 0, length, 0);
    return header;
  } finally {
    await handle.close();
  }
};

// Every .glb file starts with the 4 bytes "glTF" - this catches renamed non-model files
const isGlbFile = async (filePath) => (await readHeader(filePath)).toString('ascii', 0, 4) === 'glTF';

// JPEG starts FF D8 FF, PNG with 89 "PNG", WebP with "RIFF" .... "WEBP"
const isImageFile = async (filePath) => {
  const h = await readHeader(filePath);
  const isJpeg = h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff;
  const isPng = h.toString('hex', 0, 4) === '89504e47';
  const isWebp = h.toString('ascii', 0, 4) === 'RIFF' && h.toString('ascii', 8, 12) === 'WEBP';
  return isJpeg || isPng || isWebp;
};

// Runs after multer has saved the files. Throwing here makes the global error handler
// delete the uploaded files, so rejected uploads never stay on disk.
const checkUploadedFiles = async (req, res, next) => {
  for (const [fieldName, files] of Object.entries(req.files ?? {})) {
    const rules = FILE_RULES[fieldName];
    for (const file of files) {
      if (file.size > rules.maxSize) {
        throw httpError(400, `${fieldName} must be at most ${rules.maxSize / MB}MB`);
      }
      if (fieldName === 'model' && !(await isGlbFile(file.path))) {
        throw httpError(400, 'model is not a valid .glb file');
      }
      if (fieldName !== 'model' && !(await isImageFile(file.path))) {
        throw httpError(400, `${fieldName} is not a valid jpg, png or webp image`);
      }
    }
  }
  next();
};

// Artifact forms: optional "model" (.glb) and "thumbnail" (image), plus text fields
export const uploadArtifactFiles = [
  upload.fields([
    { name: 'model', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  checkUploadedFiles,
  storeRequestFiles, // local URL, or upload to Cloudinary (see utils/files.js)
];

// Exhibition forms: optional "coverImage", plus text fields
export const uploadCoverImage = [upload.fields([{ name: 'coverImage', maxCount: 1 }]), checkUploadedFiles, storeRequestFiles];
