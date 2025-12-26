import express from "express";
import fetch from "node-fetch";
import multer from "multer";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ limits: { fileSize: 100 * 1024 * 1024 } });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BRANCH = "main";

// ---------- Helper ----------
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

// ---------- Ping ----------
app.get("/ping", (req, res) => {
  res.json({ status: "ok" });
});

// ---------- List Files / Folders ----------
app.get("/list", async (req, res) => {
  const path = req.query.path || "storage";
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
  const data = await githubRequest(url);
  res.json(data);
});

// ---------- Upload File ----------
app.post("/upload", upload.single("file"), async (req, res) => {
  const folder = req.body.path || "storage";
  const file = req.file;

  const content = file.buffer.toString("base64");
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${folder}/${file.originalname}`;

  const result = await githubRequest(url, "PUT", {
    message: "upload file",
    content,
    branch: BRANCH,
  });

  res.json(result);
});

// ---------- Create Folder ----------
app.post("/folder", async (req, res) => {
  const path = req.body.path;
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}/.keep`;

  const result = await githubRequest(url, "PUT", {
    message: "create folder",
    content: "",
    branch: BRANCH,
  });

  res.json(result);
});

// ---------- Delete ----------
app.delete("/delete", async (req, res) => {
  const { path, sha } = req.body;
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

  const result = await githubRequest(url, "DELETE", {
    message: "delete file",
    sha,
    branch: BRANCH,
  });

  res.json(result);
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
