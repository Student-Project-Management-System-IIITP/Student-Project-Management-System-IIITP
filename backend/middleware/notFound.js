// 404 handler middleware
const notFound = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    status: 'error'
  });
};

module.exports = notFound;
