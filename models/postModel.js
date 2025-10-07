const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    images: [{
      fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'uploads.files' // Reference to GridFS files collection
      },
      filename: String,
      contentType: String,
      size: Number
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
