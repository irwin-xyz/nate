const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "_site");
const generatedAt = new Date();

function loadDotEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadDotEnv();

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
  let date = value instanceof Date ? value : new Date(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    date = new Date(year, month - 1, day);
  }
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

function secondsFromDuration(value) {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return value;
  const text = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  const parts = text.split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function metersFromDistance(value, unit = "m") {
  const amount = Number(value || 0);
  if (!amount) return 0;
  if (unit === "mi") return amount * 1609.344;
  if (unit === "km") return amount * 1000;
  return amount;
}

function distanceBetween(pointA, pointB) {
  const radius = 6371000;
  const latA = (pointA.lat * Math.PI) / 180;
  const latB = (pointB.lat * Math.PI) / 180;
  const deltaLat = ((pointB.lat - pointA.lat) * Math.PI) / 180;
  const deltaLon = ((pointB.lon - pointA.lon) * Math.PI) / 180;
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
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

function fetchOptions(options = {}) {
  const { timeoutMs, ...fetchInit } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs || 15000);
  return {
    options: { ...fetchInit, signal: fetchInit.signal || controller.signal },
    cleanup: () => clearTimeout(timeout),
  };
}

async function fetchJson(url, options = {}) {
  const request = fetchOptions(options);
  const response = await fetch(url, request.options).finally(request.cleanup);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

async function fetchText(url, options = {}) {
  const request = fetchOptions(options);
  const response = await fetch(url, request.options).finally(request.cleanup);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.text();
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

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (quoted && character === '"' && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === ",") {
      row.push(field);
      field = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

function valueFor(row, names) {
  const entries = Object.entries(row);
  for (const name of names) {
    const match = entries.find(([key]) => key.toLowerCase().replace(/[^a-z0-9]/g, "") === name);
    if (match && match[1] !== "") return match[1];
  }
  return "";
}

function normalizeHealthFitWorkout(row) {
  const distanceMeters = valueFor(row, ["distancem", "distancemeters", "distanceinmeters", "meter"]);
  const distanceKm = valueFor(row, ["distancekm", "distancekilometers"]);
  const distanceMiles = valueFor(row, ["distancemi", "distancemiles"]);
  const start = valueFor(row, ["startdate", "starttime", "date", "workoutdate"]);
  const type = valueFor(row, ["type", "activity", "activitytype", "workouttype", "sport"]) || "Workout";
  const duration =
    valueFor(row, ["movingtime", "movingtimes", "duration", "durationseconds", "elapsedtime"]) || 0;
  const elevation = valueFor(row, ["elevationgain", "elevationgainm", "ascent", "totalascent"]);

  return {
    name: valueFor(row, ["name", "title"]) || type,
    distance:
      metersFromDistance(distanceMeters, "m") ||
      metersFromDistance(distanceKm, "km") ||
      metersFromDistance(distanceMiles, "mi"),
    moving_time: secondsFromDuration(duration),
    total_elevation_gain: Number(elevation || 0),
    type,
    start_date: start,
    start_date_local: start,
    location_city: valueFor(row, ["city", "locationcity"]),
    location_state: valueFor(row, ["state", "locationstate"]),
  };
}

function parseHealthFitExport(contents, sourceName) {
  const trimmed = contents.trim();
  if (!trimmed) return [];

  if (sourceName.endsWith(".gpx") || trimmed.startsWith("<?xml")) {
    return [parseHealthFitGpx(trimmed, sourceName)].filter(Boolean);
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed);
    const workouts = Array.isArray(data) ? data : data.workouts || data.data || [];
    return workouts.map(normalizeHealthFitWorkout).filter((workout) => workout.start_date || workout.distance);
  }

  if (sourceName.endsWith(".csv") || trimmed.includes(",")) {
    return parseCsv(trimmed).map(normalizeHealthFitWorkout).filter((workout) => workout.start_date || workout.distance);
  }

  throw new Error("HealthFit export must be GPX, CSV, or JSON");
}

function typeFromFileName(fileName) {
  const basename = path.basename(fileName, path.extname(fileName));
  const parts = basename.split("-");
  if (parts.length < 5) return "";
  return parts.slice(4, -1).join(" ");
}

function startDateFromFileName(fileName) {
  const basename = path.basename(fileName);
  const match = basename.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})-/);
  if (!match) return "";
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function parseHealthFitGpx(xml, sourceName) {
  const points = [...xml.matchAll(/<trkpt\b[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g)]
    .map((match) => ({
      lat: Number(match[1]),
      lon: Number(match[2]),
      ele: Number(xmlTag(match[3], "ele") || 0),
      time: xmlTag(match[3], "time"),
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));

  if (!points.length) return null;

  let distance = 0;
  let elevationGain = 0;
  for (let index = 1; index < points.length; index += 1) {
    distance += distanceBetween(points[index - 1], points[index]);
    const elevationDelta = points[index].ele - points[index - 1].ele;
    if (elevationDelta > 0) elevationGain += elevationDelta;
  }

  const start = points[0].time || startDateFromFileName(sourceName);
  const end = points.at(-1).time;
  const movingTime =
    start && end ? Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 1000) : 0;
  const type = xmlTag(xml, "type") || typeFromFileName(sourceName) || "Workout";

  return {
    name: typeFromFileName(sourceName) || type,
    distance,
    moving_time: movingTime,
    total_elevation_gain: elevationGain,
    type: type
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    start_date: start,
    start_date_local: start,
  };
}

function readHealthFitDirectory(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((file) => file.toLowerCase().endsWith(".gpx"))
    .map((file) => path.join(directory, file))
    .map((file) => parseHealthFitGpx(fs.readFileSync(file, "utf8"), file))
    .filter(Boolean)
    .sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));
}

