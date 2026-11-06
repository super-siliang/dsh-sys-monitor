# dsh-sys-monitor

[![npm version](https://img.shields.io/npm/v/dsh-sys-monitor.svg)](https://www.npmjs.com/package/dsh-sys-monitor)

DeepSeek Harness 的「系统监控」插件：一个 btop 风格的本机资源面板，左侧栏点击图标即可在网页中实时查看 CPU、内存、磁盘、网络与进程列表。

## 功能

- **CPU**：总体使用率、每核心占用条、90 点历史曲线、1/5/15 分钟负载。
- **内存**：已用 / 缓存 / 空闲分段、交换空间、历史曲线。
- **磁盘**：容量占用、实时读取 / 写入速率与 I/O 历史曲线。
- **网络**：实时下载 / 上传速率、本次累计流量、活跃网卡与吞吐历史曲线。
- **系统信息**：主机名、系统版本、架构、处理器、核心数、开机时长。
- **进程列表**：应用图标 + CPU / 内存 / RSS / 状态 / CPU 时间 / 命令，支持按列排序、搜索与「仅用户进程 / 仅活跃进程」过滤。
- **进程详情**：点击任意进程查看应用图标、父 PID、用户、状态、内存、耗时与完整命令行。
- **强制退出**：进程详情内提供电源图标，通过确认弹窗后发送 SIGKILL；Host 会保护自身进程并拒绝来自非授权用户的请求。
- **实时控制**：0.5s / 1s / 2s / 5s 刷新间隔，可暂停采样。

## 实现

- Host 端使用 Node `os` 模块与系统自带 `ps`、`vm_stat`、`sysctl`、`df`、`ioreg`、`netstat` 采集数据。
- 数据通过 Harness 的 `ctx.connection.fetch` 鉴权通道暴露为 `GET /api/dsh-sys-monitor/snapshot`、`/icon`、`/kill`，不额外监听端口。
- 进程图标通过 macOS 自带的 `sips` 将 `.app` 的 `.icns` 转为 PNG，并带本地缓存。
- Client 端是原生 Harness 面板，使用 `--dsw-alias-*` 主题 token，自动适配明暗主题。
- 监控读取为只读；仅在用户明确确认流程后才会结束所选的单个进程。

## 安装

### 从 npm 安装

在 DeepSeek Harness 的 **Plugin Manager / 插件管理** 中安装 `dsh-sys-monitor`，或指定版本：

```text
dsh-sys-monitor@0.3.0
```

### 从源码安装

```bash
git clone https://github.com/m430/dsh-sys-monitor.git
cd dsh-sys-monitor
```

然后在 DeepSeek Harness 的插件管理中选择这个本地目录安装。也可以用 `plugin_manager install_bundle` 指向本地绝对路径。

安装后刷新页面，左侧栏出现「系统监控」图标。

## 目录

```text
dsh-sys-monitor/
├── index.js          Host 端：系统采样 + /api 路由
├── client.js         Client 端：btop 风格面板
├── cordis.patch.yml  Bundle patch
├── locale/           插件列表显示文案
├── icon.svg          插件图标
├── CHANGELOG.md      更新日志
├── CHANGELOG.zh.md   中文更新日志
└── package.json
```

## 许可证

MIT
