// Component barrel — matches upstream export surface 1:1.

import * as webjsx from '../vendor/webjsx/index.js';
export const h = webjsx.createElement;

export {
    Brand, Chip, Btn, Glyph,
    Topbar, Crumb, Side, Status, AppShell,
    Heading, Lede, Dot, Rail
} from './components/shell.js';

export {
    Panel, Row, RowLink,
    Hero, Install, Receipt, Changelog,
    WorksList, WritingList, Manifesto, Section,
    Kpi, Table,
    HomeView, ProjectView, Form
} from './components/content.js';

export {
    fmtBytes, renderInline,
    ChatMessage, ChatComposer, Chat,
    AICAT_FACE, AICatPortrait, AICat
} from './components/chat.js';

export {
    fileGlyph, fmtFileSize,
    FileIcon, FileRow, FileGrid, FileToolbar,
    DropZone, UploadProgress, EmptyState, BreadcrumbPath
} from './components/files.js';

export {
    ConfirmDialog, PromptDialog,
    FilePreviewMedia, FilePreviewCode, FilePreviewText, FileViewer
} from './components/files-modals.js';

export {
    ServerIcon, ServerRail,
    ChannelItem, ChannelCategory,
    VoiceUser, UserPanel, ChannelSidebar,
    MemberItem, MemberList,
    ChatHeader, VoiceStrip, CommunityShell
} from './components/community.js';

export { ThemeToggle } from './components/theme-toggle.js';

export {
    FREDDIE_PAGES,
    home, chat, voice, sessions, projects, agents, analytics,
    models, cron, skills, config, env, tools, batch, gateway, chains,
    skillLabel, getRecentPaths, saveRecentPath, renderChatMessages
} from './components/freddie.js';
