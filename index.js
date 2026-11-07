/**
 * dsh-sys-monitor — Host half.
 *
 * Samples the local machine (CPU, memory, swap, disks, processes) and serves a
 * JSON snapshot through the authenticated Harness browser channel. No
 * third-party dependencies: Node's `os` module plus the platform's `ps`,
 * `vm_stat`, `sysctl` and `df` utilities.
 */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, readFile, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'dsh-sys-monitor';

/** The routes are mounted by Connection's exact `/api` fetch channel. */
export const inject = ['connection'];

const SNAPSHOT_PATH = '/api/dsh-sys-monitor/snapshot';
const KILL_PATH = '/api/dsh-sys-monitor/kill';
const ICON_PATH = '/api/dsh-sys-monitor/icon';
const MAX_PROCESSES = 1000;
const MAX_COMMAND_CHARS = 600;
const CACHE_MAX_AGE_MS = 250;
const ICON_SIZE = 64;
const FAN_HELPER = fileURLToPath(new URL('./bin/smc-fan', import.meta.url));

/** App bundles we are willing to read an icon from. */
const APP_ROOTS = [
  '/Applications',
  '/System/Applications',
  '/System/Library/CoreServices',
  path.join(os.homedir(), 'Applications'),
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Run a fixed command and resolve its stdout. A missing platform utility is a
 * normal condition: the caller receives an empty string and the snapshot falls
 * back to the portable `os` values.
 */
function execText(file, args) {
  return new Promise((resolve) => {
    execFile(
      file,
      args,
      { encoding: 'utf8', timeout: 5000, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout) => {
        resolve(error && !stdout ? '' : String(stdout || ''));
      },
    );
  });
}

/** Run a fixed command and reject on a non-zero exit (used by icon conversion). */
function runFile(file, args) {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { encoding: 'utf8', timeout: 5000, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(String(stdout || ''));
      },
    );
  });
}

function readCpuTimes() {
  return os.cpus().map((cpu) => ({ ...cpu.times }));
}

/** Delta-based per-core CPU usage since the previous sample. */
function sampleCpu(state) {
  const cpus = os.cpus();
  const next = cpus.map((cpu) => ({ ...cpu.times }));
  const previous = state.previousCpu;
  state.previousCpu = next;

  let idleDelta = 0;
  let totalDelta = 0;
  const cores = cpus.map((cpu, index) => {
    const before = previous && previous[index];
    const after = next[index];
    if (!before || !after) return { id: index, usage: 0 };
    const idle = Math.max(0, after.idle - before.idle);
    const total = Math.max(
      0,
      (after.user - before.user)
        + (after.nice - before.nice)
        + (after.sys - before.sys)
        + (after.idle - before.idle)
        + (after.irq - before.irq),
    );
    idleDelta += idle;
    totalDelta += total;
    return { id: index, usage: total > 0 ? Math.round((1 - idle / total) * 1000) / 10 : 0 };
  });

  return {
    total: totalDelta > 0 ? Math.round((1 - idleDelta / totalDelta) * 1000) / 10 : 0,
    cores,
  };
}

/** Parse macOS `vm_stat` into bytes; falls back to `os.freemem()` semantics. */
function parseVmStat(text) {
  const pageSizeMatch = /page size of (\d+) bytes/.exec(text);
  const pageSize = pageSizeMatch ? Number(pageSizeMatch[1]) : 4096;
  const pages = new Map();
  for (const line of text.split('\n')) {
    const match = /^\s*"?([^":]+)"?:\s+(\d+)\.?\s*$/.exec(line);
    if (match) pages.set(match[1].trim(), Number(match[2]));
  }
  const page = (key) => (pages.get(key) || 0) * pageSize;
  const active = page('Pages active');
  const inactive = page('Pages inactive');
  const speculative = page('Pages speculative');
  const wired = page('Pages wired down');
  const compressed = page('Pages occupied by compressor');
  const purgeable = page('Pages purgeable');
  const total = os.totalmem();

  let used = active + wired + compressed;
  if (!Number.isFinite(used) || used <= 0) used = Math.max(0, total - os.freemem());
  used = clamp(used, 0, total);

  return {
    total,
    used,
    free: Math.max(0, total - used),
    active,
    inactive,
    speculative,
    wired,
    compressed,
    purgeable,
    cached: inactive + purgeable,
    pageSize,
  };
}

