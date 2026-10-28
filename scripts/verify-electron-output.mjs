import { access } from 'node:fs/promises';

const required = ['dist/main/main.js', 'dist/main/preload.js', 'dist/main/display-policy.mjs'];
for (const path of required) {
  try {
    await access(path);
  } catch {
    console.error(`Electron build is missing runtime file: ${path}`);
    process.exitCode = 1;
  }
}
