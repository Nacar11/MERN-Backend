const express = require('express');
const PostService = require('../services/postService');
const { authenticate } = require('../middlewares/auth');
const { validatePagination } = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/response');
const upload = require('../middlewares/upload');
const { getGridFS } = require('../config/gridfs');
const { uploadMultipleToGridFS } = require('../utils/fileUpload');

const router = express.Router();

/**
 * @route   GET /api/posts/all
 * @desc    Get all posts with pagination
 * @access  Private (requires authentication)
 */
router.get('/all', authenticate, validatePagination, asyncHandler(async (req, res) => {
  const { page, limit } = req.pagination || { page: 1, limit: 10 };
  const result = await PostService.getAllPosts(page, limit);
  ApiResponse.success(res, result, 'Posts retrieved successfully');
}));

/**
 * @route   GET /api/posts
 * @desc    Get posts by logged-in user
 * @access  Private (requires authentication)
 */
router.get('/', authenticate, validatePagination, asyncHandler(async (req, res) => {
  const { page, limit } = req.pagination || { page: 1, limit: 10 };
  const result = await PostService.getPostsByUser(req.user._id, page, limit);
  ApiResponse.success(res, result, 'User posts retrieved successfully');
}));

/**
 * @route   GET /api/posts/:id
 * @desc    Get single post by ID
 * @access  Private (requires authentication)
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const post = await PostService.getPostById(req.params.id);
  ApiResponse.success(res, { post }, 'Post retrieved successfully');
}));

/**
 * @route   POST /api/posts
 * @desc    Create a new post (with optional multiple images)
 * @access  Private (requires authentication)
 */
router.post('/', authenticate, upload.array('images', 5), asyncHandler(async (req, res) => {
  // Upload files to GridFS if any
  const uploadedFiles = await uploadMultipleToGridFS(req.files, req.user._id);
  
  // Create post with uploaded file info
  const post = await PostService.createPost(req.body, req.user._id, uploadedFiles);
  ApiResponse.created(res, { post }, 'Post created successfully');
}));

/**
 * @route   PATCH /api/posts/:id
 * @desc    Update a post
 * @access  Private (requires authentication)
 */
router.patch('/:id', authenticate, asyncHandler(async (req, res) => {
  const post = await PostService.updatePost(req.params.id, req.body, req.user._id);
  ApiResponse.success(res, { post }, 'Post updated successfully');
}));

/**
 * @route   DELETE /api/posts/:id
 * @desc    Delete a post
 * @access  Private (requires authentication)
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await PostService.deletePost(req.params.id, req.user._id);
  ApiResponse.success(res, result, 'Post deleted successfully');
}));

/**
 * @route   GET /api/posts/image/:filename
 * @desc    Get image file by filename
 * @access  Public
 */
router.get('/image/:filename', asyncHandler(async (req, res) => {
  const { gridfsBucket } = getGridFS();
  
  // Find file
  const files = await gridfsBucket.find({ filename: req.params.filename }).toArray();
  
  if (!files || files.length === 0) {
    return res.status(404).json({ error: 'Image not found' });
  }
  
  const file = files[0];
  const contentType = file.metadata?.contentType || file.contentType || 'image/jpeg';
  
  // Check if image
  const isImage = contentType.startsWith('image/');
  
  if (isImage) {
    // Set proper headers
    res.set('Content-Type', contentType);
    res.set('Content-Disposition', `inline; filename="${file.metadata?.originalName || file.filename}"`);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Stream the file
    const downloadStream = gridfsBucket.openDownloadStreamByName(req.params.filename);
    
    downloadStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming image' });
      }
    });
    
    downloadStream.pipe(res);
  } else {
    res.status(404).json({ error: 'Not an image', contentType });
  }
}));

/**
 * @route   GET /api/posts/image/id/:id
 * @desc    Get image file by file ID
 * @access  Public
 */
router.get('/image/id/:id', asyncHandler(async (req, res) => {
  const { gridfsBucket } = getGridFS();
  const mongoose = require('mongoose');
  
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }
  
  try {
    const files = await gridfsBucket.find({ _id: new mongoose.Types.ObjectId(req.params.id) }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const file = files[0];
    const contentType = file.metadata?.contentType || file.contentType || 'image/jpeg';
    
    // Set proper headers
    res.set('Content-Type', contentType);
    res.set('Content-Disposition', `inline; filename="${file.metadata?.originalName || file.filename}"`);
    res.set('Cache-Control', 'public, max-age=31536000');
    
    // Stream the file
    const downloadStream = gridfsBucket.openDownloadStream(new mongoose.Types.ObjectId(req.params.id));
    
    downloadStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming image' });
      }
    });
    
    downloadStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving image' });
  }
}));

module.exports = router;
