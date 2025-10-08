const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

let gfs;
let gridfsBucket;

/**
 * Initialize GridFS
 * Call this after MongoDB connection is established
 */
const initGridFS = () => {
  const conn = mongoose.connection;
  
  // Check if connection is ready
  if (!conn.db) {
    throw new Error('MongoDB connection not ready. Cannot initialize GridFS.');
  }
  
  // Initialize GridFS stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads'); // Collection name for files
  
  // Initialize GridFSBucket (newer API)
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'uploads'
  });
  
  console.log('✅ GridFS initialized successfully');
  
  return { gfs, gridfsBucket };
};

/**
 * Get GridFS instance
 */
const getGridFS = () => {
  if (!gfs || !gridfsBucket) {
    throw new Error('GridFS not initialized. Call initGridFS() first.');
  }
  return { gfs, gridfsBucket };
};

module.exports = {
  initGridFS,
  getGridFS
};
