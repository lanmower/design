// Component barrel — matches upstream export surface 1:1.

import * as webjsx from '../vendor/webjsx/index.js';
export const h = webjsx.createElement;

export {
    Brand, Chip, Btn, Glyph, Icon, IconButton, Badge, Pill,
    Topbar, Crumb, Side, Status, AppShell,
    WorkspaceShell, WorkspaceRail,
    Heading, Lede, Dot, Rail
} from './components/shell.js';

export {
    Panel, Card, Row, RowLink, PanelFromItems,
    Hero, HeroFromPageData, Marquee, Install, CliBlock, Receipt, Changelog,
    WorksList, WritingList, Manifesto, Section, PageHeader,
    Kpi, Sparkline, BarChart, Table, SearchInput, TextField, Select, EventList,
    HomeView, ProjectView, Form,
    Spinner, Skeleton, Alert, FilterPills
} from './components/content.js';

export {
    fmtBytes, renderInline, hasSelectionInside,
    ChatMessage, ChatComposer, Chat, flashComposerNote,
    AICAT_FACE, AICatPortrait, AICat
} from './components/chat.js';

export { AgentChat, MESSAGE_CAP } from './components/agent-chat.js';

export {
    ConversationList, SessionCard, SessionDashboard, SessionMeta, fmtDuration, AgentListSkeleton
} from './components/sessions.js';

export { ContextPane } from './components/context-pane.js';

export {
    fileGlyph, fmtFileSize,
    FileIcon, FileRow, FileGrid, FileSkeleton, sortFiles, FileToolbar, RootsPicker,
    DropZone, UploadProgress, EmptyState, BreadcrumbPath, BulkBar
} from './components/files.js';

export {
    ConfirmDialog, PromptDialog,
    FilePreviewMedia, FilePreviewCode, FilePreviewText, FileViewer, FilePreviewPane
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
    useKeyboardShortcut, formatShortcut, ShortcutHint, ShortcutList,
    useKeyboardShortcutHelp, ShortcutHelpDialog
} from './components/interaction-primitives.js';

export {
    Toolbar, ToolbarRow, Tabs,
    TreeView, TreeItem,
    PropertyGrid, PropertyField, PropertyGridRow, InlineEditableField,
    Dock, IconButtonGroup,
    ResizeHandle, SplitPanel,
    ContextMenu, useContextMenu,
    Drawer, Dialog, FocusTrap,
    Toast, toast,
    Pager, JsonViewer,
    Grid, GridItem,
    Collapse, CollapseGroup,
    Divider,
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
