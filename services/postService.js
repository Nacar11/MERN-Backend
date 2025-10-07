const Post = require('../models/postModel');
const { NotFoundError, ValidationError, AuthorizationError } = require('../utils/errors');
const mongoose = require('mongoose');
const { getGridFS } = require('../config/gridfs');

/**
 * Post Service
 * Handles all post-related business logic
 */
class PostService {
  /**
   * Validate MongoDB ObjectId
   */
  static validateObjectId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid post ID format');
    }
  }

  /**
   * Get all posts (with pagination support)
   */
  static async getAllPosts(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const [posts, total] = await Promise.all([
      Post.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user_id', 'email'),
      Post.countDocuments(),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get posts by user
   */
  static async getPostsByUser(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find({ user_id: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments({ user_id: userId }),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single post by ID
   */
  static async getPostById(postId) {
    this.validateObjectId(postId);

    const post = await Post.findById(postId).populate('user_id', 'email');
    
    if (!post) {
      throw new NotFoundError('Post');
    }

    return post;
  }

  /**
   * Create a new post
   */
  static async createPost(postData, userId, files = []) {
    const { title, content } = postData;

    if (!title || !content) {
      throw new ValidationError('Title and content are required');
    }

    if (title.trim().length < 3) {
      throw new ValidationError('Title must be at least 3 characters long');
    }

    if (content.trim().length < 10) {
      throw new ValidationError('Content must be at least 10 characters long');
    }

    const postPayload = {
      title: title.trim(),
      content: content.trim(),
      user_id: userId,
    };

    // Add images data if files were uploaded
    if (files && files.length > 0) {
      postPayload.images = files.map(file => ({
        fileId: file.id,
        filename: file.filename,
        contentType: file.contentType,
        size: file.size
      }));
    }

    const post = await Post.create(postPayload);

    return post;
  }

  /**
   * Update a post
   */
  static async updatePost(postId, updateData, userId) {
    this.validateObjectId(postId);

    const post = await Post.findById(postId);
    
    if (!post) {
      throw new NotFoundError('Post');
    }

    // Check ownership
    if (post.user_id.toString() !== userId.toString()) {
      throw new AuthorizationError('You can only update your own posts');
    }

    // Validate update data
    if (updateData.title && updateData.title.trim().length < 3) {
      throw new ValidationError('Title must be at least 3 characters long');
    }

    if (updateData.content && updateData.content.trim().length < 10) {
      throw new ValidationError('Content must be at least 10 characters long');
    }

    // Only allow updating specific fields
    const allowedUpdates = ['title', 'content'];
    const updates = {};
    
    allowedUpdates.forEach((field) => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field].trim();
      }
    });

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      updates,
      { new: true, runValidators: true }
    );

    return updatedPost;
  }

  /**
   * Delete a post
   */
  static async deletePost(postId, userId) {
    this.validateObjectId(postId);

    const post = await Post.findById(postId);
    
    if (!post) {
      throw new NotFoundError('Post');
    }

    // Check ownership
    if (post.user_id.toString() !== userId.toString()) {
      throw new AuthorizationError('You can only delete your own posts');
    }

    // Delete associated images from GridFS if exists
    if (post.images && post.images.length > 0) {
      try {
        const { gridfsBucket } = getGridFS();
        for (const image of post.images) {
          await gridfsBucket.delete(image.fileId);
          console.log(`✅ Deleted image file: ${image.filename}`);
        }
      } catch (error) {
        console.error('Error deleting images from GridFS:', error);
        // Continue with post deletion even if image deletion fails
      }
    }

    await Post.findByIdAndDelete(postId);
    
    return { message: 'Post deleted successfully' };
  }
}

module.exports = PostService;
