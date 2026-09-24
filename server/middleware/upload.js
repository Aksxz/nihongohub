import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF files are allowed for textbook import.'), false);
  }
};

export const uploadPdf = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024 // 30 MB max
  }
});

const imageFilter = (req, file, cb) => {
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPG, PNG, and WebP images are allowed for OCR import.'), false);
  }
};

export const uploadImages = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB per image
  }
});

const csvFilter = (req, file, cb) => {
  const allowedExts = ['.csv', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext) || file.mimetype === 'text/csv' || file.mimetype === 'text/plain' || file.mimetype.includes('excel')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only CSV files are allowed.'), false);
  }
};

export const uploadCsv = multer({
  storage,
  fileFilter: csvFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB max for CSV
  }
});
