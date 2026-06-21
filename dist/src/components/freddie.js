// Freddie page registry. Matches upstream shape:
//   FREDDIE_PAGES is an OBJECT mapping id → page-renderer fn (not an array).
//   Per-page renderer functions are stubs by default — consumers (gm-cc,
//   foph, hermes-fork, etc.) provide their own page bodies or import the
//   richer upstream renderers.

import { renderPageStub, getRecentPaths, saveRecentPath, skillLabel, renderChatMessages } from './freddie/helpers.js';

const make = (label) => (props) => renderPageStub({ id: label, ...props });

export const home      = make('home');
export const chat      = make('chat');
export const voice     = make('voice');
export const sessions  = make('sessions');
export const projects  = make('projects');
export const agents    = make('agents');
export const analytics = make('analytics');
export const models    = make('models');
export const cron      = make('cron');
export const skills    = make('skills');
export const config    = make('config');
export const env       = make('env');
export const tools     = make('tools');
export const batch     = make('batch');
export const gateway   = make('gateway');
export const chains    = make('chains');

export const FREDDIE_PAGES = {
    home, chat, voice, sessions, projects, agents, analytics,
    models, cron, skills, config, env, tools, batch, gateway, chains
};

export { skillLabel, getRecentPaths, saveRecentPath, renderChatMessages };
