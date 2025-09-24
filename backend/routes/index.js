const express = require('express');
const { getHome } = require('../controllers');

const router = express.Router();

// Home route
router.get('/', getHome);

module.exports = router;
