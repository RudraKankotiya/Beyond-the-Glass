import Artifact from '../models/Artifact.js';
import User from '../models/User.js';
import httpError from '../utils/httpError.js';

// POST /api/users/favorites/:artifactId
export const addFavorite = async (req, res) => {
  const { artifactId } = req.params;
  if (!(await Artifact.exists({ _id: artifactId }))) throw httpError(404, 'Artifact not found');

  // $addToSet adds the id only if it is not already in the list
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { favorites: artifactId } },
    { returnDocument: 'after' }
  );
  res.json({ favorites: user.favorites });
};

// DELETE /api/users/favorites/:artifactId
export const removeFavorite = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { favorites: req.params.artifactId } },
    { returnDocument: 'after' }
  );
  res.json({ favorites: user.favorites });
};

// GET /api/users/me/favorites  (artifact cards, most recently added first)
export const getMyFavorites = async (req, res) => {
  const user = await User.findById(req.user._id).populate('favorites', '-hotspots -cameraPosition');
  res.json({ favorites: [...user.favorites].reverse() });
};