async function getHealthFitActivities() {
  const { HEALTHFIT_EXPORT_URL, HEALTHFIT_EXPORT_FILE, HEALTHFIT_EXPORT_DIR } = process.env;
  const localCandidates = [
    HEALTHFIT_EXPORT_FILE,
    "_data/healthfit-workouts.csv",
    "_data/healthfit-workouts.json",
  ].filter(Boolean);

  if (HEALTHFIT_EXPORT_URL) {
    try {
      const contents = await fetchText(HEALTHFIT_EXPORT_URL);
      const activities = parseHealthFitExport(contents, HEALTHFIT_EXPORT_URL);
      if (activities.length) return { source: "HealthFit export", activities };
    } catch (error) {
      warnFallback("HealthFit URL", error);
    }
  }

  if (HEALTHFIT_EXPORT_DIR) {
    try {
      const activities = readHealthFitDirectory(HEALTHFIT_EXPORT_DIR);
      if (activities.length) return { source: "HealthFit GPX exports", activities };
    } catch (error) {
      warnFallback("HealthFit directory", error);
    }
  }

  for (const relativePath of localCandidates) {
    const filePath = path.join(root, relativePath);
    if (!fs.existsSync(filePath)) continue;
    try {
      const activities = parseHealthFitExport(fs.readFileSync(filePath, "utf8"), relativePath);
      if (activities.length) return { source: "local HealthFit export", activities };
    } catch (error) {
      warnFallback("HealthFit file", error);
    }
  }

  return null;
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

function decodeXml(value) {
  return String(value ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function xmlTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return match ? decodeXml(match[1].trim()) : "";
}

function normalizeGoodreadsReviewXml(reviewXml, status) {
  const bookXml = reviewXml.match(/<book>([\s\S]*?)<\/book>/)?.[1] || "";
  const authors = [...bookXml.matchAll(/<author>([\s\S]*?)<\/author>/g)]
    .map((match) => xmlTag(match[1], "name"))
    .filter(Boolean);

  return {
    title: xmlTag(bookXml, "title"),
    authors,
    url: xmlTag(bookXml, "link"),
    coverUrl: xmlTag(bookXml, "image_url"),
    status,
    readAt: xmlTag(reviewXml, "read_at"),
    addedAt: xmlTag(reviewXml, "date_added"),
  };
}

async function fetchGoodreadsShelf({ apiKey, userId, shelf, status }) {
  const perPage = 200;
  let page = 1;
  let totalPages = 1;
  const books = [];

  while (page <= totalPages) {
    const params = new URLSearchParams({
      key: apiKey,
      v: "2",
      shelf,
      per_page: String(perPage),
      page: String(page),
    });
    const xml = await fetchText(`https://www.goodreads.com/review/list/${userId}.xml?${params}`);
    const total = Number(xml.match(/<reviews\b[^>]*\btotal="(\d+)"/)?.[1] || 0);
    totalPages = Math.max(1, Math.ceil(total / perPage));

    for (const match of xml.matchAll(/<review>([\s\S]*?)<\/review>/g)) {
      books.push(normalizeGoodreadsReviewXml(match[1], status));
    }

    page += 1;
  }

  return books;
}

async function getGoodreadsBooks(fallback) {
  const { GOODREADS_API_KEY, GOODREADS_USER_ID = "76558" } = process.env;

  if (!GOODREADS_API_KEY) return null;

  try {
    const shelves = [
      { shelf: "currently-reading", status: "currently_reading" },
      { shelf: "read", status: "read" },
      { shelf: "to-read", status: "to_read" },
    ];
    const books = (
      await Promise.all(
        shelves.map((shelf) =>
          fetchGoodreadsShelf({
            apiKey: GOODREADS_API_KEY,
            userId: GOODREADS_USER_ID,
            ...shelf,
          })
        )
      )
    ).flat();

    return { source: "Goodreads", books: books.length ? books : fallback };
  } catch (error) {
    warnFallback("Goodreads", error);
    return null;
  }
}

async function getHardcoverBooks(fallback) {
  const { HARDCOVER_API_TOKEN } = process.env;

  if (!HARDCOVER_API_TOKEN) return null;

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

    return { source: "Hardcover", books: books.length ? books : fallback };
  } catch (error) {
    warnFallback("Hardcover", error);
    return null;
  }
}

async function getBooks() {
  const fallback = readJson("_data/books.json").map(normalizeGoodreadsBook);
  return (
    (await getGoodreadsBooks(fallback)) ||
    (await getHardcoverBooks(fallback)) || { source: "fallback Goodreads export", books: fallback }
  );
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
  renderActivePage((await getHealthFitActivities()) || (await getStravaActivities()));
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
