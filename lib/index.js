/**
 * dsh-node-jump — 宿主半部 (host half)
 *
 * 本插件纯浏览器端实现（会话头部的节点目录面板 + 跳转），宿主无需任何业务逻辑。
 * 仅保留最小可加载的 Cordis 插件外壳，使 bundle 行能正常挂载。
 * @module dsh-node-jump
 */

export const name = 'dsh-node-jump'

/** 宿主端无事可做：所有能力都在浏览器半部（lib/client.js）。 */
export function apply() {}
