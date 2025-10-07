const crypto = require('crypto');
const path = require('path');
const { Readable } = require('stream');
const { getGridFS } = require('../config/gridfs');

/**
 * Upload file buffer to GridFS
 * @param {Buffer} buffer - File buffer from multer
 * @param {Object} fileInfo - Original file info from multer
 * @param {String} userId - User ID for metadata
 * @returns {Promise<Object>} - Uploaded file info
 */
const uploadToGridFS = (buffer, fileInfo, userId) => {
  return new Promise((resolve, reject) => {
    try {
      const { gridfsBucket } = getGridFS();
      
      // Generate unique filename
      const filename = crypto.randomBytes(16).toString('hex') + path.extname(fileInfo.originalname);
      
      // Create readable stream from buffer
      const readableStream = Readable.from(buffer);
      
      // Create upload stream
      const uploadStream = gridfsBucket.openUploadStream(filename, {
        metadata: {
          originalName: fileInfo.originalname,
          uploadedBy: userId,
          uploadedAt: new Date(),
          contentType: fileInfo.mimetype
        }
      });
      
      // Handle upload completion
      uploadStream.on('finish', () => {
        resolve({
          id: uploadStream.id,
          filename: filename,
          contentType: fileInfo.mimetype,
          size: buffer.length
        });
      });
      
      // Handle errors
      uploadStream.on('error', (error) => {
        reject(error);
      });
      
      // Pipe the buffer to GridFS
      readableStream.pipe(uploadStream);
      
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Upload multiple files to GridFS
 * @param {Array} files - Array of multer files
 * @param {String} userId - User ID for metadata
 * @returns {Promise<Array>} - Array of uploaded file info
 */
const uploadMultipleToGridFS = async (files, userId) => {
  if (!files || files.length === 0) {
    return [];
  }
  
  const uploadPromises = files.map(file => 
    uploadToGridFS(file.buffer, file, userId)
  );
  
  return Promise.all(uploadPromises);
};

module.exports = {
  uploadToGridFS,
  uploadMultipleToGridFS
};
