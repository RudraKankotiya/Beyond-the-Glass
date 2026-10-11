import Artifact from '../models/Artifact.js';
import Exhibition from '../models/Exhibition.js';
import { STAFF_ROLES } from '../models/User.js';
import httpError from '../utils/httpError.js';
import { getUploadedFileUrl, deleteFileByUrl } from '../utils/files.js';
import { linkArtifactsToExhibition } from '../utils/exhibitionLinks.js';
import { parseBoolean, parseIdList } from '../utils/validate.js';

// Curators and admins can see unpublished (draft) exhibitions
const isStaff = (user) => STAFF_ROLES.includes(user?.role);

// Copies only the fields a curator may set. Returns { fields, artifactIds }.
const pickExhibitionFields = (body = {}) => {
  const fields = {};
  for (const key of ['title', 'description', 'theme', 'coverImage']) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  if (body.isPublished !== undefined) fields.isPublished = parseBoolean(body.isPublished, 'isPublished');

  const artifactIds = body.artifacts !== undefined ? parseIdList(body.artifacts, 'artifacts') : undefined;
  return { fields, artifactIds };
};

// Every id in the list must belong to an existing artifact
const ensureArtifactsExist = async (ids) => {
  const count = await Artifact.countDocuments({ _id: { $in: ids } });
  if (count !== ids.length) throw httpError(400, 'One or more artifacts do not exist');
};

// GET /api/exhibitions  (visitors see published ones only)
// Each exhibition also gets artifactCount and previewImage (its cover, or else the first
// artifact's thumbnail) so the list page can show cards without loading every artifact.
export const listExhibitions = async (req, res) => {
  const filter = isStaff(req.user) ? {} : { isPublished: true };
  const exhibitions = await Exhibition.find(filter)
    .sort({ createdAt: -1 })
    .populate('artifacts', 'thumbnailUrl');

  res.json({
    exhibitions: exhibitions.map((exhibition) => {
      const { artifacts, ...fields } = exhibition.toJSON();
      return {
        ...fields,
        artifacts: artifacts.map((artifact) => artifact._id), // keep the usual list of ids
        artifactCount: artifacts.length,
        previewImage: fields.coverImage || artifacts.find((artifact) => artifact.thumbnailUrl)?.thumbnailUrl || '',
      };
    }),
  });
};

// GET /api/exhibitions/:slug  (artifacts populated, in guided-tour order)
export const getExhibitionBySlug = async (req, res) => {
  // populate() keeps the order of the ids in the artifacts array
  const exhibition = await Exhibition.findOne({ slug: req.params.slug.toLowerCase() }).populate('artifacts');

  // A draft looks like it doesn't exist to visitors
  if (!exhibition || (!exhibition.isPublished && !isStaff(req.user))) {
    throw httpError(404, 'Exhibition not found');
  }
  res.json({ exhibition });
};

// POST /api/exhibitions  (JSON or multipart with optional "coverImage" file)
export const createExhibition = async (req, res) => {
  const { fields, artifactIds = [] } = pickExhibitionFields(req.body);
  await ensureArtifactsExist(artifactIds);

  const coverUrl = getUploadedFileUrl(req, 'coverImage');
  if (coverUrl) fields.coverImage = coverUrl;

  const exhibition = await Exhibition.create({ ...fields, artifacts: artifactIds });
  await linkArtifactsToExhibition(exhibition._id, artifactIds);

  res.status(201).json({ exhibition });
};

// PUT /api/exhibitions/:id  (any subset of fields; sending "artifacts" replaces the tour list)
export const updateExhibition = async (req, res) => {
  const exhibition = await Exhibition.findById(req.params.id);
  if (!exhibition) throw httpError(404, 'Exhibition not found');

  const { fields, artifactIds } = pickExhibitionFields(req.body);
  if (artifactIds) await ensureArtifactsExist(artifactIds);

  const oldCover = exhibition.coverImage;
  const coverUrl = getUploadedFileUrl(req, 'coverImage');
  if (coverUrl) fields.coverImage = coverUrl;

  exhibition.set(fields);
  if (artifactIds) exhibition.artifacts = artifactIds;
  await exhibition.save();

  if (artifactIds) await linkArtifactsToExhibition(exhibition._id, artifactIds);
  // Remove the old cover file only if it was replaced
  if (exhibition.coverImage !== oldCover) await deleteFileByUrl(oldCover);

  res.json({ exhibition });
};

// PUT /api/exhibitions/:id/order  body: { artifacts: [ids in the new order] }
export const reorderExhibition = async (req, res) => {
  const newOrder = parseIdList(req.body?.artifacts, 'artifacts');

  const exhibition = await Exhibition.findById(req.params.id);
  if (!exhibition) throw httpError(404, 'Exhibition not found');

  // Reordering may not add or remove artifacts - it must be the same set of ids
  const currentIds = exhibition.artifacts.map(String);
  const sameArtifacts = newOrder.length === currentIds.length && newOrder.every((id) => currentIds.includes(id));
  if (!sameArtifacts) {
    throw httpError(400, "artifacts must contain exactly the exhibition's current artifacts, in the new order");
  }

  exhibition.artifacts = newOrder;
  await exhibition.save();

  res.json({ exhibition: await exhibition.populate('artifacts') });
};

// DELETE /api/exhibitions/:id  (artifacts are kept, just unlinked)
export const deleteExhibition = async (req, res) => {
  const exhibition = await Exhibition.findByIdAndDelete(req.params.id);
  if (!exhibition) throw httpError(404, 'Exhibition not found');

  await Promise.all([
    Artifact.updateMany({ exhibitionId: exhibition._id }, { exhibitionId: null }),
    deleteFileByUrl(exhibition.coverImage),
  ]);

  res.json({ message: 'Exhibition deleted', id: exhibition._id });
};
