import Artifact from '../models/Artifact.js';
import Exhibition from '../models/Exhibition.js';
import User from '../models/User.js';
import httpError from '../utils/httpError.js';
import { getUploadedFileUrl, deleteFileByUrl } from '../utils/files.js';
import { moveArtifactToExhibition } from '../utils/exhibitionLinks.js';
import {
  isObjectId,
  escapeRegex,
  textParam,
  positiveIntParam,
  parseJsonField,
} from '../utils/validate.js';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;
const RELATED_LIMIT = 6;

// Grids/lists only need card data, not the 3D details
const CARD_FIELDS = '-hotspots -cameraPosition';

const TEXT_FIELDS = ['title', 'description', 'era', 'region', 'category', 'material'];

// Tags may arrive as an array, a JSON array string, or "bronze, egypt, mask"
const parseTags = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    if (value.trim().startsWith('[')) return parseJsonField(value, 'tags', 'a valid JSON array');
    return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  throw httpError(400, 'tags must be an array or a comma-separated list');
};

// Copies only the fields a curator may set from the request body.
// Things like views, slug, modelUrl and thumbnailUrl can never be set directly.
const pickArtifactFields = (body = {}) => {
  const fields = {};

  for (const key of TEXT_FIELDS) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  if (body.tags !== undefined) fields.tags = parseTags(body.tags);

  if (body.credits !== undefined) {
    const expected = 'an object: { author, sourceUrl, license }';
    fields.credits = parseJsonField(body.credits, 'credits', expected);
    if (typeof fields.credits !== 'object' || fields.credits === null || Array.isArray(fields.credits)) {
      throw httpError(400, `credits must be ${expected}`);
    }
  }
  if (body.cameraPosition !== undefined) {
    fields.cameraPosition = parseJsonField(body.cameraPosition, 'cameraPosition', 'an array [x, y, z]');
  }
  return fields;
};

// Validates an exhibitionId from the body. '' or null means "not in any exhibition".
const resolveExhibitionId = async (value) => {
  if (value === '' || value === null || value === 'null') return null;
  if (!isObjectId(value)) throw httpError(400, 'exhibitionId is not a valid id');
  if (!(await Exhibition.exists({ _id: value }))) throw httpError(404, 'Exhibition not found');
  return value;
};

// GET /api/artifacts?search=&era=&region=&category=&exhibition=&page=&limit=
export const listArtifacts = async (req, res) => {
  const search = textParam(req.query.search, 'search');
  const exhibition = textParam(req.query.exhibition, 'exhibition');
  const page = positiveIntParam(req.query.page, 'page', 1);
  const limit = Math.min(positiveIntParam(req.query.limit, 'limit', DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  const filter = {};

  // Search: case-insensitive "contains" match on title, description and tags, so partial words
  // work ("sat" finds "Satellite") - needed because the Discover page searches as you type.
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: pattern }, { description: pattern }, { tags: pattern }];
  }

  // Exact but case-insensitive match: "bronze age" finds "Bronze Age"
  for (const key of ['era', 'region', 'category']) {
    const value = textParam(req.query[key], key);
    if (value) filter[key] = new RegExp(`^${escapeRegex(value)}$`, 'i');
  }

  // ?exhibition= accepts an exhibition id or slug
  if (exhibition) {
    const found = await Exhibition.findOne(isObjectId(exhibition) ? { _id: exhibition } : { slug: exhibition });
    if (!found) throw httpError(404, 'Exhibition not found');
    filter.exhibitionId = found._id;
  }

  const [artifacts, total] = await Promise.all([
    Artifact.find(filter)
      .select(CARD_FIELDS)
      .sort({ createdAt: -1 }) // newest first
      .skip((page - 1) * limit)
      .limit(limit),
    Artifact.countDocuments(filter),
  ]);

  res.json({ artifacts, total, page, limit, totalPages: Math.ceil(total / limit) });
};

// GET /api/artifacts/filters  - the values the Discover page's dropdowns can offer
export const getFilterOptions = async (req, res) => {
  // distinct() returns each different value once, e.g. every era used by at least one artifact
  const [eras, regions, categories] = await Promise.all(
    ['era', 'region', 'category'].map((field) => Artifact.distinct(field))
  );
  const clean = (values) => values.filter(Boolean).sort((a, b) => a.localeCompare(b));
  res.json({ eras: clean(eras), regions: clean(regions), categories: clean(categories) });
};

// GET /api/artifacts/random  (?withModel=true: only artifacts that have a 3D model)
export const getRandomArtifact = async (req, res) => {
  const pipeline = [{ $sample: { size: 1 } }];
  if (req.query.withModel === 'true') pipeline.unshift({ $match: { modelUrl: { $ne: '' } } });

  const [artifact] = await Artifact.aggregate(pipeline);
  if (!artifact) throw httpError(404, 'No artifacts yet');
  res.json({ artifact });
};

