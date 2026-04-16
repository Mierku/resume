#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DESKTOP_MIN_WIDTH = 901;
const MOBILE_MAX_WIDTH = 900;
const MOBILE_DRAWER_SELECTORS = [".drawer", ".drawerOpen", ".drawerBackdrop"];
const SIDEBAR_TEXT_SELECTORS = [
  ".sidebar",
  ".brandTitle",
  ".brandMeta",
  ".navLink",
  ".navText",
  ".sidebarUserLabel",
  ".sidebarUserMeta",
];
const HEADER_TEXT_SELECTORS = [
  ".sectionHeader",
  ".sectionTitle",
  ".sectionPill",
  ".sectionDescription",
  ".sectionEyebrow",
];
const MAIN_EMBEDDED_SELECTORS = [".sections", ".sectionShell", ".sectionFrame"];

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const tsxPath = path.resolve(repoRoot, options.tsx);
  const scssPath = path.resolve(repoRoot, options.scss);
  const outputPath = path.resolve(repoRoot, options.out);
  const viewports = parseViewportList(options.viewports);

  const tsxSource = fs.readFileSync(tsxPath, "utf8");
  const scssSource = fs.readFileSync(scssPath, "utf8");
  const rules = collectRules(stripScssComments(scssSource));

  const dualAppThemeAttributeCount = countMatches(
    tsxSource,
    /<div\s+className=\{styles\.app\}\s+data-dashboard-theme="builder-aligned">/g,
  );

  const desktopResults = [];
  const mobileResults = [];

  for (const viewport of viewports) {
    if (viewport.width >= DESKTOP_MIN_WIDTH) {
      desktopResults.push(
        createDesktopResult(viewport, rules, dualAppThemeAttributeCount),
      );
      continue;
    }

    mobileResults.push(createMobileResult(viewport, rules, tsxSource));
  }

  const checks = [
    {
      id: "dual-root-theme-attribute-count",
      status: dualAppThemeAttributeCount === 2 ? "pass" : "fail",
    },
    ...desktopResults.map((result) => ({
      id: `desktop:${result.viewport}`,
      status: result.status,
    })),
    ...mobileResults.map((result) => ({
      id: `mobile:${result.viewport}`,
      status: result.status,
    })),
  ];

  const passed = checks.filter((check) => check.status === "pass").length;
  const failed = checks.length - passed;
  const status = failed === 0 ? "pass" : "fail";

  const output = {
    schemaVersion: 1,
    status,
    generatedAt: new Date().toISOString(),
    inputs: {
      tsx: toRepoRelative(repoRoot, tsxPath),
      scss: toRepoRelative(repoRoot, scssPath),
      viewports: viewports.map((viewport) => viewport.id),
    },
    results: {
      dualAppThemeAttributeCount,
      desktop: desktopResults,
      mobile: mobileResults,
    },
    summary: {
      totalChecks: checks.length,
      passed,
      failed,
    },
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  if (status === "fail") {
    console.error(
      `verify-dashboard-visual-invariants: failed (${passed}/${checks.length} checks passed)`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `verify-dashboard-visual-invariants: passed (${checks.length}/${checks.length} checks passed)`,
  );
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    options[key] = value;
    index += 1;
  }

  for (const requiredKey of ["tsx", "scss", "viewports", "out"]) {
    if (!options[requiredKey]) {
      throw new Error(`Missing required argument --${requiredKey}`);
    }
  }

  return options;
}

function parseViewportList(rawValue) {
  const viewports = rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = /^(\d+)x(\d+)$/.exec(entry);

      if (!match) {
        throw new Error(`Invalid viewport "${entry}"`);
      }

      return {
        id: entry,
        width: Number(match[1]),
        height: Number(match[2]),
      };
    });

  if (viewports.length === 0) {
    throw new Error("At least one viewport is required");
  }

  return viewports;
}

function stripScssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function countMatches(source, expression) {
  return [...source.matchAll(expression)].length;
}

function toRepoRelative(repoRoot, targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join("/");
}

