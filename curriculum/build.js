/**
 * One-command build for the whole Career Book.
 *
 *   node build.js            — plan + reader (fast, ~20s)
 *   node build.js --pdf      — also render the PDF (slow, several minutes)
 *   node build.js --icon     — also regenerate the app icon
 *   node build.js --install  — also (re)create the desktop shortcut
 *   node build.js --all      — everything
 */
const { execFileSync } = require('child_process');
const path = require('path');

const args    = process.argv.slice(2);
const all     = args.includes('--all');
const doPdf   = all || args.includes('--pdf');
const doIcon  = all || args.includes('--icon');
const doInst  = all || args.includes('--install');

function run(label, file, fileArgs = []) {
  process.stdout.write(`\n▶ ${label}\n`);
  execFileSync(process.execPath, [file, ...fileArgs], { cwd: __dirname, stdio: 'inherit' });
}

const t0 = Date.now();

run('Building the 137-day plan', path.join('plan', 'build-plan.js'));
run('Compiling the book', 'compile.js', doPdf ? [] : ['--html-only']);
if (doIcon) run('Generating the app icon', path.join('app', 'make-icon.js'));

if (doInst) {
  process.stdout.write('\n▶ Installing the desktop shortcut\n');
  execFileSync('powershell', [
    '-ExecutionPolicy', 'Bypass',
    '-File', path.join(__dirname, 'app', 'install-app.ps1')
  ], { cwd: __dirname, stdio: 'inherit' });
}

run('Verifying the reader', path.join('plan', 'smoke-test.js'));

console.log(`\n✓ Build complete in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
