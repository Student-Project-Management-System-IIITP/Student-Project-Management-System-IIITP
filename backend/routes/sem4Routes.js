const express = require('express');
const router = express.Router();
const { authenticateToken, requireStudent, requireAdmin } = require('../middleware/auth');
const sem4Controller = require('../controllers/sem4Controller');

router.post(
  '/choice',
  authenticateToken,
  requireStudent,
  sem4Controller.setSem4Choice
);

router.get(
  '/choice',
  authenticateToken,
  requireStudent,
  sem4Controller.getSem4Choice
);

router.get(
  '/track-choices',
  authenticateToken,
  requireAdmin,
  sem4Controller.listSem4TrackChoices
);

module.exports = router;
