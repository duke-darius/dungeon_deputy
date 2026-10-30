import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { appendFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '../..');
const artifactsRoot = join(root, 'artifacts', 'e2e');
const runId = `${new Date().toISOString().replaceAll(':','-')}-${randomUUID().slice(0,8)}`;
export const evidence = join(artifactsRoot, runId);
const dataRoot = join(evidence, 'data');
const backendBuildRoot = join(evidence, 'backend-build');
const backendRoot = join(backendBuildRoot, 'backend-win-x64');
const children = [];
const dataRoots = new Set([dataRoot]);
const logs = [];
const rendererErrors = [];
let ownedVite = false;
  const { DUNGEON_DEPUTY_E2E_AUDIO_SAVE_DELAY_MS: _ignoredDelay, DUNGEON_DEPUTY_E2E_AUDIO_SAVE_FAIL_FIRST: _ignoredFailure, DUNGEON_DEPUTY_E2E_AUDIO_INVALID_FIXTURE: _invalidFixture, DUNGEON_DEPUTY_E2E_AUDIO_FAIL_IMPORT_FIRST: _failImport, ...childEnvironment } = process.env;

function note(text) { const line=`${new Date().toISOString()} ${text}`;logs.push(line);try{appendFileSync(join(evidence,'run.log'),line+'\n');}catch{} }
function treeKill(child) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); } }
}
async function dashboardIsHere() {
  try { const r=await fetch('http://127.0.0.1:5173/index.html',{signal:AbortSignal.timeout(2500)});const s=await r.text();return r.ok&&s.includes('Starting Dungeon Deputy')&&s.includes('/src/main.tsx'); }
  catch { return false; }
}
async function waitDashboard(child) {
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){if(child.exitCode!==null)throw new Error(`Owned Vite exited (${child.exitCode}).`);if(await dashboardIsHere())return;await new Promise(r=>setTimeout(r,200));}
  throw new Error('Renderer readiness timed out on the strict port 5173.');
}
export async function setup() {
  const ignored=spawnSync('git',['check-ignore','-q','artifacts/e2e/probe'],{cwd:root});
  if(ignored.status!==0)throw new Error('Refusing evidence output: artifacts/e2e is not git-ignored.');
  const tracked=spawnSync('git',['ls-files','artifacts/e2e'],{cwd:root,encoding:'utf8'});
  if(tracked.stdout.trim())throw new Error('Refusing evidence output: artifacts/e2e contains tracked files.');
  await mkdir(evidence,{recursive:true});
  note(`run=${runId}; isolated data=${dataRoot}; backend=${backendRoot}`);
  const published=spawnSync(process.execPath,[join(root,'scripts/package-backend.mjs'),'win-x64'],{cwd:root,env:{...childEnvironment,DUNGEON_DEPUTY_BACKEND_ROOT:backendBuildRoot},encoding:'utf8'});
  if(published.stdout)note(`BACKEND PUBLISH ${published.stdout}`);if(published.stderr)note(`BACKEND PUBLISH STDERR ${published.stderr}`);
  if(published.status!==0)throw new Error(`Could not publish isolated E2E backend (${published.status}).`);
  if(!(await dashboardIsHere())){
    const vite=spawn(process.execPath,[join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5173','--strictPort'],{cwd:root,env:childEnvironment,windowsHide:true,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
    children.push(vite);ownedVite=true;
    vite.stdout.on('data',b=>note(`VITE ${b}`));vite.stderr.on('data',b=>note(`VITE ERROR ${b}`));
    vite.once('error',e=>note(`VITE SPAWN ERROR ${e}`));
    await waitDashboard(vite);
  } else note('Reusing validated external project dashboard Vite; not owned.');
}
export async function launch(testDataRoot = dataRoot, injectFirstFailure = true) {
  dataRoots.add(testDataRoot);
  await mkdir(testDataRoot, { recursive: true });
  const require=createRequire(import.meta.url);const { _electron: electron }=require('playwright-core');
  const executable=join(root,'node_modules/electron/dist/electron.exe');
  const app=await electron.launch({executablePath:executable,args:[`--user-data-dir=${join(testDataRoot,'chromium-profile')}`,root],cwd:root,env:{...childEnvironment,DUNGEON_DEPUTY_E2E:'1',DUNGEON_DEPUTY_DATA_DIR:testDataRoot,DUNGEON_DEPUTY_BACKEND_ROOT:backendRoot,DUNGEON_DEPUTY_DEV_URL:'http://127.0.0.1:5173',...(process.env.DUNGEON_DEPUTY_E2E_AUDIO_FIXTURE?{DUNGEON_DEPUTY_E2E_AUDIO_FIXTURE:process.env.DUNGEON_DEPUTY_E2E_AUDIO_FIXTURE}:{}),...(injectFirstFailure&&process.env.DUNGEON_DEPUTY_E2E_AUDIO_INVALID_FIXTURE?{DUNGEON_DEPUTY_E2E_AUDIO_INVALID_FIXTURE:process.env.DUNGEON_DEPUTY_E2E_AUDIO_INVALID_FIXTURE,DUNGEON_DEPUTY_E2E_AUDIO_FAIL_IMPORT_FIRST:'1'}:{}),DUNGEON_DEPUTY_E2E_AUDIO_SAVE_DELAY_MS:'700',...(injectFirstFailure?{DUNGEON_DEPUTY_E2E_AUDIO_SAVE_FAIL_FIRST:'1'}:{})},timeout:30000,dumpio:true});
  app.on('console',msg=>{const line=`ELECTRON CONSOLE ${msg.type()}: ${msg.text()}`;note(line);if(msg.type()==='error'&&!msg.text().includes('Soundboard save failed. Your previous settings were restored; try again.'))rendererErrors.push(line);});
  app.on('window',page=>{page.on('console',m=>{const line=`${page.url()} CONSOLE ${m.type()}: ${m.text()}`;note(line);if(m.type()==='error')rendererErrors.push(line);});page.on('pageerror',e=>{const line=`${page.url()} PAGE ERROR ${e.stack??e}`;note(line);rendererErrors.push(line);});page.on('requestfailed',r=>{const line=`${page.url()} REQUEST FAILED ${r.url()} ${r.failure()?.errorText}`;note(line);rendererErrors.push(line);});page.on('response',r=>{if(r.url().includes('/api/'))note(`API ${r.status()} ${r.url()}`);});});
  children.push(app.process());
  const deadline=Date.now()+30000;
  while(Date.now()<deadline){const pages=app.windows();if(pages.length>=2&&pages.every(p=>p.url().includes('127.0.0.1:5173')))return {app,pages};await new Promise(r=>setTimeout(r,250));}
  throw new Error('Electron did not create both dashboard and player pages.');
}
export async function saveEvidence() { await writeFile(join(evidence,'run.log'),logs.join('\n')+'\n'); }
export async function cleanup({success=false}={}) {
  for(const child of [...children].reverse()){
    if(child?.close){try{await child.close();}catch{} }
    else treeKill(child);
  }
  if(success){for(const path of dataRoots)await rm(path,{recursive:true,force:true});await rm(backendBuildRoot,{recursive:true,force:true});}
  await saveEvidence();
}
export function log(text){note(text);}
export function getRendererErrors(){return [...rendererErrors];}
export function getLogLines(){return [...logs];}
export { root };
