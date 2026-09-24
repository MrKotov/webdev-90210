// For the lecturer and the assistant, not for students.
//
// Runs one exercise's self-check across the whole group and prints a table, so handing in
// is a gate you apply once rather than thirty repositories opened by hand. It clones each
// repository at the exercise's tag into a temporary folder, runs the matching check, and
// reports pass, fail with the first failing line, or why it could not look at all.
//
//   node checks/collect.mjs 3 students.txt
//   node checks/collect.mjs 4 students.txt --url-suffix=.onrender.com
//   node checks/collect.mjs project students.txt   (the pre-defence check, at tag "project")
//
// students.txt holds one student per line, blank lines and # comments ignored:
//
//   12345 https://github.com/someone/webdev-12345
//   12346 https://github.com/someone-else/webdev-12346 https://their-app.onrender.com
//
// A third field, if present, is passed to the check as its argument. Exercise 4's check
// takes the student's live URL there; the others ignore it.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [exercise, list] = process.argv.slice(2).filter((a) => !a.startsWith('--'));

if (!exercise || !list) {
  console.error('Usage: node checks/collect.mjs <exercise number> <file with one student per line>');
  console.error('   e.g. node checks/collect.mjs 3 students.txt');
  process.exit(2);
}

// A number means an exercise; a name means a check of its own, run at a tag of that name.
const numbered = /^\d+$/.test(exercise);
const check = exercise === '1'
  ? join(here, '..', 'mcp-server', 'check.mjs')
  : join(here, numbered ? `ex${exercise}.mjs` : `${exercise}.mjs`);
const tag = numbered ? `ex${exercise}` : exercise;

const students = readFileSync(list, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const [id, repo, argument] = line.split(/\s+/);
    return { id, repo, argument };
  });

/** exercise 1 is checked differently: it needs the student's own start command */
if (exercise === '1') {
  console.error('Exercise 1 cannot be collected automatically: its check needs each student\'s own');
  console.error('start command, which they write in mcp-server/README.md. Run it by hand per repo.');
  process.exit(2);
}

const results = [];
for (const student of students) {
  const workspace = mkdtempSync(join(tmpdir(), 'collect-'));
  let status;
  let detail = '';
  try {
    execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', tag, student.repo, workspace], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  } catch (error) {
    // a missing tag and a repository nobody can read look the same from here, so say which
    const message = String(error.stderr ?? '');
    status = /not found in upstream|Remote branch/i.test(message) ? `no ${tag} tag` : 'cannot clone';
    detail = message.trim().split('\n').pop() ?? '';
    results.push({ ...student, status, detail });
    rmSync(workspace, { recursive: true, force: true });
    continue;
  }

  // From Exercise 3 on, the checks run the student's test suite, and a project with
  // dependencies cannot run it in a bare clone. Install quietly; a failure here is not
  // the student's fault to report, so let the check itself say what is missing.
  try {
    execFileSync('npm', ['ci', '--omit=dev', '--silent'], { cwd: workspace, stdio: 'ignore', timeout: 300_000 });
  } catch {
    try {
      execFileSync('npm', ['install', '--silent'], { cwd: workspace, stdio: 'ignore', timeout: 300_000 });
    } catch {
      /* no package.json, or no network: the check reports what it finds */
    }
  }

  try {
    const output = execFileSync('node', [check, ...(student.argument ? [student.argument] : [])], {
      cwd: workspace,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    status = 'pass';
    detail = output.trim().split('\n').find((l) => /checks passed/.test(l)) ?? '';
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    status = 'FAIL';
    const first = output.split('\n').find((l) => l.startsWith('FAIL'));
    const count = output.split('\n').find((l) => /checks passed/.test(l));
    detail = [count, first].filter(Boolean).join('  ').trim();
  }
  results.push({ ...student, status, detail });
  rmSync(workspace, { recursive: true, force: true });
}

const width = Math.max(...results.map((r) => r.id.length), 7);
const label = Math.max(...results.map((r) => r.status.length));
for (const r of results) {
  console.log(`${r.status.padEnd(label)}  ${r.id.padEnd(width)}  ${r.detail}`);
}

const passed = results.filter((r) => r.status === 'pass').length;
console.log(`\n${passed}/${results.length} cleared the gate for ${tag}`);
console.log('Everyone else has something structural missing: return it as incomplete, and say which line.');
