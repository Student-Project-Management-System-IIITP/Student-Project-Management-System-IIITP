const express = require('express');
const router = express.Router();
const { authenticateToken, requireStudent, requireAdmin } = require('../middleware/auth');
const { checkWindow } = require('../middleware/windowCheck');
const sem7Controller = require('../controllers/sem7Controller');

// Student endpoints
router.post('/choice', 
  authenticateToken, 
  requireStudent, 
  checkWindow('sem7.choiceWindow'), 
  sem7Controller.setSem7Choice
);
router.get('/choice', authenticateToken, requireStudent, sem7Controller.getSem7Choice);

// Admin endpoints (no window checks - admin can always finalize)
// Note: Admin sem7 routes are defined in adminRoutes.js at /admin/sem7/*
// These routes are kept here for backward compatibility if needed
router.get('/track-choices', authenticateToken, requireAdmin, sem7Controller.listSem7TrackChoices);
router.patch('/finalize/:studentId', authenticateToken, requireAdmin, sem7Controller.finalizeSem7Track);

module.exports = router;


