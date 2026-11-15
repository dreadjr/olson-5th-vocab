// Runs the tutor (and its Cloudflare tunnel) as login services on this Mac, restarted if they stop.
//   bun run service install [host]   e.g. tutor.example.com, only used to print the link
//   bun run service uninstall | status
// The tunnel is the dashboard one: save its token to ~/.config/kok-tutor/tunnel-token first.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { ROOT } from './lib.mjs';

const CONF = join(homedir(), '.config', 'kok-tutor');
const KEY_FILE = join(CONF, 'key'), TOKEN_FILE = join(CONF, 'tunnel-token');
const AGENTS = join(homedir(), 'Library', 'LaunchAgents');
const UID = process.getuid();
const which = (cmd) => spawnSync('/usr/bin/which', [cmd], { encoding: 'utf8' }).stdout.trim();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function plist(label, args, env = {}) {
  const dict = (o) => Object.entries(o).map(([k, v]) => `<key>${k}</key><string>${esc(v)}</string>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array>${args.map((a) => `<string>${esc(a)}</string>`).join('')}</array>
<key>WorkingDirectory</key><string>${esc(ROOT)}</string>
<key>EnvironmentVariables</key><dict>${dict(env)}</dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer>
<key>StandardOutPath</key><string>${esc(join(ROOT, 'logs', `${label}.log`))}</string>
<key>StandardErrorPath</key><string>${esc(join(ROOT, 'logs', `${label}.log`))}</string>
</dict></plist>
`;
}

const SERVICES = ['com.kok5th.tutor', 'com.kok5th.tunnel'];
const file = (label) => join(AGENTS, `${label}.plist`);
const stop = (label) => spawnSync('launchctl', ['bootout', `gui/${UID}/${label}`], { stdio: 'ignore' });

function install(host) {
  mkdirSync(CONF, { recursive: true, mode: 0o700 });
  mkdirSync(join(ROOT, 'logs'), { recursive: true });
  if (!existsSync(KEY_FILE)) writeFileSync(KEY_FILE, randomBytes(18).toString('base64url'), { mode: 0o600 });
  const key = readFileSync(KEY_FILE, 'utf8').trim();
  const claude = which('claude'), cloudflared = which('cloudflared');
  if (!claude) throw new Error('claude CLI not found on PATH');
  const node = process.execPath; // the real binary, not a version-manager shim
  const PATH = [...new Set([dirname(node), dirname(claude), '/usr/bin', '/bin'])].join(':');

  // Rebuild on every start so a restart picks up new forms and hints.
  const units = {
    'com.kok5th.tutor': plist('com.kok5th.tutor', ['/bin/sh', '-c', `"${node}" scripts/build.mjs && exec "${node}" scripts/tutor.mjs`], { PATH, PORT: '8080', TUTOR_KEY: key }),
  };
  if (existsSync(TOKEN_FILE) && cloudflared) {
    units['com.kok5th.tunnel'] = plist('com.kok5th.tunnel', [cloudflared, 'tunnel', '--no-autoupdate', 'run', '--token-file', TOKEN_FILE], { PATH });
  } else {
    console.log(`No tunnel: save the tunnel's token to ${TOKEN_FILE} (and brew install cloudflared), then run install again.`);
  }
  for (const [label, xml] of Object.entries(units)) {
    stop(label);
    writeFileSync(file(label), xml, { mode: 0o600 }); // holds the key
    chmodSync(file(label), 0o600);
    execFileSync('launchctl', ['bootstrap', `gui/${UID}`, file(label)]);
    console.log(`started ${label}`);
  }
  console.log(`\nOpen once on each device (it saves the key, then the plain address works):\n  https://${host || '<your tunnel hostname>'}/math/?key=${key}\nAt home also: http://localhost:8080/math/?key=${key}\nLogs: logs/com.kok5th.*.log`);
}

function uninstall() {
  for (const label of SERVICES) { stop(label); rmSync(file(label), { force: true }); console.log(`removed ${label}`); }
}

function status() {
  for (const label of SERVICES) {
    const r = spawnSync('launchctl', ['print', `gui/${UID}/${label}`], { encoding: 'utf8' });
    const state = r.status === 0 ? (r.stdout.match(/^\s*state = (.*)$/m)?.[1] || 'loaded') : 'not installed';
    console.log(`${label}: ${state}`);
  }
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'install') install(arg);
else if (cmd === 'uninstall') uninstall();
else if (cmd === 'status') status();
else console.log('usage: bun run service install [host] | uninstall | status');
