import path from 'path';
import crypto from 'crypto';

/**
 * PDF Upload Validation & Sanitization Helpers
 * Enforces strict MIME, extension, size, and header checks for StudyNest.
 */

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  status?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 413 | 500;
  sanitizedFilename?: string;
  storageIdentifier?: string;
}

/**
 * Returns configurable maximum PDF upload size in megabytes.
 * Reads process.env.MAX_PDF_SIZE_MB with fallback to 20MB.
 */
export function getMaxPdfSizeMb(): number {
  const envVal = process.env.MAX_PDF_SIZE_MB;
  if (!envVal) return 20;
  const parsed = parseInt(envVal, 10);
  return isNaN(parsed) || parsed <= 0 ? 20 : parsed;
}

/**
 * Returns max allowed upload size in bytes.
 */
export function getMaxPdfSizeBytes(): number {
  return getMaxPdfSizeMb() * 1024 * 1024;
}

/**
 * Sanitizes original filename:
 * - Strips directory traversal (../, ..\, /)
 * - Removes null bytes and non-printable characters
 * - Replaces unsafe characters with underscores
 * - Truncates excessively long names
 */
export function sanitizeFilename(rawFilename?: string | null): string {
  if (!rawFilename || typeof rawFilename !== 'string') {
    return 'document.pdf';
  }

  // Strip path traversal (both / and \), null bytes
  const normalized = rawFilename.trim().replace(/\\+/g, '/').replace(/\0/g, '');
  const basename = path.basename(normalized);

  // Normalize and replace unsafe characters
  const sanitized = basename
    .replace(/[^\w\s.-]/gi, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .trim();

  const finalName = sanitized.length > 0 ? sanitized.substring(0, 150) : 'document.pdf';

  // Ensure .pdf extension
  if (!finalName.toLowerCase().endsWith('.pdf')) {
    return `${finalName}.pdf`;
  }
  return finalName;
}

/**
 * Generates deterministic safe storage key for a document:
 * topics/{topicId}/documents/{documentId}/source.pdf
 */
export function getDocumentStorageKey(topicId: string, documentId: string): string {
  return `topics/${topicId}/documents/${documentId}/source.pdf`;
}

/**
 * Generates a safe, non-guessable storage identifier.
 * Uses UUID v4 and timestamp, never raw user filename.
 */
export function generateStorageIdentifier(topicId: string, documentId?: string): string {
  if (documentId) {
    return getDocumentStorageKey(topicId, documentId);
  }
  const uniqueId = crypto.randomUUID();
  const timestamp = Date.now();
  return `topics/${topicId}/documents/${uniqueId}/source.pdf`;
}

/**
 * Validates PDF magic header bytes (%PDF-).
 */
export function isValidPdfBuffer(buffer?: Buffer | null): boolean {
  if (!buffer || buffer.length < 5) return false;
  // Standard PDF signature starts with %PDF- (0x25 0x50 0x44 0x46 0x2D)
  // Check the first 1024 bytes in case of minimal byte-order markers
  const headerSlice = buffer.subarray(0, Math.min(buffer.length, 1024));
  return headerSlice.indexOf('%PDF-') !== -1;
}

/**
 * Server-side validation for uploaded PDF file.
 */
export function validateUploadedPdf(file?: Express.Multer.File | null): FileValidationResult {
  if (!file) {
    return {
      isValid: false,
      status: 400,
      error: 'Missing file: Please select a PDF file to upload (field name: "file").',
    };
  }

  // 1. Check empty file (0 bytes)
  if (!file.buffer || file.size === 0 || file.buffer.length === 0) {
    return {
      isValid: false,
      status: 400,
      error: 'Invalid file: The uploaded PDF is empty (0 bytes).',
    };
  }

  // 2. Check size limit
  const maxBytes = getMaxPdfSizeBytes();
  const maxMb = getMaxPdfSizeMb();
  if (file.size > maxBytes || (file.buffer && file.buffer.length > maxBytes)) {
    return {
      isValid: false,
      status: 413,
      error: `File too large: Uploaded file exceeds maximum allowed size of ${maxMb}MB.`,
    };
  }

  // 3. Check file extension
  const originalName = file.originalname || '';
  const ext = path.extname(originalName).toLowerCase();
  if (ext !== '.pdf') {
    return {
      isValid: false,
      status: 400,
      error: `Invalid file extension "${ext || 'none'}". Only .pdf files are supported.`,
    };
  }

  // 4. Check MIME type
  const mime = (file.mimetype || '').toLowerCase();
  if (mime !== 'application/pdf' && mime !== 'application/x-pdf') {
    return {
      isValid: false,
      status: 400,
      error: `Invalid MIME type "${file.mimetype}". Only application/pdf is supported.`,
    };
  }

  // 5. Check binary content header (%PDF-)
  if (!isValidPdfBuffer(file.buffer)) {
    return {
      isValid: false,
      status: 400,
      error: 'Corrupted or fake PDF: Binary content does not contain a valid PDF signature header (%PDF-).',
    };
  }

  const sanitized = sanitizeFilename(file.originalname);

  return {
    isValid: true,
    sanitizedFilename: sanitized,
  };
}
