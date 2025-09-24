// Home controller
const getHome = (req, res) => {
  res.json({
    message: 'Welcome to SPMS - IIITP Backend API',
    status: 'Server is running successfully',
    version: '1.0.0'
  });
};

module.exports = {
  getHome
};
