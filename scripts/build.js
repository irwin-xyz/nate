const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "_site");
const generatedAt = new Date();

const description =
  "Nate Irwin — Co-Founder and Chief Product Officer at OuterSpatial, building products that help people get outside. Based in Steamboat Springs, Colorado.";
const updated = "June 7, 2026";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function write(relativePath, contents) {
  const destination = path.join(outDir, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, contents);
}

function copy(relativePath) {
  const source = path.join(root, relativePath);
  if (!fs.existsSync(source)) return;
  fs.cpSync(source, path.join(outDir, relativePath), { recursive: true });
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

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatDate(value, options = {}) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

function formatNumber(value, options = {}) {
  return new Intl.NumberFormat("en-US", options).format(value || 0);
}

function milesFromMeters(meters) {
  return (meters || 0) / 1609.344;
}

function hoursFromSeconds(seconds) {
  return (seconds || 0) / 3600;
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
              <li><a href="/active/">Active</a></li>
              <li><a href="/books/">Books</a></li>
              <li><a href="/bucket-list/">Bucket list</a></li>
              <li><a href="/music/">Music</a></li>
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

function sectionHeader(title, body, sourceLabel) {
  return `<header class="section-header">
  <h1 id="${slug(title)}">${escapeHtml(title)}</h1>
  <p>${escapeHtml(body)}</p>
  <p class="source-note">Generated ${formatDate(generatedAt)} from ${escapeHtml(sourceLabel)}.</p>
</header>`;
}

function statGrid(stats) {
  return `<div class="stat-grid">
${stats
  .map(
    (stat) => `  <div class="stat-card">
    <span class="stat-value">${escapeHtml(stat.value)}</span>
    <span class="stat-label">${escapeHtml(stat.label)}</span>
  </div>`
  )
  .join("\n")}
</div>`;
}

function dashboardList(items) {
  return `<div class="dashboard-list">
${items.join("\n")}
</div>`;
}

function safeLink(url, label, className = "") {
  if (!url) return escapeHtml(label);
  return `<a${className ? ` class="${className}"` : ""} href="${escapeHtml(url)}">${escapeHtml(label)}</a>`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

function warnFallback(name, error) {
  console.warn(`Using fallback ${name} data: ${error.message}`);
}

async function getStravaActivities() {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = process.env;
  const fallback = readJson("_data/activities.json");

  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
    return { source: "fallback Strava export", activities: fallback };
  }

  try {
    const token = await fetchJson("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        refresh_token: STRAVA_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });
    const activities = await fetchJson(
      "https://www.strava.com/api/v3/athlete/activities?per_page=30",
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
      }
    );
    return { source: "Strava", activities };
  } catch (error) {
    warnFallback("Strava", error);
    return { source: "fallback Strava export", activities: fallback };
  }
}

function normalizeGoodreadsBook(entry) {
  const book = first(entry.book);
  const shelves = first(entry.shelves)?.shelf ?? [];
  const authors = first(book.authors)?.author ?? [];

  return {
    title: first(book.title),
    authors: authors.map((author) => first(author.name)).filter(Boolean),
    url: first(book.link),
    coverUrl: first(book.image_url),
    status: shelves.some((shelf) => shelf.$?.name === "currently-reading")
      ? "currently_reading"
      : shelves.some((shelf) => shelf.$?.name === "read")
        ? "read"
        : "to_read",
    readAt: first(entry.read_at),
    addedAt: first(entry.date_added),
  };
}

async function getBooks() {
  const fallback = readJson("_data/books.json").map(normalizeGoodreadsBook);
  const { HARDCOVER_API_TOKEN } = process.env;

  if (!HARDCOVER_API_TOKEN) {
    return { source: "fallback Goodreads export", books: fallback };
  }

  try {
    const data = await fetchJson("https://api.hardcover.app/v1/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HARDCOVER_API_TOKEN}`,
      },
      body: JSON.stringify({
        query: `
          query UserBooks {
            me {
              user_books(limit: 250, order_by: {updated_at: desc}) {
                status_id
                updated_at
                date_finished
                book {
                  title
                  slug
                  cached_contributors
                  image { url }
                }
              }
            }
          }
        `,
      }),
    });

    const books = (data.data?.me?.[0]?.user_books ?? []).map((entry) => ({
      title: entry.book?.title,
      authors: (entry.book?.cached_contributors ?? [])
        .map((contributor) => contributor.name)
        .filter(Boolean),
      url: entry.book?.slug ? `https://hardcover.app/books/${entry.book.slug}` : "",
      coverUrl: entry.book?.image?.url || "",
      status: entry.status_id === 2 ? "currently_reading" : entry.status_id === 3 ? "read" : "to_read",
      readAt: entry.date_finished,
      addedAt: entry.updated_at,
    }));

    return { source: "Hardcover", books };
  } catch (error) {
    warnFallback("book", error);
    return { source: "fallback Goodreads export", books: fallback };
  }
}

