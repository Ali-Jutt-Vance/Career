# Phase 2 — Chapter 13: File Upload

> *"File uploads are where security goes to die. Validate everything — MIME type, size, content."*

---

## Chapter Overview

### The Scope of File Upload

File upload seems simple: accept a file, save it. But production file upload involves:
- Parsing multipart/form-data HTTP bodies
- Validating file type, size, content
- Preventing path traversal and filename injection
- Storing files efficiently (local, S3, GCS)
- Generating secure, unguessable filenames
- Serving files efficiently (CDN, signed URLs)
- Handling large files without OOM (streaming)
- Progress tracking for large uploads

---

## Beginner Theory

### Multipart/form-data

Files are uploaded as `multipart/form-data` — the browser encodes each field and file as a separate "part" with boundary markers.

```
POST /upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="title"

My Document
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="report.pdf"
Content-Type: application/pdf

<binary file data here>
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

**Multer** is the standard Express middleware for parsing multipart requests.

---

## Basic Examples

### Basic File Upload with Multer

```javascript
// npm install multer

const express = require("express");
const multer  = require("multer");
const path    = require("path");
const crypto  = require("crypto");
const fs      = require("fs");
const router  = express.Router();

// ─── STORAGE CONFIGURATION ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join("uploads", req.user?.id || "anonymous");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Never use the original filename — can contain path traversal
    // Never use user-supplied filename on disk
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, "");
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

// ─── ALLOWED TYPES ────────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "text/csv", "application/vnd.ms-excel"
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5              // max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
    cb(null, true);
  }
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
// Single file upload
router.post("/upload/avatar", authenticate, upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  // Verify actual file content (MIME type in request is user-supplied and untrustworthy)
  const { fileTypeFromFile } = await import("file-type");
  const detected = await fileTypeFromFile(req.file.path);

  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    fs.unlinkSync(req.file.path);  // Delete the invalid file immediately
    return res.status(400).json({ error: "Invalid file type" });
  }

  // Save file record to database
  const fileRecord = await fileService.create({
    userId:       req.user.id,
    originalName: req.file.originalname,
    storedName:   req.file.filename,
    mimeType:     detected.mime,
    size:         req.file.size,
    path:         req.file.path
  });

  res.status(201).json({
    fileId:  fileRecord.id,
    name:    req.file.filename,
    size:    req.file.size,
    mimeType: detected.mime,
    url:     `/api/files/${fileRecord.id}`
  });
});

// Multiple files
router.post("/upload/documents", authenticate, upload.array("documents", 5), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: "No files uploaded" });

  const saved = await Promise.all(
    req.files.map(file => fileService.create({
      userId: req.user.id,
      ...file
    }))
  );

  res.status(201).json({ files: saved });
});

// Handle Multer errors
function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ error: "Too many files" });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ error: "File type not allowed" });
    }
  }
  next(err);
}

router.use(multerErrorHandler);
```

### Serve Uploaded Files

```javascript
// Secure file serving — verify ownership before serving
router.get("/files/:fileId", authenticate, async (req, res) => {
  const file = await fileService.findById(req.params.fileId);

  if (!file) return res.status(404).json({ error: "File not found" });

  // Authorization: only owner or admin can access
  if (file.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }

  const filePath = path.resolve(file.path);
  // Verify the resolved path is within the uploads directory
  if (!filePath.startsWith(path.resolve("uploads"))) {
    return res.status(400).json({ error: "Invalid file path" });
  }

  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
  res.sendFile(filePath);
});
```

---

## Intermediate Concepts

### Upload to AWS S3

```javascript
// npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer-s3

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multerS3 = require("multer-s3");

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET = process.env.S3_BUCKET;

// ─── UPLOAD DIRECTLY TO S3 ────────────────────────────────────────────────────
const s3Upload = multer({
  storage: multerS3({
    s3,
    bucket: BUCKET,
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName:    file.fieldname,
        originalName: file.originalname,
        uploadedBy:   req.user.id
      });
    },
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      // Organize by user ID and year/month
      const date = new Date();
      const key  = `uploads/${req.user.id}/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}${ext}`;
      cb(null, key);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 }  // 50MB
});

router.post("/upload/s3", authenticate, s3Upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });

  await fileService.create({
    userId:       req.user.id,
    originalName: req.file.originalname,
    s3Key:        req.file.key,
    s3Bucket:     req.file.bucket,
    mimeType:     req.file.mimetype,
    size:         req.file.size,
    location:     req.file.location   // S3 URL
  });

  res.status(201).json({ key: req.file.key, location: req.file.location });
});

