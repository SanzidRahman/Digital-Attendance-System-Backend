const { v2: cloudinary } = require("cloudinary");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const UploadOnCloudinary = async (filePath) => {
  try {
    if (!filePath) return null;

    const result = await cloudinary.uploader.upload(filePath);
    return result;
  } catch (error) {
    console.error("Cloudinary Error:", error.message);

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return null;
  }
};

module.exports = { UploadOnCloudinary };
