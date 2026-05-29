const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

// In production, build if .next directory doesn't exist yet
if (!dev && !fs.existsSync(path.join(__dirname, ".next"))) {
  console.log("> .next not found — running build...");
  execSync("npm run build", { stdio: "inherit" });
  console.log("> Build complete.");
}

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`> Ready on port ${port} [${process.env.NODE_ENV}]`);
  });
});