// ─── PRESIGNED URL (direct browser → S3 upload) ───────────────────────────────
// More efficient: browser uploads directly to S3, server just issues the URL

router.post("/upload/presigned-url", authenticate, async (req, res) => {
  const { filename, mimeType, size } = req.body;

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return res.status(400).json({ error: "File type not allowed" });
  }
  if (size > 100 * 1024 * 1024) {  // 100MB max
    return res.status(400).json({ error: "File too large" });
  }

  const ext = path.extname(filename).toLowerCase();
  const key = `uploads/${req.user.id}/${crypto.randomUUID()}${ext}`;

  const command = new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    ContentType: mimeType,
    ContentLength: size,
    Metadata: {
      uploadedBy:   req.user.id,
      originalName: filename
    }
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });  // 5 minutes

  // Save pending file record
  const fileRecord = await fileService.createPending({
    userId:       req.user.id,
    originalName: filename,
    s3Key:        key,
    mimeType,
    size
  });

  res.json({ uploadUrl, fileId: fileRecord.id, key });
});

// Confirm upload after browser uploads directly to S3
router.post("/upload/confirm/:fileId", authenticate, async (req, res) => {
  const file = await fileService.findById(req.params.fileId);

  if (!file || file.userId !== req.user.id) {
    return res.status(404).json({ error: "File not found" });
  }

  // Verify the file actually exists in S3
  try {
    await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: file.s3Key }));
  } catch {
    return res.status(400).json({ error: "File not found in storage" });
  }

  await fileService.markReady(file.id);

  // Generate signed download URL (valid for 1 hour)
  const downloadUrl = await getSignedUrl(s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: file.s3Key }),
    { expiresIn: 3600 }
  );

  res.json({ status: "ready", downloadUrl });
});

// ─── GENERATE SIGNED DOWNLOAD URL ────────────────────────────────────────────
router.get("/files/:fileId/download-url", authenticate, async (req, res) => {
  const file = await fileService.findById(req.params.fileId);
  if (!file) return res.status(404).json({ error: "Not found" });
  if (file.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const url = await getSignedUrl(s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: file.s3Key,
      ResponseContentDisposition: `attachment; filename="${file.originalName}"` }),
    { expiresIn: 3600 }
  );

  res.json({ downloadUrl: url, expiresIn: 3600 });
});

// ─── DELETE FILE ──────────────────────────────────────────────────────────────
router.delete("/files/:fileId", authenticate, async (req, res) => {
  const file = await fileService.findById(req.params.fileId);
  if (!file) return res.status(404).json({ error: "Not found" });
  if (file.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Delete from S3
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file.s3Key }));

  // Delete from DB
  await fileService.delete(file.id);

  res.status(204).end();
});
```

### Large File Uploads with Streaming

```javascript
// For very large files (>100MB), use multipart upload in S3
const { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } = require("@aws-sdk/client-s3");

async function uploadLargeFile(filePath, s3Key, mimeType) {
  const PART_SIZE = 10 * 1024 * 1024;  // 10MB parts (minimum is 5MB)

  // 1. Initiate multipart upload
  const { UploadId } = await s3.send(new CreateMultipartUploadCommand({
    Bucket: BUCKET, Key: s3Key, ContentType: mimeType
  }));

  const parts = [];
  const fileSize = fs.statSync(filePath).size;
  const numParts = Math.ceil(fileSize / PART_SIZE);

  // 2. Upload each part
  for (let i = 0; i < numParts; i++) {
    const start  = i * PART_SIZE;
    const end    = Math.min(start + PART_SIZE, fileSize);
    const stream = fs.createReadStream(filePath, { start, end: end - 1 });

    const { ETag } = await s3.send(new UploadPartCommand({
      Bucket: BUCKET, Key: s3Key, UploadId,
      PartNumber: i + 1,
      Body: stream
    }));

    parts.push({ PartNumber: i + 1, ETag });
    console.log(`Uploaded part ${i + 1}/${numParts}`);
  }

  // 3. Complete the multipart upload
  await s3.send(new CompleteMultipartUploadCommand({
    Bucket: BUCKET, Key: s3Key, UploadId,
    MultipartUpload: { Parts: parts }
  }));

  return `s3://${BUCKET}/${s3Key}`;
}
```

### Image Processing

```javascript
// npm install sharp

const sharp = require("sharp");

