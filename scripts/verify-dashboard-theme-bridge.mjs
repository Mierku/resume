import fs from 'node:fs'
import path from 'node:path'

const SCHEMA_VERSION = 1
const CANONICAL_TSX = 'components/dashboard/DashboardWorkbench.tsx'
const CANONICAL_SCSS = 'components/dashboard/dashboard-workbench.module.scss'
const REQUIRED_SOURCE_VARS = [
  '--builder-workspace-bg',
  '--builder-panel-bg',
  '--builder-panel-text',
  '--builder-panel-text-muted',
  '--builder-card-bg',
  '--builder-toolbar-shadow',
]
const REQUIRED_BRIDGE_VARS = [
  '--dash-bridge-workspace-bg',
  '--dash-bridge-plate-bg',
  '--dash-bridge-plate-text',
  '--dash-bridge-plate-text-muted',
  '--dash-bridge-card-bg',
  '--dash-bridge-plate-shadow',
]
const REQUIRED_CONSUMER_VARS = [
  '--dash-bg',
  '--dash-plate-bg',
  '--dash-plate-text',
  '--dash-plate-text-muted',
  '--dash-card',
  '--dash-plate-shadow',
]
const CHAIN_SPECS = [
  {
    key: 'workspace',
    source: '--builder-workspace-bg',
    bridge: '--dash-bridge-workspace-bg',
    consumer: '--dash-bg',
  },
  {
    key: 'plateBg',
    source: '--builder-panel-bg',
    bridge: '--dash-bridge-plate-bg',
    consumer: '--dash-plate-bg',
  },
  {
    key: 'plateText',
    source: '--builder-panel-text',
    bridge: '--dash-bridge-plate-text',
    consumer: '--dash-plate-text',
  },
  {
    key: 'plateTextMuted',
    source: '--builder-panel-text-muted',
    bridge: '--dash-bridge-plate-text-muted',
    consumer: '--dash-plate-text-muted',
  },
  {
    key: 'card',
    source: '--builder-card-bg',
    bridge: '--dash-bridge-card-bg',
    consumer: '--dash-card',
  },
  {
    key: 'plateShadow',
    source: '--builder-toolbar-shadow',
    bridge: '--dash-bridge-plate-shadow',
    consumer: '--dash-plate-shadow',
  },
]
const SOURCE_FILE_CANDIDATES = ['components/resume-builder/workbench/workbench-layout.scss']

function printUsage() {
  console.error(
    'Usage: node scripts/verify-dashboard-theme-bridge.mjs --tsx <path> --scss <path> --source-selector <selector> --bridge-selector <selector> --out <path>',
  )
}

