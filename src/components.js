// Component barrel — matches upstream export surface 1:1.

import * as webjsx from '../vendor/webjsx/index.js';
export const h = webjsx.createElement;

export {
    Brand, Chip, Btn, Glyph, Icon, IconButton, Badge,
    Topbar, Crumb, Side, Status, AppShell,
    Heading, Lede, Dot, Rail
} from './components/shell.js';

export {
    Panel, Card, Row, RowLink,
    Hero, Install, Receipt, Changelog,
    WorksList, WritingList, Manifesto, Section, PageHeader,
    Kpi, Table, SearchInput, TextField, Select, EventList,
    HomeView, ProjectView, Form,
    Spinner, Skeleton, Alert
} from './components/content.js';

export {
    fmtBytes, renderInline,
    ChatMessage, ChatComposer, Chat,
    AICAT_FACE, AICatPortrait, AICat
} from './components/chat.js';

export { AgentChat } from './components/agent-chat.js';

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
    ChatHeader, VoiceStrip, CommunityShell,
    MobileHeader, ReplyBar, Banner,
    ThreadPanel, ForumView, PageView
} from './components/community.js';

export {
    PttButton, VadMeter, WebcamPreview, VoiceSettingsModal, AudioQueue, VoiceControls
} from './components/voice.js';

export { ThemeToggle } from './components/theme-toggle.js';

export {
    Checkbox, Radio, RadioGroup, Toggle, Field, useFormValidation
} from './components/form-primitives.js';

export {
    useDraggable, useDropTarget, useNumberScrub, usePointerDrag, Reorderable,
    useKeyboardShortcut, formatShortcut, ShortcutHint,
    useKeyboardShortcutHelp, ShortcutHelpDialog
} from './components/interaction-primitives.js';

export {
    Toolbar, Tabs,
    TreeView, TreeItem,
    PropertyGrid, PropertyField,
    Dock, IconButtonGroup,
    ResizeHandle, SplitPanel,
    ContextMenu, useContextMenu,
    Drawer, Dialog, FocusTrap,
    Toast, toast,
    useMediaQuery,
    BP_SM, BP_MD, BP_LG, BP_XL
} from './components/editor-primitives.js';

export {
    Tooltip, Popover, Dropdown, useLongPress, useFloating,
    CommandPalette, EmojiPicker, BootOverlay, SettingsPopover,
    AuthModal, VideoLightbox
} from './components/overlay-primitives.js';

export {
    FREDDIE_PAGES,
    home, chat, voice, sessions, projects, agents, analytics,
    models, cron, skills, config, env, tools, batch, gateway, chains,
    skillLabel, getRecentPaths, saveRecentPath, renderChatMessages
} from './components/freddie.js';

export { mountCommunityApp } from './community-app.js';
