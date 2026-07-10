# Component API Reference

anentrypoint-design v0.0.127 — Standardized component prop naming and API surface.

## Overview

This document describes all exported components, their prop signatures, and standardized naming conventions. All components are pure factories that return webjsx vnodes.

The `freddie.js` re-exports (`FREDDIE_PAGES`, `home`/`chat`/`voice`/`sessions`/`projects`/`agents`/`analytics`/`models`/`cron`/`skills`/`config`/`env`/`tools`/`batch`/`gateway`/`chains`, `skillLabel`, `getRecentPaths`, `saveRecentPath`, `renderChatMessages`) are the kit's own docs/marketing demo-site page builders, not general-purpose components — not intended for external composition.

### Prop Naming Standards

**Boolean props** follow one of two patterns:
- **State props** (indicate component state): use `state` enum pattern or explicit state prop
  - Examples: `state: 'active' | 'default'`, `expanded: true | false`, `typing: true | false`
- **Semantic boolean props**: use `is*` prefix for clarity
  - Examples: `isLoading`, `isOpen`, `isDisabled`

**Callback props** always use `on*` camelCase:
- `onClick`, `onInput`, `onSubmit`, `onChange`, etc.

**Variant/mode props** use enum values, never multiple boolean flags:
- Old: `primary={true}`, `ghost={true}` [ ]
- New: `variant: 'primary' | 'ghost' | 'default'` [x]

**Multi-select contract** (shared by FileGrid and SessionDashboard):
- `selectable` (bool), `selected` (Set keyed by entity id/path),
  `onToggleSelect(item, { range })`, `onSelectAll()`, `onClearSelection()`
- FileGrid also accepts `marked`/`onMark` as aliases of `selected`/`onToggleSelect`.

---

## Workspace Surfaces

The flagship application surfaces (an agent-chat product is composed from these).

### WorkspaceShell
A Claude-Desktop-style three-(or four-)column app shell.

```js
WorkspaceShell({
  rail,                  // left nav vnode (usually WorkspaceRail())
  sessions,              // OPTIONAL second column (ConversationList); null hides it
  main,                  // primary content column (vnode or array)
  pane,                  // OPTIONAL right context pane; null hides it
  crumb,                 // optional thin top chrome bar over the content column
  status,                // optional footer (Status())
  narrow,                // caller's isNarrow() - drives drawer auto-close behavior
  railCollapsed, paneCollapsed,  // initial collapse (persisted state wins)
  stableFrame,           // keep the pane grid TRACK at width 0 when this tab has
                         // no pane, so the column count never re-flows on tab switch
  mainFlush,             // remove .ws-main's content gutter (chat self-gutters)
  railLabel, paneLabel,  // aria labels
})
```
Responsive: the pane track yields at <=1480px (right overlay drawer via
`.ws-pane-open`), the sessions track at <=1100px (left drawer via
`.ws-sessions-open`), and below 900px the rail drops to a fixed icon strip with
a single content column. The crumb bar hosts the drawer toggles.

### WorkspaceRail
`WorkspaceRail({ brand, action: {label, icon, onClick}, items: [{key, label, icon, active, count, onClick}], footer })`

### ConversationList
The persistent conversation rail ("Chats" column).

`ConversationList({ sessions: [{sid, title, project, agent, time, running, unread, rail}], selected, groups: [{label, sids}], search: {value, placeholder, onInput}, caption, onSelect(session), onNew(), newLabel, emptyText, loading, loadingText, error })`

Loading renders shape-matched skeleton rows. The body is one stable keyed
wrapper across loading/empty/populated states (webjsx applyDiff requirement).

### SessionDashboard
The live multi-session command center.

`SessionDashboard({ sessions, onStop, onOpen, onView, onStopAll, onStopSelected, onArmStopAll, onArmStopSelected, confirmingStopAll, confirmingStopSelected, sort: {value, onChange}, filter: {value, placeholder, onInput}, errorsOnly, onErrorsOnly, selectable, selected: Set, onToggleSelect, onSelectAll, onClearSelection, activeSid, streamState: 'connected'|'connecting'|'lost'|'offline', emptyText, emptyAction: {label, onClick}, offline })`

