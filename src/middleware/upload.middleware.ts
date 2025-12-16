import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Use Railway volume path in production, local uploads in development
let UPLOAD_DIR = process.env.NODE_ENV === 'production' 
  ? (process.env.UPLOAD_DIR || '/app/uploads')
  : path.join(__dirname, '../../uploads');

// Fallback: try to find the mounted volume directory in production
if (process.env.NODE_ENV === 'production') {
  const possiblePaths = [
    process.env.UPLOAD_DIR,
    '/app/uploads',
    '/uploads',
    '/mnt/uploads',
    '/app/ace-consult-backend-volume'
  ].filter(Boolean);
  
  for (const testPath of possiblePaths) {
    try {
      if (fs.existsSync(testPath)) {
        UPLOAD_DIR = testPath;
        console.log(`Found upload directory at: ${testPath}`);
        break;
      }
    } catch (e) {
      // Continue checking
    }
  }
}

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure storage

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for images only
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
  }
};

// Multer configuration
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter,
});
