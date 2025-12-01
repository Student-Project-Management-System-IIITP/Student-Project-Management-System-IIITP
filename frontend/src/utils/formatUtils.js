/**
 * Format faculty name with prefix
 * @param {Object|string} faculty - Faculty object with fullName and optional prefix, or a string
 * @returns {string} Formatted name with prefix if available, or fallback text
 */
export const formatFacultyName = (faculty, fallback = '') => {
  if (!faculty) return fallback;
  if (typeof faculty === 'string') return faculty; // If it's already a string, return as is
  
  const prefix = faculty.prefix || '';
  const fullName = faculty.fullName || '';
  
  if (!fullName) return fallback;
  return prefix ? `${prefix} ${fullName}` : fullName;
};

/**
 * Format faculty name from separate prefix and fullName
 * @param {string} prefix - Prefix (Dr, Mr, Mrs, etc.)
 * @param {string} fullName - Full name
 * @param {string} fallback - Fallback text if fullName is empty
 * @returns {string} Formatted name with prefix if available
 */
export const formatNameWithPrefix = (prefix, fullName, fallback = '') => {
  if (!fullName) return fallback;
  return prefix ? `${prefix} ${fullName}` : fullName;
};