function collectRules(source, inheritedMedia = [], output = []) {
  let buffer = "";
  let index = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  while (index < source.length) {
    const character = source[index];
    const previousCharacter = source[index - 1];

    if (character === "'" && previousCharacter !== "\\" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      buffer += character;
      index += 1;
      continue;
    }

    if (character === '"' && previousCharacter !== "\\" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      buffer += character;
      index += 1;
      continue;
    }

    if (inSingleQuote || inDoubleQuote) {
      buffer += character;
      index += 1;
      continue;
    }

    if (character === "{") {
      const preamble = collapseWhitespace(buffer);
      const { content, endIndex } = readBalancedBlock(source, index);

      if (preamble.startsWith("@media")) {
        collectRules(content, [...inheritedMedia, preamble], output);
      } else if (preamble && !preamble.startsWith("@")) {
        output.push({
          selectors: splitTopLevelList(preamble),
          declarations: parseDeclarations(content),
          media: inheritedMedia,
        });
      }

      buffer = "";
      index = endIndex + 1;
      continue;
    }

    buffer += character;
    index += 1;
  }

  return output;
}

function readBalancedBlock(source, openBraceIndex) {
  let index = openBraceIndex + 1;
  let depth = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  while (index < source.length) {
    const character = source[index];
    const previousCharacter = source[index - 1];

    if (character === "'" && previousCharacter !== "\\" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      index += 1;
      continue;
    }

    if (character === '"' && previousCharacter !== "\\" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      index += 1;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;

        if (depth === 0) {
          return {
            content: source.slice(openBraceIndex + 1, index),
            endIndex: index,
          };
        }
      }
    }

    index += 1;
  }

  throw new Error("Unbalanced block in SCSS source");
}

function splitTopLevelList(value, delimiter = ",") {
  const parts = [];
  let buffer = "";
  let depth = 0;

  for (const character of value) {
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth = Math.max(0, depth - 1);
    }

    if (character === delimiter && depth === 0) {
      const normalized = collapseWhitespace(buffer);
      if (normalized) {
        parts.push(normalized);
      }
      buffer = "";
      continue;
    }

    buffer += character;
  }

  const finalPart = collapseWhitespace(buffer);
  if (finalPart) {
    parts.push(finalPart);
  }

  return parts;
}

function splitTopLevelWhitespace(value) {
  const parts = [];
  let buffer = "";
  let depth = 0;

  for (const character of value) {
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth = Math.max(0, depth - 1);
    }

    if (/\s/.test(character) && depth === 0) {
      const normalized = collapseWhitespace(buffer);
      if (normalized) {
        parts.push(normalized);
      }
      buffer = "";
      continue;
    }

    buffer += character;
  }

  const finalPart = collapseWhitespace(buffer);
  if (finalPart) {
    parts.push(finalPart);
  }

  return parts;
}

function parseDeclarations(body) {
  const declarations = {};
  let buffer = "";
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    const previousCharacter = body[index - 1];

    if (character === "'" && previousCharacter !== "\\" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      if (depth === 0) {
        buffer += character;
      }
      continue;
    }

    if (character === '"' && previousCharacter !== "\\" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      if (depth === 0) {
        buffer += character;
      }
      continue;
    }

    if (inSingleQuote || inDoubleQuote) {
      if (depth === 0) {
        buffer += character;
      }
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (depth > 0) {
      continue;
    }

    if (character === ";") {
      addDeclaration(buffer, declarations);
      buffer = "";
      continue;
    }

    buffer += character;
  }

  addDeclaration(buffer, declarations);
  return declarations;
}

function addDeclaration(rawDeclaration, declarations) {
  const declaration = collapseWhitespace(rawDeclaration);

  if (!declaration) {
    return;
  }

  const separatorIndex = declaration.indexOf(":");
  if (separatorIndex === -1) {
    return;
  }

  const property = collapseWhitespace(declaration.slice(0, separatorIndex));
  const value = collapseWhitespace(declaration.slice(separatorIndex + 1));

  if (!property || !value) {
    return;
  }

  declarations[property] = value;
}

function mediaMatches(mediaQueries, viewportWidth) {
  return mediaQueries.every((mediaQuery) => {
    const widthConditions = [
      ...mediaQuery.matchAll(/\((min|max)-width:\s*(\d+)px\)/g),
    ];

    if (widthConditions.length === 0) {
      return true;
    }

    return widthConditions.every(([, operator, rawValue]) => {
      const value = Number(rawValue);
      return operator === "min"
        ? viewportWidth >= value
        : viewportWidth <= value;
    });
  });
}

function getComputedDeclarations(rules, viewportWidth) {
  const computed = new Map();

  for (const rule of rules) {
    if (!mediaMatches(rule.media, viewportWidth)) {
      continue;
    }

    for (const selector of rule.selectors) {
      const nextValue = {
        ...(computed.get(selector) ?? {}),
        ...rule.declarations,
      };

      computed.set(selector, nextValue);
    }
  }

  return computed;
}

function getRootVars(computed) {
  const declarations = computed.get(".app") ?? {};
  return Object.fromEntries(
    Object.entries(declarations).filter(([property]) => property.startsWith("--")),
  );
}

