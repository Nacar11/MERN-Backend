const Post = require("../models/postModel");
const mongoose = require("mongoose");

// Get all posts (latest first)
const getAllPosts = async (req, res) => {
  const posts = await Post.find({}).sort({ createdAt: -1 });
  res.status(200).json(posts);
};

// Get posts by user
const getPostsByUser = async (req, res) => {
  const user_id = req.user._id;
  const posts = await Post.find({ user_id }).sort({ createdAt: -1 });
  res.status(200).json(posts);
};

// Get a single post
const getPost = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "No such post" });
  }

  const post = await Post.findById(id);

  if (!post) {
    return res.status(404).json({ error: "No such post" });
  }

  res.status(200).json(post);
};

// Create a new post
const createPost = async (req, res) => {
  const { title, content, user_id } = req.body;

  // Validate input
  if (!title || !content || !user_id) {
    return res
      .status(400)
      .json({ error: "Title, content, and user_id are required." });
  }

  try {
    const post = await Post.create({ title, content, user_id });
    res.status(200).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a post
const deletePost = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "No such post" });
  }

  const post = await Post.findOneAndDelete({ _id: id });

  if (!post) {
    return res.status(400).json({ error: "No such post" });
  }

  res.status(200).json(post);
};

// Update a post
const updatePost = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "No such post" });
  }

  const post = await Post.findOneAndUpdate(
    { _id: id },
    {
      ...req.body,
    },
    { new: true }
  );

  if (!post) {
    return res.status(400).json({ error: "No such post" });
  }

  res.status(200).json(post);
};

module.exports = {
  getAllPosts,
  getPostsByUser,
  getPost,
  updatePost,
  createPost,
  deletePost,
};
