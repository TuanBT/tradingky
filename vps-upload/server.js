const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Load .env file (no external dependency needed)
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "https://tradingky.vercel.app,http://localhost:3000").split(",");
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("ERROR: API_KEY environment variable is required.");
  process.exit(1);
}

// Ensure upload directory exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Auth middleware — validate API key
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Multer config
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(UPLOAD_DIR, req.params.uid || "anonymous");
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    const safeName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error("Chỉ hỗ trợ file ảnh (JPG, PNG, WebP, GIF)."));
    }
    cb(null, true);
  },
});

// Upload endpoint
app.post("/upload/:uid", authMiddleware, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File quá lớn (tối đa 5MB)." });
      }
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Không có file." });
    }
    const url = `${req.protocol}://${req.get("host")}/files/${req.params.uid}/${req.file.filename}`;
    res.json({ url });
  });
});

// Delete a single file: DELETE /files/:uid/:filename
app.delete("/files/:uid/:filename", authMiddleware, (req, res) => {
  const uid = req.params.uid;
  const filename = req.params.filename;
  // Validate: no path traversal
  if (!uid || !filename || uid.includes("..") || filename.includes("..") || filename.includes("/")) {
    return res.status(400).json({ error: "Invalid path." });
  }
  const filePath = path.resolve(path.join(UPLOAD_DIR, uid, filename));
  // Ensure resolved path is within UPLOAD_DIR
  if (!filePath.startsWith(path.resolve(UPLOAD_DIR))) {
    return res.status(400).json({ error: "Invalid path." });
  }
  if (!fs.existsSync(filePath)) {
    // Already gone — treat as success
    return res.json({ ok: true });
  }
  try {
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Could not delete file." });
  }
});

// Serve uploaded files (public read)
app.use("/files", express.static(UPLOAD_DIR, {
  maxAge: "365d",
  immutable: true,
}));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Upload server running on port ${PORT}`);
  console.log(`Upload dir: ${UPLOAD_DIR}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
});