async function processImage(inputPath, outputDir, options = {}) {
  const {
    width  = 1200,
    height = null,
    quality = 85,
    format  = "webp",
    thumbnailWidth = 200,
    thumbnailHeight = 200
  } = options;

  const basename = path.basename(inputPath, path.extname(inputPath));

  // Full-size optimized
  await sharp(inputPath)
    .resize(width, height, { fit: "inside", withoutEnlargement: true })
    .toFormat(format, { quality })
    .toFile(path.join(outputDir, `${basename}.${format}`));

  // Thumbnail
  await sharp(inputPath)
    .resize(thumbnailWidth, thumbnailHeight, { fit: "cover" })
    .toFormat("webp", { quality: 80 })
    .toFile(path.join(outputDir, `${basename}_thumb.webp`));

  // Get metadata
  const meta = await sharp(inputPath).metadata();
  return { width: meta.width, height: meta.height, format: meta.format };
}

// In upload handler:
router.post("/upload/image", authenticate, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image" });

  const processedDir = path.join("uploads", "processed");
  fs.mkdirSync(processedDir, { recursive: true });

  const meta = await processImage(req.file.path, processedDir);

  // Delete original, serve processed versions
  fs.unlinkSync(req.file.path);

  res.status(201).json({ ...meta, processed: true });
});
```

---

## Security

```javascript
// FILE UPLOAD SECURITY CHECKLIST:

// 1. Validate MIME type (client-supplied header)
// 2. Validate actual file content (magic bytes)
const { fileTypeFromFile } = await import("file-type");
const detected = await fileTypeFromFile(filePath);
if (!ALLOWED_MIME_TYPES.has(detected?.mime)) { ... }

// 3. Never trust original filename
// Rename to UUID on disk
const safeFilename = `${crypto.randomUUID()}${ext}`;

// 4. Store outside web root (or use private S3 bucket)
// Files should NOT be directly accessible via URL without auth check

// 5. Scan for malware before making available
// npm install clamscan
const clamscan = new ClamScan({ clamdscan: { socket: "/tmp/clamd.sock" } });
const { isInfected } = await clamscan.scanFile(filePath);
if (isInfected) {
  fs.unlinkSync(filePath);
  return res.status(400).json({ error: "File rejected: malware detected" });
}

// 6. Limit file size at multiple layers (Multer + Nginx/ALB + network)
// 7. Generate random filename (UUID) — prevent enumeration
// 8. Validate file extension against MIME type
// 9. Set Content-Disposition: attachment when serving (prevent browser execution)
// 10. Use CSP header to prevent script execution if files served from same origin
```

---

## Interview Preparation

**Q1: Why can't you trust the MIME type sent in the upload request?**
A: The `Content-Type` of each file part is sent by the client — an attacker can set `Content-Type: image/jpeg` for a PHP file or malicious script. You must check the actual file content using "magic bytes" — the first few bytes of every file format are distinctive signatures. The `file-type` npm package reads these bytes and identifies the true format. Always validate actual content, not the header claim.

**Q2: What is a presigned URL? What are its advantages?**
A: A presigned URL is a time-limited, cryptographically signed URL that grants temporary permission to perform a specific S3 operation (upload or download) without requiring AWS credentials. Advantages: (1) the browser uploads directly to S3, bypassing your server — no bandwidth/CPU cost for large files; (2) S3 handles all streaming; (3) time-limited — expires after a few minutes; (4) no permanent credentials exposed to clients.

**Q3: How do you prevent path traversal in file uploads?**
A: Path traversal occurs when a malicious filename like `../../etc/passwd` or `../config/.env` causes the server to write outside the intended directory. Prevention: (1) never use the original filename on disk — generate a UUID filename; (2) use `path.basename()` if you need any part of the original name; (3) use `path.resolve()` and verify the resolved path starts with the expected directory prefix.

---

## Self Assessment
1. What is multipart/form-data? How does it differ from JSON?
2. Why should you never use the original filename on disk?
3. What is a magic bytes check? Why is it more reliable than MIME type header?
4. What is a presigned URL? How does it improve performance?
5. What is multer and what does it parse?
6. What is the difference between `upload.single()` and `upload.array()`?
7. How do you limit file size in multer?
8. What HTTP status code should you return for an unsupported file type?
9. Why should uploaded files not be directly served from the web root?
10. What is `Content-Disposition: attachment` and why use it for file downloads?

---

## Cheat Sheet

### Multer Setup
```javascript
const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set(["image/jpeg", "image/png", "application/pdf"]);
    cb(null, allowed.has(file.mimetype));
  }
});
app.post("/upload", upload.single("file"), handler);
```

### S3 Presigned URL Flow
```
1. Client → POST /upload/presigned-url { filename, mimeType, size }
2. Server → return { uploadUrl, fileId }
3. Client → PUT uploadUrl (direct to S3, no server)
4. Client → POST /upload/confirm/:fileId
5. Server → verify in S3, mark ready, return download URL
```
