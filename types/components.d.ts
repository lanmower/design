// types/components.d.ts -- GENERATED, do not hand-edit.
//
// Produced by `node scripts/generate-component-types.mjs` from the same
// extraction that produces docs/component-props.md, so the declarations
// and the prose reference can never disagree. Re-run after any component
// signature change; `npm run lint:component-types` fails CI when this
// file is stale.
//
// 310 exported symbols across 32 source files.

/** A webjsx virtual node, as returned by every component in this SDK. */
export type VNode = any;

// ---- src/components/shell.js -----------------------------------------

/**
 * The wordmark used in Topbar/AppShell headers.
 *
 * Props for {@link Brand} (src/components/shell.js).
 */
export interface BrandProps {
    /** the brand text. @default '247420' */
    name?: string;
    /** optional trailing breadcrumb-style leaf, rendered after a " / " separator. */
    leaf?: any;
}
export declare function Brand(props?: BrandProps): VNode;

/**
 * A small pill/tag label.
 *
 * Props for {@link Chip} (src/components/shell.js).
 */
export interface ChipProps {
    /** semantic color tone (empty = neutral). @default '' */
    tone?: string;
    /** @default 'md' */
    size?: 'sm' | 'md' | 'lg';
    /** true renders a rectangular sentence-case variant for dense data (drops the all-caps pill styling). Orthogonal to tone. @default false */
    tag?: boolean;
    /** if given, renders a trailing dismiss (x) button that calls onRemove() on click. Omitted entirely (no button) when not supplied. */
    onRemove?: (...args: any[]) => any;
    children?: any;
}
export declare function Chip(props?: ChipProps): VNode;

/**
 * The standard button/link factory. Renders an `<a>` when `href` is given, otherwise a `<button>`.
 *
 * Props for {@link Btn} (src/components/shell.js).
 */
export interface BtnProps {
    /** if present, renders as a link instead of a button. */
    href?: string;
    /** @default 'default' */
    variant?: 'default' | 'primary' | 'ghost' | 'danger';
    /** @default 'md' */
    size?: 'sm' | 'md' | 'lg';
    children?: any;
    onClick?: (...args: any[]) => any;
    'aria-label'?: string;
    /** legacy alias for variant:'primary', kept for backward compatibility. */
    primary?: boolean;
    /** legacy alias for variant:'ghost'. */
    ghost?: boolean;
    /** legacy alias for variant:'danger'. */
    danger?: boolean;
    disabled?: boolean;
    /** extra class name(s) appended to the generated class list. */
    class?: string;
    key?: any;
}
export declare function Btn(props?: BtnProps): VNode;

/**
 * A themeable inline text/character glyph (font-size + optional color from tokens) -- for a real icon shape, use Icon()/iconMarkup() from shell/icons.js instead; Glyph is for short text/character content only. Decorative (aria-hidden) by default; pass `label` to expose it as a real accessible image instead.
 *
 * Props for {@link Glyph} (src/components/shell.js).
 */
export interface GlyphProps {
    /** the glyph content (a character/short string). */
    children?: any;
    /** CSS color value; omit to inherit currentColor. */
    color?: string;
    /** @default 'base' */
    size?: 'sm' | 'base' | 'lg';
    /** accessible name; when set, renders role="img" instead of aria-hidden. */
    label?: string;
}
export declare function Glyph(props?: GlyphProps): VNode;

/** Renders a monochrome line icon from ICON_PATHS as a webjsx vnode. Accepts either call shape: `Icon('search', { size: 20 })` (the primary, historical signature) or `Icon({ name: 'search', size: 20 })` (a single props object, matching every other factory in this kit) -- both resolve through the same iconArgs() normalization below. An out-of-set name renders an empty `<span class="glyph">` rather than throwing. */
export declare function Icon(name?: any, arg1?: any): VNode;

/**
 * Props for {@link IconButton} (src/components/shell.js).
 */
export interface IconButtonProps {
    icon?: any;
    onClick?: (...args: any[]) => any;
    title?: any;
    /** @default 'base' */
    size?: string;
    /** @default 'ghost' */
    variant?: string;
    /** @default false */
    disabled?: boolean;
}
export declare function IconButton(props?: IconButtonProps): VNode;

/**
 * A small count/variant/status marker (unread count, label chip inline with text). Distinct from Chip (a status-tone indicator element in its own right) and Pill (a plain non-interactive tag label) -- see the comments at each below for the three-way split.
 *
 * Props for {@link Badge} (src/components/shell.js).
 */
export interface BadgeProps {
    children?: any;
    /** @default 'default' */
    variant?: string;
    /** semantic tone keyword, applies a `tone-{tone}` class. @default 'neutral' */
    tone?: string;
    /** @default 'md' */
    size?: 'sm' | 'md' | 'lg';
}
export declare function Badge(props?: BadgeProps): VNode;

/**
 * Props for {@link Pill} (src/components/shell.js).
 */
export interface PillProps {
    /** @default '' */
    tone?: string;
    children?: any;
    key?: string | number;
}
export declare function Pill(props?: PillProps): VNode;

/**
 * Props for {@link Topbar} (src/components/shell.js).
 */
export interface TopbarProps {
    /** @default '247420' */
    brand?: string;
    /** @default '' */
    leaf?: string;
    /** @default [] */
    items?: any[];
    /** @default '' */
    active?: string;
    onNav?: (...args: any[]) => any;
    search?: any;
    /** @default true */
    themeToggle?: boolean;
}
export declare function Topbar(props?: TopbarProps): VNode;

/**
 * Props for {@link Crumb} (src/components/shell.js).
 */
export interface CrumbProps {
    /** @default [] */
    trail?: any[];
    /** @default '' */
    leaf?: string;
    right?: any;
}
export declare function Crumb(props?: CrumbProps): VNode;

/**
 * Props for {@link Side} (src/components/shell.js).
 */
export interface SideProps {
    /** @default [] */
    sections?: any[];
}
export declare function Side(props?: SideProps): VNode;

/**
 * Props for {@link Status} (src/components/shell.js).
 */
export interface StatusProps {
    /** @default [] */
    left?: any[];
    /** @default [] */
    right?: any[];
}
export declare function Status(props?: StatusProps): VNode;

/**
 * Props for {@link AppShell} (src/components/shell.js).
 */
export interface AppShellProps {
    topbar?: any;
    crumb?: any;
    side?: any;
    main?: any;
    status?: any;
    narrow?: any;
    fullBleed?: any;
}
export declare function AppShell(props?: AppShellProps): VNode;

/**
 * A Claude-Desktop / cowork three-(or four-)column app shell.  Pure stateless chrome (props in, vnode out). Collapse is DOM-class + a persisted flag, so the host does not have to thread collapse state through its own store. Visual styling lives in app-shell.css (.ws-*).
 *
 * Props for {@link WorkspaceShell} (src/components/shell.js).
 */
export interface WorkspaceShellProps {
    /** the persistent left workspace nav (icon+label items, collapsible to icon-only). Pass the result of WorkspaceRail() or any vnode. */
    rail?: any;
    /** an OPTIONAL second column (a conversation/session list) shown between the rail and the main content. Null hides it. */
    sessions?: any;
    /** the primary content column (chat thread, files view, dashboard...). */
    main?: any;
    /** an OPTIONAL right context pane (per-conversation context, file preview...). Null hides it; collapsible when present. */
    pane?: any;
    /** an optional thin top chrome bar (breadcrumb + status), spanning the content area only (the rail has its own header). */
    crumb?: any;
    /** an optional footer. */
    status?: any;
    /** caller's isNarrow() — drives the mobile single-column collapse. */
    narrow?: boolean;
    /** initial rail collapse (persisted state wins). @default false */
    railCollapsed?: boolean;
    /** initial pane collapse (persisted state wins). @default false */
    paneCollapsed?: boolean;
    /** @default 'workspace navigation' */
    railLabel?: string;
    /** @default 'context' */
    paneLabel?: string;
    /** @default false */
    stableFrame?: boolean;
    /** @default false */
    mainFlush?: boolean;
}
export declare function WorkspaceShell(props?: WorkspaceShellProps): VNode;

/**
 * Props for {@link WorkspaceRail} (src/components/shell.js).
 */
export interface WorkspaceRailProps {
    /** @default '247420' */
    brand?: string;
    action?: any;
    /** @default [] */
    items?: any[];
    footer?: any;
}
export declare function WorkspaceRail(props?: WorkspaceRailProps): VNode;

/**
 * Props for {@link Heading} (src/components/shell.js).
 */
export interface HeadingProps {
    /** @default 1 */
    level?: number;
    children?: any;
    /** @default '' */
    style?: string;
    /** @default '' */
    class?: string;
    'aria-level'?: any;
}
export declare function Heading(props?: HeadingProps): VNode;

/**
 * Props for {@link Lede} (src/components/shell.js).
 */
export interface LedeProps {
    children?: any;
}
export declare function Lede(props?: LedeProps): VNode;

/**
 * Props for {@link Dot} (src/components/shell.js).
 */
export interface DotProps {
    /** @default 'on' */
    tone?: 'on' | 'live' | 'warn' | (string & {});
}
export declare function Dot(props?: DotProps): VNode;

/**
 * Props for {@link Rail} (src/components/shell.js).
 */
export interface RailProps {
    /** @default 'green' */
    tone?: string;
}
export declare function Rail(props?: RailProps): VNode;

// ---- src/components/content.js ---------------------------------------

/**
 * Props for {@link Panel} (src/components/content.js).
 */
export interface PanelProps {
    title?: any;
    count?: any;
    right?: any;
    /** @default '' */
    style?: string;
    /** @default '' */
    class?: string;
    children?: any;
    kind?: any;
    id?: any;
    /** @default 2 */
    headingLevel?: number;
    /** @default {} */
    bodyAttrs?: Record<string, any>;
}
export declare function Panel(props?: PanelProps): VNode;

export declare const Card: typeof Panel;

/**
 * Props for {@link Row} (src/components/content.js).
 */
export interface RowProps {
    code?: any;
    rank?: any;
    title?: any;
    sub?: any;
    meta?: any;
    active?: any;
    /** @default 'default' */
    state?: 'default' | 'active' | 'disabled' | 'error' | (string & {});
    onClick?: (...args: any[]) => any;
    key?: string | number;
    style?: any;
    href?: any;
    kind?: any;
    cols?: any;
    leading?: any;
    trailing?: any;
    target?: any;
    selected?: any;
    rail?: any;
    expanded?: any;
    highlight?: any;
    actions?: any;
    detail?: any;
}
export declare function Row(props?: RowProps): VNode;

/**
 * Props for {@link RowLink} (src/components/content.js).
 */
export interface RowLinkProps {
    code?: any;
    title?: any;
    sub?: any;
    meta?: any;
    /** @default '#' */
    href?: string;
    key?: string | number;
    target?: any;
}
export declare function RowLink(props?: RowLinkProps): VNode;

/**
 * Props for {@link PanelFromItems} (src/components/content.js).
 */
export interface PanelFromItemsProps {
    heading?: any;
    /** @default [] */
    items?: any[];
    /** @default 'i' */
    keyPrefix?: string;
    count?: any;
    style?: any;
    kind?: any;
    emptyText?: any;
}
export declare function PanelFromItems(props?: PanelFromItemsProps): VNode;

/**
 * Props for {@link Hero} (src/components/content.js).
 */
export interface HeroProps {
    eyebrow?: any;
    title?: any;
    body?: any;
    accent?: any;
    actions?: any;
    badges?: any;
}
export declare function Hero(props?: HeroProps): VNode;

export declare function HeroFromPageData(hero?: any): VNode;

/**
 * Props for {@link Marquee} (src/components/content.js).
 */
export interface MarqueeProps {
    /** @default [] */
    items?: any[];
    /** @default '/' */
    sep?: string;
}
export declare function Marquee(props?: MarqueeProps): VNode;

/**
 * Props for {@link Install} (src/components/content.js).
 */
export interface InstallProps {
    cmd?: any;
    copied?: any;
    onCopy?: (...args: any[]) => any;
}
export declare function Install(props?: InstallProps): VNode;

/**
 * Props for {@link CliBlock} (src/components/content.js).
 */
export interface CliBlockProps {
    /** @default [] */
    lines?: any[];
    /** @default 'quick start' */
    heading?: string;
    /** @default '' */
    className?: string;
}
export declare function CliBlock(props?: CliBlockProps): VNode;

/**
 * Props for {@link Receipt} (src/components/content.js).
 */
export interface ReceiptProps {
    /** @default [] */
    rows?: any[];
    /** @default 'nothing here yet' */
    emptyText?: string;
}
export declare function Receipt(props?: ReceiptProps): VNode;

/**
 * Props for {@link Changelog} (src/components/content.js).
 */
export interface ChangelogProps {
    /** @default [] */
    entries?: any[];
    /** @default 'no changelog entries yet' */
    emptyText?: string;
}
export declare function Changelog(props?: ChangelogProps): VNode;

/**
 * Props for {@link WorksList} (src/components/content.js).
 */
export interface WorksListProps {
    /** @default [] */
    works?: any[];
    /** @default -1 */
    openedIndex?: number;
    onToggle?: (...args: any[]) => any;
}
export declare function WorksList(props?: WorksListProps): VNode;

/**
 * Props for {@link WritingList} (src/components/content.js).
 */
export interface WritingListProps {
    /** @default [] */
    posts?: any[];
}
export declare function WritingList(props?: WritingListProps): VNode;

/**
 * Props for {@link Manifesto} (src/components/content.js).
 */