Session shape: `{ sid, realSid, title, agent, model, cwd, elapsedMs, counter, lastActivity, currentTool, status: 'running'|'stale'|'error', stopping, external, isNew, cost, tokens }`.
Status-sorted renders bucketed groups (Errored/Running/Idle/External); other sorts render flat.

### SessionCard
One running session. Same `session` shape as above; `external` suppresses stop and renders a read-only card.

### ContextPane
`ContextPane({ agent, model, cwd, toolCount, usage: {inputTokens, outputTokens, costUsd, turns, durationMs}, session: {turns, cost}, onSetCwd })`
The change-cwd affordance rides ON the working-dir row; all-zero session totals hide the conversation block.

### AgentChat
The reusable multi-agent chat surface (pure component, host wires transport).

```js
AgentChat({
  agents, selectedAgent, models, selectedModel, modelsLoading,
  messages,              // [{id, role, content, time, parts}] - parts may be
                         // strings or {kind:'tool'|'md'|...} structured parts
  busy, draft, status, banners,
  cwd, cwdEditing, cwdDraft, cwdError, cwdChecking,
  agentName, placeholder, canSend,
  suggestions, onSuggestionClick,
  onSelectAgent, onSelectModel, onSend, onStop, onNewChat, onInput,
  onCwdEdit, onCwdSave, onCwdCancel, onCwdClear, onCwdDraft,
  onCopyMessage, onRetryMessage, onEditMessage, confirmEdit, onArmEdit,
  avatar, composerContext,   // {bits: [string | {text|label, title, onClick}]}
  followups, onFollowupClick,
  installHint, exportActions,
  onPasteFiles(files), onDropFiles(files),   // NOTE the names - not onPasteImage
  shownMessages, onShowEarlier,              // windowed thread (default cap 100)
})
```

### FileGrid (selection + density props)
Beyond the base listing props:

`FileGrid({ ..., selectable, selected: Set (keyed by path), onToggleSelect(f, {range}), onSelectAll(keys), onClearSelection, density: 'list'|'compact'|'thumb', onDensity, thumbUrl(f) })`
`marked`/`onMark` are accepted aliases for `selected`/`onToggleSelect`.
`loading` with rows present dims the grid in place (`is-refreshing`); skeleton renders only on a cold load.
FileRow row actions: `onAction(action, file)` fires with `action` in `['download','rename','move','delete']`; `'move'` opens the host's bulk-move flow (agentgui seeds a single-path selection into its existing multi-select move dialog).

### BulkBar
`BulkBar({ count, noun, nounPlural, actions: [{label, danger, onClick}], onClear, busy })` - pluralizes `-y` nouns.

### FileToolbar / RootsPicker / DropZone
`FileToolbar({ left, right })`; `RootsPicker({ roots: [{id, label}], selected, onSelect, label })`;
`DropZone({ children, dragover, onDrop(files), onDragOver, onDragLeave, label, onPick })` - with children it is a
passive wrapper whose dashed affordance overlays ONLY during a drag; without children it is an explicit picker block.

### FilePreviewPane
Inline (non-modal) split-view file preview; the modal FileViewer remains the <900px fallback.

---

## Shell Components

### Brand
Creates a branded heading with optional leaf text.

```js
Brand({ name = '247420', leaf })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | string | `'247420'` | Brand name |
| `leaf` | string | - | Optional suffix (appears after slash) |

**Example:**
```js
Brand({ name: 'acme', leaf: 'dashboard' })
// -> "acme / dashboard"
```

### Chip
Inline colored badge/label.

```js
Chip({ tone = '', children })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tone` | string | `''` | CSS tone class (e.g., `'live'`, `'idle'`) |
| `children` | ReactNode | - | Chip label/content |

**Example:**
```js
Chip({ tone: 'live', children: 'online' })
```

### Pill
Plain non-interactive label chip — tag-like annotation (a phase name, an id, a subsystem tag). Distinct from Chip (status-tone indicator), Badge (count/variant marker), and FilterPills (interactive toggle-group): Pill renders no button and carries no pressed/active state.

```js
Pill({ tone = '', children })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tone` | string | `''` | `''` \| `'accent'` \| `'muted'` |
| `children` | ReactNode | - | Pill label/content |

**Example:**
```js
Pill({ tone: 'accent', children: 'PLAN' })
```

### Btn (Button)
Flexible button component with support for multiple variants.

```js
Btn({ href = '#', variant = 'default', children, onClick, 'aria-label' })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' | 'ghost' | 'default'` | `'default'` | Button style variant |
| `href` | string | `'#'` | Navigation link (renders as `<a>`) |
| `children` | ReactNode | - | Button label/content |
| `onClick` | function | - | Click handler callback |
| `aria-label` | string | - | Accessible label (auto-filled from children if string) |
| `primary` | boolean | - | **Deprecated**: use `variant="primary"` |
| `ghost` | boolean | - | **Deprecated**: use `variant="ghost"` |

