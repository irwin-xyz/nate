import fs from "node:fs";
import path from "node:path";
import {
  fetchJson,
  fetchText,
  first,
  metersFromDistance,
  parseCsv,
  read,
  readJson,
  resolvePath,
  root,
  secondsFromDuration,
  valueFor,
  warnFallback,
} from "./site.js";

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

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed);
    const workouts = Array.isArray(data) ? data : data.workouts || data.data || [];
    return workouts.map(normalizeHealthFitWorkout).filter((workout) => workout.start_date || workout.distance);
  }

  if (sourceName.endsWith(".csv") || trimmed.includes(",")) {
    return parseCsv(trimmed).map(normalizeHealthFitWorkout).filter((workout) => workout.start_date || workout.distance);
  }

  throw new Error("HealthFit export must be CSV or JSON");
}

export async function getStravaActivities() {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = process.env;
  const fallback = readJson("src/data/activities.json");

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

export async function getHealthFitActivities() {
  const { HEALTHFIT_EXPORT_URL, HEALTHFIT_EXPORT_FILE } = process.env;
  const localCandidates = [
    HEALTHFIT_EXPORT_FILE,
    "src/data/healthfit-workouts.csv",
    "src/data/healthfit-workouts.json",
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

  for (const relativePath of localCandidates) {
    const filePath = resolvePath(relativePath);
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

function normalizeGoodreadsCsvBook(row) {
  const title = row.Title || "";
  const bookId = row["Book Id"] || "";
  const author = row.Author || "";
  const additionalAuthors = (row["Additional Authors"] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const exclusiveShelf = row["Exclusive Shelf"] || "";

  return {
    title,
    authors: [author, ...additionalAuthors].filter(Boolean),
    url: bookId ? `https://www.goodreads.com/book/show/${bookId}` : "",
    coverUrl: "",
    status:
      exclusiveShelf === "currently-reading"
        ? "currently_reading"
        : exclusiveShelf === "read"
          ? "read"
          : "to_read",
    readAt: row["Date Read"] || "",
    addedAt: row["Date Added"] || "",
  };
}

function getGoodreadsCsvBooks() {
  const { GOODREADS_EXPORT_FILE } = process.env;
  const candidates = [GOODREADS_EXPORT_FILE, "src/data/goodreads-books.csv"].filter(Boolean);

  for (const relativePath of candidates) {
    const filePath = resolvePath(relativePath);
    if (!fs.existsSync(filePath)) continue;

    const books = parseCsv(fs.readFileSync(filePath, "utf8"))
      .map(normalizeGoodreadsCsvBook)
      .filter((book) => book.title);
    if (books.length) return { source: "Goodreads CSV export", books };
  }

  return null;
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
  const { GOODREADS_API_KEY, GOODREADS_USE_API, GOODREADS_USER_ID = "76558" } = process.env;

  if (!GOODREADS_API_KEY || GOODREADS_USE_API !== "true") return null;

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

export async function getBooks() {
  const fallback = readJson("src/data/books.json").map(normalizeGoodreadsBook);
  return (
    getGoodreadsCsvBooks() ||
    (await getGoodreadsBooks(fallback)) ||
    (await getHardcoverBooks(fallback)) || { source: "fallback Goodreads JSON export", books: fallback }
  );
}

export async function getSpotifyPlaylists() {
  const fallback = readJson("src/data/playlists.json");
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

export function getBucketList() {
  return readJson("src/data/bucket-list.json");
}

export function getPosts() {
  const postsDir = path.join(root, "src/content/writing");
  if (!fs.existsSync(postsDir)) return [];

  return fs
    .readdirSync(postsDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const markdown = read(path.join("src/content/writing", file));
      const title = markdown.match(/^title:\s*(.+)$/m)?.[1] ?? "Post";
      const slug = file.replace(/\.md$/, "");
      const body = markdown
        .replace(/^---\n[\s\S]*?\n---\n?/, "")
        .trim()
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${paragraph.trim()}</p>`)
        .join("\n");
      return { slug, title, body };
    });
}
