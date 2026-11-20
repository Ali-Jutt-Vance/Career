# File Uploads

> [!GOALS]
> - Explain how browsers send files (`multipart/form-data`) and how servers parse them.
> - Validate uploads properly: size limits at every layer, type detection from the **content** (magic bytes), and allow-lists.
> - Store files safely: never with the user's filename, never inside the web root, preferably in **object storage** such as S3.
> - Use **presigned URLs** so browsers upload directly to storage, and understand their limits.
> - Handle large files with **streaming** and multipart uploads instead of loading them into memory.
> - Process files (images especially) in the background, and serve them safely.
> - Recognise the security risks unique to user-supplied files: path traversal, disguised scripts, malicious SVGs, decompression bombs and malware.

## Why this matters

Almost every real application accepts files: profile photos, product images, receipts, CVs, CSV imports, videos. File uploads look simple — receive a file, save it — and that is exactly why they cause so many incidents. A file is **attacker-controlled data** of any size, any format and any name, and it often ends up stored on your disk or served back to other users from your domain.

Things that have really happened through upload features:

- A "profile picture" that was actually a PHP script, saved in a web folder, then requested by URL — and executed by the server. The attacker now runs code on the machine.
- A filename like `../../etc/cron.d/job` that made the server write **outside** the uploads folder.
- An SVG "image" containing JavaScript, served from the main domain, that stole other users' sessions when they viewed it.
- A 20 KB compressed image that decompressed to gigabytes of pixels and crashed the image-processing servers.
- A 5 GB upload read entirely into memory, taking the API down for everyone.

This chapter explains how uploads work at the HTTP level, then builds up the practices that make them safe and efficient: limits, content-based validation, safe storage, direct-to-storage uploads, streaming and background processing.

## The simple idea

Imagine a post room in an office building. Anyone can hand in a parcel. A sensible post room:

- **weighs** parcels and refuses ones that are too heavy;
- **checks what is inside**, not just the label — a parcel labelled "books" might contain something else;
- gives each parcel its **own reference number** instead of using whatever name the sender wrote on it;
- keeps parcels in a **locked storeroom**, not in the public lobby;
- hands a parcel only to the **person it belongs to**.

A safe upload feature does the same: limit size, inspect content, rename, store privately, and check permissions when serving.

> [!ANALOGY]
> Handling uploads is like running a post room: weigh every parcel, check what is really inside instead of trusting the label, give it your own reference number, keep it in a locked storeroom, and hand it only to its owner.
>
> **Where the analogy breaks:** a post room can open a parcel and look. A server cannot "look" at a file in the same way — it can check the first bytes, re-encode an image, or scan for known malware, but a cleverly crafted file can still be valid in two formats at once. That is why safe uploads rely on several layers rather than one inspection.

## The proper definition and key words

A **file upload** is an HTTP request in which a client sends file contents to a server, usually as part of a `multipart/form-data` request body or directly to object storage through a pre-authorised URL.

Key words:

- **`multipart/form-data`** — the request encoding browsers use for forms containing files: the body is split into parts, each with its own headers, separated by a **boundary** string.
- **MIME type** (media type) — a label such as `image/png` or `application/pdf`. The type the client **declares** is just a claim.
- **Magic bytes** (file signature) — the fixed bytes at the start of most file formats that identify them (a PNG starts with `89 50 4E 47 0D 0A 1A 0A`).
- **Path traversal** — using `../` sequences in a filename or path to escape the intended directory.
- **Object storage** — a service that stores files as objects identified by keys in a bucket, such as Amazon S3 ({{ch:s3}}), Google Cloud Storage or Cloudflare R2.
- **Presigned URL** — a time-limited URL, signed with the server's credentials, that lets a client perform one specific storage operation (upload or download one object) without having credentials of its own.
- **Streaming** — processing data in chunks as it arrives rather than holding it all in memory.
- **Multipart upload** (in object storage) — uploading a large object in separately uploaded parts, then combining them. (Not the same as `multipart/form-data`.)
- **`Content-Disposition`** — a response header telling the browser whether to display a file (`inline`) or download it (`attachment`), and under which filename.

## How it works inside

### Level 1 — What the browser sends

A form with a file field must use `enctype="multipart/form-data"`:

```html
<form action="/api/receipts" method="post" enctype="multipart/form-data">
  <input name="note" value="Lunch with supplier">
  <input type="file" name="receipt" accept="image/jpeg,image/png,application/pdf">
  <button>Upload</button>
</form>
```

The browser sends something like this:

```text
POST /api/receipts HTTP/1.1
Content-Type: multipart/form-data; boundary=----Boundary7MA4YWxk
Content-Length: 184213

------Boundary7MA4YWxk
Content-Disposition: form-data; name="note"

Lunch with supplier
------Boundary7MA4YWxk
Content-Disposition: form-data; name="receipt"; filename="receipt.jpg"
Content-Type: image/jpeg

<binary bytes of the image>
------Boundary7MA4YWxk--
```

