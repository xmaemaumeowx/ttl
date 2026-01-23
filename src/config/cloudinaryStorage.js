const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "ttl/avatars",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [
      { width: 300, height: 300, crop: "fill", gravity: "face" }
    ],
  },
});

module.exports = storage;
