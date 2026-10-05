// Creates an Error carrying an HTTP status code.
// Throw it from any controller/middleware; the global error handler turns it into a JSON response.
const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export default httpError;
