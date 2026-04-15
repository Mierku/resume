import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const scopeRoots = ["app", "components"];
const plannedScssFiles = 73;
const acceptedSnapshotScssFiles = 31;
const evidenceRoot = path.join(repoRoot, ".omx/evidence/scss-refactor-v2");
const depthReportPath = path.join(evidenceRoot, "depth-report/all.json");
const baselinePath = path.join(evidenceRoot, "baseline.json");
const latestRunPath = path.join(evidenceRoot, "summary/latest-run.md");

const requiredDirectories = [
  evidenceRoot,
  path.join(evidenceRoot, "impact-map"),
  path.join(evidenceRoot, "depth-report"),
  path.join(evidenceRoot, "visual"),
  path.join(evidenceRoot, "e2e"),
  path.join(evidenceRoot, "summary"),
];

for (const directory of requiredDirectories) {
  fs.mkdirSync(directory, { recursive: true });
}

function walkDirectory(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".git")) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkDirectory(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function normalizePath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function isSelectorBlock(preamble) {
  if (!preamble) {
    return false;
  }

  const normalized = collapseWhitespace(preamble);
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("@")) {
    return false;
  }

  return !normalized.endsWith(":");
}

function computeSelectorComplexity(selector) {
  const normalized = collapseWhitespace(selector);

  if (!normalized) {
    return 0;
  }

  const simpleSelectorCount = normalized
    .split(",")
    .flatMap((part) => part.split(/\s+|>|\+|~/))
    .map((part) => part.trim())
    .filter(Boolean).length;

  const specialTokenCount =
    (normalized.match(/[.#[>:]/g) ?? []).length +
    (normalized.match(/\[[^\]]+\]/g) ?? []).length;

  return simpleSelectorCount + specialTokenCount;
}

function computeOverrideChainLength(selector) {
  const normalized = collapseWhitespace(selector);

  if (!normalized) {
    return 0;
  }

  return Math.max(
    ...normalized
      .split(",")
      .map((part) =>
        part
          .split(/\s+|>|\+|~/)
          .map((token) => token.trim())
          .filter(Boolean).length,
      ),
  );
}

function percentile(values, target) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * target) - 1),
  );

  return sorted[index];
}

function analyzeScssFile(filePath) {
  const rawSource = fs.readFileSync(filePath, "utf8");
  const source = stripComments(rawSource);
  const selectorStack = [];
  const blockStack = [];
  const selectorCounts = new Map();
  const selectorComplexities = [];
  const overrideChainLengths = [];
  const selectorBlocks = [];

  let buffer = "";
  let maxBlockDepth = 0;
  let maxSelectorDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const previousCharacter = source[index - 1];

    if (character === "'" && previousCharacter !== "\\" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      buffer += character;
      continue;
    }

    if (character === '"' && previousCharacter !== "\\" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      buffer += character;
      continue;
    }

    if (inSingleQuote || inDoubleQuote) {
      buffer += character;
      continue;
    }

    if (character === "{") {
      const preamble = collapseWhitespace(buffer);
      const selectorBlock = isSelectorBlock(preamble);
      const selectorDepth =
        (selectorStack.at(-1)?.selectorDepth ?? 0) + (selectorBlock ? 1 : 0);

      blockStack.push({ preamble, selectorBlock, selectorDepth });
      maxBlockDepth = Math.max(maxBlockDepth, blockStack.length);

      if (selectorBlock) {
        selectorStack.push({ selectorDepth });
        maxSelectorDepth = Math.max(maxSelectorDepth, selectorDepth);

        const normalizedSelector = collapseWhitespace(preamble);
        selectorCounts.set(
          normalizedSelector,
          (selectorCounts.get(normalizedSelector) ?? 0) + 1,
        );
        selectorComplexities.push(computeSelectorComplexity(normalizedSelector));
        overrideChainLengths.push(
          computeOverrideChainLength(normalizedSelector),
        );
        selectorBlocks.push({
          selector: normalizedSelector,
          selectorDepth,
        });
      }

      buffer = "";
      continue;
    }

    if (character === "}") {
      const block = blockStack.pop();

      if (block?.selectorBlock) {
        selectorStack.pop();
      }

      buffer = "";
      continue;
    }

    buffer += character;
  }

  const repeatedSelectors = [...selectorCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([selector, count]) => ({ selector, count }));

  const varDefinitions = [...source.matchAll(/(^|[\s;{])(--[A-Za-z0-9_-]+)\s*:/gm)]
    .map((match) => match[2]);

  return {
    path: normalizePath(filePath),
    lines: rawSource.split(/\r?\n/).length,
    maxBlockDepth,
    maxSelectorDepth,
    selectorBlockCount: selectorBlocks.length,
    varDefinitions,
    uniqueVarDefinitions: [...new Set(varDefinitions)].sort(),
    repeatedSelectors,
    selectorComplexityP95: percentile(selectorComplexities, 0.95),
    overrideChainLengthP95: percentile(overrideChainLengths, 0.95),
  };
}

