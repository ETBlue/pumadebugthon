// Refresh the test fixtures in src/test/fixtures/ from the analysis files.
// Runs analysis/scripts/build_json.py into a temp folder, then copies index.json and
// issues/*.json. Fixture files for issues that are no longer built are removed.
// Usage (in app/): npm run fixtures
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const app = join(dirname(fileURLToPath(import.meta.url)), '..')
const analysis = join(app, '..', 'analysis')
const fixtures = join(app, 'src', 'test', 'fixtures')
const tmp = mkdtempSync(join(tmpdir(), 'fixtures-'))

try {
  execFileSync('python3', ['-I', join(analysis, 'scripts', 'build_json.py'), analysis, tmp], { stdio: 'inherit' })
  mkdirSync(join(fixtures, 'issues'), { recursive: true })
  cpSync(join(tmp, 'index.json'), join(fixtures, 'index.json'))
  const built = readdirSync(join(tmp, 'issues')).filter((f) => f.endsWith('.json'))
  for (const f of readdirSync(join(fixtures, 'issues'))) {
    if (f.endsWith('.json') && !built.includes(f)) rmSync(join(fixtures, 'issues', f))
  }
  for (const f of built) cpSync(join(tmp, 'issues', f), join(fixtures, 'issues', f))
  console.log(`copied index.json and ${built.join(', ')} to src/test/fixtures/`)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
