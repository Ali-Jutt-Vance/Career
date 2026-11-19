/**
 * One-command build for the book.
 *
 *   node build.js            check the chapters, then build the reader
 *   node build.js --pdf      also render output/book.pdf (slow)
 *   node build.js --install  also (re)create the desktop shortcut
 */
const { execFileSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const run = (label, file, fileArgs = []) => {
  process.stdout.write(`\n▶ ${label}\n`);
  execFileSync(process.execPath, [file, ...fileArgs], { cwd: __dirname, stdio: 'inherit' });
};

run('Checking chapters', path.join('scripts', 'check.js'));
run('Compiling the book', 'compile.js', args.includes('--pdf') ? ['--pdf'] : []);

if (args.includes('--install')) {
  process.stdout.write('\n▶ Installing the desktop shortcut\n');
  execFileSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'app', 'install-app.ps1')],
    { cwd: __dirname, stdio: 'inherit' });
}