const allFiles = scopeRoots.flatMap((root) =>
  walkDirectory(path.join(repoRoot, root)),
);
const scssFiles = allFiles.filter((filePath) => filePath.endsWith(".scss"));
const cssFiles = allFiles.filter((filePath) => filePath.endsWith(".css"));
const fileReports = scssFiles
  .map(analyzeScssFile)
  .sort((left, right) => left.path.localeCompare(right.path));

const depthViolations = fileReports
  .filter((report) => report.maxSelectorDepth > 3)
  .map((report) => ({
    path: report.path,
    maxSelectorDepth: report.maxSelectorDepth,
  }));

const uniqueVars = [...new Set(fileReports.flatMap((report) => report.uniqueVarDefinitions))].sort();
const repeatedSelectorCount = fileReports.reduce(
  (total, report) =>
    total +
    report.repeatedSelectors.reduce(
      (fileTotal, repeatedSelector) => fileTotal + repeatedSelector.count - 1,
      0,
    ),
  0,
);

const baseline = {
  generatedAt: new Date().toISOString(),
  planReference: ".omx/plans/prd-scss-system-refactor-consensus-20260416.md",
  scope: {
    roots: scopeRoots,
    plannedScssFiles,
    acceptedSnapshotScssFiles,
    actualScssFiles: scssFiles.length,
    cssFilesInScope: cssFiles.map(normalizePath).sort(),
  },
  metrics: {
    totalScssLines: fileReports.reduce((total, report) => total + report.lines, 0),
    uniqueVarDefinitions: uniqueVars.length,
    varDefinitionOccurrences: fileReports.reduce(
      (total, report) => total + report.varDefinitions.length,
      0,
    ),
    repeatedSelectors: repeatedSelectorCount,
    selectorComplexityP95: percentile(
      fileReports.map((report) => report.selectorComplexityP95),
      0.95,
    ),
    overrideChainLengthP95: percentile(
      fileReports.map((report) => report.overrideChainLengthP95),
      0.95,
    ),
    maxSelectorDepth: Math.max(0, ...fileReports.map((report) => report.maxSelectorDepth)),
    filesExceedingDepth: depthViolations,
  },
  notes: [
    `Plan baseline remains ${plannedScssFiles} SCSS files, but the verification lane accepted the current repository snapshot baseline of ${acceptedSnapshotScssFiles} SCSS files per leader steering.`,
    `The repository snapshot seen by the verifier currently contains ${scssFiles.length} SCSS files.`,
    cssFiles.length > 0
      ? `The scope still includes ${cssFiles.length} CSS file(s): ${cssFiles
          .map(normalizePath)
          .join(", ")}.`
      : "No CSS files remain in the scoped app/components tree.",
    "Depth numbers are based on selector-block nesting in the current SCSS source and ignore at-rule wrappers for the selector-depth total.",
  ],
};

fs.writeFileSync(
  depthReportPath,
  `${JSON.stringify(
    {
      generatedAt: baseline.generatedAt,
      plannedScssFiles,
      acceptedSnapshotScssFiles,
      actualScssFiles: scssFiles.length,
      files: fileReports,
    },
    null,
    2,
  )}\n`,
);

fs.writeFileSync(`${baselinePath}`, `${JSON.stringify(baseline, null, 2)}\n`);

const issues = [];

if (scssFiles.length !== acceptedSnapshotScssFiles) {
  issues.push(
    `SCSS coverage mismatch: accepted snapshot baseline ${acceptedSnapshotScssFiles}, found ${scssFiles.length}.`,
  );
}

if (cssFiles.length > 0) {
  issues.push(
    `Non-SCSS files remain in scope: ${cssFiles.map(normalizePath).join(", ")}.`,
  );
}

if (depthViolations.length > 0) {
  issues.push(
    `Selector depth violations remain in ${depthViolations.length} file(s).`,
  );
}

const latestRun = [
  "# qa:scss:v2 latest run",
  "",
  `- Generated: ${baseline.generatedAt}`,
  `- Plan baseline: ${plannedScssFiles} SCSS file(s)`,
  `- Accepted repo snapshot baseline: ${acceptedSnapshotScssFiles} SCSS file(s)`,
  `- Scope: ${scssFiles.length} SCSS file(s), ${cssFiles.length} CSS file(s)`,
  `- Max selector depth: ${baseline.metrics.maxSelectorDepth}`,
  `- Repeated selectors (aggregate): ${baseline.metrics.repeatedSelectors}`,
  `- Selector complexity p95: ${baseline.metrics.selectorComplexityP95}`,
  `- Override chain length p95: ${baseline.metrics.overrideChainLengthP95}`,
  "",
  "## Blocking issues",
  "",
  ...(issues.length > 0
    ? issues.map((issue) => `- ${issue}`)
    : ["- None."]),
  "",
  "## Artifacts",
  "",
  "- `baseline.json`",
  "- `depth-report/all.json`",
].join("\n");

fs.writeFileSync(latestRunPath, `${latestRun}\n`);

if (issues.length > 0) {
  console.error("qa:scss:v2 failed");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exitCode = 1;
} else {
  console.log("qa:scss:v2 passed");
}
