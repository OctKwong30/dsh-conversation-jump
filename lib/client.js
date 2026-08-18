/**
 * dsh-node-jump — 浏览器半部 (browser half)
 *
 * 让 dsh Web GUI 在会话内支持对话节点快捷跳转：
 *   - 会话头部工具区新增「⤵」按钮（conversation.session.header.utilities 槽位）；
 *   - 点击弹出浮动面板：列出当前会话全部已加载节点（#序号 / 类型徽标 / 文本摘要），
 *     支持按内容搜索与按类型筛选；
 *   - 点击条目：手动定位到目标节点所在滚动容器（视口居中，瞬时滚动，避免被
 *     运行中会话的“跟随底部”逻辑覆盖），并加品牌色描边高亮 1.6s 后自动清除。
 *
 * 数据来源：slot 标准 props 的 useSession（chat.order + chat.nodes），只列
 * visibility === 'visible' 的节点；跳转复用产品自带的 [data-chat-anchor-key]
 * DOM 锚点契约（与 ChatView 自身滚动恢复同款）。
 *
 * 这是 __ModuleLoader__ 静态包格式的纯 JavaScript（无 JSX/TS），无需构建。
 * @module dsh-node-jump/client
 */

window.__ModuleLoader__.load({
  id: 'dsh-node-jump',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    let React = require('react');

    const BUTTON_CSS = `
.dsh-jump-wrap { display: inline-flex; }
.dsh-jump-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0; border: none; border-radius: 6px;
  background: transparent; color: var(--dsw-alias-label-secondary, #6b7280);
  cursor: pointer; font-size: 15px; line-height: 1;
}
.dsh-jump-btn:hover {
  background: var(--dsw-alias-bg-layer-1, rgba(0,0,0,.06));
  color: var(--dsw-alias-label-primary, #1f2329);
}
.dsh-jump-panel {
  position: fixed; top: 64px; right: 16px; width: 340px;
  max-width: calc(100vw - 32px); box-sizing: border-box;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.1));
  border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,.16);
  z-index: 10000; display: flex; flex-direction: column; overflow: hidden;
  font-size: 13px; color: var(--dsw-alias-label-primary, #1f2329);
}
.dsh-jump-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; }
.dsh-jump-title { font-weight: 600; }
.dsh-jump-count { color: var(--dsw-alias-label-secondary, #6b7280); font-size: 12px; }
.dsh-jump-search {
  margin: 0 12px 8px; padding: 6px 10px; border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12));
  background: var(--dsw-alias-bg-base, #fafafa);
  color: var(--dsw-alias-label-primary, #1f2329); font-size: 13px; outline: none;
}
.dsh-jump-search:focus { border-color: var(--dsw-alias-brand-primary, #2563eb); }
.dsh-jump-groups { display: flex; gap: 6px; padding: 0 12px 10px; flex-wrap: wrap; }
.dsh-jump-chip {
  padding: 2px 8px; border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12));
  background: transparent; color: var(--dsw-alias-label-secondary, #6b7280);
  font-size: 12px; cursor: pointer;
}
.dsh-jump-chip:hover { color: var(--dsw-alias-label-primary, #1f2329); }
.dsh-jump-chip.active {
  background: var(--dsw-alias-brand-primary, #2563eb);
  border-color: var(--dsw-alias-brand-primary, #2563eb); color: #fff;
}
.dsh-jump-list { overflow-y: auto; max-height: 52vh; border-top: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); }
.dsh-jump-item {
  display: flex; align-items: baseline; gap: 8px; padding: 7px 12px; cursor: pointer;
}
.dsh-jump-item:hover { background: var(--dsw-alias-bg-layer-1, rgba(0,0,0,.05)); }
.dsh-jump-seq {
  color: var(--dsw-alias-label-secondary, #6b7280); font-size: 11px;
  font-variant-numeric: tabular-nums; min-width: 38px; text-align: right;
}
.dsh-jump-kind {
  flex: none; font-size: 11px; padding: 1px 6px; border-radius: 4px;
  background: var(--dsw-alias-bg-layer-1, rgba(0,0,0,.06));
  color: var(--dsw-alias-label-secondary, #6b7280); white-space: nowrap;
}
.dsh-jump-summary { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.dsh-jump-empty { padding: 18px 12px; text-align: center; color: var(--dsw-alias-label-secondary, #6b7280); }
.dsh-jump-foot {
  padding: 6px 12px; border-top: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
  color: var(--dsw-alias-label-secondary, #6b7280); font-size: 11px;
}
.dsh-jump-foot-btn {
  display: block; width: 100%; box-sizing: border-box;
  border: none; background: transparent; text-align: center;
  cursor: pointer; color: var(--dsw-alias-label-secondary, #6b7280);
  font-size: 11px; padding: 8px 12px;
}
.dsh-jump-foot-btn:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary, #1f2329);
  background: var(--dsw-alias-bg-layer-1, rgba(0,0,0,.05));
}
.dsh-jump-foot-btn:disabled { cursor: default; opacity: .6; }
.dsh-jump-flash {
  outline: 2px solid var(--dsw-alias-brand-primary, #2563eb) !important;
  outline-offset: 2px; border-radius: 10px;
}
.dsh-jump-set { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.dsh-jump-set-label { font-weight: 600; font-size: 13px; color: var(--dsw-alias-label-primary, #1f2329); }
.dsh-jump-set-desc { font-size: 12px; color: var(--dsw-alias-label-secondary, #6b7280); }
.dsh-jump-set-control {
  display: inline-flex; margin-left: auto; border-radius: 8px; overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12));
}
.dsh-jump-set-opt {
  padding: 4px 12px; font-size: 12px; border: none; background: transparent;
  color: var(--dsw-alias-label-secondary, #6b7280); cursor: pointer;
}
.dsh-jump-set-opt:hover { color: var(--dsw-alias-label-primary, #1f2329); }
.dsh-jump-set-opt.active {
  background: var(--dsw-alias-brand-primary, #2563eb); color: #fff;
}
`;

    const KIND_LABEL = {
      user: '用户', steering: '插入', context: '上下文',
      'assistant-step': '助手', 'turn-tail': '回合',
      'tool-call': '工具', command: '命令', 'manual-compaction': '压缩',
      compaction: '压缩', 'turn-error': '错误', 'turn-max-tokens': '上限',
      'model-retry': '重试', 'workflow-run': '工作流', 'command-input': '输入'
    };
    const KIND_GROUP = {
      user: 'user', steering: 'user', context: 'user',
      'assistant-step': 'assistant', 'turn-tail': 'assistant',
      'tool-call': 'tool', command: 'command', 'manual-compaction': 'command',
      compaction: 'system', 'turn-error': 'system', 'turn-max-tokens': 'system',
      'model-retry': 'system', 'workflow-run': 'system', 'command-input': 'system'
    };
    const GROUPS = [
      ['all', '全部'], ['user', '用户'], ['assistant', '助手'],
      ['tool', '工具'], ['command', '命令'], ['system', '系统']
    ];
    // 简洁模式只有两种条目：用户问题、回合回复。
    const GROUPS_CONCISE = [
      ['all', '全部'], ['user', '用户'], ['reply', '回复']
    ];

    function kindLabel(kind) {
      return Object.prototype.hasOwnProperty.call(KIND_LABEL, kind) ? KIND_LABEL[kind] : kind;
    }
    function kindGroup(kind) {
      return Object.prototype.hasOwnProperty.call(KIND_GROUP, kind) ? KIND_GROUP[kind] : 'system';
    }
    function blocksText(blocks) {
      if (!Array.isArray(blocks)) return '';
      let out = '';
      for (const b of blocks) {
        if (b == null) continue;
        if (typeof b.text === 'string') out += b.text;
        else if (b.kind === 'tool-call' && typeof b.name === 'string') out += ' [工具:' + b.name + ']';
      }
      return out.trim();
    }
    function truncate(text, max) {
      if (typeof text !== 'string') return '';
      const t = text.replace(/\s+/g, ' ').trim();
      return t.length > max ? t.slice(0, max) + '…' : t;
    }
    function summaryOf(node) {
      const d = node.data;
      if (d == null) return '';
      switch (node.kind) {
        case 'assistant-step': return truncate(blocksText(d.blocks), 120);
        case 'user':
        case 'steering':
        case 'context': return truncate(blocksText(d.content), 120);
        case 'tool-call': {
          const root = d.root;
          let name = null;
          let args = '';
          if (root != null) {
            if (typeof root.name === 'string') name = root.name;
            else if (root.call != null && typeof root.call.name === 'string') name = root.call.name;
            if (typeof root.argsRaw === 'string') args = root.argsRaw;
            else if (root.call != null && typeof root.call.argsRaw === 'string') args = root.call.argsRaw;
          }
          if (name !== null) {
            let label = name;
            if (args.trim() !== '') label += ' ' + truncate(args, 80);
            return label;
          }
          if (root != null && typeof root.callId === 'string') return '调用 ' + root.callId;
          return '工具调用';
        }
        case 'command': {
          if (typeof d.name === 'string') {
            const args = typeof d.args === 'string' ? ' ' + d.args : '';
            return '/' + d.name + args;
          }
          return '命令';
        }
        case 'manual-compaction': return '手动压缩';
        case 'compaction': return typeof d.summary === 'string' ? truncate(d.summary, 120) : '压缩摘要';
        case 'turn-error': return typeof d.message === 'string' ? truncate(d.message, 120) : '回合错误';
        case 'turn-max-tokens': return '输出达到上限';
        case 'model-retry': return '模型请求重试';
        case 'turn-tail': {
          const closing = d.closing;
          const text = blocksText(closing != null ? closing.blocks : undefined);
          return text !== '' ? truncate(text, 120) : '回合 ' + String(d.turn);
        }
        case 'workflow-run': return typeof d.name === 'string' ? '工作流 ' + d.name : '工作流运行';
        case 'command-input': return '命令输入';
        default:
          if (typeof d.text === 'string') return truncate(d.text, 120);
          if (typeof d.message === 'string') return truncate(d.message, 120);
          return '';
      }
    }

    // ---------- 显示模式：详细 / 简洁（设置 → General 常规页可切换） ----------
    // 持久化到 localStorage；模块内两个组件（设置行 + 头部按钮）通过订阅共享实时值。
    const MODE_KEY = 'dsh.nodeJump.mode';
    const modeListeners = new Set();
    function readMode() {
      try {
        return window.localStorage.getItem(MODE_KEY) === 'concise' ? 'concise' : 'detailed';
      } catch (err) {
        return 'detailed';
      }
    }
    function writeMode(mode) {
      try {
        window.localStorage.setItem(MODE_KEY, mode);
      } catch (err) { /* localStorage 不可用时仅保持内存态 */ }
      for (const fn of Array.from(modeListeners)) {
        try { fn(mode); } catch (err) { /* 忽略单个订阅者异常 */ }
      }
    }
    function subscribeMode(fn) {
      modeListeners.add(fn);
      return () => { modeListeners.delete(fn); };
    }
    function useMode() {
      const [mode, setMode] = React.useState(readMode);
      React.useEffect(() => subscribeMode(setMode), []);
      return mode;
    }

    /**
     * 简洁模式：把扁平节点列表聚合成「对话骨架」条目。
     *   - 每个 user 节点 → 一条「用户」条目（跳转到该问题本身）；
     *   - 每个回合（以 turn-tail 收尾）→ 一条「回复」条目（跳转到收尾节点，
     *     即该次回复的落点）；流式中未收尾的回合用最近的 assistant-step 兜底；
     *   - 中间的 steering/context/tool-call/assistant-step/compaction 等一律不展示。
     */
    function conciseEntries(items) {
      const entries = [];
      let turn = null;
      const blankTurn = (userNode, userKey) => ({
        userNode, userKey, tailKey: null, tailAnchorSeq: null, tailSummary: '',
        hasAssistant: false, lastKey: null, lastAnchorSeq: null, lastSummary: ''
      });
      const flush = () => {
        if (turn === null) return;
        if (turn.userNode != null) {
          entries.push({
            key: turn.userKey, kind: 'user', label: '用户',
            summary: summaryOf(turn.userNode), anchorSeq: turn.userNode.anchorSeq
          });
        }
        if (turn.tailKey != null) {
          entries.push({
            key: turn.tailKey, kind: 'reply', label: '回复',
            summary: turn.tailSummary, anchorSeq: turn.tailAnchorSeq
          });
        } else if (turn.hasAssistant && turn.lastKey != null) {
          entries.push({
            key: turn.lastKey, kind: 'reply', label: '回复',
            summary: turn.lastSummary !== '' ? turn.lastSummary : '回复中…',
            anchorSeq: turn.lastAnchorSeq
          });
        }
        turn = null;
      };
      for (const item of items) {
        const node = item.node;
        const kind = node.kind;
        if (kind === 'user') {
          flush();
          turn = blankTurn(node, item.key);
          continue;
        }
        if (turn === null) turn = blankTurn(null, null);
        if (kind === 'turn-tail') {
          turn.tailKey = item.key;
          turn.tailAnchorSeq = node.anchorSeq;
          turn.tailSummary = summaryOf(node);
          turn.hasAssistant = true;
          flush();
          continue;
        }
        // 中间节点：记录最近的助手侧落点，供未收尾回合兜底。
        turn.lastKey = item.key;
        turn.lastAnchorSeq = node.anchorSeq;
        if (kind === 'assistant-step') {
          turn.hasAssistant = true;
          const s = summaryOf(node);
          if (s !== '') turn.lastSummary = s;
        } else if (kind === 'tool-call' || kind === 'command' || kind === 'workflow-run') {
          turn.hasAssistant = true;
        }
      }
      flush();
      return entries;
    }

    /** 设置面板（General 常规页）中的显示模式行：详细 / 简洁。 */
    function NodeJumpSettingsRow(props) {
      const mode = useMode();
      const opts = [['detailed', '详细'], ['concise', '简洁']];
      return React.createElement('div', { className: 'dsh-jump-set' },
        React.createElement('div', { className: 'dsh-jump-set-label' }, '对话节点跳转'),
        React.createElement('span', { className: 'dsh-jump-set-desc' }, '节点目录显示模式'),
        React.createElement('div', { className: 'dsh-jump-set-control', role: 'radiogroup', 'aria-label': '对话节点显示模式' },
          ...opts.map((entry) => React.createElement('button', {
            key: entry[0], type: 'button', role: 'radio',
            'aria-checked': mode === entry[0],
            className: 'dsh-jump-set-opt' + (mode === entry[0] ? ' active' : ''),
            onClick: () => writeMode(entry[0])
          }, entry[1]))
        )
      );
    }

    // 高亮清除定时器句柄（同一时刻至多一个）。
    let flashTimer = null;
    function jumpTo(key) {
      if (typeof document === 'undefined') return false;
      let selector;
      try {
        const esc = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(key) : key;
        selector = '[data-chat-anchor-key="' + esc + '"]';
      } catch (err) {
        return false;
      }
      const row = document.querySelector(selector);
      if (row == null) return false;
      // 手动定位最近的滚动容器（chat scrollport），瞬时滚动避免 smooth 被流式更新覆盖。
      let scroller = row.parentElement;
      while (scroller !== null && scroller !== document.body) {
        const cs = getComputedStyle(scroller);
        const oy = cs.overflowY;
        if (oy === 'auto' || oy === 'scroll') break;
        scroller = scroller.parentElement;
      }
      if (scroller !== null && scroller !== document.body) {
        const rect = row.getBoundingClientRect();
        const srect = scroller.getBoundingClientRect();
        const target = scroller.scrollTop + (rect.top - srect.top) - (srect.height - rect.height) / 2;
        scroller.scrollTop = Math.max(0, Math.round(target));
      }
      row.classList.add('dsh-jump-flash');
      if (flashTimer !== null) {
        window.clearTimeout(flashTimer);
        flashTimer = null;
      }
      flashTimer = window.setTimeout(() => {
        row.classList.remove('dsh-jump-flash');
        flashTimer = null;
      }, 1600);
      return true;
    }

    /** 面板组件：数据来自 slot 标准 props 的 useSession。 */
    function NodeJumpButton(props) {
      const useSession = props.useSession;
      const [isOpen, setIsOpen] = React.useState(false);
      const [query, setQuery] = React.useState('');
      const [group, setGroup] = React.useState('all');
      const mode = useMode();
      if (useSession == null) return null;

      const order = useSession((s) => s.chat.order);
      const nodeStore = useSession((s) => s.chat.nodes);
      const hasMore = useSession((s) => s.hasMore);
      const loadingOlder = useSession((s) => s.loadingOlder);

      const items = [];
      for (const key of order) {
        const node = nodeStore.get(key);
        if (node != null && node.visibility === 'visible') items.push({ key, node });
      }
      // 详细模式：每个可见节点一条；简洁模式：用户问题 + 回合回复的骨架。
      const entries = mode === 'concise'
        ? conciseEntries(items)
        : items.map((item) => ({
            key: item.key, kind: item.node.kind, label: kindLabel(item.node.kind),
            summary: summaryOf(item.node), anchorSeq: item.node.anchorSeq
          }));
      // 简洁模式只有 全部/用户/回复 三组，切换到简洁时把遗留的旧分组钳回「全部」。
      const conciseGroups = ['all', 'user', 'reply'];
      const effGroup = (mode === 'concise' && conciseGroups.indexOf(group) === -1) ? 'all' : group;
      const q = query.trim().toLowerCase();
      const filtered = [];
      for (const entry of entries) {
        if (mode === 'concise') {
          if (effGroup !== 'all' && entry.kind !== effGroup) continue;
        } else {
          if (effGroup !== 'all' && kindGroup(entry.kind) !== effGroup) continue;
        }
        if (q !== '') {
          const hay = (entry.summary + ' ' + entry.label).toLowerCase();
          if (hay.indexOf(q) === -1) continue;
        }
        filtered.push(entry);
      }

      const onClickJump = (key) => { jumpTo(key); setIsOpen(false); };
      // 拉取一页更早历史到当前窗口；加载完成后 useSession 快照更新，列表自动刷新。
      const onLoadOlder = () => {
        const sid = props.sessionId;
        if (typeof sid !== 'string') return;
        const binding = props.sessions != null && typeof props.sessions.binding === 'function'
          ? props.sessions.binding(sid)
          : undefined;
        const session = binding != null ? binding.session : undefined;
        if (session != null && typeof session.loadOlder === 'function') {
          session.loadOlder().catch(() => {});
        }
      };
      const children = [React.createElement('button', {
        key: 'trigger', type: 'button', className: 'dsh-jump-btn',
        title: '对话节点跳转', 'aria-label': '对话节点跳转',
        onClick: () => setIsOpen(!isOpen)
      }, isOpen ? '✕' : '⤵')];

      if (isOpen) {
        const head = React.createElement('div', { key: 'head', className: 'dsh-jump-head' },
          React.createElement('span', { className: 'dsh-jump-title' }, mode === 'concise' ? '对话节点（简洁）' : '对话节点'),
          React.createElement('span', { className: 'dsh-jump-count' }, entries.length + ' 个')
        );
        const search = React.createElement('input', {
          key: 'search', className: 'dsh-jump-search', type: 'text',
          placeholder: '搜索节点内容…', value: query,
          onChange: (e) => setQuery(e.target.value)
        });
        const groupsDef = mode === 'concise' ? GROUPS_CONCISE : GROUPS;
        const chips = groupsDef.map((entry) => React.createElement('button', {
          key: 'g-' + entry[0], type: 'button',
          className: 'dsh-jump-chip' + (effGroup === entry[0] ? ' active' : ''),
          onClick: () => setGroup(entry[0])
        }, entry[1]));
        const groups = React.createElement('div', { key: 'groups', className: 'dsh-jump-groups' }, ...chips);
        const listChildren = filtered.map((entry) => {
          const summary = entry.summary;
          return React.createElement('div', {
            key: entry.key, className: 'dsh-jump-item', role: 'button',
            tabIndex: 0, title: summary,
            onClick: () => onClickJump(entry.key),
            onKeyDown: (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClickJump(entry.key);
              }
            }
          },
            React.createElement('span', { className: 'dsh-jump-seq' }, '#' + entry.anchorSeq),
            React.createElement('span', { className: 'dsh-jump-kind' }, entry.label),
            React.createElement('span', { className: 'dsh-jump-summary' }, summary !== '' ? summary : '（无文本）')
          );
        });
        if (listChildren.length === 0) {
          listChildren.push(React.createElement('div', { key: 'empty', className: 'dsh-jump-empty' },
            entries.length === 0 ? '当前会话暂无节点' : '无匹配节点'
          ));
        }
        const list = React.createElement('div', { key: 'list', className: 'dsh-jump-list' }, ...listChildren);
        const panelChildren = [head, search, groups, list];
        if (hasMore) {
          panelChildren.push(React.createElement('button', {
            key: 'foot', type: 'button',
            className: 'dsh-jump-foot dsh-jump-foot-btn',
            disabled: loadingOlder,
            title: '把更早的消息拉进当前窗口后即可搜索跳转',
            onClick: onLoadOlder
          }, loadingOlder ? '加载中…' : '较早消息未加载 · 点击加载更早'));
        }
        children.push(React.createElement('div', { key: 'panel', className: 'dsh-jump-panel' }, ...panelChildren));
      }
      return React.createElement('div', { className: 'dsh-jump-wrap' }, ...children);
    }

    // ---------- 插件入口 ----------
    const inject = ['slots', 'sessions'];

    function apply(ctx) {
      // 样式：一次性注入，随插件卸载清理。
      ctx.effect(() => {
        const style = document.createElement('style');
        style.setAttribute('data-dsh-node-jump', '');
        style.textContent = BUTTON_CSS;
        (document.head || document.documentElement).appendChild(style);
        return () => {
          if (style.parentNode !== null) style.parentNode.removeChild(style);
        };
      }, 'dsh-node-jump: styles');

      ctx.inject(['slots', 'sessions'], (scope) => {
        const slots = scope.slots;
        const sessions = scope.sessions;
        slots.inject('conversation.session.header.utilities', () => slots.register(
          { name: 'conversation.session.header.utilities', id: 'conversation-node-jump', order: 100, label: '对话节点跳转' },
          (props) => React.createElement(NodeJumpButton, Object.assign({}, props, { sessions }))
        ));
        // 设置 → General 常规页：显示模式（详细 / 简洁）单行偏好。
        slots.inject('settings.general.item', () => slots.register(
          { name: 'settings.general.item', id: 'conversation-node-jump', order: 30, label: '对话节点跳转' },
          (props) => React.createElement(NodeJumpSettingsRow, props)
        ));
      });
    }

    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  }
});