export interface ManifestoProps {
    /** @default [] */
    paragraphs?: any[];
    maxWidth?: any;
}
export declare function Manifesto(props?: ManifestoProps): VNode;

/**
 * Props for {@link Section} (src/components/content.js).
 */
export interface SectionProps {
    title?: any;
    eyebrow?: any;
    children?: any;
    id?: any;
    /** @default 2 */
    headingLevel?: number;
}
export declare function Section(props?: SectionProps): VNode;

/**
 * Props for {@link PageHeader} (src/components/content.js).
 */
export interface PageHeaderProps {
    title?: any;
    lede?: any;
    eyebrow?: any;
    right?: any;
    compact?: any;
    dense?: any;
    id?: any;
}
export declare function PageHeader(props?: PageHeaderProps): VNode;

/**
 * Props for {@link Kpi} (src/components/content.js).
 */
export interface KpiProps {
    /** @default [] */
    items?: any[];
    /** @default 'no metrics yet' */
    emptyText?: string;
}
export declare function Kpi(props?: KpiProps): VNode;

/**
 * Props for {@link Sparkline} (src/components/content.js).
 */
export interface SparklineProps {
    /** @default [] */
    values?: any[];
    /** @default 72 */
    width?: number;
    /** @default 24 */
    height?: number;
    tone?: any;
}
export declare function Sparkline(props?: SparklineProps): VNode;

/**
 * Props for {@link BarChart} (src/components/content.js).
 */
export interface BarChartProps {
    /** @default [] */
    items?: any[];
    /** @default 'no data yet' */
    emptyText?: string;
}
export declare function BarChart(props?: BarChartProps): VNode;

/**
 * Props for {@link Table} (src/components/content.js).
 */
export interface TableProps {
    /** @default [] */
    headers?: any[];
    /** @default [] */
    rows?: any[];
    onRowClick?: (...args: any[]) => any;
    /** @default 'nothing here yet' */
    emptyText?: string;
    rowLabels?: any;
    /** @default false */
    striped?: boolean;
    /** @default false */
    compact?: boolean;
    /** @default false */
    sortable?: boolean;
    sortKey?: any;
    /** @default 'asc' */
    sortDir?: 'asc' | 'desc' | (string & {});
    onSort?: (...args: any[]) => any;
    caption?: any;
}
export declare function Table(props?: TableProps): VNode;

/**
 * Props for {@link HealthTable} (src/components/content.js).
 */
export interface HealthTableProps {
    /** @default {} */
    checks?: Record<string, any>;
    /** @default 'no health data' */
    emptyText?: string;
    /** @default 'ok' */
    okLabel?: string;
    /** @default 'no' */
    missLabel?: string;
    /** @default 60 */
    jsonTruncate?: number;
}
export declare function HealthTable(props?: HealthTableProps): VNode;

/**
 * Props for {@link ProcessRegistryTable} (src/components/content.js).
 */
export interface ProcessRegistryTableProps {
    /** @default [] */
    processes?: any[];
    /** @default 'no live processes' */
    emptyText?: string;
    /** @default [] */
    extraColumns?: any[];
}
export declare function ProcessRegistryTable(props?: ProcessRegistryTableProps): VNode;

/**
 * Props for {@link SearchInput} (src/components/content.js).
 */
export interface SearchInputProps {
    /** @default '' */
    value?: string;
    /** @default 'search…' */
    placeholder?: string;
    onInput?: (...args: any[]) => any;
    onSubmit?: (...args: any[]) => any;
    /** @default 'q' */
    name?: string;
    key?: string | number;
    label?: any;
    resultCount?: any;
}
export declare function SearchInput(props?: SearchInputProps): VNode;

/**
 * Props for {@link TextField} (src/components/content.js).
 */
export interface TextFieldProps {
    label?: any;
    /** @default '' */
    value?: string;
    /** @default 'text' */
    type?: string;
    /** @default '' */
    placeholder?: string;
    onInput?: (...args: any[]) => any;
    onChange?: (...args: any[]) => any;
    name?: any;
    key?: string | number;
    hint?: any;
    multiline?: any;
    /** @default 4 */
    rows?: number;
    maxLength?: any;
    min?: any;
    max?: any;
    error?: any;
    title?: any;
    /** @default 'md' */
    size?: 'md' | 'sm' | 'lg' | (string & {});
    'aria-label'?: any;
    'aria-invalid'?: any;
    'aria-describedby'?: any;
}
export declare function TextField(props?: TextFieldProps): VNode;

/**
 * Props for {@link Select} (src/components/content.js).
 */
export interface SelectProps {
    label?: any;
    /** @default '' */
    value?: string;
    /** @default [] */
    options?: any[];
    onChange?: (...args: any[]) => any;
    name?: any;
    key?: string | number;
    placeholder?: any;
    hint?: any;
    title?: any;
    /** @default 'md' */
    size?: 'md' | 'sm' | 'lg' | (string & {});
    'aria-label'?: any;
}
export declare function Select(props?: SelectProps): VNode;

/**
 * Props for {@link EventList} (src/components/content.js).
 */
export interface EventListProps {
    items?: any;
    events?: any;
    /** @default 'no events' */
    emptyText?: string;
    /** @default 3 */
    rankPad?: number;
    /** @default false */
    loading?: boolean;
    /** @default 'loading events…' */
    loadingText?: string;
}
export declare function EventList(props?: EventListProps): VNode;

/**
 * Props for {@link HomeView} (src/components/content.js).
 */
export interface HomeViewProps {
    /** @default {} */
    state?: Record<string, any>;
    onNav?: (...args: any[]) => any;
    onToggleWork?: (...args: any[]) => any;
    /** @default [] */
    works?: any[];
    /** @default [] */
    posts?: any[];
    /** @default [] */
    manifesto?: any[];
    currentlyShipping?: any;
}
export declare function HomeView(props?: HomeViewProps): VNode;

/**
 * Props for {@link ProjectView} (src/components/content.js).
 */
export interface ProjectViewProps {
    /** @default {} */
    project?: Record<string, any>;
    copied?: any;
    onCopy?: (...args: any[]) => any;
}
export declare function ProjectView(props?: ProjectViewProps): VNode;

/**
 * Props for {@link Form} (src/components/content.js).
 */
export interface FormProps {
    /** @default [] */
    fields?: any[];
    /** @default 'submit' */
    submit?: string;
    onSubmit?: (...args: any[]) => any;
    /** @default 1 */
    columns?: number;
}
export declare function Form(props?: FormProps): VNode;

/**
 * Segmented one-time-code / PIN entry.
 *
 * Props for {@link InputOTP} (src/components/content.js).
 */
export interface InputOTPProps {
    /** number of boxes. @default 6 */
    length?: number;
    /** the full code so far (controlled). @default '' */
    value?: string;
    /** called with (nextValue:string, event) on every edit. */
    onChange?: (...args: any[]) => any;
    /** called with (code:string) once all boxes are filled. */
    onComplete?: (...args: any[]) => any;
    disabled?: boolean;
    error?: boolean;
    /** accessible name for the group. @default 'code' */
    label?: string;
    key?: any;
}
export declare function InputOTP(props?: InputOTPProps): VNode;

/**
 * Props for {@link Spinner} (src/components/content.js).
 */
export interface SpinnerProps {
    /** @default 'base' */
    size?: string;
    /** @default 'accent' */
    tone?: string;
    /** @default 'loading' */
    label?: string;
    key?: string | number;
}
export declare function Spinner(props?: SpinnerProps): VNode;

/**
 * Props for {@link Skeleton} (src/components/content.js).
 */
export interface SkeletonProps {
    /** @default '1em' */
    height?: string;
    /** @default '100%' */
    width?: string;
    /** @default 1 */
    count?: number;
    /** @default 'loading content' */
    label?: string;
    key?: string | number;
}
export declare function Skeleton(props?: SkeletonProps): VNode;

/**
 * Props for {@link Alert} (src/components/content.js).
 */
export interface AlertProps {
    /** @default 'info' */
    kind?: string;
    children?: any;
    onDismiss?: (...args: any[]) => any;
    title?: any;
    key?: string | number;
}
export declare function Alert(props?: AlertProps): VNode;

/**
 * Props for {@link FilterPills} (src/components/content.js).
 */
export interface FilterPillsProps {
    /** @default [] */
    options?: any[];
    selected?: any;
    onSelect?: (...args: any[]) => any;
    /** @default 'filters' */
    label?: string;
}
export declare function FilterPills(props?: FilterPillsProps): VNode;

/**
 * Props for {@link Avatar} (src/components/content.js).
 */
export interface AvatarProps {
    name?: any;
    src?: any;
    fallback?: any;
    /** @default 'md' */
    size?: string;
    /** @default 'circle' */
    shape?: 'circle' | 'square' | (string & {});
    /** @default 1 */
    initialsCount?: number;
    key?: string | number;
}
export declare function Avatar(props?: AvatarProps): VNode;

export declare function avatarInitial(name?: any, count?: any): VNode;

// ---- src/components/chat.js ------------------------------------------

export declare const fmtBytes: any;

export declare const renderInline: any;

export declare function hasSelectionInside(el?: any): VNode;

/**
 * Props for {@link ChatMessage} (src/components/chat.js).
 */
export interface ChatMessageProps {
    role?: any;
    /** @default 'them' */
    who?: string;
    avatar?: any;
    text?: any;
    parts?: any;
    time?: any;
    typing?: any;
    key?: string | number;
    id?: any;
    aicat?: any;
    reactions?: any;
    receipt?: any;
    name?: any;
    streaming?: any;
    actions?: any;
    incomplete?: any;
    stopped?: any;
    flat?: any;
    tail?: any;
    error?: any;
    onRetry?: (...args: any[]) => any;
    onToggleReaction?: (...args: any[]) => any;
    onAddReaction?: (...args: any[]) => any;
}
export declare function ChatMessage(props?: ChatMessageProps): VNode;

/**
 * Props for {@link ChatComposer} (src/components/chat.js).
 */
export interface ChatComposerProps {
    value?: any;
    onInput?: (...args: any[]) => any;
    onSend?: (...args: any[]) => any;
    onEmoji?: (...args: any[]) => any;
    onCancel?: (...args: any[]) => any;
    busy?: any;
    /** @default 'message…' */
    placeholder?: string;
    disabled?: any;
    disabledReason?: any;
    label?: any;
    context?: any;
    onPasteFiles?: (...args: any[]) => any;
    onDropFiles?: (...args: any[]) => any;
    onAttach?: (...args: any[]) => any;
    streamingSince?: any;
    detectAttachment?: any;
    mentionFiles?: any;
}
export declare function ChatComposer(props?: ChatComposerProps): VNode;

/**
 * Props for {@link Chat} (src/components/chat.js).
 */
export interface ChatProps {
    /** @default 'chat' */
    title?: string;
    sub?: any;
    /** @default [] */
    messages?: any[];
    composer?: any;
    header?: any;
    suggestions?: any;
    onSuggestionClick?: (...args: any[]) => any;
}
export declare function Chat(props?: ChatProps): VNode;

export declare function flashComposerNote(composerEl?: any, text?: any): VNode;

/**
 * Props for {@link ChatSuggestions} (src/components/chat.js).
 */
export interface ChatSuggestionsProps {
    /** @default 'What can I help with?' */
    heading?: string;
    /** @default '' */
    subtext?: string;
    /** @default [] */
    suggestions?: any[];
}
export declare function ChatSuggestions(props?: ChatSuggestionsProps): VNode;

/**
 * Props for {@link TypingIndicator} (src/components/chat.js).
 */
export interface TypingIndicatorProps {
    users?: any;
}
export declare function TypingIndicator(props?: TypingIndicatorProps): VNode;

export declare const AICAT_FACE: any;

/**
 * Props for {@link AICatPortrait} (src/components/chat.js).
 */
export interface AICatPortraitProps {
    /** @default 'aicat' */
    name?: string;
    status?: any;
    face?: any;
}
export declare function AICatPortrait(props?: AICatPortraitProps): VNode;

/**
 * Props for {@link AICat} (src/components/chat.js).
 */
export interface AICatProps {
    /** @default 'aicat' */
    name?: string;
    /** @default [] */
    messages?: any[];
    thinking?: any;
    composer?: any;
    /** @default 'online · purring' */
    status?: string;
    header?: any;
}
export declare function AICat(props?: AICatProps): VNode;

// ---- src/components/agent-chat.js ------------------------------------

export declare function AgentChat(props?: any): VNode;

export declare const MESSAGE_CAP: number;

// ---- src/components/chat-minimap.js ----------------------------------

/**
 * Props for {@link ChatMinimap} (src/components/chat-minimap.js).
 */
export interface ChatMinimapProps {
    /** @default [] */
    messages?: any[];
    getThreadEl?: any;
    getMessageEl?: any;
    /** @default CHAT_MINIMAP_WIDTH */
    width?: any;
}
export declare function ChatMinimap(props?: ChatMinimapProps): VNode;

export declare const CHAT_MINIMAP_WIDTH: number;

// ---- src/components/sessions.js --------------------------------------

/**
 * The Claude-Desktop "Chats" column. Sessions grouped by a caller-supplied group label, each row showing title/project, relative time, agent badge, and a running/new-event indicator. Selecting a row switches the active conversation.  another row's `sid` under that row (fork/branch tree), with an indent guide, a branch glyph, and a per-node collapse toggle. Ignored when `groups` is set (grouping and tree-nesting are mutually exclusive row layouts). `expanded`/ `onToggleExpand` are host-driven (kit stays stateless): a `sid` NOT present in the `expanded` Set renders collapsed once it has children. hover-revealed rename action (row becomes an inline text input while active). button click, before `onRename` commits; host flips `renaming` to this sid. delete action; clicking it arms an inline two-button confirm row (same height, no modal), mirroring SessionDashboard's arm-then-confirm stop control.
 *
 * Props for {@link ConversationList} (src/components/sessions.js).
 */