**Example:**
```js
// New way
Btn({ variant: 'primary', children: 'save', onClick: handleSave })

// Legacy (still supported)
Btn({ primary: true, children: 'save', onClick: handleSave })
```

### Glyph
Colored icon/symbol with optional custom color.

```js
Glyph({ children, color })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | string | - | Icon/symbol (emoji or Unicode) |
| `color` | string | - | CSS color value |

### Icon
Monochrome inline-SVG line icon (stroke = currentColor). Both call forms are accepted:

```js
Icon('folder', { size: 16 })    // positional (original)
Icon({ name: 'folder', size: 16 })  // props-object (matches every sibling component)
```

Unknown names render a blank decorative span (no throw). The canonical name list
is the `ICON_PATHS` table in `src/components/shell.js`. `iconMarkup(name|{name,size})`
returns the same SVG as a markup string for raw-DOM consumers.

### Topbar
Application header with brand, search, and nav items.

```js
Topbar({ brand = '247420', leaf = '', items = [], active = '', onNav, search })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `brand` | string | `'247420'` | Brand name |
| `leaf` | string | `''` | Brand suffix |
| `items` | `[[label, href], ...]` | `[]` | Navigation items |
| `active` | string | `''` | Currently active nav item label |
| `onNav` | function | - | Nav click callback (label passed) |
| `search` | string | - | Search placeholder (shows search input if set) |

**Example:**
```js
Topbar({
    brand: 'myapp',
    items: [['home', '#/'], ['docs', '#/docs']],
    active: 'home',
    onNav: (label) => navigate(label),
    search: 'search…'
})
```

### Side
Sidebar navigation with grouped items.

```js
Side({ sections = [] })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sections` | array | `[]` | Group objects with `{ group, items: [] }` |

**Section item shape:**
```js
{
    group: 'group label',
    items: [
        { label, glyph, href, active, count, color, onClick },
        ...
    ]
}
```

**Example:**
```js
Side({
    sections: [
        {
            group: 'main',
            items: [
                { label: 'home', glyph: '⌂', href: '#/', active: true },
                { label: 'settings', glyph: '⚙', href: '#/settings', count: 3 }
            ]
        }
    ]
})
```

### Status
Footer status bar with left/right content.

```js
Status({ left = [], right = [] })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `left` | ReactNode[] | `[]` | Left-aligned items |
| `right` | ReactNode[] | `[]` | Right-aligned items |

### AppShell
Complete app layout with header, sidebar, main, and footer.

```js
AppShell({ topbar, crumb, side, main, status, narrow })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `topbar` | ReactNode | - | Header component |
| `crumb` | ReactNode | - | Breadcrumb component |
| `side` | ReactNode | - | Sidebar component |
| `main` | ReactNode | - | Main content area |
| `status` | ReactNode | - | Footer status bar |
| `narrow` | boolean | - | Narrow main width layout |

### Heading
Semantic heading with configurable level.

