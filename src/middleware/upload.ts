import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { getMaxPdfSizeBytes, getMaxPdfSizeMb } from '../lib/fileValidation.ts';

// Configure in-memory storage for PDF uploads
const memoryStorage = multer.memoryStorage();

// Multer instance for single file upload with field name 'file'
export const uploadPdfMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const maxBytes = getMaxPdfSizeBytes();
  const maxMb = getMaxPdfSizeMb();

  const uploader = multer({
    storage: memoryStorage,
    limits: {
      fileSize: maxBytes,
      files: 1,
    },
  }).single('file');

  uploader(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: `File size exceeds the maximum limit of ${maxMb}MB.`,
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            error: 'Unexpected file field. Please upload using the field name "file".',
          });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }
    next();
  });
};
