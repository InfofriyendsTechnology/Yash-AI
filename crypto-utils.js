const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.YASH_AI_ENCRYPTION_KEY || crypto.randomBytes(32);

// Note: In production, ENCRYPTION_KEY should be stored securely (env variable, keychain, etc.)
// For now, we'll generate one and keep it in memory

/**
 * Encrypt a password
 * @param {string} password - Plain text password
 * @returns {Object} - { encrypted: string, iv: string }
 */
function encryptPassword(password) {
  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    
    // Encrypt the password
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex')
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt password');
  }
}

/**
 * Decrypt a password
 * @param {string} encryptedPassword - Encrypted password (hex)
 * @param {string} ivHex - Initialization vector (hex)
 * @returns {string} - Decrypted password
 */
function decryptPassword(encryptedPassword, ivHex) {
  try {
    // Convert IV from hex to buffer
    const iv = Buffer.from(ivHex, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    
    // Decrypt the password
    let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt password');
  }
}

/**
 * Get the encryption key (for backup/restore purposes)
 * WARNING: Store this securely!
 */
function getEncryptionKey() {
  return ENCRYPTION_KEY.toString('hex');
}

/**
 * Set encryption key from hex string (for restore purposes)
 */
function setEncryptionKey(keyHex) {
  if (keyHex && keyHex.length === 64) { // 32 bytes = 64 hex chars
    ENCRYPTION_KEY = Buffer.from(keyHex, 'hex');
    return true;
  }
  return false;
}

module.exports = {
  encryptPassword,
  decryptPassword,
  getEncryptionKey,
  setEncryptionKey
};
