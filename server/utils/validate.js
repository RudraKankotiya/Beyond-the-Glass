import httpError from './httpError.js';

// A MongoDB ObjectId is 24 hex characters, e.g. "6abb6e22de9e7402fcf8eb88"
export const isObjectId = (value) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

// Escapes characters like "." or "(" so user input can be used safely inside a RegExp
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Reads an optional text query param (?era=Bronze Age). Returns undefined when absent or blank.
export const textParam = (value, name) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw httpError(400, `${name} must be a single text value`);
  return value.trim() || undefined;
};

// Reads an optional positive whole number query param (?page=2), falling back to a default
export const positiveIntParam = (value, name, defaultValue) => {
  if (value === undefined || value === '') return defaultValue;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw httpError(400, `${name} must be a positive whole number`);
  }
  return number;
};

// Multipart forms send every field as text, so arrays/objects arrive as JSON strings.
// Values that are already parsed (JSON request bodies) are returned unchanged.
// `expected` describes the right format in the error message, e.g. "an array".
export const parseJsonField = (value, name, expected = 'valid JSON') => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw httpError(400, `${name} must be ${expected}`);
  }
};

// Accepts true/false or the strings "true"/"false" (from multipart forms)
export const parseBoolean = (value, name) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw httpError(400, `${name} must be true or false`);
};

// Validates a list of artifact ids sent by the client (JSON array or JSON string)
export const parseIdList = (value, name) => {
  const expected = 'an array of artifact ids';
  const ids = parseJsonField(value, name, expected);
  if (!Array.isArray(ids) || !ids.every(isObjectId)) {
    throw httpError(400, `${name} must be ${expected}`);
  }
  if (new Set(ids).size !== ids.length) {
    throw httpError(400, `${name} contains the same artifact more than once`);
  }
  return ids;
};
