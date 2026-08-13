// spoint kit — paint surfaces for the spoint game client (loading screen,
// HUD, editor chrome). Each render fn returns {node, ...controls, dispose};
// the consumer owns state/events, this kit owns layout + classes. Surfaced
// through the main bundle entry so spoint can import directly from unpkg.

export { renderLoadingScreen } from './loading-screen.js';
export { renderGameHud, Crosshair, AmmoCounter, HealthBar, BoostIndicator } from './game-hud.js';
export { renderHostJoinLobby } from './host-join-lobby.js';

export const themeUrl = new URL('./loading-screen.css', import.meta.url).href;
export const gameHudCssUrl = new URL('./game-hud.css', import.meta.url).href;
export const lobbyCssUrl = new URL('./host-join-lobby.css', import.meta.url).href;
