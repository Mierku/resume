import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const SCHEMA_VERSION = 1
const CANONICAL_DASHBOARD_FILE = 'components/dashboard/DashboardWorkbench.tsx'
const PROTECTED_BLOCK_IDS = [
  'visited_sections_init',
  'auth_guard_effect',
  'resolved_active_section',
  'mounted_sections',
  'admin_guard_effect',
  'handle_section_visit',
]

function printUsage() {
  console.error(
    'Usage: node scripts/verify-dashboard-logic-freeze.mjs <baseline|compare> --file <path> [--baseline <path>] --out <path>',
  )
}

function parseArgs(argv) {
  const [mode, ...rest] = argv
  const result = {
    mode,
    file: '',
    baseline: '',
    out: '',
  }

  for (let index = 0; index < rest.length; index += 1) {
    const current = rest[index]

    if (current === '--file') {
      result.file = String(rest[index + 1] || '').trim()
      index += 1
      continue
    }

    if (current === '--baseline') {
      result.baseline = String(rest[index + 1] || '').trim()
      index += 1
      continue
    }

    if (current === '--out') {
      result.out = String(rest[index + 1] || '').trim()
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

function collapseWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function normalizeBlock(value) {
  return collapseWhitespace(stripComments(value))
}

function toRelativeDisplayPath(targetPath) {
  const absolutePath = path.resolve(targetPath)
  const normalizedAbsolute = absolutePath.split(path.sep).join('/')

  if (normalizedAbsolute.endsWith(`/${CANONICAL_DASHBOARD_FILE}`)) {
    return CANONICAL_DASHBOARD_FILE
  }

  return path.relative(process.cwd(), absolutePath).split(path.sep).join('/')
}

function getLineNumber(source, index) {
  if (index <= 0) {
    return 1
  }

  return source.slice(0, index).split(/\r?\n/).length
}

function findLineEnd(source, index) {
  const lineEnd = source.indexOf('\n', index)
  return lineEnd === -1 ? source.length : lineEnd
}

function findMatchingCharacter(source, openIndex, openChar, closeChar) {
  let depth = 0
  let inSingleQuote = false
  let inDoubleQuote = false
  let inTemplateLiteral = false
  let inLineComment = false
  let inBlockComment = false

  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index]
    const nextCharacter = source[index + 1]
    const previousCharacter = source[index - 1]

    if (inLineComment) {
      if (character === '\n') {
        inLineComment = false
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
      if (character === "'" && previousCharacter !== '\\') {
        inSingleQuote = false
      }
      continue
    }

    if (inDoubleQuote) {
      if (character === '"' && previousCharacter !== '\\') {
        inDoubleQuote = false
      }
      continue
    }

    if (inTemplateLiteral) {
      if (character === '`' && previousCharacter !== '\\') {
        inTemplateLiteral = false
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
      continue
    }

    if (character === '"') {
      inDoubleQuote = true
      continue
    }

    if (character === '`') {
      inTemplateLiteral = true
      continue
    }

    if (character === openChar) {
      depth += 1
      continue
    }

    if (character === closeChar) {
      depth -= 1

      if (depth === 0) {
        return index
      }
    }
  }

  return -1
}

function extractFromBraceStart(source, id, anchor, startIndex, lineEndStrategy = 'line-end') {
  if (startIndex === -1) {
    return {
      id,
      anchor,
      status: 'fail',
      reason: `Missing anchor: ${anchor}`,
      lineStart: 0,
      lineEnd: 0,
      normalizedHash: '',
    }
  }

  const openBraceIndex = source.indexOf('{', startIndex)
  if (openBraceIndex === -1) {
    return {
      id,
      anchor,
      status: 'fail',
      reason: `Missing opening brace after anchor: ${anchor}`,
      lineStart: 0,
      lineEnd: 0,
      normalizedHash: '',
    }
  }

  const closeBraceIndex = findMatchingCharacter(source, openBraceIndex, '{', '}')
  if (closeBraceIndex === -1) {
    return {
      id,
      anchor,
      status: 'fail',
      reason: `Missing closing brace for anchor: ${anchor}`,
      lineStart: 0,
      lineEnd: 0,
      normalizedHash: '',
    }
  }

  const endIndex =
    lineEndStrategy === 'line-end'
      ? findLineEnd(source, closeBraceIndex)
      : closeBraceIndex + 1

  return finalizeExtractedBlock(source, id, anchor, startIndex, endIndex)
}

function extractLineStatement(source, id, anchor) {
  const startIndex = source.indexOf(anchor)

  if (startIndex === -1) {
    return {
      id,
      anchor,
      status: 'fail',
      reason: `Missing anchor: ${anchor}`,
      lineStart: 0,
      lineEnd: 0,
      normalizedHash: '',
    }
  }

  return finalizeExtractedBlock(source, id, anchor, startIndex, findLineEnd(source, startIndex))
}

function extractUseEffectByNeedle(source, id, needle) {
  const needleIndex = source.indexOf(needle)

  if (needleIndex === -1) {
    return {
      id,
      anchor: needle,
      status: 'fail',
      reason: `Missing assertion needle: ${needle}`,
      lineStart: 0,
      lineEnd: 0,
      normalizedHash: '',
    }
  }

  const startIndex = source.lastIndexOf('useEffect(() => {', needleIndex)
  if (startIndex === -1) {
    return {
      id,
      anchor: needle,
      status: 'fail',
      reason: `Missing useEffect anchor for needle: ${needle}`,
      lineStart: 0,
      lineEnd: 0,
      normalizedHash: '',
    }
  }

  const openParenIndex = source.indexOf('(', startIndex)
  const closeParenIndex = openParenIndex === -1 ? -1 : findMatchingCharacter(source, openParenIndex, '(', ')')

  if (closeParenIndex === -1) {
    return {
      id,
      anchor: needle,
      status: 'fail',
      reason: `Unbalanced useEffect call for needle: ${needle}`,
      lineStart: 0,
      lineEnd: 0,
      normalizedHash: '',
    }
  }

  return finalizeExtractedBlock(source, id, needle, startIndex, findLineEnd(source, closeParenIndex))
}

function finalizeExtractedBlock(source, id, anchor, startIndex, endIndex) {
  const raw = source.slice(startIndex, endIndex).trimEnd()

  if (!raw) {
    return {
      id,
      anchor,
      status: 'fail',
      reason: `Empty block for anchor: ${anchor}`,
      lineStart: 0,
      lineEnd: 0,
      normalizedHash: '',
    }
  }

  const normalized = normalizeBlock(raw)

  return {
    id,
    anchor,
    status: normalized ? 'pass' : 'fail',
    reason: normalized ? null : `Unable to normalize block for anchor: ${anchor}`,
    lineStart: getLineNumber(source, startIndex),
    lineEnd: getLineNumber(source, Math.max(startIndex, endIndex - 1)),
    normalizedHash: normalized ? crypto.createHash('sha256').update(normalized).digest('hex') : '',
  }
}

function collectProtectedBlocks(source) {
  return [
    extractFromBraceStart(
      source,
      'visited_sections_init',
      'const [visitedSections, setVisitedSections] = useState<Record<DashboardSection, boolean>>({',
      source.indexOf('const [visitedSections, setVisitedSections] = useState<Record<DashboardSection, boolean>>({'),
    ),
    extractUseEffectByNeedle(source, 'auth_guard_effect', '/login?next='),
    extractLineStatement(source, 'resolved_active_section', 'const resolvedActiveSection = '),
    extractFromBraceStart(
      source,
      'mounted_sections',
      'const mountedSections: Record<DashboardSection, boolean> = {',
      source.indexOf('const mountedSections: Record<DashboardSection, boolean> = {'),
    ),
    extractUseEffectByNeedle(source, 'admin_guard_effect', "router.replace(getDashboardSectionHref('tracking'))"),
    extractFromBraceStart(
      source,
      'handle_section_visit',
      'const handleSectionVisit = (section: DashboardSection) => {',
      source.indexOf('const handleSectionVisit = (section: DashboardSection) => {'),
      'brace-only',
    ),
  ]
}

function buildAssertion(id, condition, reason) {
  return {
    id,
    status: condition ? 'pass' : 'fail',
    reason: condition ? null : reason,
  }
}

function collectAssertions(source) {
  const authGuardMatch = /router\.replace\(\s*`\/login\?next=\$\{encodeURIComponent\(nextPath\)\}`\s*\)/.test(source)
  const adminGuardMatch =
    source.includes("if (activeSection !== 'admin-users') return") &&
    source.includes("router.replace(getDashboardSectionHref('tracking'))")

  return [
    buildAssertion('auth_guard_redirect', authGuardMatch, 'Expected router.replace(`/login?next=${encodeURIComponent(nextPath)}`) not found'),
    buildAssertion(
      'admin_guard_redirect',
      adminGuardMatch,
      "Expected admin-users guard fallback to getDashboardSectionHref('tracking') not found",
    ),
  ]
}

function summarizeChecks(protectedBlocks, assertions) {
  const checks = [...protectedBlocks, ...assertions]
  const failed = checks.filter((item) => item.status === 'fail').length
  return {
    totalChecks: checks.length,
    passed: checks.length - failed,
    failed,
  }
}

function createResult({ mode, filePath, protectedBlocks, assertions }) {
  const summary = summarizeChecks(protectedBlocks, assertions)
  return {
    schemaVersion: SCHEMA_VERSION,
    mode,
    status: summary.failed === 0 ? 'pass' : 'fail',
    file: toRelativeDisplayPath(filePath),
    generatedAt: new Date().toISOString(),
    protectedBlocks,
    assertions,
    summary,
  }
}

function loadBaseline(baselinePath) {
  try {
    const raw = fs.readFileSync(baselinePath, 'utf8')
    const parsed = JSON.parse(raw)

    if (parsed?.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`Expected schemaVersion ${SCHEMA_VERSION}, received ${String(parsed?.schemaVersion)}`)
    }

    return parsed
  } catch (error) {
    throw new Error(`Failed to load baseline: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function compareAgainstBaseline(result, baseline) {
  const baselineBlocks = new Map((baseline.protectedBlocks || []).map((block) => [block.id, block]))
  const comparedBlocks = result.protectedBlocks.map((block) => {
    if (block.status === 'fail') {
      return block
    }

    const baselineBlock = baselineBlocks.get(block.id)
    if (!baselineBlock) {
      return {
        ...block,
        status: 'fail',
        reason: `Missing baseline block: ${block.id}`,
      }
    }

    if (baselineBlock.normalizedHash !== block.normalizedHash) {
      return {
        ...block,
        status: 'fail',
        reason: `Hash mismatch with baseline for ${block.id}`,
      }
    }

    return block
  })

  const protectedBlockIds = new Set(comparedBlocks.map((block) => block.id))
  const missingIds = PROTECTED_BLOCK_IDS.filter((id) => !protectedBlockIds.has(id))
  const missingBlocks = missingIds.map((id) => ({
    id,
    anchor: id,
    status: 'fail',
    reason: `Missing protected block: ${id}`,
    lineStart: 0,
    lineEnd: 0,
    normalizedHash: '',
  }))

  return createResult({
    mode: result.mode,
    filePath: result.file,
    protectedBlocks: [...comparedBlocks, ...missingBlocks],
    assertions: result.assertions,
  })
}

const { mode, file, baseline, out } = parseArgs(process.argv.slice(2))

if ((mode !== 'baseline' && mode !== 'compare') || !file || !out || (mode === 'compare' && !baseline)) {
  printUsage()
  process.exit(1)
}

const filePath = path.resolve(file)
const source = fs.readFileSync(filePath, 'utf8')
const baseResult = createResult({
  mode,
  filePath,
  protectedBlocks: collectProtectedBlocks(source),
  assertions: collectAssertions(source),
})

const result = mode === 'compare' ? compareAgainstBaseline(baseResult, loadBaseline(path.resolve(baseline))) : baseResult

writeJson(path.resolve(out), result)

if (result.status !== 'pass') {
  console.error(`Dashboard logic freeze ${mode} failed: ${result.summary.failed}/${result.summary.totalChecks} checks failed`)
  process.exit(1)
}

console.log(`Dashboard logic freeze ${mode} passed: ${result.summary.passed}/${result.summary.totalChecks} checks`) 