export interface ConversationListProps {
    /** @default [] */
    sessions?: Array<{ sid: any; title?: string; project?: string; agent?: string; time?: string; running?: boolean; unread?: boolean; rail?: string; parentSid?: any }>;
    /** the active sid. */
    selected?: any;
    /** OPTIONAL buckets for the rows; else one flat list. */
    groups?: Array<{ label: string; sids: Array<any> }>;
    /** inline filter (optional). */
    search?: { value: string; onInput: (...args: any[]) => any; placeholder?: string };
    caption?: any;
    /** onSelect(session). */
    onSelect?: (...args: any[]) => any;
    /** onNew(). */
    onNew?: (...args: any[]) => any;
    /** @default 'New chat' */
    newLabel?: string;
    /** @default 'No conversations yet' */
    emptyText?: string;
    /** @default false */
    loading?: boolean;
    /** @default null */
    error?: any;
    /** @default 'Loading conversations…' */
    loadingText?: string;
    /** @default false */
    hasMore?: boolean;
    onLoadMore?: (...args: any[]) => any;
    /** @default 'load more conversations' */
    loadMoreLabel?: string;
    resultCount?: any;
    /** OPTIONAL: nest rows whose `parentSid` matches @default false */
    tree?: boolean;
    /** sids whose children are shown, when `tree`. */
    expanded?: Set<any>;
    /** onToggleExpand(sid), when `tree`. */
    onToggleExpand?: (...args: any[]) => any;
    /** onRename(session, newTitle). Presence enables the */
    onRename?: (...args: any[]) => any;
    /** sid of the row currently in rename-edit mode (host-driven). */
    renaming?: any;
    /** onStartRename(session) - fired by the rename */
    onStartRename?: (...args: any[]) => any;
    /** onCancelRename() - Escape / blur-without-change. */
    onCancelRename?: (...args: any[]) => any;
    /** onDelete(session). Presence enables the hover-revealed */
    onDelete?: (...args: any[]) => any;
    /** sid currently showing the armed delete-confirm state. */
    confirmingDelete?: any;
    /** onArmDelete(session) - first delete click. */
    onArmDelete?: (...args: any[]) => any;
    /** onCancelDelete() - confirm-row Cancel click. */
    onCancelDelete?: (...args: any[]) => any;
}
export declare function ConversationList(props?: ConversationListProps): VNode;

/**
 * Props for {@link SessionCard} (src/components/sessions.js).
 */
export interface SessionCardProps {
    /** @default {} */
    session?: Record<string, any>;
    onStop?: (...args: any[]) => any;
    onOpen?: (...args: any[]) => any;
    onView?: (...args: any[]) => any;
    /** @default false */
    active?: boolean;
    /** @default false */
    selectable?: boolean;
    /** @default false */
    selected?: boolean;
    onToggleSelect?: (...args: any[]) => any;
    /** @default 'comfortable' */
    density?: 'comfortable' | 'compact' | (string & {});
}
export declare function SessionCard(props?: SessionCardProps): VNode;

/**
 * The live multi-session command center ("Live" dashboard).  The stop-all / stop-selected danger buttons are two-step (host-driven, the kit is stateless): the first click fires onArmStop* so the host flips confirming* true and re-renders; the armed button reads 'stop N sessions - press again' and only THAT click fires the real onStopAll/onStopSelected. Hosts that wire no onArmStop* keep the old single-click behavior.
 *
 * Props for {@link SessionDashboard} (src/components/sessions.js).
 */
export interface SessionDashboardProps {
    /** session shape: `{ sid, realSid, title, agent, model, cwd, elapsedMs, counter, lastActivity, currentTool, status, stopping, external, isNew, cost, tokens }`. @default [] */
    sessions?: Array<Record<string, any>>;
    /** onStop(session). */
    onStop?: (...args: any[]) => any;
    /** onOpen(session). */
    onOpen?: (...args: any[]) => any;
    /** onView(session). */
    onView?: (...args: any[]) => any;
    onStopAll?: (...args: any[]) => any;
    onStopSelected?: (...args: any[]) => any;
    /** @default false */
    confirmingStopAll?: boolean;
    /** @default false */
    confirmingStopSelected?: boolean;
    onArmStopAll?: (...args: any[]) => any;
    onArmStopSelected?: (...args: any[]) => any;
    sort?: any;
    filter?: any;
    /** @default false */
    errorsOnly?: boolean;
    onErrorsOnly?: (...args: any[]) => any;
    /** @default false */
    selectable?: boolean;
    selected?: any;
    onToggleSelect?: (...args: any[]) => any;
    onSelectAll?: (...args: any[]) => any;
    onClearSelection?: (...args: any[]) => any;
    activeSid?: any;
    streamState?: 'connected' | 'connecting' | 'lost' | 'offline';
    /** @default 'No live sessions' */
    emptyText?: string;
    emptyAction?: any;
    /** @default false */
    offline?: boolean;
    /** @default 'comfortable' */
    density?: 'comfortable' | 'compact' | (string & {});
}
export declare function SessionDashboard(props?: SessionDashboardProps): VNode;

/**
 * Props for {@link SessionMeta} (src/components/sessions.js).
 */
export interface SessionMetaProps {
    /** @default [] */
    items?: any[];
}
export declare function SessionMeta(props?: SessionMetaProps): VNode;

export declare function fmtDuration(ms?: any): VNode;

export declare function fmtTime(t?: any): VNode;

export declare function fmtAgo(t?: any): VNode;

/**
 * Props for {@link AgentListSkeleton} (src/components/sessions.js).
 */
export interface AgentListSkeletonProps {
    /** @default 5 */
    rows?: number;
}
export declare function AgentListSkeleton(props?: AgentListSkeletonProps): VNode;

// ---- src/components/context-pane.js ----------------------------------

/**
 * Props for {@link ContextPane} (src/components/context-pane.js).
 */
export interface ContextPaneProps {
    agent?: any;
    model?: any;
    cwd?: any;
    /** @default 0 */
    toolCount?: number;
    usage?: any;
    session?: any;
    recentFiles?: any;
    onSetCwd?: (...args: any[]) => any;
    onOpenFile?: (...args: any[]) => any;
}
export declare function ContextPane(props?: ContextPaneProps): VNode;

/**
 * Props for {@link ContextMeter} (src/components/context-pane.js).
 */
export interface ContextMeterProps {
    /** @default 0 */
    used?: number;
    /** @default 0 */
    total?: number;
    /** @default [] */
    segments?: any[];
}
export declare function ContextMeter(props?: ContextMeterProps): VNode;

/**
 * Props for {@link ContextTreemap} (src/components/context-pane.js).
 */
export interface ContextTreemapProps {
    /** @default [] */
    items?: any[];
    /** @default 280 */
    width?: number;
    /** @default 160 */
    height?: number;
}
export declare function ContextTreemap(props?: ContextTreemapProps): VNode;

/**
 * Props for {@link ContextXRayPanel} (src/components/context-pane.js).
 */
export interface ContextXRayPanelProps {
    /** @default [] */
    segments?: any[];
    openId?: any;
    onOpenIdChange?: (...args: any[]) => any;
}
export declare function ContextXRayPanel(props?: ContextXRayPanelProps): VNode;

// ---- src/components/spreadsheet-preview.js ---------------------------

/**
 * Props for {@link SpreadsheetPreview} (src/components/spreadsheet-preview.js).
 */
export interface SpreadsheetPreviewProps {
    workbook?: any;
    activeSheet?: any;
    onSheetChange?: (...args: any[]) => any;
    /** @default DEFAULT_MAX_ROWS */
    maxRows?: any;
    /** @default DEFAULT_MAX_COLS */
    maxCols?: any;
    truncated?: any;
    loading?: any;
    error?: any;
    /** @default 'retry' */
    errorActionLabel?: string;
    onErrorAction?: (...args: any[]) => any;
    key?: string | number;
}
export declare function SpreadsheetPreview(props?: SpreadsheetPreviewProps): VNode;

// ---- src/components/git-status.js ------------------------------------

/**
 * Props for {@link GitStatusPanel} (src/components/git-status.js).
 */
export interface GitStatusPanelProps {
    /** @default [] */
    files?: any[];
    onFileClick?: (...args: any[]) => any;
    /** @default 'no changes' */
    emptyText?: string;
    active?: any;
}
export declare function GitStatusPanel(props?: GitStatusPanelProps): VNode;

/**
 * Props for {@link GitDiffView} (src/components/git-status.js).
 */
export interface GitDiffViewProps {
    /** @default '' */
    diff?: string;
    filename?: any;
    /** @default false */
    binary?: boolean;
}
export declare function GitDiffView(props?: GitDiffViewProps): VNode;

// ---- src/components/worktree-switcher.js -----------------------------

/**
 * Props for {@link WorktreeSwitcher} (src/components/worktree-switcher.js).
 */
export interface WorktreeSwitcherProps {
    /** @default [] */
    worktrees?: any[];
    current?: any;
    onSwitch?: (...args: any[]) => any;
    onCreate?: (...args: any[]) => any;
    /** @default 'switch worktree' */
    ariaLabel?: string;
}
export declare function WorktreeSwitcher(props?: WorktreeSwitcherProps): VNode;

// ---- src/components/plugins-config.js --------------------------------

/**
 * Props for {@link PluginsConfig} (src/components/plugins-config.js).
 */
export interface PluginsConfigProps {
    /** @default [] */
    plugins?: any[];
    /** @default null */
    selected?: any;
    /** @default false */
    loading?: boolean;
    /** @default null */
    error?: any;
    /** @default null */
    busyName?: any;
    onSelect?: (...args: any[]) => any;
    onToggle?: (...args: any[]) => any;
    onReload?: (...args: any[]) => any;
    onClose?: (...args: any[]) => any;
}
export declare function PluginsConfig(props?: PluginsConfigProps): VNode;

// ---- src/components/skills-config.js ---------------------------------

/**
 * Props for {@link SkillsConfig} (src/components/skills-config.js).
 */
export interface SkillsConfigProps {
    /** @default [] */
    skills?: any[];
    /** @default null */
    selected?: any;
    /** @default false */
    loading?: boolean;
    /** @default null */
    error?: any;
    /** @default null */
    busyName?: any;
    /** @default '' */
    query?: string;
    onQuery?: (...args: any[]) => any;
    onSelect?: (...args: any[]) => any;
    onToggle?: (...args: any[]) => any;
    onClose?: (...args: any[]) => any;
}
export declare function SkillsConfig(props?: SkillsConfigProps): VNode;

// ---- src/components/models-config.js ---------------------------------

/**
 * Props for {@link ModelsConfig} (src/components/models-config.js).
 */
export interface ModelsConfigProps {
    data?: any;
    loading?: any;
    error?: any;
    selectedProviderId?: any;
    onSelectProvider?: (...args: any[]) => any;
    selectedModel?: any;
    onSelectModel?: (...args: any[]) => any;
    onRefresh?: (...args: any[]) => any;
    onRebuild?: (...args: any[]) => any;
    rebuilding?: any;
    rebuildError?: any;
}
export declare function ModelsConfig(props?: ModelsConfigProps): VNode;

// ---- src/components/data-density.js ----------------------------------

export declare const DEFAULT_PHASES: any[];

/**
 * Props for {@link PhaseWalk} (src/components/data-density.js).
 */
export interface PhaseWalkProps {
    /** @default DEFAULT_PHASES */
    phases?: any;
    /** @default [] */
    reached?: any[];
    /** @default [] */
    gapKinds?: any[];
}
export declare function PhaseWalk(props?: PhaseWalkProps): VNode;

/**
 * Props for {@link TreeNode} (src/components/data-density.js).
 */
export interface TreeNodeProps {
    ts?: any;
    kind?: any;
    /** @default '' */
    variant?: string;
    phase?: any;
    id?: any;
    keyLabel?: any;
    reason?: any;
    deviationLabel?: any;
    residuals?: any;
}
export declare function TreeNode(props?: TreeNodeProps): VNode;

/**
 * Props for {@link BarRow} (src/components/data-density.js).
 */
export interface BarRowProps {
    label?: any;
    value?: any;
    /** @default 0 */
    pct?: number;
    tone?: any;
}
export declare function BarRow(props?: BarRowProps): VNode;

/**
 * Props for {@link RateCell} (src/components/data-density.js).
 */
export interface RateCellProps {
    value?: any;
    /** @default 'neutral' */
    tone?: string;
}
export declare function RateCell(props?: RateCellProps): VNode;

/**
 * Props for {@link StatTile} (src/components/data-density.js).
 */
export interface StatTileProps {
    val?: any;
    lbl?: any;
    /** @default '' */
    cls?: string;
}
export declare function StatTile(props?: StatTileProps): VNode;

/**
 * Props for {@link StatsGrid} (src/components/data-density.js).
 */
export interface StatsGridProps {
    /** @default [] */
    items?: any[];
}
export declare function StatsGrid(props?: StatsGridProps): VNode;

/**
 * Props for {@link SubGrid} (src/components/data-density.js).
 */
export interface SubGridProps {
    /** @default [] */
    items?: any[];
}
export declare function SubGrid(props?: SubGridProps): VNode;

/**
 * Props for {@link SessionRow} (src/components/data-density.js).
 */