Each part has headers: the field `name`, and for files, the `filename` and a `Content-Type`. **Every one of these values comes from the client** — the filename, the declared type, even the declared length. A script can send any of them with any content.

The `accept` attribute on the file input only filters the browser's file picker for convenience. It is not a security control.

In JavaScript, the same request is made with `FormData`:

```ts
// fragment
const form = new FormData();
form.append("note", "Lunch with supplier");
form.append("receipt", fileInput.files![0]);
await fetch("/api/receipts", { method: "POST", body: form });  // the browser sets the multipart Content-Type and boundary
```

Do **not** set the `Content-Type` header yourself here: the browser must add the boundary.

### Level 2 — Parsing uploads on the server

Express does not parse multipart bodies itself. The common choices in Node.js:

- **Multer** — Express middleware (version 2 at the time of writing) that parses multipart requests and stores files in memory or on disk.
- **Busboy** — the lower-level streaming parser Multer is built on, for full control.
- Framework helpers — `request.formData()` in Next.js route handlers and other Web-standard runtimes; NestJS wraps Multer ({{ch:nestjs-basics}}).

A Multer configuration with limits:

```ts
// fragment
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),        // fine for small files that go straight to object storage
  limits: {
    fileSize: 5 * 1024 * 1024,            // 5 MB per file
    files: 1,                             // one file per request
    fields: 10,                           // at most 10 non-file fields
    fieldSize: 10 * 1024,                 // 10 KB per text field
  },
});

app.post("/api/receipts", requireUser, upload.single("receipt"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  // req.file.buffer, req.file.size, req.file.originalname, req.file.mimetype (client-declared!)
  const saved = await receiptService.store(req.user.id, req.file);  // validates, renames, stores — below
  res.status(201).json(saved);
});
```

Every limit matters. Without `fileSize`, a client can send gigabytes; without `files` and `fields`, a client can send thousands of tiny parts to exhaust the parser. Memory storage is acceptable only **with** a small `fileSize` limit; for larger files, stream to disk or straight to object storage.

When a limit is exceeded, Multer raises a `MulterError` with a code such as `LIMIT_FILE_SIZE`; map it to a `413 Content Too Large` or `400` response in the error handler ({{ch:error-handling}}).

### Level 2 — Limits at every layer

The application limit is not the first line of defence. Set size limits:

