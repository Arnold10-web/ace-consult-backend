import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Use Railway volume path in production, local uploads in development
let UPLOAD_DIR = process.env.NODE_ENV === 'production' 
  ? (process.env.UPLOAD_DIR || '/app/uploads')
  : path.join(__dirname, '../../uploads');

// Only try to find mounted volume in production
if (process.env.NODE_ENV === 'production') {
  const possiblePaths = [
    process.env.UPLOAD_DIR,
    '/app/uploads',
    '/uploads',
    '/mnt/uploads',
    '/app/ace-consult-backend-volume'
  ].filter((path): path is string => Boolean(path));
  
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
} else {
  // For development, ensure we use local path
  UPLOAD_DIR = path.join(__dirname, '../../uploads');
}

console.log(`Upload directory: ${UPLOAD_DIR}`);

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`Created upload directory: ${UPLOAD_DIR}`);
  } catch (error) {
    console.error(`Failed to create upload directory: ${UPLOAD_DIR}`, error);
    // Fallback to temp directory
    UPLOAD_DIR = '/tmp/uploads';
    try {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      console.log(`Using fallback upload directory: ${UPLOAD_DIR}`);
    } catch (fallbackError) {
      console.error(`Failed to create fallback directory:`, fallbackError);
      // Final fallback - use current working directory
      UPLOAD_DIR = path.join(process.cwd(), 'temp_uploads');
      console.log(`Using emergency upload directory: ${UPLOAD_DIR}`);
    }
  }
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