/** Parse `total = 16384.00M used = 14723.38M free = 1660.62M`. */
function parseSwap(text) {
  const match = /total\s*=\s*([\d.]+)M\s+used\s*=\s*([\d.]+)M\s+free\s*=\s*([\d.]+)M/i.exec(text);
  if (!match) return { total: 0, used: 0, free: 0 };
  const mb = (value) => Math.round(Number(value) * 1024 * 1024);
  return { total: mb(match[1]), used: mb(match[2]), free: mb(match[3]) };
}

/** Parse POSIX `df -kP` output. */
function parseDf(text) {
  const rows = [];
  const lines = text.trim().split('\n');
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 5) continue;
    const [filesystem, blocks, used, available, capacity] = parts;
    rows.push({
      filesystem,
      mount: parts.slice(5).join(' ') || '/',
      size: Number(blocks) * 1024,
      used: Number(used) * 1024,
      available: Number(available) * 1024,
      capacity: Number(String(capacity).replace('%', '')),
    });
  }
  return rows;
}

async function collectDisks() {
  // On macOS `/` is the read-only system volume; the Data volume carries the
  // real usage figure. Fall back to `/` on other platforms.
  let rows = parseDf(await execText('df', ['-kP', '/System/Volumes/Data']));
  if (rows.length === 0) rows = parseDf(await execText('df', ['-kP', '/']));
  const seen = new Set();
  return rows.filter((row) => {
    const key = row.mount || row.filesystem;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}

/** Sum cumulative disk bytes read/written from macOS IOBlockStorageDriver statistics. */
function parseDiskIO(text, state) {
  let read = 0;
  let write = 0;
  for (const match of text.matchAll(/"Bytes \(Read\)"=(\d+)/g)) read += Number(match[1]) || 0;
  for (const match of text.matchAll(/"Bytes \(Write\)"=(\d+)/g)) write += Number(match[1]) || 0;
  const at = Date.now();
  const previous = state.previousDiskIO;
  const seconds = previous ? Math.max(0.2, (at - previous.at) / 1000) : 0;
  const readBytesPerSec = previous ? Math.max(0, read - previous.read) / seconds : 0;
  const writeBytesPerSec = previous ? Math.max(0, write - previous.write) / seconds : 0;
  state.previousDiskIO = { at, read, write };
  return {
    readBytesPerSec: Math.round(readBytesPerSec),
    writeBytesPerSec: Math.round(writeBytesPerSec),
    readTotal: read,
    writeTotal: write,
  };
}

/** Parse `netstat -ibn` link-layer counters, keyed by interface name. */
function parseNetworkCounters(text) {
  const byName = new Map();
  for (const line of text.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 10) continue;
    const name = parts[0];
    const network = parts[2] || '';
    if (name === 'lo0' || !network.startsWith('<Link#')) continue;
    const tail = parts.slice(-7);
    const rx = Number(tail[2]) || 0;
    const tx = Number(tail[5]) || 0;
    const current = byName.get(name) || { rx: 0, tx: 0 };
    current.rx += rx;
    current.tx += tx;
    byName.set(name, current);
  }
  return byName;
}

function isPrimaryInterface(name) {
  return /^(?:en|pdp|ppp)\d+$/.test(name);
}

function parseNetwork(text, state) {
  const byName = parseNetworkCounters(text);
  const primary = [...byName.entries()].filter(([name]) => isPrimaryInterface(name));
  const selected = primary.length > 0
    ? primary
    : [...byName.entries()].filter(([name]) => !/^(?:bridge|vmenet)/.test(name));

  let totalRx = 0;
  let totalTx = 0;
  for (const [, value] of selected) {
    totalRx += value.rx;
    totalTx += value.tx;
  }

  if (!state.networkBase) state.networkBase = { rx: totalRx, tx: totalTx };
  const at = Date.now();
  const previous = state.previousNetwork;
  const seconds = previous ? Math.max(0.2, (at - previous.at) / 1000) : 0;
  const rate = (current, before) => (previous && before !== undefined ? Math.max(0, current - before) / seconds : 0);

  const interfaces = [...byName.entries()]
    .map(([name, value]) => {
      const before = previous && previous.byName ? previous.byName.get(name) : undefined;
      return {
        name,
        rxBytesPerSec: Math.round(rate(value.rx, before && before.rx)),
        txBytesPerSec: Math.round(rate(value.tx, before && before.tx)),
        rxTotal: value.rx,
        txTotal: value.tx,
      };
    })
    .filter((item) => item.rxTotal > 0 || item.txTotal > 0)
    .sort((a, b) => (b.rxBytesPerSec + b.txBytesPerSec) - (a.rxBytesPerSec + a.txBytesPerSec)
      || (b.rxTotal + b.txTotal) - (a.rxTotal + a.txTotal))
    .slice(0, 4);

  const primaryRates = selected.reduce((acc, [name, value]) => {
    const before = previous && previous.byName ? previous.byName.get(name) : undefined;
    acc.rx += rate(value.rx, before && before.rx);
    acc.tx += rate(value.tx, before && before.tx);
    return acc;
  }, { rx: 0, tx: 0 });

  state.previousNetwork = { at, byName };

  return {
    rxBytesPerSec: Math.round(primaryRates.rx),
    txBytesPerSec: Math.round(primaryRates.tx),
    sessionRx: Math.max(0, totalRx - state.networkBase.rx),
    sessionTx: Math.max(0, totalTx - state.networkBase.tx),
    interfaces,
  };
}

/** Parse AppleSmartBattery fields used by the battery card. */
function parseBattery(text) {
  if (!text || !text.includes('AppleSmartBattery')) return null;
  const readNumber = (key) => {
    const match = new RegExp(`"${key}"\\s*=\\s*(-?\\d+)`).exec(text);
    return match ? Number(match[1]) : null;
  };
  const readBool = (key) => {
    const match = new RegExp(`"${key}"\\s*=\\s*(Yes|No)`).exec(text);
    return match ? match[1] === 'Yes' : null;
  };
  const percent = readNumber('CurrentCapacity');
  if (percent === null) return null;
  const external = readBool('ExternalConnected');
  const charging = readBool('IsCharging');
  const fullyCharged = readBool('FullyCharged');
  const time = readNumber('TimeRemaining');
  const cycles = readNumber('CycleCount');
  const temperature = readNumber('Temperature');
  const nominal = readNumber('NominalChargeCapacity');
  const design = readNumber('DesignCapacity');
  const adapterMatch = /AppleRawAdapterDetails[\s\S]*?"Watts"\s*=\s*(\d+)/.exec(text);
  const status = external === false
    ? 'discharging'
    : charging === true
      ? 'charging'
      : fullyCharged === true
        ? 'full'
        : 'ac';
  return {
    present: true,
    percent: Math.max(0, Math.min(100, percent)),
    status,
    timeRemainingMinutes: status === 'discharging' && time !== null && time > 0 && time < 65535 ? time : null,
    cycleCount: cycles,
    healthPercent: nominal !== null && design !== null && design > 0 ? Math.round((nominal / design) * 1000) / 10 : null,
    temperatureC: temperature !== null && temperature > 0 ? Math.round(temperature / 100 * 10) / 10 : null,
    adapterWatts: adapterMatch ? Number(adapterMatch[1]) : null,
  };
}

/** Read fan speeds through the bundled read-only AppleSMC helper. */
async function collectFans() {
  if (os.platform() !== 'darwin') return null;
  try {
    await chmod(FAN_HELPER, 0o755);
    const output = await runFile(FAN_HELPER, []);
    const parsed = JSON.parse(output);
    return Array.isArray(parsed.fans) ? { fans: parsed.fans } : null;
  } catch {
    return null;
  }
}

function processName(commandLine) {
  if (!commandLine) return '';
  const first = commandLine.trim().split(/\s+/)[0] || '';
  const slash = first.lastIndexOf('/');
  return slash >= 0 ? first.slice(slash + 1) : first;
}

/** Find the `.app` bundle a process was launched from, if it is a GUI app. */
function findAppBundle(commandLine) {
  if (!commandLine) return null;
  for (const root of APP_ROOTS) {
    const index = commandLine.indexOf(`${root}${path.sep}`);
    if (index < 0) continue;
    const tail = commandLine.slice(index);
    const end = tail.indexOf('.app');
    if (end < 0) continue;
    const bundle = tail.slice(0, end + 4);
    const next = tail.charAt(end + 4);
    if (next !== '' && next !== '/' && next !== ' ' && next !== '"' && next !== "'") continue;
    return bundle;
  }
  return null;
}

/** Validate that a requested icon path is an existing app bundle under an allowed root. */
async function resolveBundle(raw) {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return null;
  const bundle = path.resolve(raw);
  if (!bundle.endsWith('.app')) return null;
  const allowed = APP_ROOTS.some((root) => bundle.startsWith(`${root}${path.sep}`));
  if (!allowed) return null;
  try {
    const info = await stat(bundle);
    if (!info.isDirectory()) return null;
  } catch {
    return null;
  }
  return bundle;
}

async function findIconFile(bundle, state) {
  if (state.iconFileCache.has(bundle)) return state.iconFileCache.get(bundle);
  let iconPath = null;
  try {
    const resources = path.join(bundle, 'Contents', 'Resources');
    const names = await readdir(resources);
    const icns = names.filter((name) => name.toLowerCase().endsWith('.icns'));
    const preferred = ['appicon.icns', 'app.icns', 'icon.icns'];
    for (const wanted of preferred) {
      const found = icns.find((name) => name.toLowerCase() === wanted);
      if (found) {
        iconPath = path.join(resources, found);
        break;
      }
    }
    if (!iconPath && icns.length > 0) iconPath = path.join(resources, icns[0]);
  } catch {
    iconPath = null;
  }
  state.iconFileCache.set(bundle, iconPath);
  return iconPath;
}

async function readIconPng(bundle, state) {
  const iconPath = await findIconFile(bundle, state);
  if (!iconPath) return null;
  if (state.iconPngCache.has(iconPath)) return state.iconPngCache.get(iconPath);
  if (state.iconPngPending.has(iconPath)) return state.iconPngPending.get(iconPath);

  const pending = (async () => {
    const hash = createHash('sha1').update(iconPath).digest('hex');
    const output = path.join(os.tmpdir(), `dsh-sys-monitor-${hash}.png`);
    try {
      await runFile('sips', [
        '-s', 'format', 'png',
        '-z', String(ICON_SIZE), String(ICON_SIZE),
        iconPath,
        '--out', output,
      ]);
      const buffer = await readFile(output);
      state.iconPngCache.set(iconPath, buffer);
      return buffer;
    } catch {
      state.iconPngCache.set(iconPath, null);
      return null;
    } finally {
      state.iconPngPending.delete(iconPath);
      await rm(output, { force: true }).catch(() => {});
    }
  })();

  state.iconPngPending.set(iconPath, pending);
  return pending;
}

function parseProcesses(stdout) {
  const rows = [];
  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    const match = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/.exec(line);
    if (!match) continue;
    const command = match[11].slice(0, MAX_COMMAND_CHARS);
    const icon = findAppBundle(command);
    rows.push({
      pid: Number(match[1]),
      ppid: Number(match[2]),
      user: match[3],
      cpu: Number(match[4]),
      mem: Number(match[5]),
      rss: Number(match[6]) * 1024,
      vsz: Number(match[7]) * 1024,
      stat: match[8],
      state: match[8][0] || '?',
      elapsed: match[9],
      cpuTime: match[10],
      name: icon ? path.basename(icon, '.app') : processName(command),
      command,
      icon,
    });
  }
  return rows;
}

