const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const STORAGE_ROOT = path.join(__dirname, '..', 'storage');
const CHUNKS_DIR = path.join(STORAGE_ROOT, 'chunks');
const FILES_DIR = path.join(STORAGE_ROOT, 'files');

// Ensure directories exist
if (!fs.existsSync(CHUNKS_DIR)) {
  fs.mkdirSync(CHUNKS_DIR, { recursive: true });
}
if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
}

const DEFAULT_CHUNK_SIZE = 128 * 1024; // 128 KB

/**
 * Compute SHA-256 hash of a buffer or stream
 */
function computeHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Split an uploaded file into chunks, calculating hashes
 */
async function splitFileIntoChunks(sourceFilePath, originalName, uploaderId, mimeType = 'application/octet-stream', chunkSize = DEFAULT_CHUNK_SIZE) {
  const fileStats = fs.statSync(sourceFilePath);
  const fileSize = fileStats.size;

  const wholeFileBuffer = fs.readFileSync(sourceFilePath);
  const fileHash = computeHash(wholeFileBuffer);

  const fileId = 'file_' + uuidv4().slice(0, 10);
  const totalChunks = Math.ceil(fileSize / chunkSize) || 1;
  const chunks = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, fileSize);
    const chunkBuffer = wholeFileBuffer.subarray(start, end);
    const chunkHash = computeHash(chunkBuffer);
    const chunkId = `${fileId}_chunk_${i}`;
    const chunkFilename = `${chunkId}.bin`;
    const chunkPath = path.join(CHUNKS_DIR, chunkFilename);

    fs.writeFileSync(chunkPath, chunkBuffer);

    chunks.push({
      chunk_index: i,
      chunk_id: chunkId,
      chunk_hash: chunkHash,
      chunk_size: chunkBuffer.length,
      storage_path: chunkPath
    });
  }

  // Also preserve copy in FILES_DIR for reference if needed
  const permanentFilePath = path.join(FILES_DIR, `${fileId}_${path.basename(originalName)}`);
  fs.copyFileSync(sourceFilePath, permanentFilePath);

  return {
    file_id: fileId,
    file_name: originalName,
    file_size: fileSize,
    mime_type: mimeType,
    file_hash: fileHash,
    chunk_size: chunkSize,
    total_chunks: totalChunks,
    chunks: chunks,
    assembled_path: permanentFilePath
  };
}

/**
 * Verify integrity of a chunk against expected hash
 */
function verifyChunk(chunkBuffer, expectedHash) {
  const actualHash = computeHash(chunkBuffer);
  return {
    valid: actualHash.toLowerCase() === expectedHash.toLowerCase(),
    actualHash,
    expectedHash
  };
}

/**
 * Get chunk buffer by chunk_id
 */
function getChunkBuffer(chunkId) {
  const chunkPath = path.join(CHUNKS_DIR, `${chunkId}.bin`);
  if (!fs.existsSync(chunkPath)) {
    return null;
  }
  return fs.readFileSync(chunkPath);
}

module.exports = {
  CHUNKS_DIR,
  FILES_DIR,
  computeHash,
  splitFileIntoChunks,
  verifyChunk,
  getChunkBuffer
};

