import multer from "multer";
import fs from "fs";
import path from "path";

const isVercel = Boolean(process.env.VERCEL);
const uploadDir = isVercel ? path.join("/tmp", "uploads") : "uploads";

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn("Could not create uploads directory:", err.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    } catch (_) {}
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + (file.originalname || "file").replace(/\s+/g, "_"));
  }
});

const upload = multer({ storage });

export default upload;