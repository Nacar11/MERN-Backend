const express = require("express");
const {
  getAllPosts,
  getPostsByUser,
  getPost,
  createPost,
  deletePost,
  updatePost,
} = require("../controllers/postController");
const requireAuth = require("../middlewares/requireAuth");

const router = express.Router();

// Require auth for all post routes
router.use(requireAuth);

// GET all posts
router.get("/all", getAllPosts);

// GET posts by logged-in user
router.get("/", getPostsByUser);

// GET single post
router.get("/:id", getPost);

// POST new post
router.post("/", createPost);

// DELETE post
router.delete("/:id", deletePost);

// PATCH post
router.patch("/:id", updatePost);

module.exports = router;