```js
Heading({ level = 1, children, style = '' })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `level` | 1-6 | `1` | Heading level (h1-h6) |
| `children` | ReactNode | - | Heading text |
| `style` | string | `''` | CSS style string |

### Lede
Lead paragraph (large introductory text).

```js
Lede({ children })
```

### Dot
Status indicator (live/idle).

```js
Dot({ tone = 'live' })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tone` | `'live' | 'idle'` | `'live'` | Status tone |

### Rail
Colored accent bar (decorative).

```js
Rail({ tone = 'green' })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tone` | string | `'green'` | CSS tone class |

---

## Content Components

### Panel
Container with optional header and content.

```js
Panel({ title, count, right, style = '', children, kind })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | - | Panel header |
| `count` | number | - | Right-align count |
| `right` | ReactNode | - | Right header content |
| `style` | string | `''` | CSS style |
| `children` | ReactNode | - | Panel content |
| `kind` | string | - | Panel style variant |

### Row
List item with optional link/click handler.

```js
Row({ code, title, sub, meta, state = 'default', onClick, href, kind, cols, leading, trailing, target, selected, active, key, style })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `state` | `'active' | 'default'` | `'default'` | Row state |
| `title` | string | - | Primary text |
| `sub` | string | - | Secondary text |
| `code` | ReactNode | - | Leading code/glyph |
| `meta` | string | - | Trailing meta text |
| `href` | string | - | Link destination |
| `onClick` | function | - | Click handler |
| `kind` | string | - | Row style variant |
| `cols` | string | - | CSS grid-template-columns |
| `leading` | ReactNode | - | Custom leading content |
| `trailing` | ReactNode | - | Custom trailing content |
| `target` | string | - | Link target (`_blank`, etc.) |
| `active` | boolean | - | **Deprecated**: use `state="active"` |
| `selected` | boolean | - | **Deprecated**: use `state="active"` |

**Example:**
```js
// New way
Row({ title: 'item', state: 'active' })

// Legacy
Row({ title: 'item', active: true })
```

### RowLink
Link-only row (shorthand for Row with href and kind='link').

```js
RowLink({ code, title, sub, meta, href = '#', key, target })
```

### Section
Semantic section with eyebrow and title.

```js
Section({ title, eyebrow, children })
```

### Hero
Large introductory section with title, body, accent, and actions.

```js
Hero({ eyebrow, title, body, accent, badge, badgeCount, actions })
```

### Install
Code snippet with copy button.

```js
Install({ cmd, copied, onCopy })
```

### Receipt
Key-value table (invoice-like display).

```js
Receipt({ rows = [] })
```

### Changelog
Version history table.

```js
Changelog({ entries = [] })
```

### WorksList
Expandable work items list.

```js
WorksList({ works = [], openedIndex = -1, onToggle })
```

### WritingList
Blog post/article list.

```js
WritingList({ posts = [] })
```

### Manifesto
Prose paragraphs with optional dim styling.

```js
Manifesto({ paragraphs = [], maxWidth })
```

### Kpi
Key performance indicators grid.

```js
Kpi({ items = [] })
```

**Items shape:**
```js
[
    [value, label],
    [value, label, { delta: '+12.4%', tone: 'up' | 'down', spark: [8, 11, 9, 14, 16] }],
    ...
]
```

The third element is optional and additive — a bare `[value, label]` tuple is unchanged. When present, `delta` renders a toned trend pill (`--success`/`--danger`) with an up/down arrow, and `spark` renders an inline `Sparkline`.

### Sparkline
Minimal inline SVG trend line — no chart library, token-stroke only.

```js
Sparkline({ values = [], width = 72, height = 24, tone })
```

`tone: 'up' | 'down'` colors the stroke via `--success`/`--danger` (default up). Returns `null` for an empty `values` array. Decorative (`aria-hidden`) — pair with adjacent text for the actual value.

### BarChart
Horizontal token-only progress-bar breakdown — category/channel comparisons.

```js
BarChart({ items = [{ label, value, display }], emptyText = 'no data yet' })
```

Bars scale relative to the largest `value` in the set; `display` overrides the trailing numeric label (defaults to `String(value)`). Fill width is set via a `--bar-pct` custom-property write (never a raw inline `width:`), keeping it clear of the inline-styles lint gate.

### Table
Data table with optional row click handler.

```js
Table({ headers = [], rows = [], onRowClick, emptyText = 'nothing here yet' })
```

### SearchInput
Search input field with submit callback.

```js
SearchInput({ value = '', placeholder = 'search…', onInput, onSubmit, name = 'q', key })
```

### TextField
Labeled input or textarea.

```js
TextField({ label, value = '', type = 'text', placeholder = '', onInput, onChange, name, key, hint, multiline, rows = 4 })
```

### Select
Dropdown select input.

```js
Select({ label, value = '', options = [], onChange, name, key, placeholder, hint })
```

### EventList
Numbered event list (alias for multi-row display).

```js
EventList({ items, events, emptyText = 'no events', rankPad = 3 })
```

### PageHeader
Page section header with title, lede, and right content.

```js
PageHeader({ title, lede, eyebrow, right })
```

### Form
Simple form with fields and submit button.

```js
Form({ fields = [], submit = 'submit', onSubmit })
```

### HomeView
Complete home page layout.

```js
HomeView({ state = {}, onNav, onToggleWork, works = [], posts = [], manifesto = [], currentlyShipping })
```

### ProjectView
Project detail view.

```js
ProjectView({ project = {}, copied, onCopy })
```

---

## Chat Components

### ChatMessage
Single chat message with avatar, content, reactions, and receipts.

```js
ChatMessage({ role, who = 'them', avatar, text, parts, time, typing, key, aicat, reactions, receipt, name })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `role` | `'user' | 'assistant' | 'them' | 'you'` | - | Message sender role (preferred) |
| `who` | `'you' | 'them'` | `'them'` | **Deprecated**: use `role` |
| `avatar` | string | - | Avatar character/emoji |
| `text` | string | - | Plain text message |
| `parts` | array | - | Rich message parts (text, md, code, image, etc.) |
| `time` | string | - | Timestamp |
| `typing` | boolean | - | Show typing indicator |
| `aicat` | boolean | - | AI cat styling |
| `reactions` | array | - | Emoji reactions |
| `receipt` | `'sent' | 'read'` | - | Message delivery status |
| `name` | string | - | Sender name (for 'them') |
| `key` | string | - | React key |

