const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "_site");

const description =
  "Nate Irwin — Co-Founder and Chief Product Officer at OuterSpatial, building products that help people get outside. Based in Steamboat Springs, Colorado.";
const updated = "June 7, 2026";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, contents) {
  const destination = path.join(outDir, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, contents);
}

function copy(relativePath) {
  const source = path.join(root, relativePath);
  const destination = path.join(outDir, relativePath);
  fs.cpSync(source, destination, { recursive: true });
}

function clean() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripFrontMatter(contents) {
  return contents.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function head(extraCss = []) {
  const stylesheets = extraCss
    .map((stylesheet) => `  <link href="${stylesheet}" rel="stylesheet">`)
    .join("\n");

  return `<meta http-equiv="content-type" content="text/html; charset=utf-8">
  <title>nate.irwin.xyz</title>
  <meta name="author" content="Nate Irwin">
  <meta name="description" content="${description}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta property="og:site_name" content="nate.irwin.xyz">
  <meta property="og:email" content="nate@irwin.xyz">
  <meta property="og:type" content="blog">
  <meta property="twitter:account_id" content="14373135">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Raleway:400,300,600" type="text/css">
  <link rel="stylesheet" href="/assets/css/normalize.css">
  <link rel="stylesheet" href="/assets/css/skeleton.css">
  <link rel="stylesheet" href="/assets/css/site.css">
${stylesheets ? `${stylesheets}\n` : ""}  <!--[if lt IE 9]>
  <script src="/assets/libs/html5shiv/html5shiv.min.js"></script>
  <![endif]-->
  <link rel="icon" type="image/x-icon" href="/favicon.png">`;
}

function layout(content, options = {}) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
  ${head(options.css)}
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="row" style="margin-bottom:40px;">
          <nav class="column">
            <a class="brand" href="/">Nate Irwin</a>
            <ul class="nav">
              <li>
                <a href="/active/">Active</a>
              </li>
              <li>
                <a href="/books/">Books</a>
              </li>
              <li>
                <a href="/bucket-list/">Bucket list</a>
              </li>
              <li>
                <a href="/music/">Music</a>
              </li>
            </ul>
          </nav>
        </div>
        <div class="row" style="margin-bottom:40px;">
          <main class="column">
            ${content}
          </main>
        </div>
      </div>
      <div class="push"></div>
    </div>
    <footer class="row">
      <div class="column">
        <div class="container">
          <p>Updated: ${updated}</p>
        </div>
      </div>
    </footer>
  </body>
</html>
`;
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function markdownToHtml(markdown) {
  const lines = stripFrontMatter(markdown).trim().split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let listOpen = false;

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function closeList() {
    if (!listOpen) return;
    html.push("</ul>");
    listOpen = false;
  }

  for (const line of lines) {
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      closeList();
      const text = line.slice(2);
      html.push(`<h1 id="${slug(text)}">${escapeHtml(text)}</h1>`);
      continue;
    }

    const listMatch = line.match(/^- \[[ x]\] (.*)$/);
    if (listMatch) {
      flushParagraph();
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`  <li>${inlineMarkdown(listMatch[1])}</li>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();

  return html.join("\n\n");
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function renderHome() {
  write("index.html", layout(stripFrontMatter(read("index.html")).trim()));
}

function renderBucketList() {
  write("bucket-list/index.html", layout(markdownToHtml(read("bucket-list/index.md"))));
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function renderBooks() {
  const books = readJson("_data/books.json")
    .filter((entry) =>
      first(entry.shelves)?.shelf?.some((shelf) => shelf.$?.name === "read")
    )
    .map((entry) => {
      const book = first(entry.book);
      const authors = first(book.authors)?.author ?? [];
      return {
        title: first(book.title),
        link: first(book.link),
        authors: authors.map((author) => first(author.name)).join(", "),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const items = books
    .map(
      (book) =>
        `  <li><a href="${escapeHtml(book.link)}" target="_blank">${escapeHtml(
          book.title
        )}</a> - <strong>${escapeHtml(book.authors)}</strong></li>`
    )
    .join("\n");

  write(
    "books/index.html",
    layout(`<h1 id="books">Books</h1>

<p>I've read ${books.length} books (and counting).</p>

<ul>
${items}
</ul>`)
  );
}

function renderMusic() {
  const playlists = readJson("_data/playlists.json");
  const playlistHtml = playlists
    .map((playlist) => {
      const tracks = playlist.tracks
        .map((item) => {
          const track = item.track;
          const artists = track.artists.map((artist) => artist.name).join(", ");
          return `  <li>${escapeHtml(track.name)} - <strong>${escapeHtml(
            artists
          )}</strong></li>`;
        })
        .join("\n");

      return `<h2><a href="${escapeHtml(playlist.external_urls.spotify)}">${escapeHtml(
        playlist.name
      )}</a></h2>
<ol>
${tracks}
</ol>`;
    })
    .join("\n\n");

  write(
    "music/index.html",
    layout(
      `<h1 id="music">Music</h1>

<p>In November 2015, I started creating monthly playlists to track songs that "hit a nerve" with me during each month. Some months I don't listen to much music. Others are chock full of discovery.</p>

<p>Click through each playlist's name to listen to it on Spotify.</p>

${playlistHtml}`,
      { css: ["assets/css/main.css"] }
    )
  );
}

function renderActive() {
  const active = stripFrontMatter(read("active/index.html"))
    .replace("{% include head.html %}", head())
    .trim();
  write("active/index.html", active);
}

function renderPosts() {
  const postsDir = path.join(root, "_posts");
  if (!fs.existsSync(postsDir)) return;

  for (const file of fs.readdirSync(postsDir)) {
    if (!file.endsWith(".md")) continue;
    const markdown = read(path.join("_posts", file));
    const title = markdown.match(/^title:\s*(.+)$/m)?.[1] ?? "Post";
    const slugFromFile = file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
    const content = `<h1>${escapeHtml(title)}</h1>\n\n${markdownToHtml(markdown)}`;
    write(path.join("writing", slugFromFile, "index.html"), layout(content));
  }
}

function copyStaticAssets() {
  for (const relativePath of [
    "assets",
    "active/assets",
    "music/assets",
    "playground",
    "favicon.png",
  ]) {
    copy(relativePath);
  }
}

clean();
copyStaticAssets();
renderHome();
renderBucketList();
renderBooks();
renderMusic();
renderActive();
renderPosts();

console.log("Built _site");
