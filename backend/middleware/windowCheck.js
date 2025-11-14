const SystemConfig = require('../models/SystemConfig');

/**
 * Middleware to check if an action is allowed within a specified time window
 * @param {string} configKey - SystemConfig key that contains the window object {start: Date, end: Date}
 * @param {boolean} allowIfNull - If true, allow action when window is null/not set (default: true)
 * @returns {Function} Express middleware function
 */
const checkWindow = (configKey, allowIfNull = true) => {
  return async (req, res, next) => {
    try {
      // Get window configuration
      const windowConfig = await SystemConfig.getConfigValue(configKey, null);
      
      // If window is not set and we allow null, proceed
      if (!windowConfig || (!windowConfig.start && !windowConfig.end)) {
        if (allowIfNull) {
          return next(); // Allow operation when window is not configured
        } else {
          return res.status(403).json({
            success: false,
            message: `Operation window not configured. Please contact administrator.`,
            windowKey: configKey
          });
        }
      }

      const now = new Date();
      const startDate = windowConfig.start ? new Date(windowConfig.start) : null;
      const endDate = windowConfig.end ? new Date(windowConfig.end) : null;

      // Check if window has started
      if (startDate && now < startDate) {
        return res.status(403).json({
          success: false,
          message: `This operation is not yet available. Window opens on ${startDate.toLocaleString()}.`,
          windowKey: configKey,
          windowStart: startDate,
          windowEnd: endDate
        });
      }

      // Check if window has ended
      if (endDate && now > endDate) {
        return res.status(403).json({
          success: false,
          message: `This operation window has closed. Window closed on ${endDate.toLocaleString()}.`,
          windowKey: configKey,
          windowStart: startDate,
          windowEnd: endDate
        });
      }

      // Window is open, proceed
      next();
    } catch (error) {
      console.error('Window check error:', error);
      // On error, allow operation (fail open) to avoid blocking legitimate requests
      // Admin can always override via direct database/config access
      next();
    }
  };
};

/**
 * Helper function to check if a window is currently open (for use in controllers)
 * @param {string} configKey - SystemConfig key
 * @returns {Promise<{isOpen: boolean, reason?: string, start?: Date, end?: Date}>}
 */
const isWindowOpen = async (configKey) => {
  try {
    const windowConfig = await SystemConfig.getConfigValue(configKey, null);
    
    if (!windowConfig || (!windowConfig.start && !windowConfig.end)) {
      return { isOpen: true, reason: 'Window not configured' }; // Default to open if not set
    }

    const now = new Date();
    const startDate = windowConfig.start ? new Date(windowConfig.start) : null;
    const endDate = windowConfig.end ? new Date(windowConfig.end) : null;

    if (startDate && now < startDate) {
      return {
        isOpen: false,
        reason: `Window opens on ${startDate.toLocaleString()}`,
        start: startDate,
        end: endDate
      };
    }

    if (endDate && now > endDate) {
      return {
        isOpen: false,
        reason: `Window closed on ${endDate.toLocaleString()}`,
        start: startDate,
        end: endDate
      };
    }

    return {
      isOpen: true,
      start: startDate,
      end: endDate
    };
  } catch (error) {
    console.error('isWindowOpen error:', error);
    // Default to open on error
    return { isOpen: true, reason: 'Error checking window' };
  }
};

module.exports = {
  checkWindow,
  isWindowOpen
};

