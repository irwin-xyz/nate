const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "_site");
const requiredPages = [
  "index.html",
  "active/index.html",
  "books/index.html",
  "bucket-list/index.html",
  "music/index.html",
];

let failed = false;

for (const page of requiredPages) {
  const file = path.join(root, page);
  if (!fs.existsSync(file)) {
    console.error(`Missing ${page}`);
    failed = true;
    continue;
  }

  const html = fs.readFileSync(file, "utf8");
  if (html.includes("{%") || html.includes("{{")) {
    console.error(`Unresolved template tag in ${page}`);
    failed = true;
  }
}

const htmlFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.name.endsWith(".html")) {
      htmlFiles.push(fullPath);
    }
  }
}

walk(root);

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const ref of refs) {
    if (!ref.startsWith("/") || ref.startsWith("//")) continue;
    const cleanRef = ref.split("#")[0].split("?")[0];
    if (!cleanRef) continue;

    const target = cleanRef.endsWith("/")
      ? path.join(root, cleanRef.slice(1), "index.html")
      : path.join(root, cleanRef.slice(1));
    if (!fs.existsSync(target)) {
      console.error(`Missing internal reference ${ref} from ${path.relative(root, file)}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(`Verified ${htmlFiles.length} generated HTML files`);