export interface SessionRowProps {
    sessId?: any;
    phaseWalkProps?: any;
    events?: any;
    verbs?: any;
    prd?: any;
    muts?: any;
    resid?: any;
    deviations?: any;
    firstTs?: any;
    lastTs?: any;
    onClick?: (...args: any[]) => any;
}
export declare function SessionRow(props?: SessionRowProps): VNode;

/**
 * Props for {@link DevRow} (src/components/data-density.js).
 */
export interface DevRowProps {
    ts?: any;
    event?: any;
    sess?: any;
    operation?: any;
    residuals?: any;
}
export declare function DevRow(props?: DevRowProps): VNode;

/**
 * Props for {@link LiveLogEntry} (src/components/data-density.js).
 */
export interface LiveLogEntryProps {
    ts?: any;
    sub?: any;
    tone?: any;
    event?: any;
    preview?: any;
}
export declare function LiveLogEntry(props?: LiveLogEntryProps): VNode;

/**
 * Props for {@link LiveLog} (src/components/data-density.js).
 */
export interface LiveLogProps {
    /** @default [] */
    entries?: any[];
    /** @default true */
    autoScroll?: boolean;
}
export declare function LiveLog(props?: LiveLogProps): VNode;

/**
 * Props for {@link Progress} (src/components/data-density.js).
 */
export interface ProgressProps {
    /** @default 0 */
    value?: number;
    /** @default 100 */
    max?: number;
    label?: any;
}
export declare function Progress(props?: ProgressProps): VNode;

// ---- src/components/files.js -----------------------------------------

export declare function fileGlyph(type?: any): VNode;

export declare function fmtFileSize(bytes?: any): VNode;

/**
 * Props for {@link FileIcon} (src/components/files.js).
 */
export interface FileIconProps {
    /** @default 'other' */
    type?: string;
}
export declare function FileIcon(props?: FileIconProps): VNode;

/**
 * Props for {@link FileRow} (src/components/files.js).
 */
export interface FileRowProps {
    name?: any;
    /** @default 'other' */
    type?: 'other' | 'dir' | (string & {});
    size?: any;
    modified?: any;
    code?: any;
    onOpen?: (...args: any[]) => any;
    onAction?: (...args: any[]) => any;
    active?: any;
    key?: string | number;
    permissions?: any;
    locked?: any;
    /** @default FILE_ROW_ACTIONS */
    actions?: any;
    /** @default false */
    busy?: boolean;
    /** @default false */
    selectable?: boolean;
    /** @default false */
    selected?: boolean;
    onToggleSelect?: (...args: any[]) => any;
}
export declare function FileRow(props?: FileRowProps): VNode;

/**
 * The directory listing.  `loading` and `busy` are NOT two spellings of one state -- they are the two halves of this SDK's standing distinction, and FileGrid is the component that takes both because it is the one place both are in play at once:  loading -- a DATA FETCH is in flight. Owns which SHAPE renders: with no rows yet it is a cold load and the whole grid is replaced by FileSkeleton; with rows already on screen it is a refresh and the existing rows stay mounted and dim (is-refreshing), because flashing a populated directory back to shimmer reads as data loss. busy    -- a USER ACTION is in flight (a rename/move/delete round-trip). Owns INTERACTIVITY, not shape: it is forwarded to each FileRow as `busy`, which disables that row's open + mutation controls so a second click cannot fire the same mutation twice.  A grid can be `busy` while not `loading` (a delete is posting, rows fully rendered) and `loading` while not `busy` (a plain refresh). Passing one for the other is a real bug, not a style choice, so they are deliberately not merged and neither is an alias of the other.
 *
 * Props for {@link FileGrid} (src/components/files.js).
 */
export interface FileGridProps {
    /** the directory entries to render. @default [] */
    files?: any[];
    onOpen?: (...args: any[]) => any;
    onAction?: (...args: any[]) => any;
    onUp?: (...args: any[]) => any;
    /** copy for the empty/filtered-miss state. @default 'No files here yet' */
    emptyText?: string;
    emptyAction?: any;
    sort?: any;
    filter?: any;
    /** a data fetch is in flight (skeleton when cold, dim when refreshing). @default false */
    loading?: boolean;
    shown?: any;
    onShowMore?: (...args: any[]) => any;
    actions?: any;
    /** a user-initiated mutation is in flight; disables every row's controls. Per-entry `f.busy` is used when this is not passed. */
    busy?: boolean;
    /** @default false */
    selectable?: boolean;
    selected?: any;
    onToggleSelect?: (...args: any[]) => any;
    /** @default selected */
    marked?: any;
    /** @default onToggleSelect */
    onMark?: (...args: any[]) => any;
    onSelectAll?: (...args: any[]) => any;
    onClearSelection?: (...args: any[]) => any;
    /** row density; 'thumb' switches to the multi-column cell grid. @default 'list' */
    density?: 'list' | 'compact' | 'thumb';
    onDensity?: (...args: any[]) => any;
    thumbUrl?: any;
}
export declare function FileGrid(props?: FileGridProps): VNode;

/**
 * Props for {@link FileSkeleton} (src/components/files.js).
 */
export interface FileSkeletonProps {
    /** @default 12 */
    rows?: number;
}
export declare function FileSkeleton(props?: FileSkeletonProps): VNode;

export declare function sortFiles(files?: any, sort?: any, dir?: any): VNode;

/**
 * Props for {@link FileToolbar} (src/components/files.js).
 */
export interface FileToolbarProps {
    /** @default [] */
    left?: any[];
    /** @default [] */
    right?: any[];
}
export declare function FileToolbar(props?: FileToolbarProps): VNode;

/**
 * Props for {@link RootsPicker} (src/components/files.js).
 */
export interface RootsPickerProps {
    /** @default [] */
    roots?: any[];
    selected?: any;
    onSelect?: (...args: any[]) => any;
    /** @default 'roots' */
    label?: string;
}
export declare function RootsPicker(props?: RootsPickerProps): VNode;

/**
 * Props for {@link DropZone} (src/components/files.js).
 */
export interface DropZoneProps {
    children?: any;
    dragover?: any;
    rejected?: any;
    onDrop?: (...args: any[]) => any;
    onDragOver?: (...args: any[]) => any;
    onDragLeave?: (...args: any[]) => any;
    /** @default 'drop files here' */
    label?: string;
    onPick?: (...args: any[]) => any;
}
export declare function DropZone(props?: DropZoneProps): VNode;

/**
 * Props for {@link UploadProgress} (src/components/files.js).
 */
export interface UploadProgressProps {
    /** @default [] */
    items?: any[];
    onDismiss?: (...args: any[]) => any;
}
export declare function UploadProgress(props?: UploadProgressProps): VNode;

/**
 * Props for {@link EmptyState} (src/components/files.js).
 */
export interface EmptyStateProps {
    /** @default 'nothing here' */
    text?: string;
    /** @default Icon('circle') */
    glyph?: any;
    action?: any;
}
export declare function EmptyState(props?: EmptyStateProps): VNode;

/**
 * Props for {@link BreadcrumbPath} (src/components/files.js).
 */
export interface BreadcrumbPathProps {
    /** @default [] */
    segments?: any[];
    onNav?: (...args: any[]) => any;
    /** @default 'root' */
    root?: string;
}
export declare function BreadcrumbPath(props?: BreadcrumbPathProps): VNode;

/**
 * Props for {@link BulkBar} (src/components/files.js).
 */
export interface BulkBarProps {
    /** @default 0 */
    count?: number;
    /** @default 'file' */
    noun?: string;
    nounPlural?: any;
    /** @default [] */
    actions?: any[];
    onClear?: (...args: any[]) => any;
    /** @default false */
    busy?: boolean;
}
export declare function BulkBar(props?: BulkBarProps): VNode;

// ---- src/components/files-modals.js ----------------------------------

/**
 * Props for {@link ConfirmDialog} (src/components/files-modals.js).
 */
export interface ConfirmDialogProps {
    /** @default 'Are you sure?' */
    title?: string;
    message?: any;
    /** @default 'confirm' */
    confirmLabel?: string;
    /** @default 'cancel' */
    cancelLabel?: string;
    destructive?: any;
    onConfirm?: (...args: any[]) => any;
    onCancel?: (...args: any[]) => any;
    error?: any;
    /** @default false */
    busy?: boolean;
    /** @default 'working…' */
    busyLabel?: string;
}
export declare function ConfirmDialog(props?: ConfirmDialogProps): VNode;

/**
 * Props for {@link PromptDialog} (src/components/files-modals.js).
 */
export interface PromptDialogProps {
    /** @default 'Enter a name' */
    title?: string;
    /** @default '' */
    value?: string;
    /** @default '' */
    placeholder?: string;
    /** @default 'ok' */
    confirmLabel?: string;
    /** @default 'cancel' */
    cancelLabel?: string;
    onConfirm?: (...args: any[]) => any;
    onCancel?: (...args: any[]) => any;
    onInput?: (...args: any[]) => any;
    error?: any;
    /** @default false */
    busy?: boolean;
    /** @default 'working…' */
    busyLabel?: string;
    roots?: any;
    onPickRoot?: (...args: any[]) => any;
}
export declare function PromptDialog(props?: PromptDialogProps): VNode;

/**
 * Props for {@link CountdownDialog} (src/components/files-modals.js).
 */
export interface CountdownDialogProps {
    /** @default 'Are you sure?' */
    title?: string;
    message?: any;
    /** @default 10 */
    seconds?: number;
    onExpire?: (...args: any[]) => any;
    actions?: any;
}
export declare function CountdownDialog(props?: CountdownDialogProps): VNode;

/**
 * Props for {@link FilePreviewMedia} (src/components/files-modals.js).
 */
export interface FilePreviewMediaProps {
    src?: any;
    /** @default 'other' */
    type?: 'other' | 'image' | 'video' | 'audio' | (string & {});
    name?: any;
}
export declare function FilePreviewMedia(props?: FilePreviewMediaProps): VNode;

/**
 * Props for {@link FilePreviewCode} (src/components/files-modals.js).
 */
export interface FilePreviewCodeProps {
    /** @default '' */
    content?: string;
    lang?: any;
    filename?: any;
    wrap?: any;
    onWrapToggle?: (...args: any[]) => any;
    previewHtml?: any;
    /** @default 'preview' */
    previewLabel?: string;
    mode?: any;
    onModeChange?: (...args: any[]) => any;
}
export declare function FilePreviewCode(props?: FilePreviewCodeProps): VNode;

/**
 * Props for {@link FilePreviewText} (src/components/files-modals.js).
 */
export interface FilePreviewTextProps {
    /** @default '' */
    content?: string;
    truncated?: any;
}
export declare function FilePreviewText(props?: FilePreviewTextProps): VNode;

/**
 * Props for {@link FileViewer} (src/components/files-modals.js).
 */
export interface FileViewerProps {
    file?: any;
    body?: any;
    onClose?: (...args: any[]) => any;
    onAction?: (...args: any[]) => any;
    onPrev?: (...args: any[]) => any;
    onNext?: (...args: any[]) => any;
}
export declare function FileViewer(props?: FileViewerProps): VNode;

/**
 * Props for {@link FilePreviewPane} (src/components/files-modals.js).
 */
export interface FilePreviewPaneProps {
    file?: any;
    body?: any;
    onClose?: (...args: any[]) => any;
    onAction?: (...args: any[]) => any;
    onPrev?: (...args: any[]) => any;
    onNext?: (...args: any[]) => any;
}
export declare function FilePreviewPane(props?: FilePreviewPaneProps): VNode;

/**
 * Props for {@link Modal} (src/components/files-modals.js).
 */
export interface ModalProps {
    onClose?: (...args: any[]) => any;
    /** @default '' */
    kind?: string;
    head?: any;
    /** @default '' */
    headClass?: string;
    /** @default {} */
    headAttrs?: Record<string, any>;
    body?: any;
    /** @default 'ds-modal-body' */
    bodyClass?: string;
    /** @default {} */
    bodyAttrs?: Record<string, any>;
    actions?: any;
    /** @default false */
    busy?: boolean;
}
export declare function Modal(props?: ModalProps): VNode;

export declare function modalError(error?: any): VNode;

// ---- src/components/community.js -------------------------------------

/**
 * Props for {@link ServerIcon} (src/components/community.js).
 */
export interface ServerIconProps {
    id?: any;
    name?: any;
    icon?: any;
    active?: any;
    badge?: any;
    onClick?: (...args: any[]) => any;
}
export declare function ServerIcon(props?: ServerIconProps): VNode;

/**
 * Props for {@link ServerRail} (src/components/community.js).
 */
export interface ServerRailProps {
    /** @default [] */
    servers?: any[];
    activeId?: any;
    onSelect?: (...args: any[]) => any;
    onAdd?: (...args: any[]) => any;
}
export declare function ServerRail(props?: ServerRailProps): VNode;

/**
 * Props for {@link ChannelItem} (src/components/community.js).
 */
export interface ChannelItemProps {
    id?: any;
    name?: any;
    /** @default 'text' */
    type?: string;
    active?: any;
    voiceActive?: any;
    voiceConnecting?: any;
    badge?: any;
    draggable?: any;
    /** @default [] */
    actions?: any[];
    /** @default [] */
    participants?: any[];
    onClick?: (...args: any[]) => any;
    onContext?: (...args: any[]) => any;
}
export declare function ChannelItem(props?: ChannelItemProps): VNode;

/**
 * Props for {@link ChannelCategory} (src/components/community.js).
 */
