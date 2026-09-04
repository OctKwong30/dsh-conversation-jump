# dsh-node-jump

让 DeepSeek Harness Web GUI 在会话内支持**对话节点快捷跳转**：会话列左缘（应用左侧栏右侧）垂直居中处一个「⤵」悬浮圆钮，点击在钮右侧弹出节点目录面板（搜索 + 类型筛选 + 摘要列表），点击条目即定位到对应节点并高亮。

纯浏览器端插件（`__ModuleLoader__` 静态包，无 JSX/TS，无需构建）。

## 功能

- **左缘悬浮钮**：「⤵」固定在会话列左缘垂直居中处（fixed 定位，不随聊天滚动），点击展开 / 收起节点目录；Esc 关闭
- **节点目录面板**：从悬浮钮右侧弹出、垂直居中，列出当前会话全部已加载节点，每行 `#序号` + 类型徽标（用户/助手/工具/命令/系统…）+ 内容摘要（超出自动截断）
- **搜索**：按摘要文本 / 类型标签实时过滤
- **类型筛选**：全部 / 用户 / 助手 / 工具 / 命令 / 系统
- **快捷跳转**：点击条目 → 目标节点视口居中定位 + 品牌色描边高亮 1.6s → 面板自动关闭
- **显示模式（设置 → General 常规页 切换，持久化）**：
  - **详细**（默认）：逐节点展示——用户消息、助手每步回复、每次工具调用、命令、压缩摘要、错误等全部可见；筛选组为 全部 / 用户 / 助手 / 工具 / 命令 / 系统
  - **简洁**：只展示「对话骨架」——每个用户问题一条「用户」条目、每个回合的一次总回复一条「回复」条目；中间的工具调用 / 上下文 / 插入 / 压缩等节点全部隐藏；筛选组为 全部 / 用户 / 回复
  - 两种模式在设置页均带悬浮提示与跟随切换的解释文案，说明各自列出的内容与适用场景
- 主题自适应：全部使用 dsh 主题 token（亮 / 暗色自动跟随）

## 定位机制

- **左缘锚定**：悬浮钮与面板的横向位置来自聊天滚动区左缘——复用产品自带的 `[data-chat-anchor-key]` 锚点契约，从可见聊天行向上找 `overflow-y` 滚动容器取其左缘，不依赖任何第三方插件标记
- **动态跟随**：对该滚动区挂 ResizeObserver + window resize 重测；应用左侧栏宽度变化、窗口缩放时悬浮钮自动跟随；空会话无锚点行时延迟重试
- **面板几何**：从钮右侧 40px 处弹出，垂直居中（`top: 50%` + `translateY(-50%)`），`max-height: min(72vh, 100vh-32px)` 限高，列表区内部滚动

## 数据与跳转机制

- 数据来自 slot 标准 props 的 `useSession`：`chat.order`（节点顺序）+ `chat.nodes`（节点存储），只列 `visibility === 'visible'` 的节点
- 跳转复用产品自带的 `[data-chat-anchor-key]` DOM 锚点契约（与 ChatView 自身滚动恢复同款），手动定位最近的滚动容器并**瞬时滚动**——避免被运行中会话的「跟随底部」逻辑覆盖平滑滚动
- 历史分页时（`hasMore`）面板只列当前已加载窗口的节点，底部有可点击的「加载更早」按钮——点击后拉一页更早历史进当前窗口（经 `sessions.binding(sessionId).session.loadOlder()`），列表自动刷新、可连续加载，不干扰聊天区滚动

## 安装

### npx 一键安装（发布后推荐）

```sh
npx dsh-node-jump                 # 最新版，装进 web profile
npx dsh-node-jump@0.5.0           # 指定版本
npx dsh-node-jump --spec ^0.5.0   # 指定 semver 范围
npx dsh-node-jump --profile web   # 指定 profile（缺省 web）
```

安装器（`bin/install.mjs`）自动完成：

1. 定位 `~/.dsh/profiles/<profile>`（`DSH_HOME` 环境变量可覆盖）；
2. 检测 pnpm 供应链配置（`minimumReleaseAge`）并幂等放行本插件；
3. 转发官方 CLI：`dsh plugin --profile <p> add dsh-node-jump@<spec>`（PATH 上无 dsh 时自动回退 `npx -y --package @deepseek-ai/dsh dsh`）——安装与 `dsh.profile.bundles` 注册全部由官方通道完成；
4. 后验 bundle 注册结果，提示重启。

> 本地 clone 运行（`node bin/install.mjs` 或 `npx .`）时自动切换 **link 模式**（以当前目录为锚点安装，改动即时生效）；`--link` 可强制。`--dry-run` 只打印不执行。

