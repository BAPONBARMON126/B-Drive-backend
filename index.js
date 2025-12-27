import express from "express";
import fetch from "node-fetch";
import multer from "multer";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

/* ✅ FIX: memoryStorage REQUIRED */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BRANCH = "main";

/* ---------- Helper ---------- */
async function githubRequest(url, method = "GET", body) {
  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `token ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

/* ---------- Ping ---------- */
app.get("/ping", (req, res) => {
  res.json({ status: "ok" });
});

/* ---------- List Files / Folders ---------- */
app.get("/list", async (req, res) => {
  try {
    const path = req.query.path || "storage";
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
    const data = await githubRequest(url);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "List failed" });
  }
});

/* ---------- Upload File ---------- */
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const folder = req.body.path || "storage";
    const file = req.file;

    if (!file || !file.buffer) {
      return res.status(400).json({ error: "Invalid file buffer" });
    }

    const content = file.buffer.toString("base64");
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${folder}/${file.originalname}`;

    const result = await githubRequest(url, "PUT", {
      message: "upload file",
      content,
      branch: BRANCH,
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: "Upload failed" });
  }
});

/* ---------- Create Folder ---------- */
app.post("/folder", async (req, res) => {
  try {
    const path = req.body.path;
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}/.keep`;

    const result = await githubRequest(url, "PUT", {
      message: "create folder",
      content: "",
      branch: BRANCH,
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: "Folder create failed" });
  }
});

/* ---------- Delete File ---------- */
app.delete("/delete", async (req, res) => {
  try {
    const { path, sha } = req.body;
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

    const result = await githubRequest(url, "DELETE", {
      message: "delete file",
      sha,
      branch: BRANCH,
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: "Delete failed" });
  }
});

/* ---------- 🔥 DETAILS API (NEW & IMPORTANT) ---------- */
app.get("/details", async (req, res) => {
  try {
    const path = req.query.path;

    // File / folder basic info
    const info = await githubRequest(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`
    );

    let details = {
      name: info.name,
      path: info.path,
      type: info.type,
      size: info.size || 0,
      sha: info.sha,
    };

    // Last modified date (from commits)
    const commits = await githubRequest(
      `https://api.github.com/repos/${OWNER}/${REPO}/commits?path=${path}&per_page=1`
    );

    if (Array.isArray(commits) && commits.length > 0) {
      details.lastModified = commits[0].commit.committer.date;
    }

    res.json(details);
  } catch (e) {
    res.status(500).json({ error: "Details fetch failed" });
  }
});

/* ---------- Start Server ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