// GET /api/artifacts/:slug  (each visit adds one view)
export const getArtifactBySlug = async (req, res) => {
  const artifact = await Artifact.findOneAndUpdate(
    { slug: req.params.slug.toLowerCase() },
    { $inc: { views: 1 } },
    // return the updated document; a view should not change updatedAt
    { returnDocument: 'after', timestamps: false }
  ).populate('exhibitionId', 'title slug isPublished');

  if (!artifact) throw httpError(404, 'Artifact not found');
  res.json({ artifact });
};

// GET /api/artifacts/by-id/:id  (curator/admin) - for the dashboard's edit forms.
// Unlike GET /:slug, this does not count as a visitor's view.
export const getArtifactById = async (req, res) => {
  const artifact = await Artifact.findById(req.params.id);
  if (!artifact) throw httpError(404, 'Artifact not found');
  res.json({ artifact });
};

// GET /api/artifacts/:slug/related  (same category or era, up to 6)
export const getRelatedArtifacts = async (req, res) => {
  const artifact = await Artifact.findOne({ slug: req.params.slug.toLowerCase() }).select('category era');
  if (!artifact) throw httpError(404, 'Artifact not found');

  const sameGroup = [];
  if (artifact.category) sameGroup.push({ category: artifact.category });
  if (artifact.era) sameGroup.push({ era: artifact.era });
  if (sameGroup.length === 0) return res.json({ artifacts: [] });

  const artifacts = await Artifact.find({ _id: { $ne: artifact._id }, $or: sameGroup })
    .select(CARD_FIELDS)
    .sort({ views: -1 })
    .limit(RELATED_LIMIT);

  res.json({ artifacts });
};

// POST /api/artifacts  (multipart form: metadata fields + optional "model" and "thumbnail" files)
export const createArtifact = async (req, res) => {
  const fields = pickArtifactFields(req.body);
  const exhibitionId = req.body?.exhibitionId !== undefined ? await resolveExhibitionId(req.body.exhibitionId) : null;

  const artifact = await Artifact.create({
    ...fields,
    exhibitionId,
    // The model can be uploaded later, so both files are optional
    modelUrl: getUploadedFileUrl(req, 'model') ?? '',
    thumbnailUrl: getUploadedFileUrl(req, 'thumbnail') ?? '',
  });

  if (exhibitionId) await moveArtifactToExhibition(artifact._id, exhibitionId);

  res.status(201).json({ artifact });
};

// PUT /api/artifacts/:id  (JSON or multipart; any subset of fields, new files replace old ones)
export const updateArtifact = async (req, res) => {
  const artifact = await Artifact.findById(req.params.id);
  if (!artifact) throw httpError(404, 'Artifact not found');

  const { credits, ...fields } = pickArtifactFields(req.body);
  artifact.set(fields);
  // Merge credits so sending only { sourceUrl } keeps the existing author and license
  for (const [key, value] of Object.entries(credits ?? {})) {
    artifact.set(`credits.${key}`, value);
  }

  // New uploads replace the old files (deleted below, once the save has succeeded)
  const replacedFiles = [];
  const newModelUrl = getUploadedFileUrl(req, 'model');
  const newThumbnailUrl = getUploadedFileUrl(req, 'thumbnail');
  if (newModelUrl) {
    replacedFiles.push(artifact.modelUrl);
    artifact.modelUrl = newModelUrl;
  }
  if (newThumbnailUrl) {
    replacedFiles.push(artifact.thumbnailUrl);
    artifact.thumbnailUrl = newThumbnailUrl;
  }

  const exhibitionChanged = req.body?.exhibitionId !== undefined;
  if (exhibitionChanged) artifact.exhibitionId = await resolveExhibitionId(req.body.exhibitionId);

  await artifact.save();

  if (exhibitionChanged) await moveArtifactToExhibition(artifact._id, artifact.exhibitionId);
  await Promise.all(replacedFiles.map(deleteFileByUrl));

  res.json({ artifact });
};

// DELETE /api/artifacts/:id  (admin) - also removes its files and every reference to it
export const deleteArtifact = async (req, res) => {
  const artifact = await Artifact.findByIdAndDelete(req.params.id);
  if (!artifact) throw httpError(404, 'Artifact not found');

  await Promise.all([
    Exhibition.updateMany({ artifacts: artifact._id }, { $pull: { artifacts: artifact._id } }),
    User.updateMany({ favorites: artifact._id }, { $pull: { favorites: artifact._id } }),
    deleteFileByUrl(artifact.modelUrl),
    deleteFileByUrl(artifact.thumbnailUrl),
  ]);

  res.json({ message: 'Artifact deleted', id: artifact._id });
};
