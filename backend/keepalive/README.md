# Keep-Alive Module

**TEMPORARY WORKAROUND**

## What it does
This module provides a lightweight `/api/health` endpoint that returns a `200 OK` and the server uptime. It is intended to be pinged regularly (e.g., every 5 minutes by UptimeRobot) to prevent the backend from sleeping on Render's free tier, which spins down services after 15 minutes of inactivity. 

## Why it exists
Render's free tier puts applications to sleep. This workaround keeps the service warm to avoid cold start delays for users.

## Removal Steps
When the backend is upgraded to a paid Render plan that doesn't sleep, this module is no longer needed and should be cleanly removed. 

1. **Delete this entire folder**: `backend/keepalive/`
2. **Remove the route in `server.js`**:
   Remove the following lines from `backend/server.js`:
   ```javascript
   // Keep-alive route (temporary for Render free tier)
   if (process.env.KEEP_ALIVE_ENABLED === 'true') {
     const { createKeepAliveRouter } = require('./keepalive');
     app.use('/api/health', createKeepAliveRouter());
   }
   ```
3. **Unset the environment variable**: 
   Remove `KEEP_ALIVE_ENABLED` from your `.env` and `.env.example` files on all environments.
4. **Delete UptimeRobot monitor**: Log in to UptimeRobot (or whatever monitoring service you're using) and delete the monitor hitting this endpoint.
