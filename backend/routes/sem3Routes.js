const express = require('express');
const router = express.Router();
const { authenticateToken, requireStudent, requireAdmin } = require('../middleware/auth');
const sem3Controller = require('../controllers/sem3Controller');

router.post(
  '/choice',
  authenticateToken,
  requireStudent,
  sem3Controller.setSem3Choice
);

router.get(
  '/choice',
  authenticateToken,
  requireStudent,
  sem3Controller.getSem3Choice
);

router.get(
  '/track-choices',
  authenticateToken,
  requireAdmin,
  sem3Controller.listSem3TrackChoices
);

module.exports = router;