function getDeclaration(computed, selectors, properties) {
  for (const selector of selectors) {
    const declarations = computed.get(selector);

    if (!declarations) {
      continue;
    }

    for (const property of properties) {
      if (declarations[property]) {
        return declarations[property];
      }
    }
  }

  return null;
}

function valueUsesToken(value, token) {
  return typeof value === "string" && value.includes(`var(${token}`);
}

function selectorUsesToken(computed, selectors, properties, token) {
  const value = getDeclaration(computed, selectors, properties);
  return valueUsesToken(value, token);
}

function anySelectorUsesToken(computed, selectors, properties, tokens) {
  return selectors.some((selector) =>
    tokens.some((token) =>
      selectorUsesToken(computed, [selector], properties, token),
    ),
  );
}

function resolveSimpleVar(value, variables, depth = 0) {
  if (!value || depth > 10) {
    return collapseWhitespace(value ?? "");
  }

  const normalized = collapseWhitespace(value);
  const match = /^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*(.+))?\)$/.exec(normalized);

  if (!match) {
    return normalized;
  }

  const [, variableName, fallback] = match;
  const resolvedValue = variables[variableName];

  if (resolvedValue) {
    return resolveSimpleVar(resolvedValue, variables, depth + 1);
  }

  if (fallback) {
    return resolveSimpleVar(fallback, variables, depth + 1);
  }

  return normalized;
}

function extractPxValue(value, variables, viewportWidth, depth = 0) {
  if (!value || depth > 10) {
    return null;
  }

  const normalized = collapseWhitespace(value);

  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }

  const pxMatch = /^(-?\d+(?:\.\d+)?)px$/.exec(normalized);
  if (pxMatch) {
    return Number(pxMatch[1]);
  }

  const vwMatch = /^(-?\d+(?:\.\d+)?)vw$/.exec(normalized);
  if (vwMatch) {
    return (Number(vwMatch[1]) / 100) * viewportWidth;
  }

  const varMatch = /^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*(.+))?\)$/.exec(normalized);
  if (varMatch) {
    const [, variableName, fallback] = varMatch;
    if (variables[variableName]) {
      return extractPxValue(variables[variableName], variables, viewportWidth, depth + 1);
    }
    return fallback
      ? extractPxValue(fallback, variables, viewportWidth, depth + 1)
      : null;
  }

  const fnMatch = /^(min|max|clamp)\((.+)\)$/.exec(normalized);
  if (fnMatch) {
    const [, functionName, rawArguments] = fnMatch;
    const values = splitTopLevelList(rawArguments)
      .map((argument) => extractPxValue(argument, variables, viewportWidth, depth + 1))
      .filter((argument) => Number.isFinite(argument));

    if (
      (functionName === "min" || functionName === "max") &&
      values.length >= 2
    ) {
      return functionName === "min"
        ? Math.min(...values)
        : Math.max(...values);
    }

    if (functionName === "clamp" && values.length === 3) {
      const [minimum, preferred, maximum] = values;
      return Math.min(Math.max(preferred, minimum), maximum);
    }
  }

  return null;
}

function computeGeometryDelta(headerValue, sidebarValue, gridValue, variables, viewportWidth) {
  const expressions = [headerValue, sidebarValue, gridValue].map((value) =>
    resolveSimpleVar(value, variables),
  );

  if (expressions.every(Boolean) && expressions.every((value) => value === expressions[0])) {
    return 0;
  }

  const numericValues = [headerValue, sidebarValue, gridValue].map((value) =>
    extractPxValue(value, variables, viewportWidth),
  );

  if (numericValues.every((value) => Number.isFinite(value))) {
    return Math.max(
      Math.abs(numericValues[0] - numericValues[1]),
      Math.abs(numericValues[0] - numericValues[2]),
      Math.abs(numericValues[1] - numericValues[2]),
    );
  }

  return 1;
}

function pickMainEmbeddedSelector(computed) {
  for (const selector of MAIN_EMBEDDED_SELECTORS) {
    const declarations = computed.get(selector);
    if (!declarations) {
      continue;
    }

    if (
      declarations.background ||
      declarations["background-color"] ||
      declarations["border-radius"] ||
      declarations.border ||
      declarations["box-shadow"]
    ) {
      return selector;
    }
  }

  return MAIN_EMBEDDED_SELECTORS[0];
}

