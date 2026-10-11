import httpError from '../utils/httpError.js';
import { isObjectId } from '../utils/validate.js';

// Used with router.param(): runs before any route containing that parameter,
// so malformed ids get a clear 400 instead of reaching the database.
//   router.param('id', validateObjectId);
const validateObjectId = (req, res, next, value, name) => {
  if (!isObjectId(value)) return next(httpError(400, `Invalid ${name}: ${value}`));
  next();
};

export default validateObjectId;