export interface ChannelCategoryProps {
    id?: any;
    name?: any;
    /** @default [] */
    channels?: any[];
    collapsed?: any;
    activeId?: any;
    onToggle?: (...args: any[]) => any;
    onAddChannel?: (...args: any[]) => any;
    onChannelClick?: (...args: any[]) => any;
    onChannelContext?: (...args: any[]) => any;
    onContextMenu?: (...args: any[]) => any;
    extraButton?: any;
    channelDraggable?: any;
}
export declare function ChannelCategory(props?: ChannelCategoryProps): VNode;

/**
 * Props for {@link VoiceUser} (src/components/community.js).
 */
export interface VoiceUserProps {
    identity?: any;
    speaking?: any;
    color?: any;
    muted?: any;
    camera?: any;
    videoEl?: any;
}
export declare function VoiceUser(props?: VoiceUserProps): VNode;

/**
 * Props for {@link UserPanel} (src/components/community.js).
 */
export interface UserPanelProps {
    name?: any;
    tag?: any;
    color?: any;
    muted?: any;
    deafened?: any;
    onMute?: (...args: any[]) => any;
    onDeafen?: (...args: any[]) => any;
    onSettings?: (...args: any[]) => any;
}
export declare function UserPanel(props?: UserPanelProps): VNode;

/**
 * Props for {@link ChannelSidebar} (src/components/community.js).
 */
export interface ChannelSidebarProps {
    serverName?: any;
    /** @default [] */
    channels?: any[];
    /** @default [] */
    categories?: any[];
    activeId?: any;
    collapsedCats?: any;
    onChannelClick?: (...args: any[]) => any;
    onCategoryToggle?: (...args: any[]) => any;
    onAddChannel?: (...args: any[]) => any;
    onChannelContext?: (...args: any[]) => any;
    userPanelProps?: any;
    /** @default false */
    loading?: boolean;
}
export declare function ChannelSidebar(props?: ChannelSidebarProps): VNode;

/**
 * Props for {@link MemberItem} (src/components/community.js).
 */
export interface MemberItemProps {
    identity?: any;
    name?: any;
    color?: any;
    nameColor?: any;
    /** @default 'online' */
    status?: string;
    onClick?: (...args: any[]) => any;
}
export declare function MemberItem(props?: MemberItemProps): VNode;

/**
 * Props for {@link MemberList} (src/components/community.js).
 */
export interface MemberListProps {
    /** @default [] */
    categories?: any[];
    open?: any;
    /** @default false */
    loading?: boolean;
    onSelectMember?: (...args: any[]) => any;
}
export declare function MemberList(props?: MemberListProps): VNode;

/**
 * Props for {@link UserCard} (src/components/community.js).
 */
export interface UserCardProps {
    identity?: any;
    name?: any;
    color?: any;
    bannerUrl?: any;
    /** @default 'online' */
    status?: string;
    statusLabel?: any;
    bio?: any;
    /** @default [] */
    roles?: any[];
    joinedAt?: any;
    joinedServerAt?: any;
    serverName?: any;
    /** @default [] */
    actions?: any[];
}
export declare function UserCard(props?: UserCardProps): VNode;

/**
 * Props for {@link ChatHeader} (src/components/community.js).
 */
export interface ChatHeaderProps {
    /** @default '#' */
    icon?: string;
    name?: any;
    topic?: any;
    /** @default [] */
    toolbar?: any[];
}
export declare function ChatHeader(props?: ChatHeaderProps): VNode;

/**
 * Props for {@link VoiceStrip} (src/components/community.js).
 */
export interface VoiceStripProps {
    channelName?: any;
    status?: any;
    muted?: any;
    deafened?: any;
    onMute?: (...args: any[]) => any;
    onDeafen?: (...args: any[]) => any;
    onLeave?: (...args: any[]) => any;
    open?: any;
}
export declare function VoiceStrip(props?: VoiceStripProps): VNode;

/**
 * Props for {@link CommunityShell} (src/components/community.js).
 */
export interface CommunityShellProps {
    serverRailProps?: any;
    sidebarProps?: any;
    children?: any;
    memberListProps?: any;
    voiceStripProps?: any;
}
export declare function CommunityShell(props?: CommunityShellProps): VNode;

/**
 * Props for {@link MobileHeader} (src/components/community.js).
 */
export interface MobileHeaderProps {
    title?: any;
    channelType?: any;
    channelName?: any;
    onMenu?: (...args: any[]) => any;
    onMembers?: (...args: any[]) => any;
}
export declare function MobileHeader(props?: MobileHeaderProps): VNode;

/**
 * Props for {@link ReplyBar} (src/components/community.js).
 */
export interface ReplyBarProps {
    quotedMessage?: any;
    quotedAuthor?: any;
    onCancel?: (...args: any[]) => any;
}
export declare function ReplyBar(props?: ReplyBarProps): VNode;

/**
 * Props for {@link Banner} (src/components/community.js).
 */
export interface BannerProps {
    /** @default 'info' */
    tone?: 'info' | 'error' | 'warning' | (string & {});
    message?: any;
    visible?: any;
    actionLabel?: any;
    onAction?: (...args: any[]) => any;
    onClick?: (...args: any[]) => any;
}
export declare function Banner(props?: BannerProps): VNode;

/**
 * Props for {@link ThreadPanel} (src/components/community.js).
 */
export interface ThreadPanelProps {
    /** @default [] */
    threads?: any[];
    /** @default null */
    activeId?: any;
    /** @default 'Threads' */
    title?: string;
    onSelect?: (...args: any[]) => any;
    onCreate?: (...args: any[]) => any;
    onClose?: (...args: any[]) => any;
    /** @default false */
    loading?: boolean;
}
export declare function ThreadPanel(props?: ThreadPanelProps): VNode;

/**
 * Props for {@link ForumView} (src/components/community.js).
 */
export interface ForumViewProps {
    /** @default [] */
    posts?: any[];
    onSearch?: (...args: any[]) => any;
    onSort?: (...args: any[]) => any;
    onSelect?: (...args: any[]) => any;
    onNewPost?: (...args: any[]) => any;
    /** @default false */
    loading?: boolean;
}
export declare function ForumView(props?: ForumViewProps): VNode;

/**
 * Props for {@link PageView} (src/components/community.js).
 */
export interface PageViewProps {
    /** @default '' */
    title?: string;
    /** @default '' */
    html?: string;
    /** @default '' */
    author?: string;
    /** @default 0 */
    updatedAt?: number;
    /** @default false */
    isAdmin?: boolean;
    onEdit?: (...args: any[]) => any;
}
export declare function PageView(props?: PageViewProps): VNode;

/**
 * Props for {@link RoleRow} (src/components/community.js).
 */
export interface RoleRowProps {
    id?: any;
    name?: any;
    color?: any;
    memberCount?: any;
    /** @default true */
    draggable?: boolean;
    onClick?: (...args: any[]) => any;
    onDragStart?: (...args: any[]) => any;
    onDragOver?: (...args: any[]) => any;
    onDrop?: (...args: any[]) => any;
}
export declare function RoleRow(props?: RoleRowProps): VNode;

/**
 * Props for {@link RoleList} (src/components/community.js).
 */
export interface RoleListProps {
    /** @default [] */
    roles?: any[];
    onSelectRole?: (...args: any[]) => any;
    onReorder?: (...args: any[]) => any;
    onAddRole?: (...args: any[]) => any;
    /** @default false */
    saving?: boolean;
}
export declare function RoleList(props?: RoleListProps): VNode;

/**
 * Props for {@link RoleEditor} (src/components/community.js).
 */
export interface RoleEditorProps {
    /** @default {} */
    role?: Record<string, any>;
    /** @default {} */
    permissions?: Record<string, any>;
    permissionGroups?: any;
    onChangeName?: (...args: any[]) => any;
    onChangeColor?: (...args: any[]) => any;
    onChangeHoist?: (...args: any[]) => any;
    onChangeMentionable?: (...args: any[]) => any;
    onChangePermission?: (...args: any[]) => any;
    onCopyId?: (...args: any[]) => any;
    onDelete?: (...args: any[]) => any;
    onSave?: (...args: any[]) => any;
    onReset?: (...args: any[]) => any;
    /** @default false */
    dirty?: boolean;
    /** @default false */
    saving?: boolean;
}
export declare function RoleEditor(props?: RoleEditorProps): VNode;

/**
 * Props for {@link BanList} (src/components/community.js).
 */
export interface BanListProps {
    /** @default [] */
    bans?: any[];
    /** @default '' */
    filterName?: string;
    /** @default '' */
    filterReason?: string;
    onFilterName?: (...args: any[]) => any;
    onFilterReason?: (...args: any[]) => any;
    onUnban?: (...args: any[]) => any;
    /** @default false */
    loading?: boolean;
}
export declare function BanList(props?: BanListProps): VNode;

/**
 * Props for {@link InviteList} (src/components/community.js).
 */
export interface InviteListProps {
    /** @default [] */
    invites?: any[];
    onCreate?: (...args: any[]) => any;
    /** @default true */
    canCreate?: boolean;
    onCopy?: (...args: any[]) => any;
    onRevoke?: (...args: any[]) => any;
    /** @default false */
    loading?: boolean;
}
export declare function InviteList(props?: InviteListProps): VNode;

/**
 * Props for {@link WebhookList} (src/components/community.js).
 */
export interface WebhookListProps {
    /** @default [] */
    webhooks?: any[];
    onCreate?: (...args: any[]) => any;
    onEdit?: (...args: any[]) => any;
    onDelete?: (...args: any[]) => any;
    /** @default false */
    busy?: boolean;
}
export declare function WebhookList(props?: WebhookListProps): VNode;

/**
 * Props for {@link WebhookListItem} (src/components/community.js).
 */
export interface WebhookListItemProps {
    name?: any;
    avatarUrl?: any;
    color?: any;
    description?: any;
    onEdit?: (...args: any[]) => any;
    onDelete?: (...args: any[]) => any;
}
export declare function WebhookListItem(props?: WebhookListItemProps): VNode;

/**
 * Props for {@link WebhookEditor} (src/components/community.js).
 */
export interface WebhookEditorProps {
    /** @default '' */
    name?: string;
    /** @default '' */
    avatarUrl?: string;
    /** @default '' */
    url?: string;
    onNameChange?: (...args: any[]) => any;
    onAvatarChange?: (...args: any[]) => any;
    onCopyUrl?: (...args: any[]) => any;
    onSave?: (...args: any[]) => any;
    onDelete?: (...args: any[]) => any;
    /** @default false */
    saving?: boolean;
}
export declare function WebhookEditor(props?: WebhookEditorProps): VNode;

/**
 * Props for {@link RoleTabs} (src/components/community.js).
 */
export interface RoleTabsProps {
    /** @default [] */
    roles?: any[];
    activeId?: any;
    onSelect?: (...args: any[]) => any;
}
export declare function RoleTabs(props?: RoleTabsProps): VNode;

/**
 * Props for {@link PermissionRow} (src/components/community.js).
 */
export interface PermissionRowProps {
    title?: any;
    description?: any;
    value?: any;
    onCycle?: (...args: any[]) => any;
}
export declare function PermissionRow(props?: PermissionRowProps): VNode;

/**
 * Props for {@link PermissionSection} (src/components/community.js).
 */
export interface PermissionSectionProps {
    heading?: any;
    /** @default [] */
    permissions?: any[];
    /** @default {} */
    values?: Record<string, any>;
    onChange?: (...args: any[]) => any;
}
export declare function PermissionSection(props?: PermissionSectionProps): VNode;

/**
 * Props for {@link PermissionsEditor} (src/components/community.js).
 */
export interface PermissionsEditorProps {
    /** @default [] */
    roles?: any[];
    activeRoleId?: any;
    onSelectRole?: (...args: any[]) => any;
    /** @default [] */
    sections?: any[];
    /** @default {} */
    values?: Record<string, any>;
    onChange?: (...args: any[]) => any;
    /** @default false */
    dirty?: boolean;
    /** @default false */
    saving?: boolean;
    onSave?: (...args: any[]) => any;
    onReset?: (...args: any[]) => any;
}
export declare function PermissionsEditor(props?: PermissionsEditorProps): VNode;

/**
 * Props for {@link PermissionsOverview} (src/components/community.js).
 */
export interface PermissionsOverviewProps {
    /** @default [] */
    roles?: any[];
    /** @default [] */
    overrideRoleIds?: any[];
    onSelectDefault?: (...args: any[]) => any;
    onSelectRole?: (...args: any[]) => any;
}
export declare function PermissionsOverview(props?: PermissionsOverviewProps): VNode;

/**
 * Props for {@link EmojiManagerGrid} (src/components/community.js).
 */
export interface EmojiManagerGridProps {
    /** @default [] */
    emoji?: any[];
    onUpload?: (...args: any[]) => any;
    onDelete?: (...args: any[]) => any;
    /** @default false */
    dragOver?: boolean;
    onDragOver?: (...args: any[]) => any;
    onDragLeave?: (...args: any[]) => any;
    onDrop?: (...args: any[]) => any;
    /** @default false */
    busy?: boolean;
}
export declare function EmojiManagerGrid(props?: EmojiManagerGridProps): VNode;

/**
 * Props for {@link SearchBar} (src/components/community.js).
 */
export interface SearchBarProps {
    /** @default '' */
    value?: string;
    /** @default 'Search…' */
    placeholder?: string;
    onChange?: (...args: any[]) => any;
    onClear?: (...args: any[]) => any;
    onSubmit?: (...args: any[]) => any;
    /** @default false */
    autofocus?: boolean;
}
export declare function SearchBar(props?: SearchBarProps): VNode;

/**
 * Props for {@link SearchResults} (src/components/community.js).
 */
