export { skillLabel, getRecentPaths, saveRecentPath, renderChatMessages } from './freddie/helpers.js';
export { home, sessions, projects, agents, analytics } from './freddie/pages-core.js';
export { chat } from './freddie/pages-chat.js';
export { models, cron, skills, env, tools, batch, gateway } from './freddie/pages-config.js';
export { config } from './freddie/pages-config-edit.js';

import { home, sessions, projects, agents, analytics } from './freddie/pages-core.js';
import { chat } from './freddie/pages-chat.js';
import { models, cron, skills, env, tools, batch, gateway } from './freddie/pages-config.js';
import { config } from './freddie/pages-config-edit.js';
export const FREDDIE_PAGES = { home, chat, sessions, projects, agents, analytics, models, cron, skills, config, env, tools, batch, gateway };
