import {
  guides,
  categories,
  quickChecks,
  installHints,
  tutorialPaths,
} from "./data.js";
import { categoryLabels, plainTitles } from "./friendly.js";

export { guides, categories, quickChecks, installHints, tutorialPaths };

for (const guide of guides) {
  guide.plain = plainTitles[guide.id] || null;
}

export function displayTitle(guide) {
  return guide.plain || guide.title;
}

const baseMeta = {
  Forensics: {
    slug: "forensics",
    tone: "for",
    hint: "Prove what the file really is before you trust its name.",
  },
  Web: {
    slug: "web",
    tone: "web",
    hint: "Look around first at links, forms, and cookies. Then poke the part that trusts your input.",
  },
  Cryptography: {
    slug: "crypto",
    tone: "crypto",
    hint: "Work out how the message is stored before you try to break it.",
  },
  "Binary Exploit": {
    slug: "pwn",
    tone: "pwn",
    hint: "Check the program's defenses with `checksec` before you write any input.",
  },
  "Reverse Engineering": {
    slug: "rev",
    tone: "rev",
    hint: "Read the easy stuff first (text strings), then trace it, then decompile the important part.",
  },
  Network: {
    slug: "network",
    tone: "net",
    hint: "Get a summary of what's in the capture, then follow the conversation that carries the flag.",
  },
  Logs: {
    slug: "logs",
    tone: "logs",
    hint: "Count things first so the one odd line stands out from all the normal noise.",
  },
  "General Skills": {
    slug: "general",
    tone: "general",
    hint: "Decode one layer at a time, and check what you actually got before going again.",
  },
};

export const categoryMeta = Object.fromEntries(
  Object.entries(baseMeta).map(([name, meta]) => {
    const labels = categoryLabels[name];
    return [
      name,
      {
        ...meta,
        friendly: labels.friendly,
        tech: labels.tech,
        blurb: labels.plain,
      },
    ];
  }),
);

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

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function words(value) {
  return normalize(value).split(" ").filter(Boolean);
}

export function scoreGuide(guide, query) {
  if (!query) return 1;
  const q = normalize(query);
  if (!q) return 1;

  const title = normalize(guide.title);
  const plain = normalize(guide.plain || "");
  const titleWords = [...title.split(" "), ...plain.split(" ")].filter(Boolean);
  const aliasWords = words((guide.aliases || []).join(" "));
  const catWords = [...words(guide.category), ...words(categoryLabels[guide.category]?.friendly || "")];
  const softText = normalize(
    [guide.symptoms, (guide.commands || []).join(" ")].join(" "),
  );

  let score = 0;
  if (title === q || plain === q) score += 120;
  else if (title.startsWith(q) || plain.startsWith(q)) score += 70;
  else if (title.includes(q) || plain.includes(q)) score += 40;

  for (const token of q.split(" ")) {
    if (!token) continue;
    if (titleWords.includes(token)) score += 26;
    else if (titleWords.some((w) => w.startsWith(token))) score += 14;
    else if (title.includes(token) || plain.includes(token)) score += 4;

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
