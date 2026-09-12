const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.URL || 'http://localhost:5174/';
  const outConsole = '/tmp/ct_console.log';
  const outScreenshot = '/tmp/ct_screenshot.png';
  const consoleMsgs = [];
  const failedRequests = [];

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: '/usr/bin/google-chrome-stable',
  });
  const page = await browser.newPage();

  page.on('console', (msg) => {
    try { consoleMsgs.push(`${msg.type().toUpperCase()}: ${msg.text()}`); } catch (e) {}
  });
  page.on('pageerror', (err) => consoleMsgs.push(`PAGEERROR: ${err.toString()}`));
  page.on('requestfailed', (req) => {
    const failure = req.failure();
    failedRequests.push(`${req.url()} — ${failure ? failure.errorText : 'failed'}`);
  });

  page.on('response', (res) => {
    try {
      if (res.status && res.status() >= 400) {
        failedRequests.push(`${res.status()} ${res.url()}`);
      }
    } catch (e) {}
  });

  try {
    const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: outScreenshot, fullPage: true });

    const out = [];
    out.push('# Console messages');
    out.push(...consoleMsgs);
    out.push('\n# Failed requests');
    out.push(...failedRequests);
    fs.writeFileSync(outConsole, out.join('\n'), 'utf8');

    console.log('DONE');
    console.log('console_log:' + outConsole);
    console.log('screenshot:' + outScreenshot);
    if (res) console.log('status:' + res.status());
  } catch (err) {
    console.error('ERROR:', err && err.stack ? err.stack : err);
  } finally {
    await browser.close();
  }
})();
