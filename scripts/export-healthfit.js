const fs = require("fs");
const path = require("path");
const FitParserPackage = require("fit-file-parser");

const FitParser = FitParserPackage.default || FitParserPackage;

const root = path.resolve(__dirname, "..");
const defaultOutput = "_data/healthfit-workouts.csv";

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

function xmlTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : "";
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

function parseGpx(filePath) {
  const xml = fs.readFileSync(filePath, "utf8");
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

  const start = points[0].time || startDateFromFileName(filePath);
  const end = points.at(-1).time;
  const movingTime =
    start && end ? Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 1000) : 0;
  const type = xmlTag(xml, "type") || typeFromFileName(filePath) || "Workout";

  return {
    id: path.basename(filePath, path.extname(filePath)),
    name: typeFromFileName(filePath) || type,
    type: type
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    start_date: start,
    distance_m: Math.round(distance),
    moving_time: Math.round(movingTime),
    elevation_gain_m: Math.round(elevationGain),
  };
}

function titleCase(value) {
  return String(value || "Workout")
    .replace(/_/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function displayType(session, filePath) {
  const fileType = typeFromFileName(filePath);
  if (fileType) return fileType;
  return titleCase(session.sub_sport && session.sub_sport !== "generic" ? session.sub_sport : session.sport);
}

function parseFit(filePath) {
  const parser = new FitParser({
    force: true,
    lengthUnit: "m",
    speedUnit: "m/s",
    elapsedRecordField: true,
    mode: "both",
  });

  return parser.parseAsync(fs.readFileSync(filePath)).then((data) => {
    const session = data.sessions?.[0];
    if (!session) return null;

    const type = displayType(session, filePath);
    const start = session.start_time || startDateFromFileName(filePath);
    return {
      id: path.basename(filePath, path.extname(filePath)),
      name: type,
      type,
      start_date: start instanceof Date ? start.toISOString() : start,
      distance_m: Math.round(Number(session.total_distance || 0)),
      moving_time: Math.round(Number(session.total_timer_time || session.total_elapsed_time || 0)),
      elevation_gain_m: Math.round(Number(session.total_ascent || 0)),
    };
  });
}

function normalizeSeedActivity(activity) {
  return {
    id: `strava-${activity.id}`,
    name: activity.name || activity.type || "Workout",
    type: activity.type || "Workout",
    start_date: activity.start_date_local || activity.start_date,
    distance_m: Math.round(Number(activity.distance || 0)),
    moving_time: Math.round(Number(activity.moving_time || activity.elapsed_time || 0)),
    elevation_gain_m: Math.round(Number(activity.total_elevation_gain || 0)),
  };
}

function readSeedActivities(cutoffDate) {
  const seedPath = path.join(root, "_data/activities.json");
  if (!fs.existsSync(seedPath) || !cutoffDate) return [];

  return JSON.parse(fs.readFileSync(seedPath, "utf8"))
    .map(normalizeSeedActivity)
    .filter((workout) => workout.start_date && new Date(workout.start_date) < cutoffDate);
}

function mergeWorkout(primary, fallback) {
  if (!fallback) return primary;
  return {
    ...primary,
    distance_m: primary.distance_m || fallback.distance_m,
    moving_time: primary.moving_time || fallback.moving_time,
    elevation_gain_m: primary.elevation_gain_m || fallback.elevation_gain_m,
  };
}

function csvValue(value) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCsv(workouts, outputPath) {
  const headers = ["name", "type", "start_date", "distance_m", "moving_time", "elevation_gain_m"];
  const rows = [
    headers.join(","),
    ...workouts.map((workout) => headers.map((header) => csvValue(workout[header])).join(",")),
  ];

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${rows.join("\n")}\n`);
}

async function main() {
  loadDotEnv();

  const inputDir = process.argv[2] || process.env.HEALTHFIT_EXPORT_DIR;
  const outputPath = path.resolve(root, process.argv[3] || process.env.HEALTHFIT_OUTPUT_FILE || defaultOutput);

  if (!inputDir) {
    console.error("Set HEALTHFIT_EXPORT_DIR in .env or pass the HealthFit GPX folder as the first argument.");
    process.exit(1);
  }

  if (!fs.existsSync(inputDir)) {
    console.error(`HealthFit export folder does not exist: ${inputDir}`);
    process.exit(1);
  }

  const gpxById = new Map(
    fs
      .readdirSync(inputDir)
      .filter((file) => file.toLowerCase().endsWith(".gpx"))
      .map((file) => parseGpx(path.join(inputDir, file)))
      .filter(Boolean)
      .map((workout) => [workout.id, workout])
  );

  const fitWorkouts = (
    await Promise.all(
      fs
        .readdirSync(inputDir)
        .filter((file) => file.toLowerCase().endsWith(".fit"))
        .map((file) =>
          parseFit(path.join(inputDir, file)).catch((error) => {
            console.warn(`Skipped ${file}: ${error.message}`);
            return null;
          })
        )
    )
  )
    .filter(Boolean)
    .map((workout) => mergeWorkout(workout, gpxById.get(workout.id)));

  const gpxOnlyWorkouts = [...gpxById.values()].filter(
    (workout) => !fitWorkouts.some((fitWorkout) => fitWorkout.id === workout.id)
  );

  const healthFitWorkouts = [...fitWorkouts, ...gpxOnlyWorkouts].filter(
    (workout) => workout.start_date && (workout.distance_m || workout.moving_time >= 60)
  );
  const oldestHealthFitDate = healthFitWorkouts.reduce((oldest, workout) => {
    const date = new Date(workout.start_date);
    if (Number.isNaN(date.getTime())) return oldest;
    return !oldest || date < oldest ? date : oldest;
  }, null);
  const seedWorkouts = readSeedActivities(oldestHealthFitDate);
  const workouts = [...healthFitWorkouts, ...seedWorkouts].sort(
    (a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0)
  );

  if (!workouts.length) {
    console.error(`No HealthFit workouts found in ${inputDir}`);
    process.exit(1);
  }

  writeCsv(workouts, outputPath);
  console.log(
    `Wrote ${workouts.length} workouts to ${path.relative(root, outputPath)} ` +
      `(${healthFitWorkouts.length} HealthFit, ${seedWorkouts.length} seeded Strava)`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