function parseArgs(argv) {
  const result = {
    tsx: '',
    scss: '',
    sourceSelector: '',
    bridgeSelector: '',
    out: '',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]

    if (current === '--tsx') {
      result.tsx = String(argv[index + 1] || '').trim()
      index += 1
      continue
    }

    if (current === '--scss') {
      result.scss = String(argv[index + 1] || '').trim()
      index += 1
      continue
    }

    if (current === '--source-selector') {
      result.sourceSelector = String(argv[index + 1] || '').trim()
      index += 1
      continue
    }

    if (current === '--bridge-selector') {
      result.bridgeSelector = String(argv[index + 1] || '').trim()
      index += 1
      continue
    }

    if (current === '--out') {
      result.out = String(argv[index + 1] || '').trim()
      index += 1
    }
  }

  return result
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function writeJson(filePath, value) {
  ensureDirectory(filePath)
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function normalizeDisplayPath(targetPath, canonicalPath) {
  const absolutePath = path.resolve(targetPath)
  const normalizedAbsolute = absolutePath.split(path.sep).join('/')

  if (normalizedAbsolute.endsWith(`/${canonicalPath}`)) {
    return canonicalPath
  }

  return path.relative(process.cwd(), absolutePath).split(path.sep).join('/')
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeSelector(selector) {
  return collapseWhitespace(selector).replace(/"/g, "'")
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function walkDirectory(directory) {
  if (!fs.existsSync(directory)) {
    return []
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) {
      continue
    }

    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...walkDirectory(fullPath))
      continue
    }

    files.push(fullPath)
  }

  return files
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function parseScssBlocks(source) {
  const blocks = []
  const stack = []
  let buffer = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let inLineComment = false
  let inBlockComment = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    const nextCharacter = source[index + 1]
    const previousCharacter = source[index - 1]

    if (inLineComment) {
      if (character === '\n') {
        inLineComment = false
        buffer += character
      }
      continue
    }

    if (inBlockComment) {
      if (previousCharacter === '*' && character === '/') {
        inBlockComment = false
      }
      continue
    }

    if (inSingleQuote) {
      buffer += character
      if (character === "'" && previousCharacter !== '\\') {
        inSingleQuote = false
      }
      continue
    }

    if (inDoubleQuote) {
      buffer += character
      if (character === '"' && previousCharacter !== '\\') {
        inDoubleQuote = false
      }
      continue
    }

    if (character === '/' && nextCharacter === '/') {
      inLineComment = true
      index += 1
      continue
    }

    if (character === '/' && nextCharacter === '*') {
      inBlockComment = true
      index += 1
      continue
    }

    if (character === "'") {
      inSingleQuote = true
      buffer += character
      continue
    }

    if (character === '"') {
      inDoubleQuote = true
      buffer += character
      continue
    }

    if (character === '{') {
      const preamble = collapseWhitespace(buffer)
      stack.push({ preamble, bodyStart: index + 1 })
      buffer = ''
      continue
    }

    if (character === '}') {
      const block = stack.pop()

      if (block) {
        blocks.push({
          preamble: block.preamble,
          body: source.slice(block.bodyStart, index),
        })
      }

      buffer = ''
      continue
    }

    buffer += character
  }

  return blocks
}

function collectVarsFromText(text) {
  const definitions = new Map()
  const matches = text.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g)

  for (const match of matches) {
    definitions.set(match[1], collapseWhitespace(match[2]))
  }

  return definitions
}

function collectBlocksBySelector(blocks, selectorNeedle) {
  const normalizedNeedle = normalizeSelector(selectorNeedle)
  return blocks.filter((block) => normalizeSelector(block.preamble).includes(normalizedNeedle))
}

function collectSelectorFamilyBlocks(blocks, selectorPattern) {
  return blocks.filter((block) => selectorPattern.test(normalizeSelector(block.preamble)))
}

function findSourceScssFile(sourceSelector) {
  for (const candidate of SOURCE_FILE_CANDIDATES) {
    const absoluteCandidate = path.resolve(candidate)
    if (!fs.existsSync(absoluteCandidate)) {
      continue
    }

    const candidateSource = fs.readFileSync(absoluteCandidate, 'utf8')
    if (candidateSource.includes(sourceSelector)) {
      return absoluteCandidate
    }
  }

  const fallback = walkDirectory(path.resolve('components')).find((filePath) => {
    if (!filePath.endsWith('.scss')) {
      return false
    }

    const source = fs.readFileSync(filePath, 'utf8')
    return source.includes(sourceSelector)
  })

  return fallback || ''
}

function hasVarReference(value, variableName) {
  return new RegExp(`var\\(\\s*${escapeRegExp(variableName)}\\s*,`).test(value)
}

function usesDashVar(blocks, selectorPattern, variableName) {
  return collectSelectorFamilyBlocks(blocks, selectorPattern).some((block) => block.body.includes(`var(${variableName}`))
}

function summarizeChecks(checks) {
  const failed = checks.filter((check) => !check.passed).length
  return {
    totalChecks: checks.length,
    passed: checks.length - failed,
    failed,
  }
}

const { tsx, scss, sourceSelector, bridgeSelector, out } = parseArgs(process.argv.slice(2))

if (!tsx || !scss || !sourceSelector || !bridgeSelector || !out) {
  printUsage()
  process.exit(1)
}

const tsxPath = path.resolve(tsx)
const scssPath = path.resolve(scss)
const sourceScssPath = findSourceScssFile(sourceSelector)

if (!sourceScssPath) {
  console.error(`Unable to find a source SCSS file for selector ${sourceSelector}`)
  process.exit(1)
}

const tsxSource = fs.readFileSync(tsxPath, 'utf8')
const scssSource = fs.readFileSync(scssPath, 'utf8')
const sourceScssSource = fs.readFileSync(sourceScssPath, 'utf8')
const scssBlocks = parseScssBlocks(stripComments(scssSource))
const sourceBlocks = parseScssBlocks(stripComments(sourceScssSource))

