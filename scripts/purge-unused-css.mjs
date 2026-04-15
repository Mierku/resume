#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { PurgeCSS } from "purgecss";

const isDryRun = process.argv.includes("--dry-run");

const contentGlobs = [
  "app/**/*.{js,jsx,ts,tsx,mdx}",
  "components/**/*.{js,jsx,ts,tsx,mdx}",
  "lib/**/*.{js,jsx,ts,tsx,mdx}",
  "server/**/*.{js,jsx,ts,tsx,mdx}",
  "scripts/**/*.{js,mjs,cjs,ts}",
  "auth.ts",
  "next.config.ts",
];

const cssGlobs = ["app/**/*.scss", "components/**/*.scss"];

const safelist = {
  standard: [
    /^is-/,
    /^has-/,
    /^rdp-/,
    /^react-colorful__/,
    /^ProseMirror/,
    /^tiptap/,
  ],
  greedy: [/:global/],
};

const defaultExtractor = (content) => content.match(/[\w-/:]+(?<!:)/g) || [];

const formatBytes = (bytes) => `${(bytes / 1024).toFixed(2)} KB`;

const purged = await new PurgeCSS().purge({
  content: contentGlobs,
  css: cssGlobs,
  safelist,
  defaultExtractor,
  fontFace: true,
  keyframes: true,
  variables: true,
});

let changedCount = 0;
let removedBytes = 0;

for (const item of purged) {
  if (!item.file) {
    continue;
  }

  const filePath = path.resolve(process.cwd(), item.file);
  const originalCss = await readFile(filePath, "utf8");
  const purgedCss = `${item.css.trimEnd()}\n`;

  const originalBytes = Buffer.byteLength(originalCss, "utf8");
  const purgedBytes = Buffer.byteLength(purgedCss, "utf8");
  const delta = originalBytes - purgedBytes;

  if (delta <= 0) {
    continue;
  }

  changedCount += 1;
  removedBytes += delta;

  if (!isDryRun) {
    await writeFile(filePath, purgedCss, "utf8");
  }

  const prefix = isDryRun ? "[dry-run]" : "[updated]";
  console.log(
    `${prefix} ${item.file} | ${formatBytes(originalBytes)} -> ${formatBytes(
      purgedBytes,
    )} | -${formatBytes(delta)}`,
  );
}

console.log(
  `\n${isDryRun ? "Dry run complete" : "Purge complete"}: ${changedCount} files, removed ${formatBytes(
    removedBytes,
  )}`,
);
