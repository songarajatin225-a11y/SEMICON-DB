// Registry for view-specific delegated actions (kept separate from main.js to avoid import cycles).
export const ACTIONS = {};
export function registerActions(obj) { Object.assign(ACTIONS, obj); }
let _render = () => {};
export const setRenderer = fn => (_render = fn);
export const rerender = () => _render();