function createDesktopResult(viewport, rules, dualAppThemeAttributeCount) {
  const computed = getComputedDeclarations(rules, viewport.width);
  const rootVars = getRootVars(computed);
  const gridTemplateColumns = getDeclaration(
    computed,
    [".layout"],
    ["grid-template-columns"],
  );
  const firstGridTrack = gridTemplateColumns
    ? splitTopLevelWhitespace(gridTemplateColumns)[0] ?? null
    : null;
  const headerHeight =
    getDeclaration(computed, [".sectionHeader"], ["height"]) ??
    getDeclaration(computed, [".sectionHeader"], ["min-height"]);
  const sidebarWidth =
    getDeclaration(computed, [".sidebar"], ["width"]) ?? firstGridTrack;

  const geometryDeltaPx = computeGeometryDelta(
    headerHeight,
    sidebarWidth,
    firstGridTrack,
    rootVars,
    viewport.width,
  );

  const plateContinuity =
    dualAppThemeAttributeCount === 2 &&
    selectorUsesToken(
      computed,
      [".sidebar"],
      ["background", "background-color"],
      "--dash-plate-bg",
    ) &&
    selectorUsesToken(
      computed,
      [".sectionHeader"],
      ["background", "background-color"],
      "--dash-plate-bg",
    ) &&
    anySelectorUsesToken(
      computed,
      SIDEBAR_TEXT_SELECTORS,
      ["color"],
      ["--dash-plate-text", "--dash-plate-text-muted"],
    ) &&
    anySelectorUsesToken(
      computed,
      HEADER_TEXT_SELECTORS,
      ["color"],
      ["--dash-plate-text", "--dash-plate-text-muted"],
    );

  const mainSelector = pickMainEmbeddedSelector(computed);
  const mainBorderRadius = getDeclaration(
    computed,
    [mainSelector],
    ["border-radius"],
  );
  const mainBorder = getDeclaration(
    computed,
    [mainSelector],
    ["border", "border-color"],
  );
  const mainShadow = getDeclaration(computed, [mainSelector], ["box-shadow"]);
  const mainBackground = getDeclaration(
    computed,
    [mainSelector],
    ["background", "background-color"],
  );
  const plateBackground = getDeclaration(
    computed,
    [".sectionHeader", ".sidebar"],
    ["background", "background-color"],
  );
  const radiusPx = extractPxValue(mainBorderRadius, rootVars, viewport.width) ?? 0;
  const hasBorder = Boolean(mainBorder) && !/\b(?:0|none)\b/i.test(mainBorder);
  const hasShadow = Boolean(mainShadow) && !/\bnone\b/i.test(mainShadow);
  const bgDiffFromPlate =
    Boolean(mainBackground) &&
    Boolean(plateBackground) &&
    resolveSimpleVar(mainBackground, rootVars) !==
      resolveSimpleVar(plateBackground, rootVars);
  const mainEmbedded = {
    radiusPx,
    hasBorder,
    hasShadow,
    bgDiffFromPlate,
  };

  const status =
    geometryDeltaPx === 0 &&
    plateContinuity &&
    radiusPx >= 16 &&
    hasBorder &&
    hasShadow &&
    bgDiffFromPlate
      ? "pass"
      : "fail";

  return {
    viewport: viewport.id,
    geometryDeltaPx,
    plateContinuity,
    mainEmbedded,
    status,
  };
}

function createMobileResult(viewport, rules, tsxSource) {
  const computed = getComputedDeclarations(rules, viewport.width);
  const drawerContract = {
    hasDrawer:
      tsxSource.includes("styles.drawer") &&
      computed.has(MOBILE_DRAWER_SELECTORS[0]),
    hasDrawerOpen:
      tsxSource.includes("styles.drawerOpen") &&
      computed.has(MOBILE_DRAWER_SELECTORS[1]),
    hasDrawerBackdrop:
      tsxSource.includes("styles.drawerBackdrop") &&
      computed.has(MOBILE_DRAWER_SELECTORS[2]),
    hasOpenHandler: tsxSource.includes("onClick={() => setMobileNavOpen(true)}"),
    hasCloseHandler: tsxSource.includes("onClick={() => setMobileNavOpen(false)}"),
    hasNavCloseOnVisit: tsxSource.includes("setMobileNavOpen(false)"),
  };

  const status = Object.values(drawerContract).every(Boolean) ? "pass" : "fail";

  return {
    viewport: viewport.id,
    geometryRule: viewport.width <= MOBILE_MAX_WIDTH ? "N/A" : "applies",
    drawerContract,
    status,
  };
}

try {
  main();
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "verify-dashboard-visual-invariants: unknown error",
  );
  process.exitCode = 1;
}