**Example:**
```js
// New way
ChatMessage({ role: 'user', text: 'hello!' })
ChatMessage({ role: 'assistant', text: 'hi there!' })

// Legacy
ChatMessage({ who: 'you', text: 'hello!' })
ChatMessage({ who: 'them', text: 'hi there!' })
```

**Message parts shape:**
```js
{
    kind: 'text' | 'md' | 'code' | 'image' | 'pdf' | 'file' | 'link',
    text?, code?, lang?, filename?,
    src?, alt?, caption?, href?, title?, desc?, thumb?,
    name?, size?, kindLabel?
}
```

### ChatComposer
Text input for composing messages.

```js
ChatComposer({ value, onInput, onSend, placeholder = 'message…', disabled })
```

### Chat
Complete chat container with header and message thread.

```js
Chat({ title = 'chat', sub, messages = [], composer, header })
```

### AICat
AI assistant chat interface with typing indicator.

```js
AICat({ name = 'aicat', messages = [], thinking, composer, status = 'online · purring' })
```

### AICatPortrait
AI cat avatar display.

```js
AICatPortrait({ name = 'aicat', status = 'idle', face })
```

---

## Editor Primitives

### Toolbar
Flexible toolbar with leading, trailing, and center sections.

```js
Toolbar({ leading = [], trailing = [], dense = false, children })
```

### ToolbarRow
Flat, wrapping row of arbitrary action nodes (buttons/inputs/chips) with no leading/center/trailing slot structure — the shape to reach for when a caller just wants "this row of controls, left to right, wrapping on narrow viewports" and Toolbar's three-slot split is unwanted overhead. Accepts children as varargs or a single array.

```js
ToolbarRow(...actions)
```

**Example:**
```js
ToolbarRow(searchInput, filterSelect, refreshButton)
// or
ToolbarRow([searchInput, filterSelect, refreshButton])
```

### Tabs
Tabbed interface.

```js
Tabs({ items = [], active, onChange, children })
```

**Item shape:**
```js
{ id, label }
```

### TreeView
Hierarchical tree navigation container.

```js
TreeView({ children })
```

### TreeItem
Single expandable tree node.

