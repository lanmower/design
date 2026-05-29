// spoint kit — paint surfaces for the spoint game client (loading screen,
// HUD, editor chrome). Each render fn returns {node, ...controls, dispose};
// the consumer owns state/events, this kit owns layout + classes. Surfaced
// through the main bundle entry so spoint can import directly from unpkg.

export { renderLoadingScreen } from './loading-screen.js';

export const themeUrl = new URL('./loading-screen.css', import.meta.url).href;