export interface SearchResultsProps {
    /** @default '' */
    query?: string;
    /** @default [] */
    groups?: any[];
    /** @default false */
    busy?: boolean;
    /** @default 'No results' */
    emptyText?: string;
}
export declare function SearchResults(props?: SearchResultsProps): VNode;

/**
 * Props for {@link SearchResultMessage} (src/components/community.js).
 */
export interface SearchResultMessageProps {
    author?: any;
    avatarColor?: any;
    text?: any;
    time?: any;
    channelName?: any;
    query?: any;
    onClick?: (...args: any[]) => any;
}
export declare function SearchResultMessage(props?: SearchResultMessageProps): VNode;

/**
 * Props for {@link SearchResultEntity} (src/components/community.js).
 */
export interface SearchResultEntityProps {
    /** @default 'channel' */
    kind?: 'channel' | 'user' | 'voice' | (string & {});
    name?: any;
    icon?: any;
    color?: any;
    subtitle?: any;
    onClick?: (...args: any[]) => any;
}
export declare function SearchResultEntity(props?: SearchResultEntityProps): VNode;

// ---- src/components/voice.js -----------------------------------------

/**
 * Props for {@link PttButton} (src/components/voice.js).
 */
export interface PttButtonProps {
    /** @default 'idle' */
    state?: 'idle' | 'live' | 'recording' | 'vad' | (string & {});
    /** @default 'ptt' */
    mode?: string;
    onHoldStart?: (...args: any[]) => any;
    onHoldEnd?: (...args: any[]) => any;
    onClick?: (...args: any[]) => any;
    /** @default 'Hold to talk' */
    label?: string;
}
export declare function PttButton(props?: PttButtonProps): VNode;

/**
 * Props for {@link VadMeter} (src/components/voice.js).
 */
export interface VadMeterProps {
    /** @default 0 */
    level?: number;
    /** @default 0.5 */
    threshold?: number;
    onThresholdChange?: (...args: any[]) => any;
}
export declare function VadMeter(props?: VadMeterProps): VNode;

/**
 * Props for {@link WebcamPreview} (src/components/voice.js).
 */
export interface WebcamPreviewProps {
    /** @default null */
    videoStream?: any;
    /** @default '640x480' */
    resolution?: string;
    /** @default 30 */
    fps?: number;
    /** @default true */
    enabled?: boolean;
    /** @default [] */
    resolutions?: any[];
    /** @default [] */
    fpsOptions?: any[];
    onResolutionChange?: (...args: any[]) => any;
    onFpsChange?: (...args: any[]) => any;
    onToggle?: (...args: any[]) => any;
}
export declare function WebcamPreview(props?: WebcamPreviewProps): VNode;

/**
 * Props for {@link VoiceSettingsModal} (src/components/voice.js).
 */
export interface VoiceSettingsModalProps {
    /** @default false */
    open?: boolean;
    /** @default 'ptt' */
    mode?: 'ptt' | 'vad' | (string & {});
    inputId?: any;
    outputId?: any;
    /** @default [] */
    inputDevices?: any[];
    /** @default [] */
    outputDevices?: any[];
    /** @default 0.5 */
    vadThreshold?: number;
    /** @default false */
    rnnoise?: boolean;
    /** @default false */
    autoGain?: boolean;
    /** @default false */
    forceTurn?: boolean;
    /** @default 64 */
    bitrate?: number;
    volume?: any;
    onChange?: (...args: any[]) => any;
    onSave?: (...args: any[]) => any;
    onCancel?: (...args: any[]) => any;
    onClose?: (...args: any[]) => any;
}
export declare function VoiceSettingsModal(props?: VoiceSettingsModalProps): VNode;

/**
 * Props for {@link AudioQueue} (src/components/voice.js).
 */
export interface AudioQueueProps {
    /** @default [] */
    segments?: any[];
    /** @default null */
    currentSegmentId?: any;
    /** @default false */
    paused?: boolean;
    onReplay?: (...args: any[]) => any;
    onSkip?: (...args: any[]) => any;
    onResume?: (...args: any[]) => any;
    onPause?: (...args: any[]) => any;
}
export declare function AudioQueue(props?: AudioQueueProps): VNode;

/**
 * Props for {@link VoiceControls} (src/components/voice.js).
 */
export interface VoiceControlsProps {
    /** @default false */
    muted?: boolean;
    /** @default false */
    deafened?: boolean;
    /** @default false */
    cameraOn?: boolean;
    /** @default false */
    screenShareOn?: boolean;
    /** @default false */
    collapsed?: boolean;
    onMic?: (...args: any[]) => any;
    onDeafen?: (...args: any[]) => any;
    onCamera?: (...args: any[]) => any;
    onScreenShare?: (...args: any[]) => any;
    onSettings?: (...args: any[]) => any;
    onLeave?: (...args: any[]) => any;
    onReturn?: (...args: any[]) => any;
}
export declare function VoiceControls(props?: VoiceControlsProps): VNode;

/**
 * Props for {@link playCompletionCue} (src/components/voice.js).
 */
export interface playCompletionCueProps {}

export declare function playCompletionCue(props?: playCompletionCueProps): VNode;

export declare function SettingsRowGroup(children?: any): VNode;

/**
 * Props for {@link SettingsSection} (src/components/voice.js).
 */
export interface SettingsSectionProps {
    title?: any;
    children?: any;
}
export declare function SettingsSection(props?: SettingsSectionProps): VNode;

/**
 * Props for {@link SettingsRow} (src/components/voice.js).
 */
export interface SettingsRowProps {
    /** @default 'blank' */
    icon?: string;
    label?: any;
    description?: any;
    action?: any;
    onClick?: (...args: any[]) => any;
}
export declare function SettingsRow(props?: SettingsRowProps): VNode;

/**
 * Props for {@link SettingsRowToggle} (src/components/voice.js).
 */
export interface SettingsRowToggleProps {
    /** @default 'blank' */
    icon?: string;
    label?: any;
    description?: any;
    /** @default false */
    checked?: boolean;
    onToggle?: (...args: any[]) => any;
}
export declare function SettingsRowToggle(props?: SettingsRowToggleProps): VNode;

/**
 * Props for {@link SettingsRowSelect} (src/components/voice.js).
 */
export interface SettingsRowSelectProps {
    /** @default 'blank' */
    icon?: string;
    label?: any;
    description?: any;
    value?: any;
    /** @default [] */
    options?: any[];
    onChange?: (...args: any[]) => any;
    ariaLabel?: any;
}
export declare function SettingsRowSelect(props?: SettingsRowSelectProps): VNode;

// ---- src/components/collab.js ----------------------------------------

/**
 * Props for {@link LiveCursorOverlay} (src/components/collab.js).
 */
export interface LiveCursorOverlayProps {
    /** @default [] */
    cursors?: any[];
}
export declare function LiveCursorOverlay(props?: LiveCursorOverlayProps): VNode;

/**
 * Props for {@link RemoteSelectionRings} (src/components/collab.js).
 */
export interface RemoteSelectionRingsProps {
    /** @default [] */
    selections?: any[];
}
export declare function RemoteSelectionRings(props?: RemoteSelectionRingsProps): VNode;

/**
 * Props for {@link RecentEditHighlightFlash} (src/components/collab.js).
 */
export interface RecentEditHighlightFlashProps {
    /** @default [] */
    edits?: any[];
}
export declare function RecentEditHighlightFlash(props?: RecentEditHighlightFlashProps): VNode;

/**
 * Props for {@link AgentPresenceChip} (src/components/collab.js).
 */
export interface AgentPresenceChipProps {
    userId?: any;
    label?: any;
    color?: any;
    /** @default 'active' */
    status?: string;
    key?: string | number;
}
export declare function AgentPresenceChip(props?: AgentPresenceChipProps): VNode;

/**
 * Props for {@link PresenceBar} (src/components/collab.js).
 */
export interface PresenceBarProps {
    /** @default [] */
    users?: any[];
}
export declare function PresenceBar(props?: PresenceBarProps): VNode;

// ---- src/components/theme-toggle.js ----------------------------------

/**
 * Props for {@link ThemeToggle} (src/components/theme-toggle.js).
 */
export interface ThemeToggleProps {
    /** @default false */
    compact?: boolean;
    onChange?: (...args: any[]) => any;
}
export declare function ThemeToggle(props?: ThemeToggleProps): VNode;

// ---- src/components/form-primitives.js -------------------------------

/**
 * Props for {@link Checkbox} (src/components/form-primitives.js).
 */
export interface CheckboxProps {
    checked?: any;
    indeterminate?: any;
    disabled?: any;
    label?: any;
    hint?: any;
    onChange?: (...args: any[]) => any;
    ariaLabel?: any;
    key?: string | number;
    name?: any;
    id?: any;
}
export declare function Checkbox(props?: CheckboxProps): VNode;

/**
 * Props for {@link Radio} (src/components/form-primitives.js).
 */
export interface RadioProps {
    name?: any;
    value?: any;
    checked?: any;
    disabled?: any;
    label?: any;
    hint?: any;
    onChange?: (...args: any[]) => any;
    ariaLabel?: any;
    key?: string | number;
    id?: any;
}
export declare function Radio(props?: RadioProps): VNode;

/**
 * Props for {@link RadioGroup} (src/components/form-primitives.js).
 */
export interface RadioGroupProps {
    legend?: any;
    name?: any;
    value?: any;
    /** @default [] */
    options?: any[];
    onChange?: (...args: any[]) => any;
    /** @default 'vertical' */
    orientation?: 'vertical' | 'horizontal' | (string & {});
    key?: string | number;
}
export declare function RadioGroup(props?: RadioGroupProps): VNode;

/**
 * Props for {@link Toggle} (src/components/form-primitives.js).
 */
export interface ToggleProps {
    checked?: any;
    disabled?: any;
    label?: any;
    hint?: any;
    onChange?: (...args: any[]) => any;
    ariaLabel?: any;
    /** @default 'switch' */
    kind?: string;
    key?: string | number;
    id?: any;
}
export declare function Toggle(props?: ToggleProps): VNode;

/**
 * Props for {@link Field} (src/components/form-primitives.js).
 */
export interface FieldProps {
    label?: any;
    hint?: any;
    error?: any;
    required?: any;
    /** @default '*' */
    requiredMarker?: string;
    htmlFor?: any;
    children?: any;
    key?: string | number;
}
export declare function Field(props?: FieldProps): VNode;

export declare function useFormValidation(schema?: any): VNode;

export declare function focusFirstInvalidField(errors?: any, order?: any, getEl?: any): VNode;

// ---- src/components/slider.js ----------------------------------------

/**
 * A single-value range slider (track + fill + thumb) built on a real, invisible native `<input type="range">` for keyboard/pointer/a11y semantics, matching the overlay approach voice/capture.js's VadMeter pioneered for its threshold handle.
 *
 * Props for {@link Slider} (src/components/slider.js).
 */
export interface SliderProps {
    /** @default 0 */
    value?: number;
    /** @default 0 */
    min?: number;
    /** @default 100 */
    max?: number;
    /** @default 1 */
    step?: number;
    /** called with (value:number, event) on input. */
    onChange?: (...args: any[]) => any;
    /** accessible name; also rendered visibly when given. */
    label?: string;
    disabled?: boolean;
    hint?: string;
    key?: any;
}
export declare function Slider(props?: SliderProps): VNode;

// ---- src/components/carousel.js --------------------------------------

/**
 * A scroll-snap content carousel with prev/next controls.
 *
 * Props for {@link Carousel} (src/components/carousel.js).
 */
export interface CarouselProps {
    /** @default [] */
    items?: any[];
    /** (item, index) => vnode. */
    renderItem?: (...args: any[]) => any;
    /** @default 'horizontal' */
    orientation?: 'horizontal' | 'vertical';
    /** accessible name for the region. @default 'carousel' */
    label?: string;
    key?: any;
}
export declare function Carousel(props?: CarouselProps): VNode;

// ---- src/components/interaction-primitives.js ------------------------

export declare function useDraggable(el?: any, arg1?: any, kind?: any, onDragStart?: any, arg4?: any): VNode;

export declare function useDropTarget(el?: any, arg1?: any, onDrop?: any, arg3?: any): VNode;

export declare function useNumberScrub(el?: any, arg1?: any, onChange?: any, step?: any, threshold?: any): VNode;

export declare function usePointerDrag(el?: any, arg1?: any, onMove?: any, onEnd?: any, button?: any): VNode;

/**
 * Props for {@link Reorderable} (src/components/interaction-primitives.js).
 */
export interface ReorderableProps {
    /** @default [] */
    items?: any[];
    getKey?: any;
    renderItem?: any;
    onReorder?: (...args: any[]) => any;
    /** @default 'vertical' */
    axis?: string;
    /** @default 'reorder' */
    kind?: string;
}
export declare function Reorderable(props?: ReorderableProps): VNode;

export declare function useKeyboardShortcut(map?: any, arg1?: any, enabled?: any): VNode;

export declare function formatShortcut(combo?: any): VNode;

/**
 * Props for {@link ShortcutHint} (src/components/interaction-primitives.js).
 */
export interface ShortcutHintProps {
    combo?: any;
    /** @default 'kbd' */
    kind?: string;
}
export declare function ShortcutHint(props?: ShortcutHintProps): VNode;

/**
 * Props for {@link ShortcutList} (src/components/interaction-primitives.js).
 */
export interface ShortcutListProps {
    /** @default [] */
    shortcuts?: any[];
}
export declare function ShortcutList(props?: ShortcutListProps): VNode;

