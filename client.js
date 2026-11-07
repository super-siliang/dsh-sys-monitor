/**
 * dsh-sys-monitor — Client half.
 *
 * A btop-flavoured system dashboard rendered as a native Harness main panel.
 * All colors come from `--dsw-alias-*` theme tokens so light/dark mode works
 * without a second palette.
 */
window.__ModuleLoader__.load({
  id: 'dsh-sys-monitor',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    const NS = 'dsh-sys-monitor';
    const API_PATH = '/api/dsh-sys-monitor/snapshot';
    const KILL_API = '/api/dsh-sys-monitor/kill';
    const ICON_API = '/api/dsh-sys-monitor/icon';
    const INTERVALS = [500, 1000, 2000, 5000];
    const HISTORY_LIMIT = 90;

    /* ------------------------------------------------------------------ */
    /* Locale                                                              */
    /* ------------------------------------------------------------------ */

    const zh = {
      'panel.label': '系统监控',
      title: '系统监控',
      subtitle: '本机进程与资源负载',
      live: '实时',
      paused: '已暂停',
      pause: '暂停',
      resume: '继续',
      loading: '正在采样系统数据…',
      errorTitle: '无法读取系统数据',
      retry: '重试',
      cpu: 'CPU',
      cpuUsage: 'CPU 使用率',
      memory: '内存',
      memoryUsage: '内存占用',
      swap: '交换空间',
      load: '负载',
      load1: '1 分钟',
      load5: '5 分钟',
      load15: '15 分钟',
      processes: '进程',
      processCount: '进程总数',
      running: '运行中',
      sleeping: '休眠',
      stopped: '已停止',
      zombie: '僵尸',
      other: '其他',
      disk: '磁盘',
      diskUsage: '磁盘占用',
      diskIO: '磁盘 I/O',
      read: '读取',
      write: '写入',
      network: '网络',
      battery: '电池',
      batteryStatusCharging: '充电中',
      batteryStatusDischarging: '使用电池',
      batteryStatusFull: '已充满',
      batteryStatusAc: '已接通电源',
      batteryTimeRemaining: '预计可用',
      batteryCycles: '循环次数',
      batteryHealth: '健康度',
      batteryTemperature: '电池温度',
      batteryNo: '未检测到电池',
      fan: '风扇',
      fanUnavailable: '风扇传感器不可用',
      download: '下载',
      upload: '上传',
      totalTransferred: '本次累计',
      noTraffic: '暂无流量',
      uptime: '运行时间',
      system: '系统信息',
      hostname: '主机名',
      platform: '系统',
      arch: '架构',
      cpuModel: '处理器',
      cores: '核心',
      total: '总计',
      used: '已用',
      cached: '缓存',
      free: '空闲',
      available: '可用',
      searchPlaceholder: '搜索进程名、PID 或用户…',
      filterAll: '全部',
      filterUser: '用户进程',
      filterActive: '活跃',
      pid: 'PID',
      user: '用户',
      cpuShort: 'CPU%',
      memShort: '内存%',
      rss: '内存',
      state: '状态',
      timePlus: 'CPU 时间',
      command: '命令',
      hidePaths: '隐藏路径',
      showPaths: '显示路径',
      hideUsers: '隐藏用户名',
      showUsers: '显示用户名',
      noProcesses: '没有匹配的进程',
      selectedProcess: '进程详情',
      close: '关闭',
      ppid: '父进程',
      virtual: '虚拟内存',
      elapsed: '运行时长',
      cpuTime: 'CPU 时间',
      updated: '更新于',
      interval: '刷新间隔',
      lastSample: '最近采样',
      unitDay: '天',
      unitHour: '小时',
      unitMinute: '分钟',
      stateRunning: '运行',
      stateSleeping: '休眠',
      stateStopped: '停止',
      stateZombie: '僵尸',
      stateIdle: '空闲',
      processSummary: '进程概要',
      killProcess: '强制退出',
      killDialogTitle: '强制退出进程？',
      killDialogDesc: '将向以下进程发送 SIGKILL，未保存的数据可能丢失：',
      cancel: '取消',
      confirmKill: '强制退出',
      killing: '正在退出…',
      killSuccess: '已强制退出进程',
      killErrorInvalid: '无效的进程 ID。',
      killErrorProtected: '不能退出 Harness 自身的进程。',
      killErrorNotFound: '进程不存在或已经退出。',
      killErrorPermission: '权限不足，无法退出该进程。',
      killErrorFailed: '强制退出进程失败。',
    };

    const en = {
      'panel.label': 'System Monitor',
      title: 'System Monitor',
      subtitle: 'Local processes and resource load',
      live: 'Live',
      paused: 'Paused',
      pause: 'Pause',
      resume: 'Resume',
      loading: 'Sampling system data…',
      errorTitle: 'Unable to read system data',
      retry: 'Retry',
      cpu: 'CPU',
      cpuUsage: 'CPU usage',
      memory: 'Memory',
      memoryUsage: 'Memory usage',
      swap: 'Swap',
      load: 'Load',
      load1: '1 min',
      load5: '5 min',
      load15: '15 min',
      processes: 'processes',
      processCount: 'Processes',
      running: 'running',
      sleeping: 'sleeping',
      stopped: 'stopped',
      zombie: 'zombie',
      other: 'other',
      disk: 'Disk',
      diskUsage: 'Disk usage',
      diskIO: 'Disk I/O',
      read: 'Read',
      write: 'Write',
      network: 'Network',
      battery: 'Battery',
      batteryStatusCharging: 'Charging',
      batteryStatusDischarging: 'On battery',
      batteryStatusFull: 'Fully charged',
      batteryStatusAc: 'AC power',
      batteryTimeRemaining: 'Remaining',
      batteryCycles: 'Cycles',
      batteryHealth: 'Health',
      batteryTemperature: 'Battery temp',
      batteryNo: 'No battery detected',
      fan: 'Fans',
      fanUnavailable: 'Fan sensors unavailable',
      download: 'Download',
      upload: 'Upload',
      totalTransferred: 'Session total',
      noTraffic: 'No traffic',
      uptime: 'Uptime',
      system: 'System',
      hostname: 'Hostname',
      platform: 'Platform',
      arch: 'Architecture',
      cpuModel: 'Processor',
      cores: 'Cores',
      total: 'Total',
      used: 'Used',
      cached: 'Cached',
      free: 'Free',
      available: 'Available',
      searchPlaceholder: 'Search process, PID, or user…',
      filterAll: 'All',
      filterUser: 'User',
      filterActive: 'Active',
      pid: 'PID',
      user: 'User',
      cpuShort: 'CPU%',
      memShort: 'MEM%',
      rss: 'Memory',
      state: 'State',
      timePlus: 'CPU Time',
      command: 'Command',
      hidePaths: 'Hide paths',
      showPaths: 'Show paths',
      hideUsers: 'Hide users',
      showUsers: 'Show users',
      noProcesses: 'No matching processes',
      selectedProcess: 'Process details',
      close: 'Close',
      ppid: 'Parent PID',
      virtual: 'Virtual memory',
      elapsed: 'Elapsed',
      cpuTime: 'CPU time',
      updated: 'Updated',
      interval: 'Refresh',
      lastSample: 'Last sample',
      unitDay: 'd',
      unitHour: 'h',
      unitMinute: 'm',
      stateRunning: 'Running',
      stateSleeping: 'Sleeping',
      stateStopped: 'Stopped',
      stateZombie: 'Zombie',
      stateIdle: 'Idle',
      processSummary: 'Process summary',
      killProcess: 'Force quit',
      killDialogTitle: 'Force quit this process?',
      killDialogDesc: 'SIGKILL will be sent to this process; unsaved data may be lost:',
      cancel: 'Cancel',
      confirmKill: 'Force quit',
      killing: 'Quitting…',
      killSuccess: 'Process force-quit',
      killErrorInvalid: 'Invalid process ID.',
      killErrorProtected: 'The Harness process cannot be terminated here.',
      killErrorNotFound: 'The process does not exist or already exited.',
      killErrorPermission: 'Permission denied for this process.',
      killErrorFailed: 'Failed to force-quit the process.',
    };

    /* ------------------------------------------------------------------ */
    /* Formatting helpers                                                  */
    /* ------------------------------------------------------------------ */

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function formatBytes(value) {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
      let size = number;
      let unit = 0;
      while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit += 1;
      }
      const digits = size >= 100 ? 0 : size >= 10 ? 1 : 2;
      return `${size.toFixed(digits)} ${units[unit]}`;
    }

    function formatPercent(value) {
      return `${Number(value || 0).toFixed(1)}%`;
    }

    function formatClock(timestamp) {
      if (!timestamp) return '—';
      try {
        return new Date(timestamp).toLocaleTimeString([], { hour12: false });
      } catch {
        return new Date(timestamp).toLocaleTimeString();
      }
    }

    function formatDuration(seconds, t) {
      const total = Math.max(0, Math.floor(Number(seconds) || 0));
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      if (days > 0) return `${days}${t('unitDay')} ${hours}${t('unitHour')}`;
      if (hours > 0) return `${hours}${t('unitHour')} ${minutes}${t('unitMinute')}`;
      return `${minutes}${t('unitMinute')}`;
    }

    function stateLabel(state, t) {
      switch (state) {
        case 'R': return t('stateRunning');
        case 'S':
        case 'I': return t('stateSleeping');
        case 'T': return t('stateStopped');
        case 'Z': return t('stateZombie');
        default: return state || '—';
      }
    }

    function toneFor(value) {
      if (value >= 85) return 'error';
      if (value >= 60) return 'warn';
      return 'ok';
    }

    function classNames(...parts) {
      return parts.filter(Boolean).join(' ');
    }

    /* ------------------------------------------------------------------ */
    /* Data polling                                                        */
    /* ------------------------------------------------------------------ */

    async function fetchSnapshot(signal) {
      const response = await fetch(API_PATH, {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store',
        signal,
      });
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`HTTP ${response.status}`);
      }
      if (!response.ok || !payload || payload.ok !== true) {
        const message = payload && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`;
        throw new Error(message);
      }
      return payload.result;
    }

    function useSnapshot(refreshMs, paused) {
      const [snapshot, setSnapshot] = useState(null);
      const [error, setError] = useState(null);
      const [updatedAt, setUpdatedAt] = useState(0);
      const [loading, setLoading] = useState(true);
      const [nonce, setNonce] = useState(0);

      useEffect(() => {
        let cancelled = false;
        let timer = null;
        const controller = new AbortController();

        async function tick() {
          try {
            const next = await fetchSnapshot(controller.signal);
            if (cancelled) return;
            setSnapshot(next);
            setUpdatedAt(Date.now());
            setError(null);
            setLoading(false);
          } catch (reason) {
            if (cancelled || (reason && reason.name === 'AbortError')) return;
            setError(reason instanceof Error ? reason.message : String(reason));
            setLoading(false);
          }
          if (!cancelled && !paused) {
            timer = setTimeout(tick, refreshMs);
          }
        }

        if (paused) {
          setLoading(false);
        } else {
          tick();
        }

        return () => {
          cancelled = true;
          controller.abort();
          if (timer !== null) clearTimeout(timer);
        };
      }, [refreshMs, paused, nonce]);

      const retry = useCallback(() => {
        setLoading(true);
        setNonce((value) => value + 1);
      }, []);

      return { snapshot, error, updatedAt, loading, retry };
    }

    /* ------------------------------------------------------------------ */
    /* Small visual primitives                                             */
    /* ------------------------------------------------------------------ */

    function Meter({ value, tone, height }) {
      const safe = clamp(Number(value) || 0, 0, 100);
      return h(
        'div',
        { className: 'dsm-meter', style: height ? { height: `${height}px` } : undefined },
        h('i', { className: `is-${tone || toneFor(safe)}`, style: { width: `${safe}%` } }),
      );
    }

    function Sparkline({ values, max = 100, className }) {
      const source = values && values.length > 0 ? values : [0, 0];
      const list = source.length === 1 ? [source[0], source[0]] : source;
      const points = list.map((value, index) => {
        const x = (index / (list.length - 1)) * 100;
        const y = 40 - clamp((Number(value) || 0) / max, 0, 1) * 38;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(' ');
      const area = `0,40 ${points} 100,40`;
      return h(
        'svg',
        {
          className: classNames('dsm-spark', className),
          viewBox: '0 0 100 40',
          preserveAspectRatio: 'none',
          'aria-hidden': true,
        },
        h('polygon', { points: area, fill: 'currentColor', opacity: 0.12 }),
        h('polyline', {
          points,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinejoin: 'round',
          strokeLinecap: 'round',
          vectorEffect: 'non-scaling-stroke',
        }),
      );
    }

    function MonitorGlyph({ size = 20 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('rect', { x: 2.5, y: 4, width: 19, height: 13.5, rx: 2.5, stroke: 'currentColor', strokeWidth: 1.7 }),
        h('path', { d: 'M6 9.5h3l1.6 4 2.2-7 1.8 5h3.4', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M9 20.5h6M12 17.5v3', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }),
      );
    }

    function SystemMonitorIcon({ size = 18, active }) {
      return h(
        'span',
        {
          className: classNames('dsm-navIcon', active && 'is-active'),
          style: { width: size, height: size, opacity: active ? 1 : 0.72 },
        },
        h(MonitorGlyph, { size }),
      );
    }

    function PauseIcon() {
      return h(
        'svg',
        { width: 12, height: 12, viewBox: '0 0 12 12', 'aria-hidden': true },
        h('rect', { x: 2, y: 1.5, width: 3, height: 9, rx: 1, fill: 'currentColor' }),
        h('rect', { x: 7, y: 1.5, width: 3, height: 9, rx: 1, fill: 'currentColor' }),
      );
    }

    function PlayIcon() {
      return h(
        'svg',
        { width: 12, height: 12, viewBox: '0 0 12 12', 'aria-hidden': true },
        h('path', { d: 'M3 1.8 10 6l-7 4.2z', fill: 'currentColor' }),
      );
    }

    function SearchIcon() {
      return h(
        'svg',
        { width: 13, height: 13, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('circle', { cx: 7, cy: 7, r: 4.6, stroke: 'currentColor', strokeWidth: 1.5 }),
        h('path', { d: 'm10.5 10.5 3 3', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
      );
    }

    function CloseIcon() {
      return h(
        'svg',
        { width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
      );
    }

    function KillIcon({ size = 12 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M6 1.7v4.1', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('path', { d: 'M3.25 3.25a4 4 0 1 0 5.5 0', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
      );
    }

    function EyeIcon({ size = 13, off = false }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 14 14', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M1.4 7s2.1-4.1 5.6-4.1S12.6 7 12.6 7s-2.1 4.1-5.6 4.1S1.4 7 1.4 7Z', stroke: 'currentColor', strokeWidth: 1.35, strokeLinejoin: 'round' }),
        h('circle', { cx: 7, cy: 7, r: 1.8, stroke: 'currentColor', strokeWidth: 1.35 }),
        off ? h('path', { d: 'M2 2l10 10', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }) : null,
      );
    }

    function maskCommand(row) {
      const name = row.name || '';
      const command = row.command || '';
      const tail = command.startsWith(name) ? command.slice(name.length).trim() : command;
      const length = Math.max(8, Math.min(48, Math.ceil(tail.length / 2)));
      return `${name}${name ? '  ' : ''}${'•'.repeat(length)}`;
    }
    function maskUser(user) {
      return '•'.repeat(Math.max(4, Math.min(12, String(user || '').length)));
    }

    function processInitial(name) {
      const text = String(name || '?').trim();
      return text ? text.charAt(0).toUpperCase() : '?';
    }

    /** Real app icon when the process belongs to an .app bundle; otherwise a neutral initial badge. */
    function ProcessIcon({ process: item, size = 16, className }) {
      const [failed, setFailed] = useState(false);
      const bundle = item && item.icon;
      if (bundle && !failed) {
        return h('img', {
          className: classNames('dsm-procIcon', className),
          src: `${ICON_API}?bundle=${encodeURIComponent(bundle)}`,
          width: size,
          height: size,
          alt: '',
          loading: 'lazy',
          draggable: false,
          onError: () => setFailed(true),
        });
      }
      return h('span', {
        className: classNames('dsm-procIcon', 'dsm-procIconFallback', className),
        style: { width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.54)) },
        'aria-hidden': true,
      }, processInitial(item && item.name));
    }

    function killErrorMessage(code, t) {
      switch (code) {
        case 'invalid-pid': return t('killErrorInvalid');
        case 'protected': return t('killErrorProtected');
        case 'not-found': return t('killErrorNotFound');
        case 'permission': return t('killErrorPermission');
        default: return t('killErrorFailed');
      }
    }

    /* ------------------------------------------------------------------ */
    /* Panels                                                              */
    /* ------------------------------------------------------------------ */

    function CpuPanel({ data, history, t }) {
      const cpu = data ? data.cpu : { total: 0, cores: [] };
      const load = data ? data.host.load : [0, 0, 0];
      const cores = cpu.cores || [];

      return h(
        'section',
        { className: 'dsm-panel dsm-cpuPanel' },
        h(
          'div',
          { className: 'dsm-panelHead' },
          h('div', null,
            h('span', { className: 'dsm-kicker' }, t('cpuUsage')),
            h('strong', { className: `dsm-bigNum is-${toneFor(cpu.total)}` }, formatPercent(cpu.total)),
          ),
          h('div', { className: 'dsm-loads' },
            h('span', null, h('em', null, t('load1')), h('b', null, Number(load[0] || 0).toFixed(2))),
            h('span', null, h('em', null, t('load5')), h('b', null, Number(load[1] || 0).toFixed(2))),
            h('span', null, h('em', null, t('load15')), h('b', null, Number(load[2] || 0).toFixed(2))),
          ),
        ),
        h('div', { className: 'dsm-sparkWrap' }, h(Sparkline, { values: history, max: 100, className: 'is-cpu' })),
        cores.length > 0
          ? h('div', { className: 'dsm-cores' },
            cores.map((core) => h(
              'div',
              { className: 'dsm-core', key: core.id },
              h('span', { className: 'dsm-coreId' }, `C${core.id}`),
              h(Meter, { value: core.usage }),
              h('span', { className: `dsm-coreVal is-${toneFor(core.usage)}` }, `${Math.round(core.usage)}%`),
            )),
          )
          : h('div', { className: 'dsm-muted' }, t('loading')),
      );
    }

    function MemoryPanel({ data, history, t }) {
      const memory = data ? data.memory : { total: 0, used: 0, free: 0, cached: 0 };
      const swap = data ? data.swap : { total: 0, used: 0, free: 0 };
      const total = memory.total || 1;
      const usedPct = clamp((memory.used / total) * 100, 0, 100);
      const cachedPct = clamp((memory.cached / total) * 100, 0, 100 - usedPct);
      const swapPct = swap.total > 0 ? clamp((swap.used / swap.total) * 100, 0, 100) : 0;

      return h(
        'section',
        { className: 'dsm-panel' },
        h(
          'div',
          { className: 'dsm-panelHead' },
          h('div', null,
            h('span', { className: 'dsm-kicker' }, t('memoryUsage')),
            h('strong', { className: `dsm-bigNum is-${toneFor(usedPct)}` }, formatPercent(usedPct)),
          ),
          h('span', { className: 'dsm-headNote' }, `${formatBytes(memory.used)} / ${formatBytes(memory.total)}`),
        ),
        h('div', { className: 'dsm-stack' },
          h('i', { className: 'is-used', style: { width: `${usedPct}%` } }),
          h('i', { className: 'is-cached', style: { width: `${cachedPct}%` } }),
        ),
        h('div', { className: 'dsm-legend' },
          h('span', null, h('i', { className: 'is-used' }), `${t('used')} ${formatBytes(memory.used)}`),
          h('span', null, h('i', { className: 'is-cached' }), `${t('cached')} ${formatBytes(memory.cached)}`),
          h('span', null, h('i', { className: 'is-free' }), `${t('free')} ${formatBytes(memory.free)}`),
        ),
        h('div', { className: 'dsm-subRow' },
          h('span', null, t('swap')),
          h(Meter, { value: swapPct, tone: swapPct > 70 ? 'warn' : 'brand' }),
          h('b', null, `${formatBytes(swap.used)} / ${formatBytes(swap.total)}`),
        ),
        h('div', { className: 'dsm-sparkWrap is-small' }, h(Sparkline, { values: history, max: 100, className: 'is-mem' })),
      );
    }

    function DiskPanel({ data, history, t }) {
      const disks = data && data.disks ? data.disks : [];
      const primary = disks[0] || { mount: '—', used: 0, size: 0, capacity: 0 };
      const io = data && data.diskIO ? data.diskIO : { readBytesPerSec: 0, writeBytesPerSec: 0 };
      const max = Math.max(1, ...history);
      return h(
        'section',
        { className: 'dsm-panel' },
        h('div', { className: 'dsm-panelHead' },
          h('div', null,
            h('span', { className: 'dsm-kicker' }, t('disk')),
            h('strong', { className: `dsm-bigNum is-${toneFor(primary.capacity)}` }, `${primary.capacity}%`),
          ),
          h('span', { className: 'dsm-headNote', title: primary.mount }, primary.mount || '—'),
        ),
        h('div', { className: 'dsm-volumeRow' },
          h('span', null, t('diskUsage')),
          h(Meter, { value: primary.capacity, tone: primary.capacity >= 90 ? 'error' : primary.capacity >= 75 ? 'warn' : 'ok' }),
        ),
        h('div', { className: 'dsm-diskFoot' },
          h('span', null, `${formatBytes(primary.used)} / ${formatBytes(primary.size)}`),
          h('span', { title: primary.mount }, primary.mount || ''),
        ),
        h('div', { className: 'dsm-sparkWrap is-small is-disk' }, h(Sparkline, { values: history, max, className: 'is-disk' })),
        h('div', { className: 'dsm-ioGrid' },
          h('div', { className: 'dsm-statBox' }, h('span', null, t('read')), h('b', null, `${formatBytes(io.readBytesPerSec)}/s`)),
          h('div', { className: 'dsm-statBox' }, h('span', null, t('write')), h('b', null, `${formatBytes(io.writeBytesPerSec)}/s`)),
        ),
      );
    }

    function NetworkPanel({ data, history, t }) {
      const network = data && data.network
        ? data.network
        : { rxBytesPerSec: 0, txBytesPerSec: 0, sessionRx: 0, sessionTx: 0, interfaces: [] };
      const total = network.rxBytesPerSec + network.txBytesPerSec;
      const max = Math.max(1, ...history);
      const interfaces = network.interfaces || [];
      const active = interfaces.length > 0 ? interfaces[0].name : '—';
      const activeInterfaces = interfaces
        .filter((item) => item.rxBytesPerSec + item.txBytesPerSec > 0)
        .slice(0, 3);
      return h(
        'section',
        { className: 'dsm-panel' },
        h('div', { className: 'dsm-panelHead' },
          h('div', null,
            h('span', { className: 'dsm-kicker' }, t('network')),
            h('strong', { className: 'dsm-bigNum' }, `${formatBytes(total)}/s`),
          ),
          h('span', { className: 'dsm-headNote' }, active),
        ),
        h('div', { className: 'dsm-sparkWrap is-small is-net' }, h(Sparkline, { values: history, max, className: 'is-net' })),
        h('div', { className: 'dsm-ioGrid' },
          h('div', { className: 'dsm-statBox' },
            h('span', null, h('i', { className: 'dsm-dirIcon is-down' }, '↓'), t('download')),
            h('b', null, `${formatBytes(network.rxBytesPerSec)}/s`),
          ),
          h('div', { className: 'dsm-statBox' },
            h('span', null, h('i', { className: 'dsm-dirIcon is-up' }, '↑'), t('upload')),
            h('b', null, `${formatBytes(network.txBytesPerSec)}/s`),
          ),
        ),
        h('div', { className: 'dsm-netFoot' }, `${t('totalTransferred')}  ↓ ${formatBytes(network.sessionRx)}  ↑ ${formatBytes(network.sessionTx)}`),
        activeInterfaces.length > 1
          ? h('div', { className: 'dsm-ifaceList' },
            activeInterfaces.map((item) => h('div', { className: 'dsm-ifaceRow', key: item.name },
              h('span', null, item.name),
              h('span', null, `↓ ${formatBytes(item.rxBytesPerSec)}/s  ↑ ${formatBytes(item.txBytesPerSec)}/s`),
            )),
          )
          : null,
      );
    }

    function BatteryPanel({ data, t }) {
      const battery = data && data.battery ? data.battery : null;
      if (!battery) {
        return h(
          'section',
          { className: 'dsm-panel' },
          h('div', { className: 'dsm-panelHead' },
            h('span', { className: 'dsm-kicker' }, t('battery')),
            h('span', { className: 'dsm-headNote' }, '—'),
          ),
          h('div', { className: 'dsm-muted' }, t('batteryNo')),
        );
      }
      const statusKey = {
        charging: 'batteryStatusCharging',
        discharging: 'batteryStatusDischarging',
        full: 'batteryStatusFull',
        ac: 'batteryStatusAc',
      }[battery.status] || 'batteryStatusAc';
      const tone = battery.percent <= 20 ? 'error' : battery.percent <= 40 ? 'warn' : 'ok';
      const details = [
        [t('batteryTimeRemaining'), battery.timeRemainingMinutes != null ? formatDuration(battery.timeRemainingMinutes * 60, t) : '—'],
        [t('batteryCycles'), battery.cycleCount != null ? String(battery.cycleCount) : '—'],
        [t('batteryHealth'), battery.healthPercent != null ? `${battery.healthPercent}%` : '—'],
        [t('batteryTemperature'), battery.temperatureC != null ? `${battery.temperatureC}°C` : '—'],
      ];
      return h(
        'section',
        { className: 'dsm-panel' },
        h('div', { className: 'dsm-panelHead' },
          h('div', null,
            h('span', { className: 'dsm-kicker' }, t('battery')),
            h('strong', { className: `dsm-bigNum is-${tone}` }, `${battery.percent}%`),
          ),
          h('span', { className: 'dsm-headNote' }, `${t(statusKey)}${battery.adapterWatts ? ` · ${battery.adapterWatts}W` : ''}`),
        ),
        h('div', { className: 'dsm-batteryTrack' },
          h('i', { className: `is-${tone}`, style: { width: `${battery.percent}%` } }),
        ),
        h('div', { className: 'dsm-infoGrid dsm-batteryGrid' },
          details.map(([label, value]) => h('div', { className: 'dsm-infoRow', key: label },
            h('span', null, label),
            h('b', { title: value }, value),
          )),
        ),
      );
    }

    function FanPanel({ data, t }) {
      const fans = data && data.fans && Array.isArray(data.fans.fans) ? data.fans.fans : [];
      const maxRpm = fans.reduce((max, fan) => Math.max(max, Number(fan.rpm) || 0), 0);
      return h(
        'section',
        { className: 'dsm-panel' },
        h('div', { className: 'dsm-panelHead' },
          h('div', null,
            h('span', { className: 'dsm-kicker' }, t('fan')),
            h('strong', { className: 'dsm-bigNum' }, fans.length > 0 ? `${Math.round(maxRpm)} RPM` : '—'),
          ),
          h('span', { className: 'dsm-headNote' }, fans.length > 0 ? `${fans.length} ${t('fan')}` : t('fanUnavailable')),
        ),
        fans.length > 0
          ? h('div', { className: 'dsm-fanList' },
            fans.map((fan) => {
              const rpm = Number(fan.rpm) || 0;
              const max = Number(fan.max) || 0;
              const percent = max > 0 ? clamp((rpm / max) * 100, 0, 100) : 0;
              return h('div', { className: 'dsm-fanRow', key: fan.index },
                h('span', { className: 'dsm-fanLabel' }, `${t('fan')} ${fan.index + 1}`),
                h(Meter, { value: percent, tone: percent >= 85 ? 'warn' : 'ok' }),
                h('span', { className: 'dsm-fanRpm' }, `${Math.round(rpm)} RPM`),
              );
            }),
          )
          : h('div', { className: 'dsm-muted' }, t('fanUnavailable')),
      );
    }

    function SystemPanel({ data, t }) {
      const host = data ? data.host : { hostname: '—', platformLabel: '—', osVersion: '—', arch: '—', cpuModel: '—', cpuCount: 0, uptimeSec: 0, load: [0, 0, 0] };
      const summary = data ? data.processSummary : { total: 0, running: 0, sleeping: 0, stopped: 0, zombie: 0, other: 0 };

      const rows = [
        [t('hostname'), host.hostname],
        [t('platform'), `${host.platformLabel} ${host.osVersion}`],
        [t('arch'), host.arch],
        [t('cpuModel'), host.cpuModel],
        [t('cores'), String(host.cpuCount)],
        [t('uptime'), formatDuration(host.uptimeSec, t)],
      ];

      return h(
        'section',
        { className: 'dsm-panel dsm-systemPanel' },
        h('div', { className: 'dsm-panelHead' },
          h('span', { className: 'dsm-kicker' }, t('system')),
          h('span', { className: 'dsm-headNote' }, data ? host.hostname : ''),
        ),
        h('div', { className: 'dsm-infoGrid' },
          rows.map(([label, value]) => h('div', { className: 'dsm-infoRow', key: label },
            h('span', null, label),
            h('b', { title: value }, value),
          )),
        ),
        h('div', { className: 'dsm-procSummary' },
          h('span', null, h('b', null, summary.total), ` ${t('processes')}`),
          h('span', { className: 'is-running' }, h('i'), `${summary.running} ${t('running')}`),
          h('span', null, h('i', { className: 'is-sleeping' }), `${summary.sleeping} ${t('sleeping')}`),
          summary.zombie > 0 ? h('span', { className: 'is-zombie' }, h('i'), `${summary.zombie} ${t('zombie')}`) : null,
        ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Process table                                                       */
    /* ------------------------------------------------------------------ */

    function processFilter(row, query, filter) {
      if (filter === 'user' && (row.user === 'root' || row.user.startsWith('_'))) return false;
      if (filter === 'active' && row.cpu < 0.1) return false;
      if (!query) return true;
      const needle = query.toLowerCase();
      return String(row.pid).includes(needle)
        || row.user.toLowerCase().includes(needle)
        || (row.name || '').toLowerCase().includes(needle)
        || (row.command || '').toLowerCase().includes(needle);
    }

    function compareRows(a, b, key, direction) {
      const left = a[key];
      const right = b[key];
      let result;
      if (typeof left === 'string' || typeof right === 'string') {
        result = String(left || '').localeCompare(String(right || ''), undefined, { numeric: true, sensitivity: 'base' });
      } else {
        result = (Number(left) || 0) - (Number(right) || 0);
      }
      return direction === 'asc' ? result : -result;
    }

    function ProcessPanel(props) {
      const {
        rows, snapshot, t, query, setQuery, filter, setFilter,
        sortKey, sortDir, onSort, selectedPid, setSelectedPid,
        maskPaths, setMaskPaths, maskUsers, setMaskUsers,
      } = props;

      const columns = [
        { key: 'pid', label: t('pid'), className: 'dsm-c-pid' },
        { key: 'user', label: t('user'), className: 'dsm-c-user' },
        { key: 'cpu', label: t('cpuShort'), className: 'dsm-c-num' },
        { key: 'mem', label: t('memShort'), className: 'dsm-c-num' },
        { key: 'rss', label: t('rss'), className: 'dsm-c-num dsm-c-rss' },
        { key: 'state', label: t('state'), className: 'dsm-c-state' },
        { key: 'cpuTime', label: t('timePlus'), className: 'dsm-c-time' },
        { key: 'name', label: t('command'), className: 'dsm-c-cmd' },
      ];

      const filters = [
        ['all', t('filterAll')],
        ['user', t('filterUser')],
        ['active', t('filterActive')],
      ];

      return h(
        'section',
        { className: 'dsm-panel dsm-processPanel' },
        h('div', { className: 'dsm-procToolbar' },
          h('div', { className: 'dsm-procTitle' },
            h('span', { className: 'dsm-kicker' }, t('processes')),
            h('b', null, snapshot ? snapshot.processSummary.total : 0),
          ),
          h('label', { className: 'dsm-search' },
            h(SearchIcon),
            h('input', {
              value: query,
              placeholder: t('searchPlaceholder'),
              onChange: (event) => setQuery(event.target.value),
              spellCheck: false,
            }),
            query ? h('button', { type: 'button', className: 'dsm-searchClear', onClick: () => setQuery(''), 'aria-label': t('close') }, h(CloseIcon)) : null,
          ),
          h('div', { className: 'dsm-filter' },
            filters.map(([value, label]) => h(
              'button',
              {
                key: value,
                type: 'button',
                className: classNames('dsm-filterBtn', filter === value && 'is-active'),
                onClick: () => setFilter(value),
              },
              label,
            )),
          ),
        ),
        h('div', { className: 'dsm-tableWrap' },
          h('table', { className: 'dsm-table' },
            h('thead', null,
              h('tr', null,
                columns.map((column) => {
                  const privacy = column.key === 'name'
                    ? { masked: maskPaths, setMasked: setMaskPaths, hide: t('hidePaths'), show: t('showPaths') }
                    : column.key === 'user'
                      ? { masked: maskUsers, setMasked: setMaskUsers, hide: t('hideUsers'), show: t('showUsers') }
                      : null;
                  return h(
                    'th',
                    {
                      key: column.key,
                      className: classNames(column.className, sortKey === column.key && 'is-sorted'),
                      onClick: () => onSort(column.key),
                      scope: 'col',
                      'aria-sort': sortKey === column.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none',
                    },
                    privacy
                      ? h('span', { className: 'dsm-cmdHead' },
                        column.label,
                        h('button', {
                          type: 'button',
                          className: classNames('dsm-eyeBtn', privacy.masked && 'is-off'),
                          title: privacy.masked ? privacy.show : privacy.hide,
                          'aria-label': privacy.masked ? privacy.show : privacy.hide,
                          'aria-pressed': privacy.masked,
                          onClick: (event) => {
                            event.stopPropagation();
                            privacy.setMasked(!privacy.masked);
                          },
                        }, h(EyeIcon, { size: 13, off: privacy.masked })),
                      )
                      : column.label,
                    sortKey === column.key
                      ? h('i', { className: 'dsm-sortArrow' }, sortDir === 'asc' ? '▲' : '▼')
                      : h('i', { className: 'dsm-sortHint', 'aria-hidden': true }, '↕'),
                  );
                }),
              ),
            ),
            h('tbody', null,
              rows.length === 0
                ? h('tr', null, h('td', { colSpan: columns.length, className: 'dsm-emptyCell' }, t('noProcesses')))
                : rows.map((row) => h(
                  'tr',
                  {
                    key: row.pid,
                    className: classNames('dsm-procRow', selectedPid === row.pid && 'is-selected'),
                    onClick: () => setSelectedPid(row.pid),
                    title: maskPaths ? undefined : row.command,
                  },
                  h('td', { className: 'dsm-c-pid' }, String(row.pid)),
                  h('td', { className: 'dsm-c-user', title: maskUsers ? undefined : row.user }, maskUsers ? maskUser(row.user) : row.user),
                  h('td', { className: 'dsm-c-num' }, h('span', { className: classNames('dsm-cpuText', row.cpu >= 50 && 'is-hot', row.cpu >= 10 && row.cpu < 50 && 'is-warm') }, row.cpu.toFixed(1))),
                  h('td', { className: 'dsm-c-num' }, row.mem.toFixed(1)),
                  h('td', { className: 'dsm-c-num dsm-c-rss' }, formatBytes(row.rss)),
                  h('td', { className: 'dsm-c-state' }, h('span', { className: `dsm-state is-${row.state}` }, row.state || '?')),
                  h('td', { className: 'dsm-c-time' }, row.cpuTime || '—'),
                  h('td', { className: 'dsm-c-cmd' },
                    h('span', { className: 'dsm-cmdWrap' },
                      h(ProcessIcon, { process: row, size: 14 }),
                      h('span', { className: 'dsm-cmdText' }, maskPaths ? maskCommand(row) : row.command || row.name),
                    ),
                  ),
                )),
            ),
          ),
        ),
        h('div', { className: 'dsm-tableFoot' },
          h('span', null, `${rows.length} / ${snapshot ? snapshot.processSummary.total : 0} ${t('processes')}`),
          h('span', null, snapshot ? `${snapshot.processSummary.running} ${t('running')}` : ''),
        ),
      );
    }

    function KillConfirmDialog({ process: item, t, busy, error, onCancel, onConfirm }) {
      const cancelRef = useRef(null);

      useEffect(() => {
        const handleKeyDown = (event) => {
          if (event.key === 'Escape' && !busy) onCancel();
        };
        document.addEventListener('keydown', handleKeyDown);
        const timer = setTimeout(() => {
          if (cancelRef.current) cancelRef.current.focus();
        }, 0);
        return () => {
          document.removeEventListener('keydown', handleKeyDown);
          clearTimeout(timer);
        };
      }, [busy, onCancel]);

      return h(
        'div',
        {
          className: 'dsm-modalBackdrop',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget && !busy) onCancel();
          },
        },
        h(
          'div',
          {
            className: 'dsm-modal',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'dsm-kill-title',
          },
          h(
            'div',
            { className: 'dsm-modalHead' },
            h('span', { className: 'dsm-modalIcon' }, h(KillIcon)),
            h(
              'div',
              { className: 'dsm-modalText' },
              h('h2', { className: 'dsm-modalTitle', id: 'dsm-kill-title' }, t('killDialogTitle')),
              h('p', { className: 'dsm-modalDesc' }, t('killDialogDesc')),
            ),
          ),
          h(
            'div',
            { className: 'dsm-modalTarget' },
            h(ProcessIcon, { process: item, size: 24, className: 'dsm-modalProcIcon' }),
            h('b', null, item.name || item.command),
            h('code', null, `PID ${item.pid}`),
          ),
          error ? h('div', { className: 'dsm-killError' }, error) : null,
          h(
            'div',
            { className: 'dsm-modalActions' },
            h('button', {
              ref: cancelRef,
              type: 'button',
              className: 'dsm-btn',
              disabled: busy,
              onClick: onCancel,
            }, t('cancel')),
            h('button', {
              type: 'button',
              className: 'dsm-btn dsm-btnDanger',
              disabled: busy,
              onClick: onConfirm,
            }, busy ? t('killing') : t('confirmKill')),
          ),
        ),
      );
    }

    function ProcessDetail({ process: item, t, onClose, onKilled, maskPaths, maskUsers }) {
      const [dialogOpen, setDialogOpen] = useState(false);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState(null);

      const rows = [
        [t('ppid'), String(item.ppid)],
        [t('user'), maskUsers ? maskUser(item.user) : item.user],
        [t('state'), stateLabel(item.state, t)],
        [t('cpuShort'), formatPercent(item.cpu)],
        [t('memShort'), formatPercent(item.mem)],
        [t('rss'), formatBytes(item.rss)],
        [t('virtual'), formatBytes(item.vsz)],
        [t('elapsed'), item.elapsed],
        [t('cpuTime'), item.cpuTime || '—'],
      ];

      const closeDialog = useCallback(() => {
        if (busy) return;
        setDialogOpen(false);
        setError(null);
      }, [busy]);

      const handleKill = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
          const response = await fetch(KILL_API, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ pid: item.pid }),
          });
          let payload = null;
          try {
            payload = await response.json();
          } catch {
            payload = null;
          }
          if (!response.ok || !payload || payload.ok !== true) {
            const failure = new Error('kill failed');
            failure.code = payload && payload.code;
            throw failure;
          }
          setBusy(false);
          setDialogOpen(false);
          if (typeof onKilled === 'function') onKilled(item);
        } catch (reason) {
          setBusy(false);
          setError(killErrorMessage(reason && reason.code, t));
        }
      }, [item, t, onKilled]);

      return h(
        'section',
        { className: 'dsm-panel dsm-detail' },
        h('div', { className: 'dsm-detailHead' },
          h('div', { className: 'dsm-detailTitle' },
            h(ProcessIcon, { process: item, size: 34, className: 'dsm-detailIcon' }),
            h('div', { className: 'dsm-detailTitleText' },
              h('span', { className: 'dsm-kicker' }, t('selectedProcess')),
              h('strong', null, item.name || item.command),
              h('code', null, `PID ${item.pid}`),
              h('button', {
                type: 'button',
                className: 'dsm-killIconBtn',
                title: t('killProcess'),
                'aria-label': t('killProcess'),
                onClick: () => {
                  setError(null);
                  setDialogOpen(true);
                },
              }, h(KillIcon, { size: 13 })),
            ),
          ),
          h('div', { className: 'dsm-detailActions' },
            h('button', { type: 'button', className: 'dsm-iconBtn', onClick: onClose, 'aria-label': t('close'), title: t('close') }, h(CloseIcon)),
          ),
        ),
        h('div', { className: 'dsm-detailGrid' },
          rows.map(([label, value]) => h('div', { className: 'dsm-detailItem', key: label },
            h('span', null, label),
            h('b', { title: value }, value),
          )),
        ),
        h('div', { className: 'dsm-detailCommand' },
          h('span', { className: 'dsm-kicker' }, t('command')),
          h('code', null, maskPaths ? maskCommand(item) : item.command || item.name),
        ),
        dialogOpen
          ? h(KillConfirmDialog, {
            process: item,
            t,
            busy,
            error,
            onCancel: closeDialog,
            onConfirm: handleKill,
          })
          : null,
      );
    }

    /* ------------------------------------------------------------------ */
    /* Page                                                                */
    /* ------------------------------------------------------------------ */

    function SystemMonitorPage(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key;
      const [refreshMs, setRefreshMs] = useState(5000);
      const [paused, setPaused] = useState(false);
      const [query, setQuery] = useState('');
      const [filter, setFilter] = useState('all');
      const [sortKey, setSortKey] = useState('cpu');
      const [sortDir, setSortDir] = useState('desc');
      const [selectedPid, setSelectedPid] = useState(null);
      const [maskPaths, setMaskPaths] = useState(false);
      const [maskUsers, setMaskUsers] = useState(false);
      const [history, setHistory] = useState({ cpu: [], mem: [], disk: [], net: [] });
      const [notice, setNotice] = useState(null);

      const { snapshot, error, updatedAt, loading, retry } = useSnapshot(refreshMs, paused);

      useEffect(() => {
        if (!notice) return undefined;
        const timer = setTimeout(() => setNotice(null), 4200);
        return () => clearTimeout(timer);
      }, [notice]);

      useEffect(() => {
        if (!snapshot) return;
        setHistory((previous) => ({
          cpu: [...previous.cpu, snapshot.cpu.total].slice(-HISTORY_LIMIT),
          mem: [...previous.mem, snapshot.memory.total > 0 ? (snapshot.memory.used / snapshot.memory.total) * 100 : 0].slice(-HISTORY_LIMIT),
          disk: [...previous.disk, (snapshot.diskIO ? snapshot.diskIO.readBytesPerSec + snapshot.diskIO.writeBytesPerSec : 0)].slice(-HISTORY_LIMIT),
          net: [...previous.net, (snapshot.network ? snapshot.network.rxBytesPerSec + snapshot.network.txBytesPerSec : 0)].slice(-HISTORY_LIMIT),
        }));
      }, [snapshot]);

      const processes = snapshot ? snapshot.processes : [];

      const rows = useMemo(() => {
        if (!snapshot) return [];
        const filtered = processes.filter((row) => processFilter(row, query.trim(), filter));
        return filtered.slice().sort((a, b) => compareRows(a, b, sortKey, sortDir));
      }, [snapshot, processes, query, filter, sortKey, sortDir]);

      const selected = useMemo(() => {
        if (selectedPid === null) return null;
        return processes.find((row) => row.pid === selectedPid) || null;
      }, [processes, selectedPid]);

      useEffect(() => {
        if (selectedPid !== null && snapshot && !snapshot.processes.some((row) => row.pid === selectedPid)) {
          setSelectedPid(null);
        }
      }, [snapshot, selectedPid]);

      const onSort = useCallback((key) => {
        if (key === sortKey) {
          setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'));
          return;
        }
        setSortKey(key);
        setSortDir(key === 'user' || key === 'name' || key === 'state' || key === 'pid' ? 'asc' : 'desc');
      }, [sortKey]);

      const handleKilled = useCallback((item) => {
        setSelectedPid(null);
        setNotice({
          tone: 'success',
          text: `${t('killSuccess')}：${item.name || item.command} (PID ${item.pid})`,
        });
        retry();
      }, [t, retry]);

      const intervalLabel = (ms) => (ms < 1000 ? `${ms / 1000}s` : `${ms / 1000}s`);

      return h(
        'div',
        { className: 'dsm-root' },
        h('header', { className: 'dsm-topbar' },
          h('div', { className: 'dsm-brand' },
            h('span', { className: 'dsm-brandGlyph' }, h(MonitorGlyph, { size: 22 })),
            h('div', { className: 'dsm-brandText' },
              h('h1', null, t('title')),
              h('p', null, snapshot
                ? `${snapshot.host.hostname} · ${snapshot.host.platformLabel} ${snapshot.host.osVersion} · ${snapshot.host.cpuModel}`
                : t('subtitle')),
            ),
          ),
          h('div', { className: 'dsm-controls' },
            h('span', { className: classNames('dsm-live', paused && 'is-paused') },
              h('i'), paused ? t('paused') : t('live')),
            h('div', { className: 'dsm-seg', role: 'group', 'aria-label': t('interval') },
              INTERVALS.map((ms) => h('button', {
                key: ms,
                type: 'button',
                className: classNames(refreshMs === ms && 'is-active'),
                onClick: () => setRefreshMs(ms),
              }, intervalLabel(ms))),
            ),
            h('button', {
              type: 'button',
              className: classNames('dsm-btn', paused && 'is-primary'),
              onClick: () => setPaused((value) => !value),
            }, paused ? h(PlayIcon) : h(PauseIcon), paused ? t('resume') : t('pause')),
          ),
        ),
        error
          ? h('div', { className: 'dsm-errorBar' },
            h('div', null, h('b', null, t('errorTitle')), h('span', null, error)),
            h('button', { type: 'button', className: 'dsm-btn', onClick: retry }, t('retry')),
          )
          : null,
        notice
          ? h('div', { className: `dsm-noticeBar is-${notice.tone}` },
            h('span', null, notice.text),
            h('button', { type: 'button', className: 'dsm-iconBtn', onClick: () => setNotice(null), 'aria-label': t('close') }, h(CloseIcon)),
          )
          : null,
        loading && !snapshot
          ? h('div', { className: 'dsm-loading' },
            h('span', { className: 'dsm-spinner' }),
            h('span', null, t('loading')),
          )
          : h('div', { className: 'dsm-body' },
            h('aside', { className: 'dsm-side' },
              h(CpuPanel, { data: snapshot, history: history.cpu, t }),
              h(MemoryPanel, { data: snapshot, history: history.mem, t }),
              h(DiskPanel, { data: snapshot, history: history.disk, t }),
              h(NetworkPanel, { data: snapshot, history: history.net, t }),
              h(BatteryPanel, { data: snapshot, t }),
              h(FanPanel, { data: snapshot, t }),
              h(SystemPanel, { data: snapshot, t }),
            ),
            h('main', { className: 'dsm-main' },
              h(ProcessPanel, {
                rows,
                snapshot,
                t,
                query,
                setQuery,
                filter,
                setFilter,
                sortKey,
                sortDir,
                onSort,
                selectedPid,
                setSelectedPid,
                maskPaths,
                setMaskPaths,
                maskUsers,
                setMaskUsers,
              }),
              selected ? h(ProcessDetail, { process: selected, t, onClose: () => setSelectedPid(null), onKilled: handleKilled, maskPaths, maskUsers }) : null,
            ),
          ),
        h('footer', { className: 'dsm-footer' },
          h('span', null, updatedAt ? `${t('updated')} ${formatClock(updatedAt)}` : t('lastSample') + ' —'),
          h('span', null, snapshot ? `${snapshot.processSummary.total} ${t('processes')} · ${formatBytes(snapshot.memory.used)} / ${formatBytes(snapshot.memory.total)}` : ''),
          h('span', null, `${t('interval')} ${refreshMs / 1000}s`),
        ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Styles                                                              */
    /* ------------------------------------------------------------------ */

    const CSS = `
.dsm-root{--dsm-mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;display:flex;flex-direction:column;width:100%;height:100%;min-height:0;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);overflow:hidden}
.dsm-root *{box-sizing:border-box}
.dsm-topbar{flex:none;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 20px 14px max(20px, var(--dsh-frame-leading-clearance, 20px));border-bottom:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 62%,transparent);transition:padding-left var(--ds-transition-duration-slow, 220ms) var(--ds-ease-in-out, ease)}
.dsm-brand{display:flex;align-items:center;gap:12px;min-width:0}
.dsm-brandGlyph{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;flex:none;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,var(--dsw-alias-border-l1));border-radius:11px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-brand-primary)}
.dsm-brandText{min-width:0}
.dsm-brandText h1{margin:0;font-size:16px;font-weight:600;line-height:24px;letter-spacing:.01em}
.dsm-brandText p{margin:1px 0 0;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsm-controls{display:flex;align-items:center;gap:10px;flex:none}
.dsm-live{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-state-success-primary);font-size:11px;font-weight:500;line-height:18px;white-space:nowrap}
.dsm-live i{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 0 3px color-mix(in srgb,currentColor 14%,transparent);animation:dsm-pulse 1.8s ease-in-out infinite}
.dsm-live.is-paused{color:var(--dsw-alias-state-warn-primary)}
.dsm-live.is-paused i{animation:none;box-shadow:none}
@keyframes dsm-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.dsm-seg{display:inline-flex;align-items:center;gap:1px;padding:2px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base)}
.dsm-seg button{height:24px;padding:0 7px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-family:var(--dsm-mono);font-size:10px;cursor:pointer}
.dsm-seg button:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.dsm-seg button.is-active{color:var(--dsw-alias-bg-base);background:var(--dsw-alias-label-primary)}
.dsm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;font-weight:500;line-height:18px;white-space:nowrap;cursor:pointer;transition:background .15s,border-color .15s,opacity .15s}
.dsm-btn:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}
.dsm-btn.is-primary{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-brand-primary)}
.dsm-btn.dsm-btnDanger{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 55%,var(--dsw-alias-border-l1));color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 7%,transparent)}
.dsm-btn.dsm-btnDanger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent);border-color:var(--dsw-alias-state-error-primary)}
.dsm-btn:disabled{opacity:.5;cursor:default}
.dsm-btn:focus-visible,.dsm-seg button:focus-visible,.dsm-filterBtn:focus-visible,.dsm-iconBtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dsm-errorBar{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 16px 0;padding:9px 12px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 42%,var(--dsw-alias-border-l1));border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12px}
.dsm-errorBar div{display:flex;align-items:baseline;gap:8px;min-width:0}
.dsm-errorBar span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.85}
.dsm-noticeBar{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 16px 0;padding:8px 12px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-success-primary) 40%,var(--dsw-alias-border-l1));border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,transparent);color:var(--dsw-alias-state-success-primary);font-size:12px;line-height:18px}
.dsm-noticeBar span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsm-loading{flex:1;display:flex;align-items:center;justify-content:center;gap:10px;color:var(--dsw-alias-label-secondary);font-size:13px}
.dsm-spinner{width:15px;height:15px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:dsm-spin .75s linear infinite}
@keyframes dsm-spin{to{transform:rotate(360deg)}}
.dsm-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(320px,388px) minmax(0,1fr);gap:12px;padding:12px 16px;overflow:hidden}
.dsm-side{display:flex;flex-direction:column;gap:12px;min-height:0;overflow:auto;padding-right:2px}
.dsm-main{display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0}
.dsm-panel{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:12px 14px;min-width:0}
.dsm-panelHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}
.dsm-kicker{display:block;color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:600;letter-spacing:.13em;line-height:16px;text-transform:uppercase}
.dsm-bigNum{display:block;margin-top:1px;font-family:var(--dsm-mono);font-size:26px;font-weight:600;line-height:32px;font-variant-numeric:tabular-nums}
.dsm-bigNum.is-ok,.dsm-coreVal.is-ok{color:var(--dsw-alias-state-success-primary)}
.dsm-bigNum.is-warn,.dsm-coreVal.is-warn{color:var(--dsw-alias-state-warn-primary)}
.dsm-bigNum.is-error,.dsm-coreVal.is-error{color:var(--dsw-alias-state-error-primary)}
.dsm-loads{display:flex;flex-direction:column;gap:1px;text-align:right;padding-top:2px}
.dsm-loads span{display:inline-flex;align-items:baseline;justify-content:flex-end;gap:5px;color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px}
.dsm-loads em{font-style:normal;opacity:.75}
.dsm-loads b{font-family:var(--dsm-mono);font-size:11px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.dsm-sparkWrap{position:relative;height:52px;margin:4px 0 8px;color:var(--dsw-alias-brand-primary);background-image:linear-gradient(color-mix(in srgb,var(--dsw-alias-label-secondary) 12%,transparent) 1px,transparent 1px);background-size:100% 25%;border-radius:4px;overflow:hidden}
.dsm-sparkWrap.is-small{height:34px;margin:8px 0 0;color:var(--dsw-alias-state-success-primary)}
.dsm-spark{display:block;width:100%;height:100%}
.dsm-spark.is-mem{color:var(--dsw-alias-state-success-primary)}
.dsm-cores{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 10px}
.dsm-core{display:grid;grid-template-columns:24px minmax(0,1fr) 30px;align-items:center;gap:5px;min-width:0}
.dsm-coreId{color:var(--dsw-alias-label-secondary);font-family:var(--dsm-mono);font-size:9px;line-height:12px}
.dsm-coreVal{font-family:var(--dsm-mono);font-size:9px;line-height:12px;text-align:right;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dsm-meter{position:relative;height:7px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 9%,transparent);overflow:hidden;flex:1;min-width:0}
.dsm-meter>i{display:block;height:100%;border-radius:inherit;transition:width .3s ease;background:var(--dsw-alias-state-success-primary)}
.dsm-meter>i.is-warn{background:var(--dsw-alias-state-warn-primary)}
.dsm-meter>i.is-error{background:var(--dsw-alias-state-error-primary)}
.dsm-meter>i.is-brand{background:var(--dsw-alias-brand-primary)}
.dsm-meter>i.is-ok{background:var(--dsw-alias-state-success-primary)}
.dsm-headNote{color:var(--dsw-alias-label-secondary);font-family:var(--dsm-mono);font-size:10px;line-height:16px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:55%}
.dsm-stack{display:flex;height:10px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 9%,transparent);overflow:hidden}
.dsm-stack i{display:block;height:100%}
.dsm-stack i.is-used{background:var(--dsw-alias-state-success-primary)}
.dsm-stack i.is-cached{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 38%,var(--dsw-alias-bg-layer-1))}
.dsm-legend{display:flex;flex-wrap:wrap;gap:4px 12px;margin:7px 0 0;color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px}
.dsm-legend span{display:inline-flex;align-items:center;gap:4px}
.dsm-legend i{display:inline-block;width:7px;height:7px;border-radius:2px;background:var(--dsw-alias-label-secondary)}
.dsm-legend i.is-used{background:var(--dsw-alias-state-success-primary)}
.dsm-legend i.is-cached{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 38%,var(--dsw-alias-bg-layer-1))}
.dsm-legend i.is-free{background:color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent)}
.dsm-subRow{display:flex;align-items:center;gap:8px;margin-top:10px;color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px}
.dsm-subRow>span{flex:none;width:62px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsm-subRow>b{flex:none;font-family:var(--dsm-mono);font-size:9px;font-weight:500;font-variant-numeric:tabular-nums}
.dsm-infoGrid{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-top:2px}
.dsm-infoRow{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-width:0;font-size:10px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.dsm-infoRow b{color:var(--dsw-alias-label-primary);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:var(--dsm-mono);font-size:9px}
.dsm-disk{margin-top:11px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1)}
.dsm-diskHead{display:flex;align-items:center;justify-content:space-between;color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px;margin-bottom:6px}
.dsm-diskHead b{color:var(--dsw-alias-label-primary);font-family:var(--dsm-mono);font-size:11px;font-variant-numeric:tabular-nums}
.dsm-diskFoot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:5px;color:var(--dsw-alias-label-secondary);font-family:var(--dsm-mono);font-size:9px;line-height:14px}
.dsm-diskFoot span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%}
.dsm-volumeRow{display:flex;align-items:center;gap:8px;margin-top:2px;color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px}
.dsm-volumeRow>span{flex:none;width:62px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsm-volumeRow .dsm-meter{height:8px}
.dsm-ioGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.dsm-statBox{min-width:0;padding:7px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base)}
.dsm-statBox span{display:flex;align-items:center;gap:4px;color:var(--dsw-alias-label-secondary);font-size:9px;line-height:13px;letter-spacing:.04em}
.dsm-statBox b{display:block;margin-top:2px;font-family:var(--dsm-mono);font-size:13px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsm-dirIcon{font-style:normal;font-weight:700}
.dsm-dirIcon.is-down{color:var(--dsw-alias-state-success-primary)}
.dsm-dirIcon.is-up{color:var(--dsw-alias-brand-primary)}
.dsm-netFoot{margin-top:8px;color:var(--dsw-alias-label-secondary);font-family:var(--dsm-mono);font-size:9px;line-height:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsm-ifaceList{margin-top:7px;padding-top:7px;border-top:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:3px}
.dsm-ifaceRow{display:flex;justify-content:space-between;gap:8px;color:var(--dsw-alias-label-secondary);font-family:var(--dsm-mono);font-size:9px;line-height:14px}
.dsm-ifaceRow span:last-child{color:var(--dsw-alias-label-primary);white-space:nowrap}
.dsm-batteryTrack{display:flex;height:10px;margin-top:2px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 9%,transparent);overflow:hidden}
.dsm-batteryTrack>i{display:block;height:100%;border-radius:inherit;background:var(--dsw-alias-state-success-primary);transition:width .35s ease}
.dsm-batteryTrack>i.is-warn{background:var(--dsw-alias-state-warn-primary)}
.dsm-batteryTrack>i.is-error{background:var(--dsw-alias-state-error-primary)}
.dsm-batteryGrid{margin-top:9px}
.dsm-fanList{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.dsm-fanRow{display:grid;grid-template-columns:52px minmax(0,1fr) 74px;align-items:center;gap:8px;min-width:0}
.dsm-fanLabel{color:var(--dsw-alias-label-secondary);font-size:9px;line-height:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsm-fanRpm{color:var(--dsw-alias-label-primary);font-family:var(--dsm-mono);font-size:9px;line-height:14px;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.dsm-fanRow .dsm-meter{height:8px}
.dsm-sparkWrap.is-disk{color:var(--dsw-alias-brand-primary)}
.dsm-sparkWrap.is-net{color:var(--dsw-alias-state-success-primary)}
.dsm-procSummary{display:flex;flex-wrap:wrap;gap:5px 12px;margin-top:10px;padding-top:9px;border-top:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px}
.dsm-procSummary b{color:var(--dsw-alias-label-primary);font-family:var(--dsm-mono);font-size:11px}
.dsm-procSummary span{display:inline-flex;align-items:center;gap:4px}
.dsm-procSummary i{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}
.dsm-procSummary span.is-running{color:var(--dsw-alias-state-success-primary)}
.dsm-procSummary span.is-running i{background:currentColor}
.dsm-procSummary span.is-zombie{color:var(--dsw-alias-state-error-primary)}
.dsm-procSummary span.is-zombie i{background:currentColor}
.dsm-processPanel{flex:1;min-height:0;display:flex;flex-direction:column;padding:0;overflow:hidden}
.dsm-procToolbar{flex:none;display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap}
.dsm-procTitle{display:flex;align-items:baseline;gap:8px;margin-right:auto}
.dsm-procTitle .dsm-kicker{display:inline}
.dsm-procTitle b{font-family:var(--dsm-mono);font-size:15px;line-height:20px;font-variant-numeric:tabular-nums}
.dsm-search{display:flex;align-items:center;gap:6px;height:29px;padding:0 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);min-width:190px;flex:1;max-width:280px}
.dsm-search:focus-within{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 1px var(--dsw-alias-brand-primary)}
.dsm-search input{flex:1;min-width:0;border:0;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;line-height:18px}
.dsm-search input::placeholder{color:var(--dsw-alias-label-secondary)}
.dsm-searchClear{display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsm-searchClear:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsm-filter{display:inline-flex;align-items:center;gap:1px;padding:2px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base)}
.dsm-filterBtn{height:23px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10px;line-height:16px;cursor:pointer;white-space:nowrap}
.dsm-filterBtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.dsm-filterBtn.is-active{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l1)}
.dsm-tableWrap{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable}
.dsm-table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font-family:var(--dsm-mono);font-size:11px;line-height:16px}
.dsm-table thead th{position:sticky;top:0;z-index:2;height:30px;padding:0 8px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:9px;font-weight:600;letter-spacing:.08em;text-align:left;text-transform:uppercase;white-space:nowrap;cursor:pointer;user-select:none}
.dsm-table thead th:hover{color:var(--dsw-alias-label-primary)}
.dsm-table thead th.is-sorted{color:var(--dsw-alias-brand-primary)}
.dsm-sortArrow{margin-left:4px;font-size:7px;font-style:normal;opacity:.85}
.dsm-sortHint{display:inline-block;margin-left:4px;color:var(--dsw-alias-label-secondary);font-size:8px;font-style:normal;line-height:1;opacity:.32;transition:opacity .15s}
.dsm-table thead th:hover .dsm-sortHint{opacity:.7}
.dsm-table tbody td{height:27px;padding:0 8px;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 55%,transparent);color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.dsm-procRow{cursor:pointer}
.dsm-procRow:hover td{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 7%,transparent)}
.dsm-procRow.is-selected td{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}
.dsm-procRow.is-selected td:first-child{box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary)}
.dsm-c-pid{width:66px;color:var(--dsw-alias-label-secondary)!important}
.dsm-c-user{width:108px;overflow:hidden;text-overflow:ellipsis}
.dsm-c-num{width:66px;text-align:right!important}
.dsm-c-rss{width:84px}
.dsm-c-state{width:54px;text-align:center!important}
.dsm-c-time{width:88px;color:var(--dsw-alias-label-secondary)!important}
.dsm-c-cmd{width:auto}
.dsm-cmdWrap{display:flex;align-items:center;gap:6px;min-width:0;width:100%}
.dsm-cmdText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.dsm-cmdHead{display:inline-flex;align-items:center;gap:5px;min-width:0}
.dsm-eyeBtn{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;padding:0;border:1px solid transparent;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;vertical-align:middle}
.dsm-eyeBtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsm-eyeBtn.is-off{color:var(--dsw-alias-state-warn-primary)}
.dsm-eyeBtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsm-procIcon{flex:none;display:inline-block;object-fit:contain;border-radius:3px}
.dsm-procIconFallback{display:inline-flex;align-items:center;justify-content:center;border-radius:4px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 17%,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-brand-primary);font-weight:700;line-height:1;text-transform:uppercase}
.dsm-cpuText{font-weight:600}
.dsm-cpuText.is-warm{color:var(--dsw-alias-state-warn-primary)}
.dsm-cpuText.is-hot{color:var(--dsw-alias-state-error-primary)}
.dsm-state{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:16px;padding:0 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:9px;font-weight:600;line-height:16px}
.dsm-state.is-R{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 16%,transparent);color:var(--dsw-alias-state-success-primary)}
.dsm-state.is-T{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 16%,transparent);color:var(--dsw-alias-state-warn-primary)}
.dsm-state.is-Z{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 16%,transparent);color:var(--dsw-alias-state-error-primary)}
.dsm-emptyCell{padding:32px 10px!important;text-align:center;color:var(--dsw-alias-label-secondary)!important;font-family:inherit!important;font-size:12px!important}
.dsm-tableFoot{flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 14px;border-top:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 80%,transparent);color:var(--dsw-alias-label-secondary);font-family:var(--dsm-mono);font-size:9px;line-height:14px;font-variant-numeric:tabular-nums}
.dsm-detail{flex:none;max-height:280px;overflow:auto;animation:dsm-detailIn .18s ease-out}
@keyframes dsm-detailIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.dsm-detailHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.dsm-detailTitle{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
.dsm-detailIcon{flex:none;border-radius:7px}
.dsm-detailTitleText{display:flex;align-items:baseline;gap:8px;min-width:0;flex-wrap:wrap}
.dsm-detailTitleText strong{font-size:14px;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:48%}
.dsm-detailTitleText code{color:var(--dsw-alias-label-secondary);font-family:var(--dsm-mono);font-size:10px}
.dsm-killIconBtn{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;flex:none;align-self:center;margin-left:1px;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background .15s,border-color .15s,color .15s}
.dsm-killIconBtn:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}
.dsm-killIconBtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dsm-detailActions{display:flex;align-items:center;gap:6px;flex:none}
.dsm-iconBtn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;flex:none;padding:0;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsm-iconBtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsm-detailGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px 12px;margin-top:9px}
.dsm-detailItem{min-width:0}
.dsm-detailItem span{display:block;color:var(--dsw-alias-label-secondary);font-size:9px;line-height:13px;letter-spacing:.04em}
.dsm-detailItem b{display:block;font-family:var(--dsm-mono);font-size:10px;font-weight:500;line-height:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsm-detailCommand{margin-top:9px;padding-top:8px;border-top:1px solid var(--dsw-alias-border-l1)}
.dsm-detailCommand code{display:block;margin-top:3px;color:var(--dsw-alias-label-secondary);font-family:var(--dsm-mono);font-size:10px;line-height:15px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:52px;overflow:auto}
.dsm-killError{margin-top:12px;padding:7px 9px;border-radius:7px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 9%,transparent);color:var(--dsw-alias-state-error-primary);font-size:11px;line-height:17px}
.dsm-modalBackdrop{position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;padding:24px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 30%,transparent);animation:dsm-fadeIn .15s ease-out}
@keyframes dsm-fadeIn{from{opacity:0}to{opacity:1}}
.dsm-modal{width:min(430px,calc(100vw - 32px));padding:18px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-overlay);box-shadow:0 18px 50px color-mix(in srgb,var(--dsw-alias-label-primary) 25%,transparent);animation:dsm-modalIn .18s ease-out}
@keyframes dsm-modalIn{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.dsm-modalHead{display:flex;align-items:flex-start;gap:10px}
.dsm-modalIcon{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;flex:none;border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary)}
.dsm-modalText{min-width:0;padding-top:1px}
.dsm-modalTitle{margin:0;color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:22px}
.dsm-modalDesc{margin:3px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:19px}
.dsm-modalTarget{display:flex;align-items:center;gap:7px;margin-top:12px;padding:9px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);min-width:0}
.dsm-modalTarget b{font-size:12px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsm-modalTarget code{color:var(--dsw-alias-label-secondary);font-family:var(--dsm-mono);font-size:10px;line-height:16px;flex:none}
.dsm-modalProcIcon{flex:none}
.dsm-modalActions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.dsm-footer{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;height:28px;padding:0 18px;border-top:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-family:var(--dsm-mono);font-size:9px;line-height:14px;font-variant-numeric:tabular-nums;background:var(--dsw-alias-bg-base)}
.dsm-footer span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsm-muted{color:var(--dsw-alias-label-secondary);font-size:11px;padding:8px 0}
.dsm-navIcon{display:inline-flex;align-items:center;justify-content:center;color:currentColor}
@media (max-width:1180px){.dsm-c-user{display:none}.dsm-c-time{display:none}}
@media (max-width:980px){.dsm-body{grid-template-columns:1fr;overflow:auto}.dsm-side{overflow:visible}.dsm-processPanel{min-height:420px}.dsm-detailGrid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:720px){.dsm-topbar{align-items:flex-start;flex-direction:column}.dsm-controls{width:100%;justify-content:space-between;flex-wrap:wrap}.dsm-c-rss{display:none}.dsm-search{max-width:none;order:3;width:100%}}
`;

    function installStyle(css, id) {
      if (typeof document === 'undefined') return undefined;
      const selector = `style[data-plugin-css="${id}"]`;
      if (document.querySelector(selector) !== null) return undefined;
      const tag = document.createElement('style');
      tag.dataset.plugin = 'dsh-sys-monitor';
      tag.dataset.pluginCss = id;
      tag.textContent = css;
      document.head.appendChild(tag);
      return () => tag.remove();
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => installStyle(CSS, 'dsh-sys-monitor/page.css'), 'dsh-sys-monitor: styles');
        ctx.effect(() => ctx.locale.register(NS, 'zh', zh), 'dsh-sys-monitor: zh dictionary');
        ctx.effect(() => ctx.locale.register(NS, 'en', en), 'dsh-sys-monitor: en dictionary');

        const t = ctx.locale.bind(NS);
        ctx.slots.inject('main', () => ctx.slots.register(
          { name: 'main', key: 'system-monitor', locale: NS },
          SystemMonitorPage,
        ));
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: 'system-monitor',
            order: 30,
            locale: NS,
            label: () => t('panel.label'),
          },
          SystemMonitorIcon,
        ));
      },
    };
  },
});
