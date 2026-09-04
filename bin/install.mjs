#!/usr/bin/env node
/**
 * dsh-node-jump — npx 一键安装器
 *
 * 用法（发布到 npm 后）：
 *   npx dsh-node-jump                     # 默认最新版，装进 web profile
 *   npx dsh-node-jump@0.5.0               # 指定版本
 *   npx dsh-node-jump --profile web       # 指定 profile（缺省 web）
 *   npx dsh-node-jump --spec ^0.5.0       # 指定 semver 范围
 *
 * 本地 checkout 内运行（node bin/install.mjs 或 npx .）：
 *   自动切换 link 模式 —— 以当前目录为锚点 `dsh plugin add <绝对路径>`，
 *   改动即时生效（与 README 的本地开发安装一致）。
 *
 * 参数：
 *   --profile <name>   目标 profile 名，缺省 web
 *   --spec <range>     registry 模式的版本范围（缺省 latest）
 *   --link             强制 link 模式（以本脚本所在包目录为锚点）
 *   --dry-run          只打印将要执行的操作，不写任何文件
 *
 * 环境变量（均可省略）：
 *   DSH_HOME   默认 ~/.dsh
 *   DSH_CMD    自定义 dsh CLI 命令；缺省优先 PATH 上的 dsh，
 *              再回退 npx -y --package @deepseek-ai/dsh dsh
 *
 * 实现说明：本脚本只做「定位 + 组装 + 转发」——真正的安装与 bundle 注册
 * 全部交给官方 `dsh plugin --profile <p> add <spec>`（pnpm forwarder，
 * 会把声明 dsh.bundle 的包自动并入 dsh.profile.bundles）。发布未满 24h
 * 的版本可能被 pnpm 的 minimumReleaseAge 拦截，检测到该配置时幂等写入
 * minimumReleaseAgeExclude 放行本插件。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = 'dsh-node-jump';

// ---------- 参数解析 ----------
const args = process.argv.slice(2);
const opts = { profile: 'web', spec: 'latest', link: false, dryRun: false };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--profile') opts.profile = args[++i];
  else if (a === '--spec') opts.spec = args[++i];
  else if (a === '--link') opts.link = true;
  else if (a === '--dry-run') opts.dryRun = true;
  else if (a === '--help' || a === '-h') { usage(); process.exit(0); }
  else { fail(`未知参数：${a}（--help 查看用法）`); }
}

function usage() {
  console.log(`dsh-node-jump 安装器

  npx ${PKG} [--profile web] [--spec latest] [--link] [--dry-run]

  --profile <name>   目标 profile 名（缺省 web）
  --spec <range>     registry 模式的版本范围（缺省 latest）
  --link             强制 link 模式（本地 checkout 开发）
  --dry-run          只打印将要执行的操作`);
}
function say(msg) { console.log(`[install] ${msg}`); }
function warn(msg) { console.warn(`[warn] ${msg}`); }
function fail(msg) { console.error(`[error] ${msg}`); process.exit(1); }

// ---------- 路径定位 ----------
const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dshHome = process.env.DSH_HOME || path.join(homedir(), '.dsh');
const profileDir = path.join(dshHome, 'profiles', opts.profile);
const profilePkg = path.join(profileDir, 'package.json');
const wsYml = path.join(profileDir, 'pnpm-workspace.yaml');

// ---------- 模式检测 ----------
// 本地 checkout（含 .git）→ link 模式；npx 从 registry 拉取的缓存副本无
// .git → registry 模式。--link 强制前者。
const isLocalCheckout = existsSync(path.join(pkgRoot, '.git'));
const useLink = opts.link || isLocalCheckout;
const spec = useLink ? pkgRoot : `${PKG}@${opts.spec}`;

// ---------- 前置校验 ----------
if (!existsSync(profilePkg)) {
  fail(`找不到 profile：${profilePkg}\n请先安装并运行过一次 dsh（dsh web）以初始化该 profile。`);
}
say(`目标 profile：${profileDir}`);
say(`安装形态：${useLink ? `link（本地 checkout：${pkgRoot}）` : `registry（${spec}）`}`);

// ---------- pnpm minimumReleaseAge 防护（幂等） ----------
// pnpm 的供应链防护（minimumReleaseAge）会拒绝发布未满 N 小时的版本，使
// `dsh plugin add` 非零退出。检测到该配置时把本插件加入 exclude 放行。
function ensureReleaseAgeExclude() {
  if (!existsSync(wsYml)) return;
  let text = readFileSync(wsYml, 'utf8');
  if (!/^\s*minimumReleaseAge:/m.test(text)) return; // 未启用该配置，无需处理
  if (new RegExp(`^\\s*-\\s+${PKG}(@|$)`, 'm').test(text)) return; // 已在 exclude
  if (!/^\s*minimumReleaseAgeExclude:\s*$/m.test(text)) {
    text += `\nminimumReleaseAgeExclude:\n  - ${PKG}\n`;
  } else {
    text = text.replace(/^(\s*minimumReleaseAgeExclude:\s*)$/m, `$1\n  - ${PKG}`);
  }
  if (opts.dryRun) { say(`[dry-run] 写入 ${wsYml}：minimumReleaseAgeExclude += ${PKG}`); return; }
  writeFileSync(wsYml, text);
  say(`已放行 minimumReleaseAge：${wsYml} 增加 ${PKG}（发布 <24h 的新版本可安装）`);
}
ensureReleaseAgeExclude();

// ---------- dsh CLI 组装 ----------
function resolveCli() {
  if (process.env.DSH_CMD) return { cmd: process.env.DSH_CMD, base: [] };
  // PATH 上的 dsh（spawnSync 直接探测，避免 Windows shell 差异）
  const probe = process.platform === 'win32' ? spawnSync('where', ['dsh']) : spawnSync('which', ['dsh']);
  if (probe.status === 0 && String(probe.stdout).trim() !== '') return { cmd: 'dsh', base: [] };
  return { cmd: 'npx', base: ['-y', '--package', '@deepseek-ai/dsh', 'dsh'] };
}

// ---------- 执行安装（官方 CLI 通道） ----------
// dsh CLI 是 pnpm forwarder：`--profile <p>` 之后的参数原样转发给 pnpm，
// 因此可追加 pnpm 参数（如 --registry）。
const cli = resolveCli();
function runInstall(extraArgs) {
  const args = [...cli.base, 'plugin', '--profile', opts.profile, 'add', spec, ...extraArgs];
  say(`执行：${cli.cmd} ${args.join(' ')}`);
  return spawnSync(cli.cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
}
if (opts.dryRun) {
  say(`[dry-run] 校验 ${profilePkg} 的 dsh.profile.bundles 包含 ${PKG}`);
  say('[dry-run] registry 模式下若默认源安装失败，自动改用官方源 https://registry.npmjs.org 重试');
  say('[dry-run] 完成。正式运行时按上述步骤执行。');
  process.exit(0);
}
let run = runInstall([]);
if (run.status !== 0 && !useLink) {
  // 常见场景：默认 registry 为只读镜像（如 npmmirror）且新发布的包尚未
  // 同步到镜像 —— E404 / ENOTFOUND。改用官方源重试一次。
  warn('默认 registry 安装失败——若上方输出为 404 / not found，多半是镜像源尚未同步新发布的包。');
  warn('改用官方源 https://registry.npmjs.org 重试...');
  run = runInstall(['--registry=https://registry.npmjs.org']);
}
if (run.status !== 0) {
  warn('dsh plugin add 失败。常见原因：');
  warn('  - 网络/registry 不可达，或该版本尚未发布（npm view dsh-node-jump versions 确认）；');
  warn(`  - 依赖安装冲突：可手动重试 cd "${profileDir}" && pnpm install。`);
  process.exit(1);
}

// ---------- 后验：bundle 注册 ----------
// dsh plugin add 会把声明 dsh.bundle 的包并入 dsh.profile.bundles；
// 出现在其中即代表下次启动自动挂载。
try {
  const manifest = JSON.parse(readFileSync(profilePkg, 'utf8'));
  const bundles = manifest?.dsh?.profile?.bundles ?? [];
  if (!bundles.includes(PKG)) {
    warn(`${PKG} 未出现在 dsh.profile.bundles —— bundle 未注册。`);
    warn('若上方 pnpm 输出有 ignored build scripts 等提示，请处理后重跑本安装器。');
    process.exit(1);
  }
  say(`bundle 已注册：dsh.profile.bundles 包含 ${PKG}（下次启动自动挂载）`);
} catch (err) {
  warn(`读取 ${profilePkg} 失败：${err.message}`);
}

say('安装完成。下一步：重启 dsh web（或 `dsh web`）并硬刷新页面（Ctrl+Shift+R）。');
