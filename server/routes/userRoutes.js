import { Router } from 'express';
import { addFavorite, removeFavorite, getMyFavorites } from '../controllers/userController.js';
import verifyToken from '../middleware/verifyToken.js';
import validateObjectId from '../middleware/validateObjectId.js';

const router = Router();

router.param('artifactId', validateObjectId);

// Every route here needs a logged-in user (any role)
router.use(verifyToken);

router.get('/me/favorites', getMyFavorites);
router.post('/favorites/:artifactId', addFavorite);
router.delete('/favorites/:artifactId', removeFavorite);

export default router;