```js
TreeItem({ label, glyph, tag, depth = 0, selected = false, expanded = false, onSelect, onToggle, children, hasChildren })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | - | Node label |
| `glyph` | ReactNode | - | Leading icon |
| `tag` | ReactNode | - | Trailing tag |
| `depth` | number | `0` | Indentation level |
| `selected` | boolean | `false` | Selection state |
| `expanded` | boolean | `false` | Expansion state |
| `onSelect` | function | - | Selection callback |
| `onToggle` | function | - | Expand/collapse callback |
| `children` | ReactNode | - | Child nodes |
| `hasChildren` | boolean | - | Explicitly mark as having children (inferred from children prop) |

### PropertyGrid
Property inspector grid container.

```js
PropertyGrid({ children })
```

### PropertyField
Property grid field item.

```js
PropertyField({ label, hint, inline = false, children })
```

### PropertyGridRow
A PropertyGrid row wrapper with a bottom-border divider (last-child border suppressed) — for editors that need stronger per-row visual separation than the default PropertyGrid gap gives (e.g. a list of independently-editable records like PRD/mutable rows).

```js
PropertyGridRow({ children })
```

### InlineEditableField
Borderless-until-focus text input inheriting surrounding font, with an explicit error state (`aria-invalid` + danger-token border) for live per-field validation. Renders a `<textarea>` when `multiline` is set, else a single-line `<input>`.

```js
InlineEditableField({ value = '', placeholder, onInput, onChange, error, multiline = false, rows = 3, ariaLabel, disabled = false })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | string | `''` | Current field value |
| `placeholder` | string | - | Placeholder text |
| `onInput` | function | - | `(value, event) => void`, fires on every keystroke |
| `onChange` | function | - | `(value, event) => void`, fires on commit (blur/change) |
| `error` | boolean | - | Sets `aria-invalid="true"` + `.has-error` class |
| `multiline` | boolean | `false` | Renders a `<textarea>` instead of `<input>` |
| `rows` | number | `3` | Textarea row count (multiline only) |
| `ariaLabel` | string | - | Accessible name |
| `disabled` | boolean | `false` | Disables the field |

### Pager
Prev/next paginator with a page label. `page` is 1-indexed; `pageCount<=1` disables both buttons (no divide-by-zero, no dead-end enabled control). `total` (optional) renders an item-count suffix.

```js
Pager({ page = 1, pageCount = 1, onPage, total, itemLabel = 'items' })
```

**Example:**
```js
Pager({ page: 2, pageCount: 5, total: 42, onPage: (p) => setPage(p) })
```

### JsonViewer
Monospace data preview (max-height + scroll). Accepts a pre-stringified string OR any value — objects/arrays get `JSON.stringify(v, null, 2)`; `null`/`undefined` render `emptyText` rather than the literal `"undefined"`/`"null"`.

`mode` selects rendering. `'plain'` (default) is the historical contract — flat `<pre>`, raw text, string input verbatim. `'highlight'` tokenizes the JSON into `ds-ep-json-k/s/n/b/z` spans (key/string/number/boolean/null; linear single-pass scan, no regex); a string that does not parse as JSON falls back to plain text, so arbitrary prose is never falsely tokenized. `'tree'` renders nested objects/arrays as native collapsible `<details>` nodes with child-count tags, open above `treeDepth` (default 2); scalars fall back to highlight. `copyable: true` wraps the viewer with a copy-to-clipboard button (transient copied/failed feedback).

```js
JsonViewer({ value, emptyText = 'no data', maxHeight, mode = 'plain', copyable = false, treeDepth = 2 })
```

### Dock
Five-panel layout (top, left, center, right, bottom).

```js
Dock({ top, left, right, bottom, center })
```

### IconButtonGroup
Toggle button group.

```js
IconButtonGroup({ items = [], value, onChange, dense = false })
```

**Item shape:**
```js
{ id, glyph?, label?, title?, disabled? }
```

---

## Community Components

### ServerIcon
Server/guild icon button.

```js
ServerIcon({ id, name, icon, active, badge, onClick })
```

### ServerRail
Vertical server icon rail.

```js
ServerRail({ servers = [], activeId, onSelect, onAdd })
```

### ChannelItem
Channel list item with optional voice state.