function summarizeProcesses(processes) {
  const summary = { total: processes.length, running: 0, sleeping: 0, stopped: 0, zombie: 0, other: 0 };
  for (const process of processes) {
    switch (process.state) {
      case 'R': summary.running += 1; break;
      case 'S':
      case 'I': summary.sleeping += 1; break;
      case 'T': summary.stopped += 1; break;
      case 'Z': summary.zombie += 1; break;
      default: summary.other += 1; break;
    }
  }
  return summary;
}

/** Collect one complete snapshot. Exported for an offline smoke test. */
export async function collectSnapshot(state) {
  const platform = os.platform();
  const cpu = sampleCpu(state);
  const [psText, vmText, swapText, disks, osVersionText, diskText, networkText, batteryText, fans] = await Promise.all([
    execText('ps', ['-axo', 'pid=,ppid=,user=,%cpu=,%mem=,rss=,vsz=,stat=,etime=,time=,args=', '-ww']),
    execText('vm_stat', []),
    execText('sysctl', ['-n', 'vm.swapusage']),
    collectDisks(),
    platform === 'darwin' ? execText('sw_vers', ['-productVersion']) : Promise.resolve(''),
    platform === 'darwin'
      ? execText('ioreg', ['-r', '-c', 'IOBlockStorageDriver', '-k', 'Statistics'])
      : Promise.resolve(''),
    execText('netstat', ['-ibn']),
    platform === 'darwin' ? execText('ioreg', ['-r', '-c', 'AppleSmartBattery', '-w0']) : Promise.resolve(''),
    platform === 'darwin' ? collectFans() : Promise.resolve(null),
  ]);

  const allProcesses = parseProcesses(psText);
  const cpus = os.cpus();

  return {
    timestamp: Date.now(),
    host: {
      hostname: os.hostname(),
      platform,
      platformLabel: platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'Linux',
      release: os.release(),
      osVersion: osVersionText.trim() || os.release(),
      arch: os.arch(),
      uptimeSec: os.uptime(),
      cpuModel: cpus[0] ? cpus[0].model : 'Unknown CPU',
      cpuCount: cpus.length,
      load: os.loadavg(),
    },
    cpu,
    memory: parseVmStat(vmText),
    swap: parseSwap(swapText),
    disks,
    diskIO: parseDiskIO(diskText, state),
    network: parseNetwork(networkText, state),
    battery: parseBattery(batteryText),
    fans,
    processSummary: summarizeProcesses(allProcesses),
    processes: allProcesses.slice(0, MAX_PROCESSES),
  };
}

