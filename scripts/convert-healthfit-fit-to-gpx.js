const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");

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

function optionValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function commandExists(command) {
  const result = spawnSync("command", ["-v", command], { shell: true, encoding: "utf8" });
  return result.status === 0;
}

function main() {
  loadDotEnv();

  const inputDir = path.resolve(
    optionValue("--input") || process.env.HEALTHFIT_EXPORT_DIR || process.cwd()
  );
  const outputDir = path.resolve(optionValue("--output") || inputDir);
  const dryRun = hasFlag("--dry-run");
  const limit = Number(optionValue("--limit") || 0);

  if (!fs.existsSync(inputDir)) {
    console.error(`HealthFit export folder does not exist: ${inputDir}`);
    process.exit(1);
  }

  if (!dryRun && !commandExists("gpsbabel")) {
    console.error("gpsbabel is required. Install it with: brew install gpsbabel");
    process.exit(1);
  }

  const candidates = fs
    .readdirSync(inputDir)
    .filter((file) => file.toLowerCase().endsWith(".fit"))
    .map((file) => {
      const fitPath = path.join(inputDir, file);
      const gpxPath = path.join(outputDir, `${path.basename(file, path.extname(file))}.gpx`);
      return { fitPath, gpxPath };
    })
    .filter(({ gpxPath }) => !fs.existsSync(gpxPath));

  const selected = limit > 0 ? candidates.slice(0, limit) : candidates;

  if (dryRun) {
    console.log(`Would convert ${selected.length} of ${candidates.length} missing FIT files.`);
    for (const { fitPath, gpxPath } of selected.slice(0, 20)) {
      console.log(`${path.basename(fitPath)} -> ${path.basename(gpxPath)}`);
    }
    if (selected.length > 20) console.log(`...and ${selected.length - 20} more`);
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  let converted = 0;
  let failed = 0;
  for (const { fitPath, gpxPath } of selected) {
    const result = spawnSync(
      "gpsbabel",
      ["-i", "garmin_fit", "-f", fitPath, "-o", "gpx", "-F", gpxPath],
      { encoding: "utf8" }
    );

    if (result.status === 0 && fs.existsSync(gpxPath)) {
      converted += 1;
      console.log(`Converted ${path.basename(fitPath)}`);
    } else {
      failed += 1;
      if (fs.existsSync(gpxPath)) fs.unlinkSync(gpxPath);
      const message = (result.stderr || result.stdout || "conversion failed").trim();
      console.warn(`Skipped ${path.basename(fitPath)}: ${message}`);
    }
  }

  console.log(`Converted ${converted} FIT files to GPX. Failed/skipped ${failed}.`);
}

main();