### 本地 / 源码安装

进入插件目录后执行（推荐，不依赖目录名——`dsh plugin` 会把 `.` 以当前目录为锚点解析成插件包绝对路径）：

```sh
cd dsh-node-jump        # 本地开发目录，或 clone 仓库后的目录名
dsh plugin --profile web add .
```

也可以在任何位置用路径指定插件目录（相对路径以执行命令时所在的目录为锚点）：

```sh
dsh plugin --profile web add ./dsh-node-jump   # 在插件父目录执行
```

该命令会把本包写入 `~/.dsh/profiles/web/package.json` 的依赖（形式为 `dsh-node-jump: link:<插件绝对路径>`，本地 link 依赖，改动即时生效），并因声明了 `dsh.bundle` 自动加入 `dsh.profile.bundles` 层栈。之后**重启 web 服务**（或重新 `dsh web`）即生效，会话列左缘出现「⤵」悬浮钮。

> 注意：`dsh plugin add/remove` 会执行 reconcile，自动把所有声明 `dsh.bundle` 的依赖并入 bundles 层栈——改完插件配置后请重启服务并确认启动日志无 `duplicate loader entry` 报错（本插件不在任何聚合包内，正常无重复风险）。

### 发布（维护者）

```sh
# 没有账号？到 https://www.npmjs.com/signup 免费注册（网页注册，需验证邮箱）
npm login --registry https://registry.npmjs.org   # 登录官方源
npm publish                                        # tarball 已含 bin/ lib/ cordis.patch.yml README
# 发布后即可 npx dsh-node-jump 一键安装
```

> **国内镜像用户注意**：若 `~/.npmrc` 把默认 registry 指向 npmmirror 等只读镜像，直接
> `npm login` 会报 `Public registration is not allowed`（镜像不支持注册/发布）——登录必须
> 显式带 `--registry https://registry.npmjs.org`。本包已在 `package.json` 声明
> `publishConfig.registry`，`npm publish` 永远发到官方源，不受镜像配置影响；安装端
> （installer → `dsh plugin add` → pnpm）在镜像源未同步新包（404）时会自动改用官方源重试。

## 卸载

```sh
dsh plugin --profile web remove dsh-node-jump
```

## 说明

- 本插件与动态 Cordis 插件的区别：动态插件仅存在于单个会话进程，页面刷新后需重新激活；本包持久化于 web profile，刷新 / 重启后自动加载，所有会话可用。
- **悬浮钮的显示条件**：按钮经 `conversation.session.header.utilities` 槽位挂载，且左缘测量依赖可见的聊天锚点行，因此——
  - **空会话**（新建后未发消息）：产品不渲染该槽位容器，按钮不出现；发首条消息后自动恢复（此时也无节点可跳，语义上合理）；
  - **非会话视图**（设置页 / 任务看板等）：无会话头部，按钮不出现，回到会话即恢复；
  - **窄窗口**：侧栏响应式收起、会话列贴视口左缘（left=0）时按钮正常显示；宽度变化经 ResizeObserver + MutationObserver（锚点行数变化）自动重测跟随。
- 已知限制：面板是浮动层，展开时覆盖其下方的聊天内容（跳转后自动关闭）；窗口加载完整后（`hasMore` 为 false）面板不再显示「加载更早」按钮。

## 更新日志

- **0.5.0**：新增 npx 一键安装支持——`bin/install.mjs` 安装器（`bin` 入口）自动检测安装形态（本地 checkout → link 模式 / npx registry 副本 → registry 模式），转发官方 `dsh plugin add` 通道完成安装与 bundle 注册；`minimumReleaseAge` 供应链配置幂等放行；支持 `--profile` / `--spec` / `--link` / `--dry-run`
- **0.4.1**：修复窄窗口（侧栏响应式收起、会话列贴视口左缘）时按钮误隐藏的问题——left=0 为合法锚线，旧版误判跳过导致测量失败；锚点行数变化（首条消息 / 标签页切换）经 MutationObserver 兜底重测并重挂 ResizeObserver
- **0.4.0**：悬浮钮与面板从会话头部 / 视口右上迁移至会话列左缘垂直居中（`[data-chat-anchor-key]` 锚点定位，ResizeObserver 跟随左侧栏宽度变化）；设置页详细/简洁模式增加悬浮提示与解释文案；Esc 关闭面板
- **0.3.0**：面板内「点击加载更早」拉取历史分页（`sessions.loadOlder`）
- **0.2.0**：对话节点快捷跳转插件（详细/简洁双显示模式 + 设置面板配置）
