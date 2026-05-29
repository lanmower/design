# Component API Reference

anentrypoint-design v0.0.127 — Standardized component prop naming and API surface.

## Overview

This document describes all exported components, their prop signatures, and standardized naming conventions. All components are pure factories that return webjsx vnodes.

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
    ...
]
```

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
- Old `primary` and `ghost` props still work but trigger deprecation notices in development
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

Components emit predictable CSS classes for styling:

- `.btn`, `.btn-primary`, `.btn-ghost`
- `.row`, `.row.active`, `.row-grid`
- `.chat-msg`, `.chat-msg.you`, `.chat-msg.them`
- `.ds-ep-tree-item`, `.ds-ep-tree-item.selected`
- `.cm-channel-item`, `.cm-channel-item.active`, `.cm-channel-item.voice-active`

All components follow the pattern: `<component>-<element>` or `ds-<scope>-<element>` for scoped variants.

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