/**
 * Props for {@link useKeyboardShortcutHelp} (src/components/interaction-primitives.js).
 */
export interface useKeyboardShortcutHelpProps {}

export declare function useKeyboardShortcutHelp(props?: useKeyboardShortcutHelpProps): VNode;

/**
 * Props for {@link ShortcutHelpDialog} (src/components/interaction-primitives.js).
 */
export interface ShortcutHelpDialogProps {
    /** @default false */
    open?: boolean;
    onClose?: (...args: any[]) => any;
    registry?: any;
}
export declare function ShortcutHelpDialog(props?: ShortcutHelpDialogProps): VNode;

/**
 * Props for {@link isMobileNow} (src/components/interaction-primitives.js).
 */
export interface isMobileNowProps {}

export declare function isMobileNow(props?: isMobileNowProps): VNode;

export declare function onMobileChange(cb?: any): VNode;

// ---- src/components/editor-primitives.js -----------------------------

/**
 * Props for {@link Toolbar} (src/components/editor-primitives.js).
 */
export interface ToolbarProps {
    /** @default [] */
    leading?: any[];
    /** @default [] */
    trailing?: any[];
    /** @default false */
    dense?: boolean;
    children?: any;
}
export declare function Toolbar(props?: ToolbarProps): VNode;

export declare function ToolbarRow(arg0?: any): VNode;

/**
 * Props for {@link Tabs} (src/components/editor-primitives.js).
 */
export interface TabsProps {
    /** @default [] */
    items?: any[];
    active?: any;
    onChange?: (...args: any[]) => any;
    children?: any;
    'aria-label'?: any;
    onClose?: (...args: any[]) => any;
    /** @default false */
    scroll?: boolean;
}
export declare function Tabs(props?: TabsProps): VNode;

/**
 * Props for {@link TreeView} (src/components/editor-primitives.js).
 */
export interface TreeViewProps {
    children?: any;
}
export declare function TreeView(props?: TreeViewProps): VNode;

/**
 * Props for {@link TreeItem} (src/components/editor-primitives.js).
 */
export interface TreeItemProps {
    label?: any;
    glyph?: any;
    tag?: any;
    /** @default 0 */
    depth?: number;
    /** @default false */
    selected?: boolean;
    /** @default false */
    expanded?: boolean;
    onSelect?: (...args: any[]) => any;
    onToggle?: (...args: any[]) => any;
    children?: any;
    hasChildren?: any;
}
export declare function TreeItem(props?: TreeItemProps): VNode;

/**
 * Props for {@link PropertyGrid} (src/components/editor-primitives.js).
 */
export interface PropertyGridProps {
    children?: any;
}
export declare function PropertyGrid(props?: PropertyGridProps): VNode;

/**
 * Props for {@link PropertyField} (src/components/editor-primitives.js).
 */
export interface PropertyFieldProps {
    label?: any;
    hint?: any;
    /** @default false */
    inline?: boolean;
    children?: any;
}
export declare function PropertyField(props?: PropertyFieldProps): VNode;

/**
 * Props for {@link PropertyGridRow} (src/components/editor-primitives.js).
 */
export interface PropertyGridRowProps {
    children?: any;
    key?: string | number;
}
export declare function PropertyGridRow(props?: PropertyGridRowProps): VNode;

/**
 * Props for {@link InlineEditableField} (src/components/editor-primitives.js).
 */
export interface InlineEditableFieldProps {
    /** @default '' */
    value?: string;
    placeholder?: any;
    onInput?: (...args: any[]) => any;
    onChange?: (...args: any[]) => any;
    error?: any;
    /** @default false */
    multiline?: boolean;
    /** @default 3 */
    rows?: number;
    ariaLabel?: any;
    /** @default false */
    disabled?: boolean;
}
export declare function InlineEditableField(props?: InlineEditableFieldProps): VNode;

/**
 * Props for {@link Dock} (src/components/editor-primitives.js).
 */
export interface DockProps {
    top?: any;
    left?: any;
    right?: any;
    bottom?: any;
    center?: any;
}
export declare function Dock(props?: DockProps): VNode;

/**
 * Props for {@link IconButtonGroup} (src/components/editor-primitives.js).
 */
export interface IconButtonGroupProps {
    /** @default [] */
    items?: any[];
    value?: any;
    onChange?: (...args: any[]) => any;
    /** @default false */
    dense?: boolean;
}
export declare function IconButtonGroup(props?: IconButtonGroupProps): VNode;

/**
 * Props for {@link ResizeHandle} (src/components/editor-primitives.js).
 */
export interface ResizeHandleProps {
    /** @default 'horizontal' */
    axis?: string;
    onResize?: (...args: any[]) => any;
    ariaLabel?: any;
}
export declare function ResizeHandle(props?: ResizeHandleProps): VNode;

/**
 * Props for {@link SplitPanel} (src/components/editor-primitives.js).
 */
export interface SplitPanelProps {
    /** @default 'horizontal' */
    orientation?: string;
    /** @default '50%' */
    initial?: string;
    /** @default 80 */
    min?: number;
    /** @default Infinity */
    max?: number;
    children?: any;
}
export declare function SplitPanel(props?: SplitPanelProps): VNode;

/**
 * Props for {@link ContextMenu} (src/components/editor-primitives.js).
 */
export interface ContextMenuProps {
    /** @default [] */
    items?: any[];
    /** @default { x: 0, y: 0 } */
    anchor?: Record<string, any>;
    onClose?: (...args: any[]) => any;
}
export declare function ContextMenu(props?: ContextMenuProps): VNode;

export declare function useContextMenu(targetEl?: any, items?: any, openCb?: any): VNode;

/**
 * Props for {@link Drawer} (src/components/editor-primitives.js).
 */
export interface DrawerProps {
    /** @default 'left' */
    side?: string;
    /** @default false */
    open?: boolean;
    onClose?: (...args: any[]) => any;
    children?: any;
    ariaLabel?: any;
}
export declare function Drawer(props?: DrawerProps): VNode;

/**
 * Props for {@link Dialog} (src/components/editor-primitives.js).
 */
export interface DialogProps {
    title?: any;
    /** @default false */
    open?: boolean;
    onClose?: (...args: any[]) => any;
    children?: any;
    /** @default [] */
    actions?: any[];
    /** @default false */
    dismissible?: boolean;
    ariaLabel?: any;
}
export declare function Dialog(props?: DialogProps): VNode;

/**
 * Props for {@link FocusTrap} (src/components/editor-primitives.js).
 */
export interface FocusTrapProps {
    children?: any;
}
export declare function FocusTrap(props?: FocusTrapProps): VNode;

/**
 * Props for {@link Toast} (src/components/editor-primitives.js).
 */
export interface ToastProps {
    message?: any;
    /** @default 'info' */
    kind?: 'info' | 'error' | (string & {});
    /** @default 3000 */
    duration?: number;
    onClose?: (...args: any[]) => any;
}
export declare function Toast(props?: ToastProps): VNode;

/**
 * Props for {@link toast} (src/components/editor-primitives.js).
 */
export interface toastProps {
    message?: any;
    /** @default 'info' */
    kind?: 'info' | 'error' | (string & {});
    /** @default 3000 */
    duration?: number;
    actionLabel?: any;
    onAction?: (...args: any[]) => any;
}
export declare function toast(props?: toastProps): VNode;

/**
 * Props for {@link Pager} (src/components/editor-primitives.js).
 */
export interface PagerProps {
    /** @default 1 */
    page?: number;
    /** @default 1 */
    pageCount?: number;
    onPage?: (...args: any[]) => any;
    total?: any;
    /** @default 'items' */
    itemLabel?: string;
    /** @default false */
    numbered?: boolean;
    /** @default 1 */
    siblingCount?: number;
}
export declare function Pager(props?: PagerProps): VNode;

/**
 * Props for {@link JsonViewer} (src/components/editor-primitives.js).
 */
export interface JsonViewerProps {
    value?: any;
    /** @default 'no data' */
    emptyText?: string;
    maxHeight?: any;
    /** @default 'plain' */
    mode?: 'plain' | 'highlight' | 'tree' | (string & {});
    /** @default false */
    copyable?: boolean;
    /** @default 2 */
    treeDepth?: number;
}
export declare function JsonViewer(props?: JsonViewerProps): VNode;

/**
 * Props for {@link Grid} (src/components/editor-primitives.js).
 */
export interface GridProps {
    gap?: any;
    justify?: any;
    align?: any;
    children?: any;
    key?: string | number;
}
export declare function Grid(props?: GridProps): VNode;

/**
 * Props for {@link GridItem} (src/components/editor-primitives.js).
 */
export interface GridItemProps {
    xs?: any;
    sm?: any;
    md?: any;
    lg?: any;
    xl?: any;
    children?: any;
    key?: string | number;
}
export declare function GridItem(props?: GridItemProps): VNode;

/**
 * Props for {@link Collapse} (src/components/editor-primitives.js).
 */
export interface CollapseProps {
    title?: any;
    /** @default false */
    expanded?: boolean;
    onToggle?: (...args: any[]) => any;
    children?: any;
    key?: string | number;
}
export declare function Collapse(props?: CollapseProps): VNode;

/**
 * Props for {@link CollapseGroup} (src/components/editor-primitives.js).
 */
export interface CollapseGroupProps {
    /** @default [] */
    items?: any[];
    openId?: any;
    onOpenChange?: (...args: any[]) => any;
    /** @default false */
    accordion?: boolean;
    key?: string | number;
}
export declare function CollapseGroup(props?: CollapseGroupProps): VNode;

/**
 * Props for {@link Divider} (src/components/editor-primitives.js).
 */
export interface DividerProps {
    label?: any;
    /** @default false */
    vertical?: boolean;
    key?: string | number;
}
export declare function Divider(props?: DividerProps): VNode;

/**
 * Props for {@link AspectRatio} (src/components/editor-primitives.js).
 */
export interface AspectRatioProps {
    ratio?: any;
    children?: any;
    key?: string | number;
}
export declare function AspectRatio(props?: AspectRatioProps): VNode;

export declare function useMediaQuery(query?: any): VNode;

export declare const BP_SM: number;

export declare const BP_MD: number;

export declare const BP_LG: number;

export declare const BP_XL: number;

/**
 * Props for {@link InfoRow} (src/components/editor-primitives.js).
 */
export interface InfoRowProps {
    label?: any;
    value?: any;
    key?: string | number;
}
export declare function InfoRow(props?: InfoRowProps): VNode;

/**
 * Props for {@link InfoSection} (src/components/editor-primitives.js).
 */
export interface InfoSectionProps {
    title?: any;
    rows?: any;
    key?: string | number;
}
export declare function InfoSection(props?: InfoSectionProps): VNode;

/**
 * Props for {@link DiagnosticsPanel} (src/components/editor-primitives.js).
 */
export interface DiagnosticsPanelProps {
    /** @default 'Diagnostics' */
    title?: string;
    /** @default [] */
    sections?: any[];
    onRefresh?: (...args: any[]) => any;
    /** @default false */
    refreshing?: boolean;
    key?: string | number;
}
export declare function DiagnosticsPanel(props?: DiagnosticsPanelProps): VNode;

/**
 * Props for {@link BatchProgressLabel} (src/components/editor-primitives.js).
 */
export interface BatchProgressLabelProps {
    /** @default 'Processing' */
    label?: string;
    /** @default 0 */
    done?: number;
    /** @default 0 */
    total?: number;
    key?: string | number;
}
export declare function BatchProgressLabel(props?: BatchProgressLabelProps): VNode;

/**
 * Props for {@link formatBatchOutcome} (src/components/editor-primitives.js).
 */
export interface formatBatchOutcomeProps {
    /** @default 0 */
    succeeded?: number;
    /** @default 0 */
    total?: number;
    /** @default [] */
    failedNames?: any[];
    /** @default 3 */
    maxNames?: number;
}
export declare function formatBatchOutcome(props?: formatBatchOutcomeProps): VNode;

export declare function runBatchSequential(items?: any, fn?: any, onProgress?: any): VNode;

// ---- src/components/overlay-primitives.js ----------------------------

/**
 * Props for {@link Tooltip} (src/components/overlay-primitives.js).
 */
export interface TooltipProps {
    children?: any;
    label?: any;
    /** @default 'top' */
    placement?: string;
    /** @default 350 */
    delay?: number;
    /** @default 'default' */
    kind?: string;
}
export declare function Tooltip(props?: TooltipProps): VNode;

/**
 * Props for {@link Popover} (src/components/overlay-primitives.js).
 */
export interface PopoverProps {
    open?: any;
    anchorEl?: any;
    onClose?: (...args: any[]) => any;
    /** @default 'bottom-start' */
    placement?: string;
    children?: any;
    ariaLabel?: any;
}
export declare function Popover(props?: PopoverProps): VNode;

/**
 * Props for {@link Dropdown} (src/components/overlay-primitives.js).
 */
export interface DropdownProps {
    trigger?: any;
    /** @default [] */
    items?: any[];
    onSelect?: (...args: any[]) => any;
    /** @default 'bottom-start' */
    placement?: string;
    ariaLabel?: any;
}
export declare function Dropdown(props?: DropdownProps): VNode;

export declare function useLongPress(targetEl?: any, callback?: any, arg2?: any): VNode;

export declare function useFloating(anchorEl?: any, contentEl?: any, arg2?: any, offset?: any): VNode;

/**
 * Props for {@link CommandPalette} (src/components/overlay-primitives.js).
 */
export interface CommandPaletteProps {
    open?: any;
    /** @default [] */
    items?: any[];
    onSelect?: (...args: any[]) => any;
    onClose?: (...args: any[]) => any;
}
export declare function CommandPalette(props?: CommandPaletteProps): VNode;

