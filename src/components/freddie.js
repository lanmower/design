export { skillLabel, getRecentPaths, saveRecentPath, renderChatMessages } from './freddie/helpers.js';
export { home, sessions, projects, agents, analytics } from './freddie/pages-core.js';
export { chat } from './freddie/pages-chat.js';
export { models, cron, skills, env, tools } from './freddie/pages-config.js';
export { batch, gateway } from './freddie/pages-runtime.js';
export { config } from './freddie/pages-config-edit.js';
export { voice } from './freddie/pages-voice.js';
export { chains } from './freddie/pages-chains.js';

import { home, sessions, projects, agents, analytics } from './freddie/pages-core.js';
import { chat } from './freddie/pages-chat.js';
import { models, cron, skills, env, tools } from './freddie/pages-config.js';
import { batch, gateway } from './freddie/pages-runtime.js';
import { config } from './freddie/pages-config-edit.js';
import { voice } from './freddie/pages-voice.js';
import { chains } from './freddie/pages-chains.js';
export const FREDDIE_PAGES = { home, chat, voice, sessions, projects, agents, analytics, models, cron, skills, config, env, tools, batch, gateway, chains };
