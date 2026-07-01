// Store reset codes in memory (in production, use database)
const resetCodes = new Map(); // email -> { code, expiresAt }

module.exports = resetCodes;
