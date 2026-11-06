# dsh-sys-monitor

[![npm version](https://img.shields.io/npm/v/dsh-sys-monitor.svg)](https://www.npmjs.com/package/dsh-sys-monitor)

DeepSeek Harness 的「系统监控」插件：一个 btop 风格的本机资源面板，在网页里实时查看 CPU、内存、磁盘、网络与进程。


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

## 安装

### 从 npm 安装

在 DeepSeek Harness 的 **Plugin Manager / 插件管理** 中安装 `dsh-sys-monitor`，或指定版本：

```text
dsh-sys-monitor@0.3.2
```

### 从源码安装

```bash
git clone https://github.com/m430/dsh-sys-monitor.git
cd dsh-sys-monitor
```

然后在 DeepSeek Harness 的插件管理中选择这个本地目录安装。

安装后刷新页面，左侧栏出现「系统监控」图标。

## 使用

- 点击左侧栏「系统监控」进入面板。
- 点击任意进程行查看详情；详情标题 PID 后的电源图标可强制退出该进程。
- 右上角可调整刷新间隔或暂停采样。

## 许可证

MIT