```js
ChannelItem({ id, name, type = 'text', active, voiceActive, voiceConnecting, badge, draggable, actions = [], participants = [], onClick, onContext })
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'text' | 'voice' | 'forum' | ...` | `'text'` | Channel type |
| `active` | boolean | - | Active state |
| `voiceActive` | boolean | - | Voice channel active |
| `voiceConnecting` | boolean | - | Voice connection pending |
| `badge` | number | - | Unread count badge |
| `draggable` | boolean | - | Enable drag-and-drop |
| `actions` | array | - | Action button array |
| `participants` | array | - | Voice participants |
| `onClick` | function | - | Click handler |
| `onContext` | function | - | Right-click handler |

### ChannelCategory
Collapsible channel group.

```js
ChannelCategory({ id, name, channels = [], collapsed, activeId, onToggle, onAddChannel, onChannelClick, onChannelContext, onContextMenu, extraButton, channelDraggable })
```

### VoiceUser
Voice channel participant.

```js
VoiceUser({ identity, speaking, color })
```

### UserPanel
User profile panel.

```js
UserPanel({ identity, name, color, status = 'online' })
```

### VoiceStrip
Voice channel toolbar.

```js
VoiceStrip({ channelName, status, muted, deafened, onMute, onDeafen, onLeave, open })
```

### ChannelSidebar
Complete channel sidebar with categories.

```js
ChannelSidebar({ categories = [], open })
```

### MemberItem
Member list item.

```js
MemberItem({ id, name, channels = [], collapsed, activeId, onToggle, onAddChannel, onChannelClick, onChannelContext, onContextMenu, extraButton, channelDraggable })
```

### MemberList
Members list container.

```js
MemberList({ members = [], onMemberClick })
```

### ChatHeader
Chat header (community).

```js
ChatHeader({ channelName, status, muted, deafened, onMute, onDeafen, onLeave, open })
```

### CommunityShell
Complete community layout.

```js
CommunityShell({ topbar, crumb, side, main, status, narrow })
```

---

## Utility Helpers

### fmtBytes
Format byte size to human-readable string.

```js
fmtBytes(n: number): string
```

**Example:**
```js
fmtBytes(1024) // '1.0 KB'
fmtBytes(1048576) // '1.0 MB'
```

### renderInline
Render inline markdown subset (bold, italic, code, links).

```js
renderInline(text: string): ReactNode[]
```

---

## Migration Guide: Breaking Changes

### Btn Component
**Status**: Backward compatible (v0.0.127+)

**Old API:**
```js
Btn({ primary: true, children: 'Save' })
Btn({ ghost: true, children: 'Cancel' })
Btn({ children: 'Default' })
```

**New API:**
```js
Btn({ variant: 'primary', children: 'Save' })
Btn({ variant: 'ghost', children: 'Cancel' })
Btn({ variant: 'default', children: 'Default' })
```

**Migration Path:**
- Old `primary` and `ghost` props still work (resolved silently; `variant` wins when both are present)
- Update gradually per codebase
- Full removal planned for v1.0

### Row Component
**Status**: Backward compatible (v0.0.127+)

**Old API:**
```js
Row({ title: 'item', active: true })
```

**New API:**
```js
Row({ title: 'item', state: 'active' })
```

**Migration Path:**
- `active: true` -> `state: 'active'`
- `active: false` -> `state: 'default'`
- `selected: true` -> `state: 'active'`

### ChatMessage Component
**Status**: Backward compatible (v0.0.127+)

**Old API:**
```js
ChatMessage({ who: 'you', text: 'hello' })
ChatMessage({ who: 'them', text: 'hi' })
```

**New API:**
```js
ChatMessage({ role: 'user', text: 'hello' })
ChatMessage({ role: 'assistant', text: 'hi' })
```

**Migration Path:**
- `who: 'you'` -> `role: 'user'`
- `who: 'them'` -> `role: 'assistant'`
- Both still supported; `role` takes precedence if both provided

### TreeItem Component
**Status**: Backward compatible (v0.0.127+)

**Internal logic:**
- `hasKids` computed from `children` presence
- Optional `hasChildren` prop available for explicit control
- No breaking changes needed (internal only)

---

