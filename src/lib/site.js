import fs from "node:fs";
import path from "node:path";

export const root = path.resolve(".");
export const generatedAt = new Date();
export const updated = "June 7, 2026";
export const description =
  "Nate Irwin — Co-Founder and Chief Product Officer at OuterSpatial, building products that help people get outside. Based in Steamboat Springs, Colorado.";

export function loadDotEnv() {
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

export function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

export function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

export function stripFrontMatter(contents) {
  return contents.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

export function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function formatDate(value, options = {}) {
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

export function formatNumber(value, options = {}) {
  return new Intl.NumberFormat("en-US", options).format(value || 0);
}

export function milesFromMeters(meters) {
  return (meters || 0) / 1609.344;
}

export function hoursFromSeconds(seconds) {
  return (seconds || 0) / 3600;
}

export function secondsFromDuration(value) {
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

export function metersFromDistance(value, unit = "m") {
  const amount = Number(value || 0);
  if (!amount) return 0;
  if (unit === "mi") return amount * 1609.344;
  if (unit === "km") return amount * 1000;
  return amount;
}

export function parseCsv(text) {
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

export function valueFor(row, names) {
  const entries = Object.entries(row);
  for (const name of names) {
    const match = entries.find(([key]) => key.toLowerCase().replace(/[^a-z0-9]/g, "") === name);
    if (match && match[1] !== "") return match[1];
  }
  return "";
}

export function fetchOptions(options = {}) {
  const { timeoutMs, ...fetchInit } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs || 15000);
  return {
    options: { ...fetchInit, signal: fetchInit.signal || controller.signal },
    cleanup: () => clearTimeout(timeout),
  };
}

export async function fetchJson(url, options = {}) {
  const request = fetchOptions(options);
  const response = await fetch(url, request.options).finally(request.cleanup);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

export async function fetchText(url, options = {}) {
  const request = fetchOptions(options);
  const response = await fetch(url, request.options).finally(request.cleanup);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

export function warnFallback(name, error) {
  console.warn(`Using fallback ${name} data: ${error.message}`);
}