function createState() {
  return {
    previousCpu: readCpuTimes(),
    previousDiskIO: null,
    previousNetwork: null,
    networkBase: null,
    cache: null,
    pending: null,
    iconFileCache: new Map(),
    iconPngCache: new Map(),
    iconPngPending: new Map(),
  };
}

async function getSnapshot(state) {
  if (state.cache && Date.now() - state.cache.at < CACHE_MAX_AGE_MS) {
    return state.cache.value;
  }
  if (!state.pending) {
    state.pending = collectSnapshot(state)
      .then((value) => {
        state.cache = { at: Date.now(), value };
        return value;
      })
      .finally(() => {
        state.pending = null;
      });
  }
  return state.pending;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export function apply(ctx) {
  const state = createState();

  ctx.effect(
    () => ctx.connection.fetch.register({
      path: SNAPSHOT_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => {
        try {
          return jsonResponse({ ok: true, result: await getSnapshot(state) });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          ctx.logger?.warn?.(`dsh-sys-monitor: snapshot failed: ${message}`);
          return jsonResponse({ ok: false, error: message }, 500);
        }
      },
    }),
    'dsh-sys-monitor: snapshot route',
  );

  ctx.effect(
    () => ctx.connection.fetch.register({
      path: ICON_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const url = new URL(request.url);
          const bundle = await resolveBundle(url.searchParams.get('bundle'));
          if (!bundle) return new Response('icon not found', { status: 404, headers: { 'content-type': 'text/plain' } });
          const png = await readIconPng(bundle, state);
          if (!png) return new Response('icon not found', { status: 404, headers: { 'content-type': 'text/plain' } });
          return new Response(png, {
            headers: {
              'content-type': 'image/png',
              'cache-control': 'public, max-age=86400',
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          ctx.logger?.warn?.(`dsh-sys-monitor: icon failed: ${message}`);
          return new Response('icon not found', { status: 404, headers: { 'content-type': 'text/plain' } });
        }
      },
    }),
    'dsh-sys-monitor: icon route',
  );

  ctx.effect(
    () => ctx.connection.fetch.register({
      path: KILL_PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        let body;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ ok: false, code: 'invalid-body' }, 400);
        }
        const pid = Number(body && body.pid);
        if (!Number.isInteger(pid) || pid <= 1) {
          return jsonResponse({ ok: false, code: 'invalid-pid' }, 400);
        }
        // Never let the UI kill the Host process, its direct parent, or the
        // Harness desktop app itself (renderer/helper processes included).
        if (pid === process.pid || pid === process.ppid) {
          return jsonResponse({ ok: false, code: 'protected' }, 403);
        }
        const targetCommand = await execText('ps', ['-p', String(pid), '-o', 'args=']);
        if (targetCommand.includes('DeepSeek Harness.app')) {
          return jsonResponse({ ok: false, code: 'protected' }, 403);
        }
        try {
          process.kill(pid, 'SIGKILL');
          state.cache = null;
          return jsonResponse({ ok: true, result: { pid, signal: 'SIGKILL' } });
        } catch (error) {
          const errorCode = error && typeof error === 'object' ? error.code : undefined;
          const code = errorCode === 'ESRCH' ? 'not-found' : errorCode === 'EPERM' ? 'permission' : 'failed';
          const message = error instanceof Error ? error.message : String(error);
          ctx.logger?.warn?.(`dsh-sys-monitor: kill ${pid} failed: ${message}`);
          return jsonResponse({ ok: false, code, message }, code === 'not-found' ? 404 : code === 'permission' ? 403 : 500);
        }
      },
    }),
    'dsh-sys-monitor: kill route',
  );
}
