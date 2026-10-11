import { Router } from 'express';
import {
  listExhibitions,
  getExhibitionBySlug,
  createExhibition,
  updateExhibition,
  reorderExhibition,
  deleteExhibition,
} from '../controllers/exhibitionController.js';
import verifyToken from '../middleware/verifyToken.js';
import optionalAuth from '../middleware/optionalAuth.js';
import requireRole from '../middleware/requireRole.js';
import validateObjectId from '../middleware/validateObjectId.js';
import { uploadCoverImage } from '../middleware/upload.js';
import { STAFF_ROLES } from '../models/User.js';

const router = Router();
const staffOnly = [verifyToken, requireRole(STAFF_ROLES)];

router.param('id', validateObjectId);

// Public (a logged-in curator/admin also sees unpublished exhibitions)
router.get('/', optionalAuth, listExhibitions);
router.get('/:slug', optionalAuth, getExhibitionBySlug);

// Curator/admin
router.post('/', staffOnly, uploadCoverImage, createExhibition);
router.put('/:id', staffOnly, uploadCoverImage, updateExhibition);
router.put('/:id/order', staffOnly, reorderExhibition);
router.delete('/:id', staffOnly, deleteExhibition);

export default router;
