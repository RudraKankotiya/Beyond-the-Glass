import { Router } from 'express';
import {
  listArtifacts,
  getRandomArtifact,
  getFilterOptions,
  getArtifactBySlug,
  getArtifactById,
  getRelatedArtifacts,
  createArtifact,
  updateArtifact,
  deleteArtifact,
} from '../controllers/artifactController.js';
import verifyToken from '../middleware/verifyToken.js';
import requireRole from '../middleware/requireRole.js';
import validateObjectId from '../middleware/validateObjectId.js';
import { uploadArtifactFiles } from '../middleware/upload.js';
import { STAFF_ROLES } from '../models/User.js';

const router = Router();
const staffOnly = [verifyToken, requireRole(STAFF_ROLES)];

router.param('id', validateObjectId);

// Public
router.get('/', listArtifacts);
router.get('/random', getRandomArtifact); // these two must come before /:slug
router.get('/filters', getFilterOptions);
router.get('/by-id/:id', staffOnly, getArtifactById); // dashboard editing (no view counted)
router.get('/:slug', getArtifactBySlug);
router.get('/:slug/related', getRelatedArtifacts);

// Curator/admin (auth runs before the upload, so guests can't write files to disk)
router.post('/', staffOnly, uploadArtifactFiles, createArtifact);
router.put('/:id', staffOnly, uploadArtifactFiles, updateArtifact);

// Admin
router.delete('/:id', verifyToken, requireRole('admin'), deleteArtifact);

export default router;