const sourceVars = new Map()
for (const block of collectBlocksBySelector(sourceBlocks, sourceSelector)) {
  for (const [key, value] of collectVarsFromText(block.body)) {
    sourceVars.set(key, value)
  }
}

const bridgeVars = new Map()
for (const block of collectBlocksBySelector(scssBlocks, bridgeSelector)) {
  for (const [key, value] of collectVarsFromText(block.body)) {
    bridgeVars.set(key, value)
  }
}

const consumerVars = collectVarsFromText(stripComments(scssSource))
const dualAppThemeAttributeCount =
  tsxSource.match(/<div\b(?=[^>]*className=\{styles\.app\})(?=[^>]*data-dashboard-theme=["']builder-aligned["'])[^>]*>/g)?.length || 0

const chainIntegrity = Object.fromEntries(
  CHAIN_SPECS.map(({ key, source, bridge, consumer }) => {
    const bridgeValue = bridgeVars.get(bridge) || ''
    const consumerValue = consumerVars.get(consumer) || ''
    const chainPass =
      Boolean(bridgeValue) &&
      Boolean(consumerValue) &&
      hasVarReference(bridgeValue, source) &&
      hasVarReference(consumerValue, bridge) &&
      !hasVarReference(consumerValue, source)

    return [key, chainPass ? 'pass' : 'fail']
  }),
)

const sidebarSelectorPattern = /\.[\w-]*sidebar[\w-]*/i
const headerSelectorPattern = /\.[\w-]*header[\w-]*/i
const plateContinuityChainValid =
  usesDashVar(scssBlocks, sidebarSelectorPattern, '--dash-plate-bg') &&
  usesDashVar(scssBlocks, sidebarSelectorPattern, '--dash-plate-text') &&
  usesDashVar(scssBlocks, headerSelectorPattern, '--dash-plate-bg') &&
  usesDashVar(scssBlocks, headerSelectorPattern, '--dash-plate-text')

const sourceVarsPresent = REQUIRED_SOURCE_VARS.every((variableName) => sourceVars.has(variableName))
const bridgeVarsPresent = REQUIRED_BRIDGE_VARS.every((variableName) => bridgeVars.has(variableName))
const consumerVarsPresent = REQUIRED_CONSUMER_VARS.every((variableName) => consumerVars.has(variableName))

const checks = [
  { name: 'sourceVarsPresent', passed: sourceVarsPresent },
  { name: 'bridgeVarsPresent', passed: bridgeVarsPresent },
  { name: 'consumerVarsPresent', passed: consumerVarsPresent },
  ...Object.entries(chainIntegrity).map(([name, status]) => ({ name, passed: status === 'pass' })),
  { name: 'plateContinuityChainValid', passed: plateContinuityChainValid },
  { name: 'dualAppThemeAttributeCount', passed: dualAppThemeAttributeCount === 2 },
]
const summary = summarizeChecks(checks)
const result = {
  schemaVersion: SCHEMA_VERSION,
  status: summary.failed === 0 ? 'pass' : 'fail',
  generatedAt: new Date().toISOString(),
  inputs: {
    tsx: normalizeDisplayPath(tsxPath, CANONICAL_TSX),
    scss: normalizeDisplayPath(scssPath, CANONICAL_SCSS),
    sourceSelector,
    bridgeSelector,
  },
  required: {
    sourceVars: REQUIRED_SOURCE_VARS,
    bridgeVars: REQUIRED_BRIDGE_VARS,
    consumerVars: REQUIRED_CONSUMER_VARS,
  },
  results: {
    sourceVarsPresent,
    bridgeVarsPresent,
    consumerVarsPresent,
    chainIntegrity,
    plateContinuityChainValid,
    dualAppThemeAttributeCount,
  },
  summary,
}

writeJson(path.resolve(out), result)

if (result.status !== 'pass') {
  console.error(`Dashboard theme bridge verification failed: ${result.summary.failed}/${result.summary.totalChecks} checks failed`)
  process.exit(1)
}

console.log(`Dashboard theme bridge verification passed: ${result.summary.passed}/${result.summary.totalChecks} checks`)
