/**
 * Sanitizes search queries to prevent JSON parsing issues with special characters
 * @param {string} query - The search query to sanitize
 * @returns {string} - The sanitized query
 */
function sanitizeSearchQuery(query) {
    if (!query) return query;
    
    // Handle backslash and other special characters that can cause JSON issues
    return query
        .replace(/\\/g, '\\\\')  // Escape backslashes
        .replace(/"/g, '\\"')    // Escape double quotes
        .replace(/\n/g, '\\n')   // Escape newlines
        .replace(/\r/g, '\\r')   // Escape carriage returns
        .replace(/\t/g, '\\t')   // Escape tabs
        .trim();                 // Remove leading/trailing whitespace
}

module.exports = { sanitizeSearchQuery };