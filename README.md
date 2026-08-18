# dsh-node-jump

让 DeepSeek Harness Web GUI 在会话内支持**对话节点快捷跳转**：会话头部工具区新增「⤵」按钮，点击弹出节点目录面板（搜索 + 类型筛选 + 摘要列表），点击条目即定位到对应节点并高亮。

纯浏览器端插件（`__ModuleLoader__` 静态包，无 JSX/TS，无需构建）。

## 功能

- **节点目录面板**：列出当前会话全部已加载节点，每行 `#序号` + 类型徽标（用户/助手/工具/命令/系统…）+ 内容摘要（超出自动截断）
- **搜索**：按摘要文本 / 类型标签实时过滤
- **类型筛选**：全部 / 用户 / 助手 / 工具 / 命令 / 系统
- **快捷跳转**：点击条目 → 目标节点视口居中定位 + 品牌色描边高亮 1.6s → 面板自动关闭
- **显示模式（设置 → General 常规页 切换，持久化）**：
  - **详细**（默认）：逐节点展示，当前完整实现
  - **简洁**：只展示「对话骨架」——每个用户问题一条「用户」条目、每个回合的一次总回复一条「回复」条目；中间的工具调用 / 上下文 / 插入 / 压缩等节点全部隐藏；筛选组为 全部 / 用户 / 回复
- 主题自适应：全部使用 dsh 主题 token（亮 / 暗色自动跟随）

## 数据与跳转机制

- 数据来自 slot 标准 props 的 `useSession`：`chat.order`（节点顺序）+ `chat.nodes`（节点存储），只列 `visibility === 'visible'` 的节点
- 跳转复用产品自带的 `[data-chat-anchor-key]` DOM 锚点契约（与 ChatView 自身滚动恢复同款），手动定位最近的滚动容器并**瞬时滚动**——避免被运行中会话的「跟随底部」逻辑覆盖平滑滚动
- 历史分页时（`hasMore`）面板只列当前已加载窗口的节点，底部有可点击的「加载更早」按钮——点击后拉一页更早历史进当前窗口（经 `sessions.binding(sessionId).session.loadOlder()`），列表自动刷新、可连续加载，不干扰聊天区滚动

## 安装

进入插件目录后执行（推荐，不依赖目录名——`dsh plugin` 会把 `.` 以当前目录为锚点解析成插件包绝对路径）：

```sh
cd dsh-node-jump        # 本地开发目录，或 clone 仓库后的目录名
dsh plugin --profile web add .
```

也可以在任何位置用路径指定插件目录（相对路径以执行命令时所在的目录为锚点）：

```sh
dsh plugin --profile web add ./dsh-node-jump   # 在插件父目录执行
```

该命令会把本包写入 `~/.dsh/profiles/web/package.json` 的依赖（形式为 `dsh-node-jump: link:<插件绝对路径>`，本地 link 依赖，改动即时生效），并因声明了 `dsh.bundle` 自动加入 `dsh.profile.bundles` 层栈。之后**重启 web 服务**（或重新 `dsh web`）即生效，所有会话头部出现「⤵」按钮。

> 注意：`dsh plugin add/remove` 会执行 reconcile，自动把所有声明 `dsh.bundle` 的依赖并入 bundles 层栈——改完插件配置后请重启服务并确认启动日志无 `duplicate loader entry` 报错（本插件不在任何聚合包内，正常无重复风险）。

## 卸载

```sh
dsh plugin --profile web remove dsh-node-jump
```

## 说明

- 本插件与动态 Cordis 插件的区别：动态插件（`ndjp-1`）仅存在于单个会话进程，页面刷新后需重新激活；本包持久化于 web profile，刷新 / 重启后自动加载，所有会话可用。
- 已知限制：面板是浮动层，会临时覆盖右侧文件面板区域（跳转后自动关闭）；窗口加载完整后（`hasMore` 为 false）面板不再显示「加载更早」按钮。
