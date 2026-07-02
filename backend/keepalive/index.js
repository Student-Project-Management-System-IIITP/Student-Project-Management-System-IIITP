/**
 * TEMPORARY: Remove when Render is upgraded to a paid/always-on plan.
 * See README.md in this folder for removal steps.
 */

const express = require('express');
const { keepAliveLimiter } = require('../middleware/rateLimiter');

const createKeepAliveRouter = () => {
  const router = express.Router();

  // Apply rate limiting to prevent DoS (e.g. 10 requests / minute)
  router.use(keepAliveLimiter);

  router.get('/', (req, res) => {
    const userAgent = req.get('User-Agent') || '';
    
    // Distinguish traffic from UptimeRobot
    if (userAgent.includes('UptimeRobot')) {
      console.log('[keepalive] Ping received from UptimeRobot');
    } else {
      console.log(`[keepalive] Ping received from ${userAgent || 'unknown'}`);
    }

    res.status(200).json({
      status: 'ok',
      uptime: process.uptime()
    });
  });

  return router;
};

module.exports = {
  createKeepAliveRouter
};
