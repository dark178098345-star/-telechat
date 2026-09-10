const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<body></body>' }));
    await page.goto('http://telechat.test/');
    await page.evaluate(() => {
      window.onlineCalls = 0;
      window.statusCalls = 0;
      window.contactsCalls = 0;
      window.badgeCalls = 0;
      window.updateOnline = async () => { onlineCalls++; await new Promise(resolve => setTimeout(resolve, 20)); };
      window.updateStatusBar = async () => { statusCalls++; await new Promise(resolve => setTimeout(resolve, 20)); };
      window.renderContacts = async () => { contactsCalls++; await new Promise(resolve => setTimeout(resolve, 20)); };
      window.enhanceVerifiedBadges = () => { badgeCalls++; };
      localStorage.removeItem('telechat_calm_mode_v95');
    });
    await page.addScriptTag({ path: path.join(root, 'performance-v107.js') });
    assert.equal(await page.evaluate(() => document.body.classList.contains('telechat-calm-v107')), false, 'normal mode must not alter the interface');

    await page.evaluate(async () => {
      await Promise.all([updateOnline(), updateOnline(), updateOnline()]);
      await Promise.all([updateStatusBar(), updateStatusBar()]);
      await Promise.all([renderContacts(), renderContacts()]);
      enhanceVerifiedBadges();
      enhanceVerifiedBadges();
    });
    assert.equal(await page.evaluate(() => onlineCalls), 1, 'online heartbeat must be single-flight');
    assert.equal(await page.evaluate(() => statusCalls), 1, 'status refresh must be single-flight');
    assert.equal(await page.evaluate(() => contactsCalls), 1, 'sidebar refresh must be single-flight');
    await page.waitForTimeout(40);
    assert.equal(await page.evaluate(() => badgeCalls), 1, 'badge decoration must be one paint per frame');

    await page.evaluate(() => {
      localStorage.setItem('telechat_calm_mode_v95', 'true');
      document.body.append(Object.assign(document.createElement('input'), { id: 'calm-mode-v95', type: 'checkbox' }));
      document.querySelector('#calm-mode-v95').checked = true;
      document.querySelector('#calm-mode-v95').dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(20);
    assert(await page.evaluate(() => document.body.classList.contains('telechat-calm-v107')), 'calm mode must only add the performance class');
    console.log('V107 browser: duplicate heartbeats, sidebar paints and badge frames are coalesced; calm mode keeps the same UI and pauses decoration.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
