// Response utility functions
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data
  });
};

const errorResponse = (res, message = 'Error', statusCode = 500) => {
  return res.status(statusCode).json({
    status: 'error',
    message
  });
};

module.exports = {
  successResponse,
  errorResponse
};
