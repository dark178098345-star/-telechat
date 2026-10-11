'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForParent(pid) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
      await wait(300);
    } catch {
      return;
    }
  }
}

function run(file, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { windowsHide: true, stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`process exited with ${code}`)));
  });
}

async function main() {
  const [installerPath, currentExe, parentPidRaw] = process.argv.slice(2);
  const parentPid = Number(parentPidRaw) || 0;
  if (!installerPath || !currentExe || !parentPid || !fs.existsSync(installerPath)) return;

  await waitForParent(parentPid);
  await run(installerPath, ['/S']);
  await wait(900);

  const targets = [
    path.join(path.dirname(currentExe), 'ExstraChat.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'ExstraChat', 'ExstraChat.exe'),
    currentExe,
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'tele.chat', 'tele.chat.exe')
  ];
  const target = targets.find(file => fs.existsSync(file));
  if (!target || !fs.existsSync(target)) return;
  const appProcess = spawn(target, [], { detached: true, windowsHide: true, stdio: 'ignore' });
  appProcess.unref();
}

main().catch(() => {});