## CSS Classes Reference

The real class taxonomy (enforced by `scripts/lint-classes.mjs` at build time):

- `ds-*` — scoped primitives (rows, grids, dialogs, dashboards, previews)
- `app-*` — AppShell chrome (topbar, status bar, crumb)
- `ws-*` — WorkspaceShell chrome (rail, sessions, content, pane, drawers, scrim)
- `chat-*` / `agentchat-*` / `aicat-*` — chat surfaces
- `cm-*` — community surfaces; `ov-*` — overlay primitives; `vx-*` — voice; `fd-*` — freddie
- **Public utility classes** (intentional, stable API): `.btn`, `.btn-primary`, `.btn-ghost`,
  `.row`, `.panel`, `.seg`, `.crumb`, `.glyph`, `.status-dot-disc`
- **Legacy bare internals** (frozen — always styled under a prefixed parent; do
  NOT add new ones, and avoid global consumer rules on these words inside the
  mount root): `name`, `size`, `icon`, `count`, `sep`, `leaf`, `cap`, `thumb`,
  `desc`, `tick`, `meta`, `sub`, `title`, `spread`, and the rest of the
  allowlist in `scripts/lint-classes.mjs`.

State modifiers use `is-*` / `.active` / `.show`; rail tones use `rail-*`; badge tones use `tone-*`.

### Bundled stylesheets

`scripts/build.mjs` concatenates the root CSS files into the scoped `dist/247420.css`:
`colors_and_type.css` (tokens) -> `app-shell.css` -> `community.css` -> `chat.css` ->
`editor-primitives.css` -> `community-app.css` -> **`app-surfaces.css`** -> the spoint kit sheets.
`app-surfaces.css` holds consumer-app application-surface styling (the agentgui pills, cwd bar,
resume banner, health chips, settings grid, history empty state, boot splash, scrollbar theming,
focus rings, print) so a consuming app keeps NO design content of its own; its selectors are
written pre-scoped `.ds-247420 ...` (the build prefixer leaves already-scoped selectors untouched).
`lint-glyphs` scans these root CSS files (via `SCAN_ROOT_FILES`) in addition to `src/`, so a
decorative glyph in shipped CSS fails the build.

### Focus + multi-select tokens/classes

- Unified focus tokens (colors_and_type.css): `--focus-color` / `--focus-w` / `--focus-offset`
  for outset rings, and `--focus-ring-inset` for bordered text fields. Keyboard rings use
  `:focus-visible` (never bare `:focus`, so a mouse click draws no ring).
- `.ds-check-box` — a CSS-drawn multi-select checkbox (bordered box, accent fill + border-drawn
  tick on `.is-marked` or `[aria-checked="true"]`, dash on `[aria-checked="mixed"]`). Used by
  FileRow/FileCell, the file/session select-all, and SessionCard select. Replaces `[x]/[ ]` text;
  AT keeps the `role=checkbox` + `aria-checked` name/state.
- Dashboard card status rails (chat.css): `is-error` (flame inset, strongest) > `is-stale`
  (amber inset) > `is-active`/`is-new` (accent inset). Tool-card status pills: `tool-running`
  (accent) / `tool-error` (flame) / `tool-done` (success). `Row()` rail tones differentiate by
  SHAPE (taller bar = error, gapped fill = subagent) plus an sr-only status word, not hue alone.

---

## Accessibility Standards

All components include ARIA attributes where applicable:

- **Buttons**: `role="button"`, `aria-label`, `aria-pressed`
- **Navigation**: `aria-current="page"`, `aria-label`
- **Trees**: `role="treeitem"`, `aria-selected`, `aria-expanded`
- **Tabs**: `role="tablist"`, `role="tab"`, `aria-selected`
- **Chat**: `role="log"`, `aria-live="polite"`

---

## Version History

- **v0.0.127** (2026-05-21): Standardized prop naming with backward compatibility
  - Btn: Added `variant` prop (old `primary`/`ghost` still work)
  - Row: Added `state` prop (old `active`/`selected` still work)
  - ChatMessage: Added `role` prop (old `who` still works)
  - TreeItem: Added optional `hasChildren` prop
  - Full accessibility audit complete
