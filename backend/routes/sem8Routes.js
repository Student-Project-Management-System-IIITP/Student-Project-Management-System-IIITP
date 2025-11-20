const express = require('express');
const router = express.Router();
const { authenticateToken, requireStudent, requireAdmin } = require('../middleware/auth');
const { checkWindow } = require('../middleware/windowCheck');
const sem8Controller = require('../controllers/sem8Controller');

// Student endpoints
router.get('/status', authenticateToken, requireStudent, sem8Controller.getSem8Status);
router.post('/choice', 
  authenticateToken, 
  requireStudent, 
  checkWindow('sem8.choiceWindow'), 
  sem8Controller.setSem8Choice
);
router.get('/choice', authenticateToken, requireStudent, sem8Controller.getSem8Choice);

// Admin endpoints (no window checks - admin can always finalize)
// Note: Admin sem8 routes are also defined in adminRoutes.js at /admin/sem8/*
// These routes are kept here for backward compatibility if needed
router.get('/track-choices', authenticateToken, requireAdmin, sem8Controller.listSem8TrackChoices);
router.patch('/finalize/:studentId', authenticateToken, requireAdmin, sem8Controller.finalizeSem8Track);

module.exports = router;

