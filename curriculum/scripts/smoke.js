// Opens the built reader headlessly and checks the basics work.
const puppeteer = require('puppeteer');
const path = require('path');
(async () => {
  const url = require('url').pathToFileURL(path.join(__dirname, '..', 'output', 'index.html')).href;
  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });
  const check = async label => console.log(label, await page.evaluate(() => ({
    active: document.querySelector('.page.active')?.id,
    crumb: document.querySelector('#crumb')?.textContent.trim(),
  })));
  await check('start  ');
  await page.click('.nav-ch[data-id="nodejs"] .nav-ch-link'); await check('click  ');
  await page.keyboard.press('ArrowRight'); await check('next   ');
  await page.type('#search', 'event loop');
  console.log('search ', await page.$$eval('#search-results a', a => a.length), 'results');
  await page.goto(url + '#glossary', { waitUntil: 'domcontentloaded' }); await check('gloss  ');
  await page.screenshot({ path: path.join(__dirname, '..', 'output', 'preview.png') });
  console.log('errors ', errors.length ? errors : 'none');
  await browser.close();
})();