- at the **reverse proxy or load balancer** (for example, `client_max_body_size 10m;` in Nginx, {{ch:nginx-reverse-proxy}}), so huge bodies never reach Node;
- in the **upload parser** (Multer's `fileSize`);
- in **presigned upload policies** for direct uploads (below);
- per **user** — total storage quotas and upload rate limits ({{ch:rate-limiting}}).

### Level 3 — Never trust the declared type: check the content

The `Content-Type` of a part and the filename's extension are both chosen by the client. An attacker can upload `invoice.jpg` with `Content-Type: image/jpeg` whose bytes are a PHP script. To know what a file really is, read its first bytes and compare them with known **signatures**:

```ts
type Detected = { mime: string; ext: string } | undefined;

const SIGNATURES: { mime: string; ext: string; bytes: (number | null)[] }[] = [
  { mime: "image/png", ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/jpeg", ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/gif", ext: "gif", bytes: [0x47, 0x49, 0x46, 0x38] },                 // "GIF8"
  { mime: "application/pdf", ext: "pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },     // "%PDF-"
  { mime: "image/webp", ext: "webp", bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50] }, // "RIFF....WEBP"
];

function detectType(head: Uint8Array): Detected {
  for (const sig of SIGNATURES) {
    const matches = sig.bytes.every((b, i) => b === null || head[i] === b);
    if (matches && head.length >= sig.bytes.length) return { mime: sig.mime, ext: sig.ext };
  }
  return undefined;
}

const samples: Record<string, Uint8Array> = {
  "photo.png": Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]),
  "scan.pdf": new TextEncoder().encode("%PDF-1.7\n..."),
  "cat.webp": new TextEncoder().encode("RIFF\u0010\u0000\u0000\u0000WEBPVP8 "),
  "invoice.jpg": new TextEncoder().encode("<?php system($_GET['c']); ?>"),
};

for (const [name, bytes] of Object.entries(samples)) {
  const found = detectType(bytes);
  console.log(name.padEnd(12), "→", found ? found.mime : "unknown type: reject");
}
```

**Output:**

```text
photo.png    → image/png
scan.pdf     → application/pdf
cat.webp     → image/webp
invoice.jpg  → unknown type: reject
```

- Each signature lists the bytes a format starts with; `null` means "any byte here" (WebP has the file size in bytes 4–7).
- The "invoice.jpg" is text starting with `<?php` — no image signature matches, so it is rejected whatever its name and declared type say.
- In real code, use a maintained library such as **`file-type`**, which knows hundreds of formats and their edge cases. The example shows what it does underneath.

The rule is an **allow-list**: decide the few types each feature accepts (receipts: JPEG, PNG, PDF), detect the real type, and reject everything else. Then also check that the extension matches the detected type, and use **your own** extension when storing.

Magic bytes are necessary but not sufficient. Some files are valid in two formats at once ("polyglots"), and text formats such as CSV and SVG have no reliable signature. That is why the later layers — re-encoding images, serving with safe headers, storing outside the web root — still matter.

### Level 3 — Never use the user's filename on disk

A filename is a string from the attacker. Used as a path, it can escape your folder:

```ts
import path from "node:path";

const UPLOAD_ROOT = "/srv/uploads";

function naiveTarget(originalName: string): string {
  return path.posix.join(UPLOAD_ROOT, originalName);       // DON'T: trusts the user's filename
}

function isInside(root: string, target: string): boolean {
  const relative = path.posix.relative(root, path.posix.resolve(root, target));
  return relative !== "" && !relative.startsWith("..") && !path.posix.isAbsolute(relative);
}

function safeTarget(userId: string, id: string, ext: string): string {
  return path.posix.join(UPLOAD_ROOT, userId, `${id}.${ext}`); // our own name, our own extension
}

for (const name of ["report.pdf", "../../etc/cron.d/backdoor", "../uploads-old/x.png"]) {
  const target = naiveTarget(name);
  console.log(JSON.stringify(name), "→", target, isInside(UPLOAD_ROOT, target) ? "(inside)" : "(ESCAPES the folder)");
}

console.log(safeTarget("usr_41", "3f2b9c1e-6a7d-4e1f-9b0c-2d5e8a7f1c34", "pdf"));
```

**Output:**

```text
"report.pdf" → /srv/uploads/report.pdf (inside)
"../../etc/cron.d/backdoor" → /etc/cron.d/backdoor (ESCAPES the folder)
"../uploads-old/x.png" → /srv/uploads-old/x.png (ESCAPES the folder)
/srv/uploads/usr_41/3f2b9c1e-6a7d-4e1f-9b0c-2d5e8a7f1c34.pdf
```

- `path.join` happily resolves `../` sequences, so a crafted name points anywhere the process can write.
- The third case shows why a simple "starts with `/srv/uploads`" string check is dangerous: `/srv/uploads-old` starts with the same characters. Comparing with `path.relative` handles it correctly.
- The safe approach avoids the problem entirely: the stored name is a **random identifier** (a UUID from `crypto.randomUUID()`) plus an extension **you** chose from the detected type. The example uses `path.posix` so the output is the same on every operating system.

Keep the original filename only as **data** in your database (for showing to the user and for the download name), never as a path. Random names also stop people guessing other users' file URLs.

### Level 3 — Where to store files

| Option | When it fits | Watch out for |
|---|---|---|
| **Local disk** | Prototypes, single-server tools | Lost when the server is replaced; does not work with several servers ({{ch:scalability}}); backups are your job |
| **Object storage** (S3, GCS, R2, Azure Blob) | Almost all production applications | Bucket must be **private**; costs for storage and data transfer |
| **Database** (as binary columns) | Tiny files tied tightly to a row | Bloats the database and its backups; slow to serve |

**Object storage is the default.** Store the file under a key such as `receipts/usr_41/3f2b9c1e….pdf` in a **private** bucket, and keep a database row with the metadata:

```text
  files
  ┌─────────┬─────────┬───────────────────────────────┬─────────────┬────────────┬────────┬────────┐
  │ id      │ owner   │ storage_key                   │ original    │ mime       │ bytes  │ status │
  ├─────────┼─────────┼───────────────────────────────┼─────────────┼────────────┼────────┼────────┤
  │ fil_901 │ usr_41  │ receipts/usr_41/3f2b9c1e….pdf │ Receipt.pdf │ application│ 184213 │ ready  │
  │         │         │                               │             │ /pdf       │        │        │
  └─────────┴─────────┴───────────────────────────────┴─────────────┴────────────┴────────┴────────┘
```

The `status` column (`pending`, `scanning`, `ready`, `rejected`) lets the application track a file through validation and processing.

Whatever you choose, uploaded files must **never** be stored in a folder your web server executes or serves directly. A file in a public web folder can be requested by URL — and, on servers configured to run scripts (PHP, CGI), executed.

### Level 4 — Direct uploads with presigned URLs

Sending a 200 MB video through your API server wastes its bandwidth, memory and time. Instead, let the browser upload **directly to object storage**, using a **presigned URL** your server creates:

```text
  browser                         your API                          object storage (S3)
     │ 1. POST /uploads {name, type, size}  │                                  │
     │─────────────────────────────────────▶│ checks user, type, size, quota  │
     │                                      │ creates pending row + key       │
     │ ◀── { uploadUrl, fileId } (expires in minutes)                         │
     │ 2. PUT uploadUrl (file bytes) ───────────────────────────────────────▶ │
     │ 3. POST /uploads/fil_902/complete ──▶│ checks the object exists,       │
     │                                      │ size and real type; queues      │
     │                                      │ scanning/processing             │
     │ ◀── { status: "processing" }         │                                  │
```

```ts
// fragment
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const s3 = new S3Client({});                               // credentials from the environment's IAM role ({{ch:iam}})
const ALLOWED = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["video/mp4", "mp4"]]);

app.post("/api/uploads", requireUser, async (req, res) => {
  const { name, type, size } = uploadRequestSchema.parse(req.body);   // validation ({{ch:validation}})
  const ext = ALLOWED.get(type);
  if (!ext) return res.status(415).json({ error: "File type not allowed" });
  if (size > 500 * 1024 * 1024) return res.status(413).json({ error: "File too large" });

  const key = `videos/${req.user.id}/${randomUUID()}.${ext}`;
  const file = await files.createPending({ ownerId: req.user.id, key, originalName: name, mime: type, bytes: size });

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: process.env.UPLOAD_BUCKET, Key: key, ContentType: type, ContentLength: size }),
    { expiresIn: 300 },                                    // 5 minutes
  );
  res.json({ fileId: file.id, uploadUrl });
});
```

- The URL authorises **one** operation on **one** key for a **short** time. The browser never receives storage credentials.
- The server chooses the key and the extension; the client chooses nothing about where the file goes.
- Signing `ContentType` and `ContentLength` means the upload must use exactly those values. For an enforced **maximum** size with a variable length, S3 also supports **presigned POST** policies with a `content-length-range` condition.
- **The client's claims are still claims.** The "complete" step (or a storage event notification triggering a worker, {{ch:sns-sqs}}) must check the object really exists, its real size, and its real type from its first bytes, before marking it `ready`. Objects never confirmed should be deleted automatically — a **lifecycle rule** on a `pending/` prefix does this.
- The bucket needs a **CORS** configuration allowing `PUT` from your site's origin, or the browser will block the request ({{ch:browser-and-dom}}).

### Level 4 — Streaming large files

Reading a whole file into memory (`memoryStorage`, `await req.arrayBuffer()`) is fine for a 2 MB photo and fatal for many simultaneous 2 GB uploads. Streams process data chunk by chunk ({{ch:nodejs}}). This example enforces a size limit **while** the data flows, stopping as soon as the limit is crossed:

```ts
import { Readable, Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";

function limitSize(maxBytes: number): Transform {
  let seen = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      seen += chunk.length;
      if (seen > maxBytes) callback(new Error(`file is larger than ${maxBytes} bytes`));
      else callback(null, chunk);
    },
  });
}

function countingSink(label: string): Writable {
  let total = 0;
  return new Writable({
    write(chunk: Buffer, _encoding, callback) {
      total += chunk.length;
      callback();
    },
    final(callback) {
      console.log(`${label}: stored ${total} bytes`);
      callback();
    },
  });
}

async function upload(label: string, chunks: number, chunkSize: number) {
  const source = Readable.from(Array.from({ length: chunks }, () => Buffer.alloc(chunkSize)));
  try {
    await pipeline(source, limitSize(10_000), countingSink(label));
  } catch (err) {
    console.log(`${label}: rejected (${(err as Error).message})`);
  }
}

await upload("small.png", 3, 2_000);
await upload("huge.png", 50, 2_000);
```

**Output:**

```text
small.png: stored 6000 bytes
huge.png: rejected (file is larger than 10000 bytes)
```

- `pipeline` connects the source (in real code, the incoming file stream from Busboy), the limiter, and the destination (a file or an object-storage upload stream). Memory use stays at roughly one chunk, whatever the file size.
- When the limiter fails, `pipeline` destroys every stream in the chain and rejects — so the huge upload stops early, and the `final` message is never printed for it. In real code, also delete the partly written file or abort the storage upload.

For very large objects, object storage offers **multipart uploads**: the file is split into parts (in S3, at least 5 MB each except the last) uploaded separately — in parallel, with retries per part — then combined. The AWS SDK's `Upload` helper (`@aws-sdk/lib-storage`) does this for a stream automatically. Browsers can do the same with presigned URLs per part, which lets users **resume** an interrupted upload; libraries such as Uppy, or the **tus** resumable-upload protocol, package this.

### Level 4 — Processing files in the background

Uploads often need work afterwards: resizing images, generating thumbnails, extracting text from PDFs, transcoding video, scanning for malware, importing CSV rows. Do it **after** responding, in a background worker ({{ch:queues}}):

1. The upload is stored with status `pending` (or `processing`).
2. A job is queued with the file id.
3. A worker downloads the file, validates and processes it, stores the results, and sets the status to `ready` or `rejected`.
4. The client polls, receives a WebSocket message ({{ch:websockets}}), or simply sees the result on the next page load.

For images, the worker should **re-encode** them — decode the pixels and write a fresh file — with a library such as **sharp**:

```ts
// fragment
import sharp from "sharp";

const original = await storage.download(file.key);
const image = sharp(original, { limitInputPixels: 40_000_000 });   // refuse "decompression bombs"
const meta = await image.metadata();
if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) throw new RejectedUpload("not an image");

const large = await image.clone().rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
const thumb = await image.clone().rotate().resize({ width: 320, height: 320, fit: "cover" }).webp({ quality: 75 }).toBuffer();
await storage.upload(`${file.key}.1600.webp`, large, "image/webp");
await storage.upload(`${file.key}.320.webp`, thumb, "image/webp");
```

Re-encoding does several jobs at once:

- It **proves** the file is a decodable image, not just something with the right first bytes.
- It **discards** anything hidden after or inside the image data (a polyglot's script part, for example).
- It **strips metadata** — sharp removes EXIF data by default — including GPS coordinates that would reveal where a customer's photo was taken. `rotate()` with no arguments first applies the EXIF orientation, so photos are not shown sideways once the metadata is gone.
- It produces **right-sized, modern formats** for faster pages ({{ch:frontend-performance}}).

`limitInputPixels` protects against **decompression bombs**: tiny files declaring enormous dimensions that would need gigabytes of memory to decode. Archive files (ZIP) have the same risk — check the total uncompressed size and file count before extracting, and reject paths with `../` inside the archive (the "zip slip" vulnerability).

**Malware scanning** matters when files are shared with other people — documents uploaded by one customer and downloaded by staff, for example. Common options are a ClamAV service in your infrastructure, or a cloud provider's scanning feature for object storage. Keep files unavailable (`scanning`) until the scan passes.

### Level 4 — Serving files safely

Serving user files is as risky as receiving them. If an uploaded HTML or SVG file is served from **your main domain** and the browser renders it, any script inside runs with access to your site — including your users' sessions. Defences, in order of strength:

1. **Private storage plus authorisation.** Check that the user may access the file (owner, admin, shared with them), then return the bytes or a **short-lived presigned download URL** ({{ch:authentication}}). Unguessable keys are not permission checks.
2. **A separate domain for user content** — for example, `cornershop-usercontent.example` or the storage provider's own domain, often behind a CDN ({{ch:cloudfront}}). Scripts in a file there cannot read cookies or pages of your main site. Large services all do this.
3. **Safe headers**:
   - `Content-Type` set from the type **you detected**, never echoed from the upload;
   - `X-Content-Type-Options: nosniff`, so browsers do not guess a different type;
   - `Content-Disposition: attachment` for anything that should be downloaded rather than displayed (documents, unknown types);
   - a restrictive `Content-Security-Policy` (for example, `default-src 'none'`) on user-content responses.
4. **Do not accept risky formats** unless needed. Accepting SVG means accepting a script-capable format; if you need vector logos, sanitise them with a dedicated library, or convert them to PNG.

The download filename also needs care, because it goes inside a header: quotes and line breaks in a user's filename can break or inject headers. Exercise 2 builds a safe `Content-Disposition` value.

## From beginner to enterprise

**Level 1–2 — first upload.** A form with `multipart/form-data`, Multer with size and count limits, files in a private folder outside the web root, UUID names.

**Level 3 — safe validation.** Allow-lists per feature, type detection from content, extension checks, original filename stored only as data, authorisation on every download.

**Level 4 — production applications.** Private object storage; presigned uploads and downloads; a `pending → ready` lifecycle with confirmation; streaming; background processing with image re-encoding and metadata stripping; separate user-content domain; quotas.

**Level 5 — professional practice.** Malware scanning, resumable multipart uploads for large media, storage event notifications driving workers, lifecycle rules for abandoned and old files, CDN delivery with signed URLs or cookies, metrics on upload failures and processing time.

**Level 6 — enterprises.** Data residency (files stored in specific regions), encryption with customer-managed keys, retention and legal-hold policies, data-loss-prevention scanning for sensitive content, content moderation pipelines for user-generated images and video, deletion workflows that satisfy privacy laws (removing a person's files from storage, CDN caches and backups).

## Real-world use cases

### Expense receipts

- **Design**: authenticated users upload JPEG, PNG or PDF up to 10 MB; presigned upload to a private bucket; a worker checks magic bytes, re-encodes images, extracts text from PDFs for search, and marks the receipt `ready`; downloads go through a permission check and a 5-minute presigned URL with `Content-Disposition: attachment`.
- **Why**: receipts are personal financial data — private storage and authorisation are essential; re-encoding removes location metadata from phone photos.

### Product images for a shop

- **Design**: staff upload images; a worker produces several sizes in WebP and AVIF; the resized versions are **public** (served from a CDN on a separate domain) while originals stay private.
- **Why**: product images are meant to be public, so the right trade-off is fast public delivery of **processed** files, never of raw uploads.

### Video course uploads

- **Design**: resumable multipart uploads directly to storage; a storage event starts a transcoding job (often a managed media service) producing streaming formats; progress shown to the instructor; the original kept in cheaper storage classes ({{ch:cost-optimization}}).

## Common mistakes

### Beginner: trusting the declared `Content-Type` or extension

**Fix:** detect the type from the content; allow-list; use your own extension.

### Beginner: saving files with the original filename

**Consequence:** path traversal, overwritten files, guessable URLs. **Fix:** random names; original name stored as data only.

### Beginner: storing uploads in a public web folder

**Consequence:** direct access without permission checks; possible execution. **Fix:** private storage; serve through authorisation or presigned URLs.

### Intermediate: no size limits, or only in the application

**Fix:** limits at the proxy, the parser, presigned policies and per-user quotas.

### Intermediate: loading large files into memory

**Fix:** streaming; direct-to-storage uploads; multipart uploads for very large objects.

### Intermediate: serving user files from the main domain without safe headers

**Consequence:** stored cross-site scripting through HTML and SVG uploads. **Fix:** separate user-content domain, detected `Content-Type`, `nosniff`, `attachment`, restrictive CSP.

### Production: trusting the client's "upload complete" call

**Fix:** verify the object's existence, size and type on the server or in a worker; expire unconfirmed uploads.

### Production: processing in the request

**Consequence:** slow responses, timeouts, servers overwhelmed by large files. **Fix:** queue background jobs; set pixel and size limits in processors.

## Debugging and troubleshooting

- **`req.file` is undefined**: the form lacks `enctype="multipart/form-data"`, the field name differs from `upload.single("...")`, or the client set `Content-Type` manually without a boundary.
- **`413` errors before reaching the application**: the reverse proxy or platform has a lower body-size limit than the application (Nginx's default `client_max_body_size` is only 1 MB).
- **Presigned upload fails with `403 SignatureDoesNotMatch`**: the request's `Content-Type` or other signed headers differ from what was signed, the URL expired, or the clock is wrong.
- **Browser reports a CORS error on direct upload**: the bucket's CORS rules do not allow your origin, the `PUT` method, or the headers you send.
- **Images appear rotated after processing**: EXIF orientation was stripped without being applied — call `rotate()` before resizing.
- **Memory spikes during uploads**: memory storage or buffering whole files; check with process metrics ({{ch:monitoring}}) and switch to streaming.

## Security summary

- **Limit** size and count at the proxy, the parser, presigned policies and per user.
- **Detect** the real type from the content; **allow-list** formats per feature; check the extension matches.
- **Rename** every file with a random identifier and your own extension; never use user input as a path.
- **Store privately** — object storage or a folder outside the web root — and never where scripts can execute.
- **Authorise** every download; use short-lived presigned URLs; unguessable names are not access control.
- **Serve safely**: separate user-content domain, detected `Content-Type`, `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment` where appropriate, restrictive CSP; avoid or sanitise SVG and HTML.
- **Re-encode images**, strip metadata, and set pixel limits; guard against decompression bombs and zip slip.
- **Scan** shared files for malware before making them available.
- **Verify** direct uploads on the server before marking them ready; expire abandoned uploads.

## How a senior engineer thinks about this

- **A file is untrusted input with a size, a name, a type and content — validate all four.** None of the client's claims is accepted as fact.
- **Defence in depth.** Magic bytes can be fooled, so they also re-encode, isolate the serving domain and set safe headers. Each layer covers the gaps of the others.
- **Keep bytes away from the API servers.** Presigned uploads and downloads, streaming and background workers keep the request path fast and the servers stable.
- **Model the lifecycle.** Pending, scanning, ready, rejected, deleted — with automatic clean-up and clear ownership.
- **Think about privacy and cost.** Location metadata, retention, deletion requests, and storage and transfer costs are part of the design, not afterthoughts.

## Exercises

### Exercise 1 — An upload validator

**Objective:** combine the validation rules.
**What to build:** a function `checkUpload(upload)` for a receipts feature that accepts JPEG (up to 5 MB, extensions `.jpg` or `.jpeg`), PNG (up to 5 MB, `.png`) and PDF (up to 20 MB, `.pdf`). The upload includes the original name, the declared type, the type detected from the content (or `undefined`) and the size. Return either acceptance with the extension to store under, or a rejection reason. Test it with a normal JPEG with an upper-case extension, an oversized PDF, a PNG name with JPEG content, an unrecognised file and an MP4.

<details>
<summary>Show the solution</summary>

```ts
const ALLOWED = new Map<string, { exts: string[]; store: string; maxBytes: number }>([
  ["image/jpeg", { exts: ["jpg", "jpeg"], store: "jpg", maxBytes: 5_000_000 }],
  ["image/png", { exts: ["png"], store: "png", maxBytes: 5_000_000 }],
  ["application/pdf", { exts: ["pdf"], store: "pdf", maxBytes: 20_000_000 }],
]);

type Upload = { originalName: string; declaredType: string; detectedType: string | undefined; size: number };
type Verdict = { ok: true; storeAs: string } | { ok: false; reason: string };

function checkUpload(u: Upload): Verdict {
  if (!u.detectedType) return { ok: false, reason: "unrecognised content" };
  const rule = ALLOWED.get(u.detectedType);
  if (!rule) return { ok: false, reason: `type ${u.detectedType} not allowed` };
  if (u.size > rule.maxBytes) return { ok: false, reason: `too large (max ${rule.maxBytes} bytes)` };
  const ext = u.originalName.includes(".") ? u.originalName.split(".").pop()!.toLowerCase() : "";
  if (!rule.exts.includes(ext)) return { ok: false, reason: `extension .${ext} does not match ${u.detectedType}` };
  if (u.declaredType !== u.detectedType) return { ok: false, reason: "declared type does not match content" };
  return { ok: true, storeAs: rule.store };
}

const uploads: Upload[] = [
  { originalName: "Receipt.JPG", declaredType: "image/jpeg", detectedType: "image/jpeg", size: 812_000 },
  { originalName: "cv.pdf", declaredType: "application/pdf", detectedType: "application/pdf", size: 31_000_000 },
  { originalName: "logo.png", declaredType: "image/png", detectedType: "image/jpeg", size: 40_000 },
  { originalName: "shell.php.png", declaredType: "image/png", detectedType: undefined, size: 900 },
  { originalName: "movie.mp4", declaredType: "video/mp4", detectedType: "video/mp4", size: 9_000_000 },
];

for (const u of uploads) {
  const v = checkUpload(u);
  console.log(u.originalName.padEnd(14), v.ok ? `accept, store as .${v.storeAs}` : `reject: ${v.reason}`);
}
```

**Output:**

```text
Receipt.JPG    accept, store as .jpg
cv.pdf         reject: too large (max 20000000 bytes)
logo.png       reject: extension .png does not match image/jpeg
shell.php.png  reject: unrecognised content
movie.mp4      reject: type video/mp4 not allowed
```

**Walkthrough:** the **detected** type drives every decision; the declared type and extension are only checked for consistency. The stored extension comes from the rule's `store` value (`.jpg`), not from the user (`.JPG`). Whether to reject or simply correct a mismatched extension (the `logo.png` case) is a product decision — rejecting is the cautious default.

</details>

### Exercise 2 — A safe download header

**Objective:** practise treating filenames as untrusted data in headers.
**What to build:** `contentDisposition(originalName)` returning an `attachment` header value with an ASCII-only `filename="..."` fallback (no quotes, backslashes or line breaks) and a `filename*=UTF-8''...` parameter carrying the exact name percent-encoded (RFC 6266 and RFC 5987). Test with a plain name, a name with an umlaut and quotes, and a name trying to inject a header.

<details>
<summary>Show the solution</summary>

```ts
function contentDisposition(originalName: string): string {
  const fallback = originalName
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")       // ASCII only
    .replace(/["\\\r\n]/g, "_")          // no quotes, backslashes or line breaks
    .trim() || "download";
  const encoded = encodeURIComponent(originalName).replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

console.log(contentDisposition("report.pdf"));
console.log(contentDisposition('Rechnung März "final".pdf'));
console.log(contentDisposition('evil.html"\r\nSet-Cookie: a=b'));
```

**Output:**

```text
attachment; filename="report.pdf"; filename*=UTF-8''report.pdf
attachment; filename="Rechnung Marz _final_.pdf"; filename*=UTF-8''Rechnung%20M%C3%A4rz%20%22final%22.pdf
attachment; filename="evil.html_Set-Cookie: a=b"; filename*=UTF-8''evil.html%22%0D%0ASet-Cookie%3A%20a%3Db
```

**Walkthrough:** `normalize("NFKD")` splits "ä" into "a" plus a combining mark, which the ASCII filter then removes — giving a readable fallback. The line breaks of the injection attempt are removed (they are outside the printable ASCII range) and the quote becomes `_`, so the attacker cannot end the header and start a new `Set-Cookie` one. Modern browsers use the `filename*` version, which restores the exact original name safely. (Express's `res.attachment()` and `res.download()` build this header for you; the point is knowing why it must be built carefully.)

</details>

### Exercise 3 — Review an upload feature

**Objective:** practise spotting upload vulnerabilities.
**The scenario:** an avatar feature uses Multer's disk storage with `filename: (req, file, cb) => cb(null, file.originalname)` and `destination: "public/avatars"`, has no limits, checks `file.mimetype.startsWith("image/")`, and the page shows `<img src="/avatars/{originalname}">`. List the problems and a better design.

<details>
<summary>Show the solution</summary>

**Problems**
1. **Original filename on disk** — path traversal (`../../server.js`), overwriting other users' avatars, guessable URLs.
2. **Public web folder** — anything uploaded is served directly; with script execution enabled anywhere, it could run.
3. **No limits** — huge files or thousands of parts can exhaust disk and memory.
4. **Declared type check only** — `file.mimetype` comes from the client; an HTML or SVG file with `Content-Type: image/png` passes. Even real `image/svg+xml` passes and can contain scripts, served from the main domain.
5. **No re-encoding** — EXIF location data is published with every avatar; malformed images reach every browser.
6. **Local disk** — does not work across several servers and is lost when servers are replaced.

**Better design**
- Limits (2 MB, one file) at the proxy and parser; JPEG, PNG and WebP only, detected from content.
- Presigned upload to a private bucket under `avatars/{userId}/{uuid}`; a worker re-encodes to WebP at fixed sizes (stripping metadata, with pixel limits).
- Processed avatars published to a public CDN path on a **separate domain**, with correct `Content-Type` and `nosniff`; originals stay private; the user's row points to the processed key.

</details>

### Exercise 4 — Production scenario: a CSV import

**Objective:** design an upload-plus-processing pipeline.
**The scenario:** shop owners will upload product catalogues as CSV files of up to 200 MB (around a million rows) to update prices and stock. Describe the design from upload to completion.

<details>
<summary>Show the solution</summary>

1. **Upload**: the client asks for a presigned upload (`text/csv`, size ≤ 200 MB); the server creates an `imports` row (`pending`) and returns the URL; the browser uploads directly to a private bucket (multipart for large files).
2. **Confirm**: the client calls "complete"; the server checks the object exists and its size, then queues an import job ({{ch:queues}}).
3. **Process by streaming**: the worker streams the object through a CSV parser — never loading it fully — validating each row with a schema ({{ch:validation}}) and writing in batches of, say, 1,000 rows inside transactions ({{ch:transactions}}).
4. **Errors**: invalid rows are collected (row number, column, message) into an error report file instead of failing the whole import; a threshold (for example, more than 5% invalid) aborts with a clear message.
5. **Safety**: limits on columns, row length and total rows; values starting with `=`, `+`, `-` or `@` escaped when error reports are opened in spreadsheets (CSV formula injection); the import only touches the uploading shop's products.
6. **Progress and idempotency**: the job records progress for the UI; it can resume after a crash by recording the last processed row; re-running the same file does not double-apply changes.
7. **Completion**: status `completed` with counts (updated, skipped, failed), a link to the error report, and an email notification ({{ch:email}}); the uploaded file is deleted after a retention period by a lifecycle rule.

</details>

## Summary

Browsers upload files as **`multipart/form-data`**: parts separated by a boundary, each with a field name and, for files, a filename and declared type — **all controlled by the client**. Servers parse them with libraries such as Multer or Busboy, with **limits** on file size, file count and fields, backed by limits at the proxy and per-user quotas.

Validation detects the **real type from the content** (magic bytes, via a library such as `file-type`), applies an **allow-list** per feature, and checks the extension for consistency. Files are stored under **random names with your own extensions**, never at paths built from user input, in **private object storage** rather than local disk or the web root, with a database row tracking metadata and status.

**Presigned URLs** let browsers upload and download directly to object storage for a few minutes, keeping bytes off the API servers — but the server must still confirm the object's size and type before trusting it. Large files are handled by **streaming** and **multipart uploads**, and processing happens in **background workers**: images are **re-encoded** (proving they are images, removing hidden content and location metadata) with pixel limits against decompression bombs, and shared files are scanned for malware.

Files are served only after **authorisation**, ideally from a **separate user-content domain**, with the detected `Content-Type`, `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment` where appropriate and a restrictive CSP — and risky formats such as SVG and HTML are refused or sanitised.

## Key terms

- **File upload** — Sending file contents from a client to a server or to storage over HTTP.
- **multipart/form-data** — The request encoding that splits a body into parts separated by a boundary, used for forms with files.
- **Boundary** — The unique string separating the parts of a multipart request body.
- **MIME type** — A label describing a file's format, such as `image/png`; when declared by a client, only a claim.
- **Magic bytes** — The signature bytes at the start of a file that identify its real format.
- **Allow-list** — A list of the only values accepted, with everything else rejected.
- **Multer** — An Express middleware for parsing multipart uploads.
- **Path traversal** — Using sequences such as `../` to access files outside an intended directory.
- **Object storage** — A storage service that keeps files as objects identified by keys in buckets.
- **Presigned URL** — A time-limited signed URL granting one specific storage operation without credentials.
- **Presigned POST** — A browser upload form policy for object storage that can enforce conditions such as a size range.
- **Multipart upload (storage)** — Uploading a large object in separate parts that storage combines.
- **Resumable upload** — An upload that can continue from where it stopped after an interruption.
- **Streaming** — Processing data chunk by chunk as it arrives instead of holding it all in memory.
- **Re-encoding** — Decoding a file's content and writing a fresh file, removing anything unexpected.
- **EXIF metadata** — Information stored inside photos, including camera details and sometimes GPS location.
- **Decompression bomb** — A small file that expands to an enormous size when decoded or extracted.
- **Zip slip** — A vulnerability where archive entries with `../` paths are extracted outside the target folder.
- **Polyglot file** — A file that is valid in more than one format at the same time.
- **Content-Disposition** — The response header that tells a browser to display or download a file and under what name.
- **X-Content-Type-Options: nosniff** — A header telling browsers not to guess a different content type.
- **User-content domain** — A separate domain for serving user-uploaded files, isolating them from the main site.
- **Lifecycle rule** — An object-storage rule that automatically deletes or moves objects after a period.

## What comes next

Uploads often trigger messages — "your import finished", "your receipt was approved". The next chapter, {{ch:email}}, covers sending email from applications: transactional versus marketing email, providers and their APIs, templates, deliverability with SPF, DKIM and DMARC, bounces and complaints, and sending reliably through background jobs.
