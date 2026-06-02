import { guides, categories, quickChecks, installHints } from "./data.js";

export { guides, categories, quickChecks, installHints };

/* Map each category to a short slug + accent token + one-line description. */
export const categoryMeta = {
  Forensics: {
    slug: "forensics",
    tone: "for",
    blurb: "Files that hide more than they show — images, archives, disks, memory, and audio.",
    hint: "Prove the real file type before you trust the extension.",
  },
  Web: {
    slug: "web",
    tone: "web",
    blurb: "Servers that trust the wrong input — injection, access control, and exposed source.",
    hint: "Map routes and parameters first, then attack the bug the framework invites.",
  },
  Cryptography: {
    slug: "crypto",
    tone: "crypto",
    blurb: "Math used badly — classical ciphers, XOR, RSA mistakes, and broken randomness.",
    hint: "Identify the representation before reaching for an attack.",
  },
  "Binary Exploit": {
    slug: "pwn",
    tone: "pwn",
    blurb: "Memory you can bend — overflows, format strings, ROP, and heap corruption.",
    hint: "Read the protections with checksec before writing a single byte of payload.",
  },
  "Reverse Engineering": {
    slug: "rev",
    tone: "rev",
    blurb: "Programs that don't want to be read — crackmes, packers, bytecode, and mobile apps.",
    hint: "Start static with strings, then trace, then decompile the part that validates.",
  },
  Network: {
    slug: "network",
    tone: "net",
    blurb: "Traffic that says too much — PCAPs, DNS exfil, USB capture, and plaintext protocols.",
    hint: "Get the protocol summary, then follow the stream that carries the flag.",
  },
  Logs: {
    slug: "logs",
    tone: "logs",
    blurb: "Stories told in lines — auth logs, web access logs, Windows events, and cloud trails.",
    hint: "Summarise frequency first, then isolate the rare event after the noise.",
  },
  "General Skills": {
    slug: "general",
    tone: "general",
    blurb: "The cross-cutting toolkit — encodings, QR codes, git history, and hidden Unicode.",
    hint: "Decode one layer at a time and check what the result actually is.",
  },
};

const slugToCategory = Object.fromEntries(
  Object.entries(categoryMeta).map(([name, meta]) => [meta.slug, name]),
);

export function categoryFromSlug(slug) {
  return slugToCategory[slug];
}

export function categoryCount(category) {
  return guides.filter((g) => g.category === category).length;
}

export function guidesInCategory(category) {
  return guides.filter((g) => g.category === category);
}

export function getGuide(id) {
  return guides.find((g) => g.id === id);
}

export function relatedGuides(guide, limit = 6) {
  return guides
    .filter((g) => g.id !== guide.id && g.category === guide.category)
    .slice(0, limit);
}

const FEATURED_ID = "binary-digits-image";
export const featuredGuide = getGuide(FEATURED_ID);

/* ---- search ---- */
function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function words(value) {
  return normalize(value).split(" ").filter(Boolean);
}

/* Word-boundary aware so short tokens like "rsa" don't match "trave[rsa]l". */
export function scoreGuide(guide, query) {
  if (!query) return 1;
  const q = normalize(query);
  if (!q) return 1;

  const title = normalize(guide.title);
  const titleWords = title.split(" ");
  const aliasWords = words((guide.aliases || []).join(" "));
  const catWords = words(guide.category);
  const softText = normalize(
    [guide.symptoms, (guide.commands || []).join(" ")].join(" "),
  );

  let score = 0;
  if (title === q) score += 120;
  else if (title.startsWith(q)) score += 70;
  else if (title.includes(q)) score += 40;

  for (const token of q.split(" ")) {
    if (!token) continue;
    if (titleWords.includes(token)) score += 26;
    else if (titleWords.some((w) => w.startsWith(token))) score += 14;
    else if (title.includes(token)) score += 4;

    if (catWords.includes(token)) score += 16;
    if (aliasWords.includes(token)) score += 12;
    else if (aliasWords.some((w) => w.startsWith(token))) score += 6;

    if (softText.includes(token)) score += 2;
  }
  return score;
}

export function searchGuides(query, { category } = {}) {
  const pool = category ? guidesInCategory(category) : guides;
  const hasQuery = Boolean(query && query.trim());
  return pool
    .map((guide) => ({ guide, score: scoreGuide(guide, query) }))
    .filter((item) => (hasQuery ? item.score > 0 : true))
    .sort(
      (a, b) =>
        b.score - a.score || a.guide.title.localeCompare(b.guide.title),
    )
    .map((item) => item.guide);
}

export const totalGuides = guides.length;
