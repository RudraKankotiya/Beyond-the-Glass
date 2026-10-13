// Numbers shared by the viewer components, in one place so they are easy to tune.

// Every model is scaled so its longest side is this many units. Models come in very different
// units (a coin in millimetres, a building in metres); normalising them means the camera,
// zoom limits, lights and shadows can use the same numbers for every artifact.
export const MODEL_SIZE = 2;

// The optimized models use Draco compression. The decoder is served from /public/draco
// (copied from three.js) instead of Google's CDN, so the viewer also works offline.
export const DRACO_DECODER_PATH = '/draco/';

// Camera
export const CAMERA_FOV = 45; // field of view in degrees: how wide the camera "lens" is
// Direction the camera looks from: right of, above and in front of the model - the same angle
// as the thumbnails, so the model looks the same when a visitor opens it. FitCamera then moves
// the camera closer or further along this line until the model fits the view.
export const DEFAULT_CAMERA_POSITION = [2.5, 1.5, 3];


// Orbit controls
export const MIN_ZOOM_DISTANCE = 1; // closest the camera may get to the centre of the model
export const MAX_ZOOM_DISTANCE = 8; // furthest it may move away
export const MAX_PAN_DISTANCE = MODEL_SIZE * 0.75; // how far the view may be dragged off-centre