async function getSpotifyPlaylists() {
  const fallback = readJson("_data/playlists.json");
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_USER_ID = "nateirwin" } = process.env;

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return { source: "fallback Spotify export", playlists: fallback };
  }

  try {
    const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
    const token = await fetchJson("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const playlistData = await fetchJson(
      `https://api.spotify.com/v1/users/${encodeURIComponent(SPOTIFY_USER_ID)}/playlists?limit=50`,
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
      }
    );
    const monthlyPlaylists = (playlistData.items ?? []).filter((playlist) =>
      /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/.test(
        playlist.name
      )
    );

    const playlists = [];
    for (const playlist of monthlyPlaylists.slice(0, 12)) {
      const tracks = await fetchJson(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=50`,
        {
          headers: { Authorization: `Bearer ${token.access_token}` },
        }
      );
      playlists.push({ ...playlist, tracks: tracks.items ?? [] });
    }

    return { source: "Spotify", playlists };
  } catch (error) {
    warnFallback("Spotify", error);
    return { source: "fallback Spotify export", playlists: fallback };
  }
}

function renderHome() {
  write("index.html", layout(stripFrontMatter(read("index.html")).trim()));
}

function activityTypeLabel(type) {
  return type === "Ride" ? "rides" : type === "Run" ? "runs" : `${String(type || "activity").toLowerCase()}s`;
}

function renderActivePage(data) {
  const activities = data.activities || [];
  const totalMiles = activities.reduce((sum, activity) => sum + milesFromMeters(activity.distance), 0);
  const totalHours = activities.reduce((sum, activity) => sum + hoursFromSeconds(activity.moving_time), 0);
  const totalGain = activities.reduce((sum, activity) => sum + (activity.total_elevation_gain || 0), 0);
  const byType = activities.reduce((memo, activity) => {
    memo[activity.type] = (memo[activity.type] || 0) + 1;
    return memo;
  }, {});
  const newest = activities[0];
  const recentItems = activities.slice(0, 10).map((activity) => {
    const location = [activity.location_city, activity.location_state].filter(Boolean).join(", ");
    return `<article class="dashboard-row">
  <div>
    <h2>${escapeHtml(activity.name || activity.type || "Activity")}</h2>
    <p>${escapeHtml([formatDate(activity.start_date || activity.start_date_local), activity.type, location].filter(Boolean).join(" · "))}</p>
  </div>
  <div class="metric-pair">
    <span>${formatNumber(milesFromMeters(activity.distance), { maximumFractionDigits: 1 })} mi</span>
    <span>${formatNumber(hoursFromSeconds(activity.moving_time), { maximumFractionDigits: 1 })} hr</span>
  </div>
</article>`;
  });

  write(
    "active/index.html",
    layout(`${sectionHeader(
      "Active",
      "A summary of recent outdoor activity without publishing route lines or precise start locations.",
      data.source
    )}
${statGrid([
  { value: formatNumber(activities.length), label: "recent activities" },
  { value: formatNumber(totalMiles, { maximumFractionDigits: 1 }), label: "miles" },
  { value: formatNumber(totalHours, { maximumFractionDigits: 1 }), label: "moving hours" },
  { value: `${formatNumber(totalGain, { maximumFractionDigits: 0 })} m`, label: "elevation gain" },
])}
<section class="dashboard-section">
  <h2>Activity mix</h2>
  <p>${escapeHtml(
    Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `${count} ${activityTypeLabel(type)}`)
      .join(", ") || "No recent activity data available."
  )}</p>
</section>
<section class="dashboard-section">
  <h2>Recent activities</h2>
  ${newest ? dashboardList(recentItems) : "<p>No activity data available.</p>"}
</section>`)
  );
}

function renderBooksPage(data) {
  const books = data.books || [];
  const current = books.filter((book) => book.status === "currently_reading").slice(0, 6);
  const read = books.filter((book) => book.status === "read");
  const toRead = books.filter((book) => book.status === "to_read");
  const recentRead = read
    .sort((a, b) => new Date(b.readAt || b.addedAt || 0) - new Date(a.readAt || a.addedAt || 0))
    .slice(0, 18);

  function bookRow(book) {
    return `<article class="dashboard-row">
  <div>
    <h2>${safeLink(book.url, book.title || "Untitled book")}</h2>
    <p>${escapeHtml((book.authors || []).join(", ") || "Unknown author")}</p>
  </div>
  <span class="status-pill">${escapeHtml(book.status.replace(/_/g, " "))}</span>
</article>`;
  }

  write(
    "books/index.html",
    layout(`${sectionHeader(
      "Books",
      "A reading dashboard for what I am reading now, what I have finished, and what is waiting on the shelf.",
      data.source
    )}
${statGrid([
  { value: formatNumber(read.length), label: "read" },
  { value: formatNumber(current.length), label: "currently reading" },
  { value: formatNumber(toRead.length), label: "to read" },
])}
<section class="dashboard-section">
  <h2>Currently reading</h2>
  ${current.length ? dashboardList(current.map(bookRow)) : "<p>No current reads found.</p>"}
</section>
<section class="dashboard-section">
  <h2>Recently read</h2>
  ${recentRead.length ? dashboardList(recentRead.map(bookRow)) : "<p>No recent reads found.</p>"}
</section>`)
  );
}

function renderBucketListPage() {
  const items = readJson("_data/bucket-list.json");
  const completed = items.filter((item) => item.status === "completed");
  const inProgress = items.filter((item) => item.status === "in_progress");
  const planned = items.filter((item) => item.status === "planned");
  const categories = [...new Set(items.map((item) => item.category))].filter(Boolean);

  const itemRows = items
    .sort((a, b) => {
      const order = { in_progress: 0, planned: 1, completed: 2 };
      return order[a.status] - order[b.status] || a.category.localeCompare(b.category) || a.title.localeCompare(b.title);
    })
    .map((item) => `<article class="dashboard-row">
  <div>
    <h2>${escapeHtml(item.title)}</h2>
    <p>${escapeHtml([item.category, item.completedAt ? `completed ${formatDate(item.completedAt)}` : item.notes].filter(Boolean).join(" · "))}</p>
  </div>
  <span class="status-pill">${escapeHtml(item.status.replace(/_/g, " "))}</span>
</article>`);

  write(
    "bucket-list/index.html",
    layout(`${sectionHeader(
      "Bucket List",
      "A living list of things I want to do, organized by progress instead of one long checklist.",
      "manual bucket list data"
    )}
${statGrid([
  { value: formatNumber(completed.length), label: "completed" },
  { value: formatNumber(inProgress.length), label: "in progress" },
  { value: formatNumber(planned.length), label: "planned" },
  { value: formatNumber(categories.length), label: "categories" },
])}
<section class="dashboard-section">
  <h2>Progress</h2>
  ${dashboardList(itemRows)}
</section>`)
  );
}

function playlistDateValue(name) {
  const date = new Date(`${name} 1`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizeTrack(item) {
  const track = item.track || item;
  return {
    name: track.name,
    artists: (track.artists || []).map((artist) => artist.name).filter(Boolean),
    url: track.external_urls?.spotify,
  };
}

function renderMusicPage(data) {
  const playlists = (data.playlists || [])
    .slice()
    .sort((a, b) => playlistDateValue(b.name) - playlistDateValue(a.name))
    .slice(0, 12);
  const totalTracks = playlists.reduce((sum, playlist) => sum + (playlist.tracks?.length || 0), 0);
  const newest = playlists[0];
  const playlistCards = playlists.map((playlist) => {
    const tracks = (playlist.tracks || []).slice(0, 12).map(normalizeTrack);
    return `<article class="playlist-card">
  <h2>${safeLink(playlist.external_urls?.spotify, playlist.name)}</h2>
  <p>${formatNumber(playlist.tracks?.length || 0)} tracks</p>
  <ol>
${tracks
  .map((track) => `    <li>${safeLink(track.url, track.name)} <strong>${escapeHtml(track.artists.join(", "))}</strong></li>`)
  .join("\n")}
  </ol>
</article>`;
  });

  write(
    "music/index.html",
    layout(`${sectionHeader(
      "Music",
      "Monthly playlists of songs that caught my attention, pulled from Spotify when credentials are available.",
      data.source
    )}
${statGrid([
  { value: formatNumber(playlists.length), label: "playlists shown" },
  { value: formatNumber(totalTracks), label: "tracks" },
  { value: newest?.name || "None", label: "newest playlist" },
])}
<section class="dashboard-section">
  <h2>Monthly playlists</h2>
  <div class="playlist-grid">
${playlistCards.join("\n")}
  </div>
</section>`)
  );
}

function renderPosts() {
  const postsDir = path.join(root, "_posts");
  if (!fs.existsSync(postsDir)) return;

  for (const file of fs.readdirSync(postsDir)) {
    if (!file.endsWith(".md")) continue;
    const markdown = read(path.join("_posts", file));
    const title = markdown.match(/^title:\s*(.+)$/m)?.[1] ?? "Post";
    const slugFromFile = file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
    const body = stripFrontMatter(markdown)
      .trim()
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHtml(paragraph.trim())}</p>`)
      .join("\n");
    write(path.join("writing", slugFromFile, "index.html"), layout(`<h1>${escapeHtml(title)}</h1>\n\n${body}`));
  }
}

function copyStaticAssets() {
  for (const relativePath of ["assets", "playground", "favicon.png"]) {
    copy(relativePath);
  }
}

async function main() {
  clean();
  copyStaticAssets();
  renderHome();
  renderActivePage(await getStravaActivities());
  renderBooksPage(await getBooks());
  renderBucketListPage();
  renderMusicPage(await getSpotifyPlaylists());
  renderPosts();
  console.log("Built _site");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