/**
 * Props for {@link MentionAutocomplete} (src/components/overlay-primitives.js).
 */
export interface MentionAutocompleteProps {
    open?: any;
    /** @default 'user' */
    kind?: 'user' | 'channel' | 'role' | 'emoji' | (string & {});
    /** @default [] */
    matches?: any[];
    /** @default 0 */
    selection?: number;
    onSelect?: (...args: any[]) => any;
    onHover?: (...args: any[]) => any;
}
export declare function MentionAutocomplete(props?: MentionAutocompleteProps): VNode;

/**
 * Props for {@link EmojiPicker} (src/components/overlay-primitives.js).
 */
export interface EmojiPickerProps {
    open?: any;
    /** @default 0 */
    anchorX?: number;
    /** @default 0 */
    anchorY?: number;
    onSelect?: (...args: any[]) => any;
    onClose?: (...args: any[]) => any;
    /** @default '' */
    query?: string;
}
export declare function EmojiPicker(props?: EmojiPickerProps): VNode;

/**
 * Props for {@link BootOverlay} (src/components/overlay-primitives.js).
 */
export interface BootOverlayProps {
    /** @default 0 */
    progress?: number;
    /** @default '' */
    phase?: string;
    /** @default false */
    errored?: boolean;
    /** @default false */
    visible?: boolean;
}
export declare function BootOverlay(props?: BootOverlayProps): VNode;

/**
 * Props for {@link SettingsPopover} (src/components/overlay-primitives.js).
 */
export interface SettingsPopoverProps {
    /** @default 'Settings' */
    title?: string;
    open?: any;
    /** @default 0 */
    anchorX?: number;
    /** @default 0 */
    anchorY?: number;
    /** @default [] */
    sections?: any[];
    onClose?: (...args: any[]) => any;
}
export declare function SettingsPopover(props?: SettingsPopoverProps): VNode;

/**
 * Props for {@link SettingsShell} (src/components/overlay-primitives.js).
 */
export interface SettingsShellProps {
    /** @default 'Settings' */
    title?: string;
    open?: any;
    /** @default [] */
    groups?: any[];
    activeId?: any;
    onSelect?: (...args: any[]) => any;
    onClose?: (...args: any[]) => any;
    children?: any;
}
export declare function SettingsShell(props?: SettingsShellProps): VNode;

/**
 * Props for {@link AuthModal} (src/components/overlay-primitives.js).
 */
export interface AuthModalProps {
    /** @default 'extension' */
    mode?: 'extension' | 'generate' | 'import' | (string & {});
    /** @default '' */
    error?: string;
    /** @default false */
    busy?: boolean;
    /** @default false */
    open?: boolean;
    onModeChange?: (...args: any[]) => any;
    onConnectExtension?: (...args: any[]) => any;
    onGenerate?: (...args: any[]) => any;
    onImport?: (...args: any[]) => any;
    onClose?: (...args: any[]) => any;
}
export declare function AuthModal(props?: AuthModalProps): VNode;

/**
 * Props for {@link VideoLightbox} (src/components/overlay-primitives.js).
 */
export interface VideoLightboxProps {
    src?: any;
    /** @default '' */
    label?: string;
    /** @default false */
    open?: boolean;
    onClose?: (...args: any[]) => any;
}
export declare function VideoLightbox(props?: VideoLightboxProps): VNode;

/**
 * Props for {@link ImageLightbox} (src/components/overlay-primitives.js).
 */
export interface ImageLightboxProps {
    src?: any;
    /** @default '' */
    alt?: string;
    /** @default '' */
    label?: string;
    /** @default false */
    open?: boolean;
    onClose?: (...args: any[]) => any;
}
export declare function ImageLightbox(props?: ImageLightboxProps): VNode;

/**
 * Props for {@link PermissionMenu} (src/components/overlay-primitives.js).
 */
export interface PermissionMenuProps {
    trigger?: any;
    /** @default [] */
    categories?: any[];
    /** @default [] */
    approved?: any[];
    onToggle?: (...args: any[]) => any;
    onToggleAll?: (...args: any[]) => any;
    /** @default 'bottom-start' */
    placement?: string;
    /** @default 'Permissions' */
    ariaLabel?: string;
}
export declare function PermissionMenu(props?: PermissionMenuProps): VNode;

/**
 * Props for {@link ApprovalPrompt} (src/components/overlay-primitives.js).
 */
export interface ApprovalPromptProps {
    toolName?: any;
    categoryLabel?: any;
    argsPreview?: any;
    onDecision?: (...args: any[]) => any;
    /** @default true */
    autoFocusNote?: boolean;
}
export declare function ApprovalPrompt(props?: ApprovalPromptProps): VNode;

export declare function withBusy(btn?: any, fn?: any, busyLabel?: any): VNode;

/**
 * Props for {@link MenuButton} (src/components/overlay-primitives.js).
 */
export interface MenuButtonProps {
    trigger?: any;
    /** @default [] */
    items?: any[];
    selected?: any;
    onSelect?: (...args: any[]) => any;
    onRetry?: (...args: any[]) => any;
    /** @default 'bottom-start' */
    placement?: string;
    /** @default 'Menu' */
    ariaLabel?: string;
    /** @default 'No options available' */
    emptyText?: string;
}
export declare function MenuButton(props?: MenuButtonProps): VNode;

/**
 * Props for {@link HoverCard} (src/components/overlay-primitives.js).
 */
export interface HoverCardProps {
    trigger?: any;
    content?: any;
    open?: any;
    onOpenChange?: (...args: any[]) => any;
    /** @default 700 */
    openDelay?: number;
    /** @default 300 */
    closeDelay?: number;
    /** @default 'top' */
    placement?: string;
    ariaLabel?: any;
}
export declare function HoverCard(props?: HoverCardProps): VNode;

/**
 * Props for {@link Menubar} (src/components/overlay-primitives.js).
 */
export interface MenubarProps {
    /** @default [] */
    menus?: any[];
    /** @default null */
    openIndex?: any;
    onOpenIndexChange?: (...args: any[]) => any;
    /** @default 'Menu bar' */
    ariaLabel?: string;
}
export declare function Menubar(props?: MenubarProps): VNode;

// ---- src/components/freddie.js ---------------------------------------

export declare const FREDDIE_PAGES: Record<string, any>;

export declare const home: (...args: any[]) => VNode;

export declare const chat: (...args: any[]) => VNode;

export declare const voice: (...args: any[]) => VNode;

export declare const sessions: (...args: any[]) => VNode;

export declare const projects: (...args: any[]) => VNode;

export declare const agents: any;

export declare const analytics: (...args: any[]) => VNode;

export declare const models: (...args: any[]) => VNode;

export declare const cron: (...args: any[]) => VNode;

export declare const skills: (...args: any[]) => VNode;

export declare const plugins: (...args: any[]) => VNode;

export declare const config: (...args: any[]) => VNode;

export declare const env: (...args: any[]) => VNode;

export declare const tools: (...args: any[]) => VNode;

export declare const batch: (...args: any[]) => VNode;

export declare const gateway: (...args: any[]) => VNode;

export declare const chains: (...args: any[]) => VNode;

export declare const machines: (...args: any[]) => VNode;

export declare const health: (...args: any[]) => VNode;

export declare const logs: (...args: any[]) => VNode;

export declare const debug: (...args: any[]) => VNode;

export declare const git: (...args: any[]) => VNode;

export declare function skillLabel(input?: any): VNode;

/**
 * Props for {@link getRecentPaths} (src/components/freddie.js).
 */
export interface getRecentPathsProps {}

export declare function getRecentPaths(props?: getRecentPathsProps): VNode;

export declare function saveRecentPath(path?: any): VNode;

export declare function renderChatMessages(messages?: any, opts?: any): VNode;

export declare function buildNavPaletteActions(routes?: any, arg1?: any): VNode;

/**
 * Props for {@link renderDashboardSide} (src/components/freddie.js).
 */
export interface renderDashboardSideProps {
    routeGroups?: any;
    active?: any;
    onNavigate?: (...args: any[]) => any;
}
export declare function renderDashboardSide(props?: renderDashboardSideProps): VNode;

/**
 * Props for {@link renderDashboardShell} (src/components/freddie.js).
 */
export interface renderDashboardShellProps {
    active?: any;
    body?: any;
    routeGroups?: any;
    onNavigate?: (...args: any[]) => any;
    /** @default { ok: 0, bad: 0, total: 0, error: false } */
    sampler?: Record<string, any>;
    /** @default false */
    degraded?: boolean;
    /** @default null */
    error?: any;
    /** @default 'default' */
    project?: string;
    /** @default '—' */
    toolsCount?: string;
    /** @default '—' */
    skillsCount?: string;
    /** @default '' */
    ts?: string;
    /** @default 'freddie' */
    brand?: string;
    /** @default false */
    fullBleed?: boolean;
}
export declare function renderDashboardShell(props?: renderDashboardShellProps): VNode;

// ---- src/components/freddie/runtime.js -------------------------------

export declare function makePage(setup?: any, arg1?: any): VNode;

export declare function api(path?: any, opts?: any): VNode;

export declare function loadingState(label?: any): VNode;

export declare function errorState(err?: any, onRetry?: any): VNode;

export declare function emptyState(text?: any, glyph?: any): VNode;

export declare function refreshError(err?: any): VNode;

// ---- src/components/dashboard-shell.js -------------------------------

/**
 * Props for {@link openCommandPalette} (src/components/dashboard-shell.js).
 */
export interface openCommandPaletteProps {
    /** @default [] */
    actions?: any[];
    onSelect?: (...args: any[]) => any;
}
export declare function openCommandPalette(props?: openCommandPaletteProps): VNode;

/**
 * Props for {@link closeCommandPalette} (src/components/dashboard-shell.js).
 */
export interface closeCommandPaletteProps {}

export declare function closeCommandPalette(props?: closeCommandPaletteProps): VNode;

// ---- src/community-app.js --------------------------------------------

export declare function mountCommunityApp(root?: any, adapter?: any): VNode;

// ---- src/components/calendar.js --------------------------------------

/**
 * A month date-grid. Fully controlled: `selected`/`month` are owned by the caller, this component holds no selection state of its own.
 *
 * Props for {@link Calendar} (src/components/calendar.js).
 */
export interface CalendarProps {
    /** @default 'single' */
    mode?: 'single' | 'range';
    /** a Date in single mode, `{from,to}` in range mode. */
    selected?: any;
    /** single mode: `onSelect(date)`. range mode: `onSelect({from,to})`. */
    onSelect?: (...args: any[]) => any;
    /** the currently-displayed month (any date within it). */
    month?: any;
    /** `onMonthChange(newMonthDate)`, fired by the prev/next nav. */
    onMonthChange?: (...args: any[]) => any;
    minDate?: any;
    maxDate?: any;
    /** BCP-47 locale for weekday/month labels; defaults to the SDK's active locale. @default getLocale() */
    locale?: string;
}
export declare function Calendar(props?: CalendarProps): VNode;

/**
 * Trigger button that opens a Popover hosting a single-mode Calendar.
 *
 * Props for {@link DatePicker} (src/components/calendar.js).
 */
export interface DatePickerProps {
    /** the selected date. */
    value?: any;
    /** `onChange(date)`, fired on day select. */
    onChange?: (...args: any[]) => any;
    /** popover open state, owned by the caller. @default false */
    open?: boolean;
    /** `onOpenChange(nextOpen)`, fired by the trigger click and on close (Escape/outside-click/selection). */
    onOpenChange?: (...args: any[]) => any;
    /** displayed month; defaults to `value` or today when omitted. */
    month?: any;
    /** `onMonthChange(newMonthDate)`, fired by the prev/next nav. */
    onMonthChange?: (...args: any[]) => any;
    /** trigger label when `value` is unset. @default 'Select date' */
    placeholder?: string;
    minDate?: any;
    maxDate?: any;
    /** stable id distinguishing multiple pickers' anchor lookup; set explicitly when rendering more than one DatePicker on a page. @default 'dp' */
    name?: string;
    /** @default getLocale() */
    locale?: string;
}
export declare function DatePicker(props?: DatePickerProps): VNode;

/**
 * Trigger button that opens a Popover hosting a range-mode Calendar.
 *
 * Props for {@link DateRangePicker} (src/components/calendar.js).
 */
export interface DateRangePickerProps {
    value?: { from: any; to: any };
    /** `onChange({from,to})`, fired on each click. */
    onChange?: (...args: any[]) => any;
    /** popover open state, owned by the caller. @default false */
    open?: boolean;
    /** `onOpenChange(nextOpen)`; also fired with `false` once both ends of the range are picked. */
    onOpenChange?: (...args: any[]) => any;
    month?: any;
    onMonthChange?: (...args: any[]) => any;
    /** @default 'Select dates' */
    placeholder?: string;
    minDate?: any;
    maxDate?: any;
    /** stable id distinguishing multiple pickers' anchor lookup. @default 'drp' */
    name?: string;
    /** @default getLocale() */
    locale?: string;
}
export declare function DateRangePicker(props?: DateRangePickerProps): VNode;

export declare const WEEKDAY_LABELS: any[];

export declare function buildMonthGrid(monthDate?: any): VNode;

export declare function formatDate(d?: any, locale?: any): VNode;

export declare function monthLabel(monthDate?: any, locale?: any): VNode;

// ---- drift warnings from the shared extraction -------------------
// ! 'createDamageNumbers' exported by components.js but no definition found in src/components/game-editor-kit.js

