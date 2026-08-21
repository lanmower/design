# Component props reference

Generated from `src/components.js`'s real export barrel + each symbol's real definition in `src/components/*.js`, via `node scripts/generate-component-docs.mjs`. Do not hand-edit -- re-run after any component signature or JSDoc change.

310 exported symbols across 32 source files. **1 drift warning(s) found -- see bottom of file.**

---

## `src/components/shell.js`

### Brand

The wordmark used in Topbar/AppShell headers.

**Kind:** component

**Signature:** `name` = `'247420'`, `leaf`

**Documented params:**

- `props` _(Object)_
- `props.name` _(string)_ -- the brand text.
- `props.leaf` _(*)_ -- optional trailing breadcrumb-style leaf, rendered after a " / " separator.

**Returns:** {*} webjsx vnode

### Chip

A small pill/tag label.

**Kind:** component

**Signature:** `tone` = `''`, `size` = `'md'`, `tag` = `false`, `onRemove`, `children`

**Documented params:**

- `props` _(Object)_
- `props.tone` _(string)_ -- semantic color tone (empty = neutral).
- `props.size` _('sm'|'md'|'lg')_
- `props.tag` _(boolean)_ -- true renders a rectangular sentence-case variant for dense data (drops the all-caps pill styling). Orthogonal to tone.
- `props.onRemove` _(Function)_ -- if given, renders a trailing dismiss (x) button that calls onRemove() on click. Omitted entirely (no button) when not supplied.
- `props.children` _(*)_

**Returns:** {*} webjsx vnode

### Btn

The standard button/link factory. Renders an `<a>` when `href` is given, otherwise a `<button>`.

**Kind:** component

**Signature:** `href`, `variant` = `'default'`, `size` = `'md'`, `children`, `onClick`, `aria-label` _(local: ariaLabel)_, `primary`, `ghost`, `danger`, `disabled`, `class` _(local: className)_, `key`

**Documented params:**

- `props` _(Object)_
- `props.href` _(string)_ -- if present, renders as a link instead of a button.
- `props.variant` _('default'|'primary'|'ghost'|'danger')_
- `props.size` _('sm'|'md'|'lg')_
- `props.children` _(*)_
- `props.onClick` _(Function)_
- `props['aria-label']` _(string)_
- `props.primary` _(boolean)_ -- legacy alias for variant:'primary', kept for backward compatibility.
- `props.ghost` _(boolean)_ -- legacy alias for variant:'ghost'.
- `props.danger` _(boolean)_ -- legacy alias for variant:'danger'.
- `props.disabled` _(boolean)_
- `props.class` _(string)_ -- extra class name(s) appended to the generated class list.
- `props.key` _(*)_

**Returns:** {*} webjsx vnode

### Glyph

A themeable inline text/character glyph (font-size + optional color from tokens) -- for a real icon shape, use Icon()/iconMarkup() from shell/icons.js instead; Glyph is for short text/character content only. Decorative (aria-hidden) by default; pass `label` to expose it as a real accessible image instead.

**Kind:** component

**Signature:** `children`, `color`, `size` = `'base'`, `label`

**Documented params:**

- `props` _(Object)_
- `props.children` _(*)_ -- the glyph content (a character/short string).
- `props.color` _(string)_ -- CSS color value; omit to inherit currentColor.
- `props.size` _('sm'|'base'|'lg')_
- `props.label` _(string)_ -- accessible name; when set, renders role="img" instead of aria-hidden.

**Returns:** {*} webjsx vnode

### Icon

Renders a monochrome line icon from ICON_PATHS as a webjsx vnode. Accepts either call shape: `Icon('search', { size: 20 })` (the primary, historical signature) or `Icon({ name: 'search', size: 20 })` (a single props object, matching every other factory in this kit) -- both resolve through the same iconArgs() normalization below. An out-of-set name renders an empty `<span class="glyph">` rather than throwing.

**Kind:** component

**Signature:** `name, { size = 16 } = {}` _(positional arg)_

### IconButton

**Kind:** component

**Signature:** `icon`, `onClick`, `title`, `size` = `'base'`, `variant` = `'ghost'`, `disabled` = `false`

### Badge

A small count/variant/status marker (unread count, label chip inline with text). Distinct from Chip (a status-tone indicator element in its own right) and Pill (a plain non-interactive tag label) -- see the comments at each below for the three-way split.

**Kind:** component

**Signature:** `children`, `variant` = `'default'`, `tone` = `'neutral'`, `size` = `'md'`

**Documented params:**

- `props` _(Object)_
- `props.children` _(*)_
- `props.variant` _(string)_
- `props.tone` _(string)_ -- semantic tone keyword, applies a `tone-{tone}` class.
- `props.size` _('sm'|'md'|'lg')_

**Returns:** {*} webjsx vnode

### Pill

**Kind:** component

**Signature:** `tone` = `''`, `children`, `key`

### Topbar

**Kind:** component

**Signature:** `brand` = `'247420'`, `leaf` = `''`, `items` = `[]`, `active` = `''`, `onNav`, `search`, `themeToggle` = `true`

### Crumb

**Kind:** component

**Signature:** `trail` = `[]`, `leaf` = `''`, `right`

### Side

**Kind:** component

**Signature:** `sections` = `[]`

### Status

**Kind:** component

**Signature:** `left` = `[]`, `right` = `[]`

### AppShell

**Kind:** component

**Signature:** `topbar`, `crumb`, `side`, `main`, `status`, `narrow`, `fullBleed`

### WorkspaceShell

A Claude-Desktop / cowork three-(or four-)column app shell.  Pure stateless chrome (props in, vnode out). Collapse is DOM-class + a persisted flag, so the host does not have to thread collapse state through its own store. Visual styling lives in app-shell.css (.ws-*).

**Kind:** component

**Signature:** `rail`, `sessions`, `main`, `pane`, `crumb`, `status`, `narrow`, `railCollapsed` = `false`, `paneCollapsed` = `false`, `railLabel` = `'workspace navigation'`, `paneLabel` = `'context'`, `stableFrame` = `false`, `mainFlush` = `false`

**Documented params:**

- `props` _(Object)_
- `props.rail` _(*)_ -- the persistent left workspace nav (icon+label items, collapsible to icon-only). Pass the result of WorkspaceRail() or any vnode.
- `props.sessions` _(*)_ -- an OPTIONAL second column (a conversation/session list) shown between the rail and the main content. Null hides it.
- `props.main` _(*)_ -- the primary content column (chat thread, files view, dashboard...).
- `props.pane` _(*)_ -- an OPTIONAL right context pane (per-conversation context, file preview...). Null hides it; collapsible when present.
- `props.crumb` _(*)_ -- an optional thin top chrome bar (breadcrumb + status), spanning the content area only (the rail has its own header).
- `props.status` _(*)_ -- an optional footer.
- `props.narrow` _(boolean)_ -- caller's isNarrow() — drives the mobile single-column collapse.
- `props.railCollapsed` _(boolean)_ -- initial rail collapse (persisted state wins).
- `props.paneCollapsed` _(boolean)_ -- initial pane collapse (persisted state wins).

**Returns:** {*} webjsx vnode

### WorkspaceRail

**Kind:** component

**Signature:** `brand` = `'247420'`, `action`, `items` = `[]`, `footer`

### Heading

**Kind:** component

**Signature:** `level` = `1`, `children`, `style` = `''`, `class` _(local: className)_ = `''`, `aria-level` _(local: ariaLevel)_

### Lede

**Kind:** component

**Signature:** `children`

### Dot

**Kind:** component

**Signature:** `tone` = `'on'`

### Rail

**Kind:** component

**Signature:** `tone` = `'green'`

## `src/components/content.js`

### Panel

**Kind:** component

**Signature:** `title`, `count`, `right`, `style` = `''`, `class` _(local: className)_ = `''`, `children`, `kind`, `id`, `headingLevel` = `2`, `bodyAttrs` = `{}`

### Card

**Kind:** const (alias)

**Signature:** `Panel`

### Row

**Kind:** component

**Signature:** `code`, `rank`, `title`, `sub`, `meta`, `active`, `state` = `'default'`, `onClick`, `key`, `style`, `href`, `kind`, `cols`, `leading`, `trailing`, `target`, `selected`, `rail`, `expanded`, `highlight`, `actions`, `detail`

### RowLink

**Kind:** component

**Signature:** `code`, `title`, `sub`, `meta`, `href` = `'#'`, `key`, `target`

### PanelFromItems

**Kind:** component

**Signature:** `heading`, `items` = `[]`, `keyPrefix` = `'i'`, `count`, `style`, `kind`, `emptyText`

### Hero

**Kind:** component

**Signature:** `eyebrow`, `title`, `body`, `accent`, `actions`, `badges`

### HeroFromPageData

**Kind:** component

**Signature:** `hero` _(positional arg)_

### Marquee

**Kind:** component

**Signature:** `items` = `[]`, `sep` = `'/'`

### Install

**Kind:** component

**Signature:** `cmd`, `copied`, `onCopy`

### CliBlock

**Kind:** component

**Signature:** `lines` = `[]`, `heading` = `'quick start'`, `className` = `''`

### Receipt

**Kind:** component

**Signature:** `rows` = `[]`, `emptyText` = `'nothing here yet'`

### Changelog

**Kind:** component

**Signature:** `entries` = `[]`, `emptyText` = `'no changelog entries yet'`

### WorksList

**Kind:** component

**Signature:** `works` = `[]`, `openedIndex` = `-1`, `onToggle`

### WritingList

**Kind:** component

**Signature:** `posts` = `[]`

### Manifesto

**Kind:** component

**Signature:** `paragraphs` = `[]`, `maxWidth`

### Section

**Kind:** component

**Signature:** `title`, `eyebrow`, `children`, `id`, `headingLevel` = `2`

### PageHeader

**Kind:** component

**Signature:** `title`, `lede`, `eyebrow`, `right`, `compact`, `dense`, `id`

### Kpi

**Kind:** component

**Signature:** `items` = `[]`, `emptyText` = `'no metrics yet'`

### Sparkline

**Kind:** component

**Signature:** `values` = `[]`, `width` = `72`, `height` = `24`, `tone`

### BarChart

**Kind:** component

**Signature:** `items` = `[]`, `emptyText` = `'no data yet'`

### Table

**Kind:** component

**Signature:** `headers` = `[]`, `rows` = `[]`, `onRowClick`, `emptyText` = `'nothing here yet'`, `rowLabels`, `striped` = `false`, `compact` = `false`, `sortable` = `false`, `sortKey`, `sortDir` = `'asc'`, `onSort`, `caption`

### HealthTable

**Kind:** component

**Signature:** `checks` = `{}`, `emptyText` = `'no health data'`, `okLabel` = `'ok'`, `missLabel` = `'no'`, `jsonTruncate` = `60`

### ProcessRegistryTable

**Kind:** component

**Signature:** `processes` = `[]`, `emptyText` = `'no live processes'`, `extraColumns` = `[]`

### SearchInput

**Kind:** component

**Signature:** `value` = `''`, `placeholder` = `'search…'`, `onInput`, `onSubmit`, `name` = `'q'`, `key`, `label`, `resultCount`

### TextField

**Kind:** component

**Signature:** `label`, `value` = `''`, `type` = `'text'`, `placeholder` = `''`, `onInput`, `onChange`, `name`, `key`, `hint`, `multiline`, `rows` = `4`, `maxLength`, `min`, `max`, `error`, `title`, `size` = `'md'`, `aria-label` _(local: ariaLabel)_, `aria-invalid` _(local: ariaInvalid)_, `aria-describedby` _(local: ariaDescribedBy)_

### Select

**Kind:** component

**Signature:** `label`, `value` = `''`, `options` = `[]`, `onChange`, `name`, `key`, `placeholder`, `hint`, `title`, `size` = `'md'`, `aria-label` _(local: ariaLabel)_

### EventList

**Kind:** component

**Signature:** `items`, `events`, `emptyText` = `'no events'`, `rankPad` = `3`, `loading` = `false`, `loadingText` = `'loading events…'`

### HomeView

**Kind:** component

**Signature:** `state` = `{}`, `onNav`, `onToggleWork`, `works` = `[]`, `posts` = `[]`, `manifesto` = `[]`, `currentlyShipping`

### ProjectView

**Kind:** component

**Signature:** `project` = `{}`, `copied`, `onCopy`

### Form

**Kind:** component

**Signature:** `fields` = `[]`, `submit` = `'submit'`, `onSubmit`, `columns` = `1`

### InputOTP

Segmented one-time-code / PIN entry.

**Kind:** component

**Signature:** `length` = `6`, `value` = `''`, `onChange`, `onComplete`, `disabled`, `error`, `label` = `'code'`, `key`

**Documented params:**

- `props` _(Object)_
- `props.length` _(number)_ -- number of boxes.
- `props.value` _(string)_ -- the full code so far (controlled).
- `props.onChange` _(Function)_ -- called with (nextValue:string, event) on every edit.
- `props.onComplete` _(Function)_ -- called with (code:string) once all boxes are filled.
- `props.disabled` _(boolean)_
- `props.error` _(boolean)_
- `props.label` _(string)_ -- accessible name for the group.
- `props.key` _(*)_

**Returns:** {*} webjsx vnode

### Spinner

**Kind:** component

**Signature:** `size` = `'base'`, `tone` = `'accent'`, `label` = `'loading'`, `key`

### Skeleton

**Kind:** component

**Signature:** `height` = `'1em'`, `width` = `'100%'`, `count` = `1`, `label` = `'loading content'`, `key`

### Alert

**Kind:** component

**Signature:** `kind` = `'info'`, `children`, `onDismiss`, `title`, `key`

### FilterPills

**Kind:** component

**Signature:** `options` = `[]`, `selected`, `onSelect`, `label` = `'filters'`

### Avatar

**Kind:** component

**Signature:** `name`, `src`, `fallback`, `size` = `'md'`, `shape` = `'circle'`, `initialsCount` = `1`, `key`

### avatarInitial

**Kind:** component

**Signature:** `name, count = 1` _(positional arg)_

## `src/components/chat.js`

### fmtBytes

**Kind:** const

**Signature:** `fmtFileSize`

### renderInline

**Kind:** const

**Signature:** `sharedRenderInline`

### hasSelectionInside

**Kind:** component

**Signature:** `el` _(positional arg)_

### ChatMessage

**Kind:** component

**Signature:** `role`, `who` = `'them'`, `avatar`, `text`, `parts`, `time`, `typing`, `key`, `id`, `aicat`, `reactions`, `receipt`, `name`, `streaming`, `actions`, `incomplete`, `stopped`, `flat`, `tail`, `error`, `onRetry`, `onToggleReaction`, `onAddReaction`

### ChatComposer

**Kind:** component

**Signature:** `value`, `onInput`, `onSend`, `onEmoji`, `onCancel`, `busy`, `placeholder` = `'message…'`, `disabled`, `disabledReason`, `label`, `context`, `onPasteFiles`, `onDropFiles`, `onAttach`, `streamingSince`, `detectAttachment`, `mentionFiles`

### Chat

**Kind:** component

**Signature:** `title` = `'chat'`, `sub`, `messages` = `[]`, `composer`, `header`, `suggestions`, `onSuggestionClick`

### flashComposerNote

**Kind:** component

**Signature:** `composerEl, text` _(positional arg)_

### ChatSuggestions

**Kind:** component

**Signature:** `heading` = `'What can I help with?'`, `subtext` = `''`, `suggestions` = `[]`

### TypingIndicator

**Kind:** component

**Signature:** `users`

### AICAT_FACE

**Kind:** const

**Signature:** `` /\\_/\\\n( o.o )\n > ^ <``

### AICatPortrait

**Kind:** component

**Signature:** `name` = `'aicat'`, `status`, `face`

### AICat

**Kind:** component

**Signature:** `name` = `'aicat'`, `messages` = `[]`, `thinking`, `composer`, `status` = `'online · purring'`, `header`

## `src/components/agent-chat.js`

### AgentChat

**Kind:** component

**Signature:** `props = {}` _(positional arg)_

### MESSAGE_CAP

**Kind:** const

**Signature:** `100`

## `src/components/chat-minimap.js`

### ChatMinimap

**Kind:** component

**Signature:** `messages` = `[]`, `getThreadEl`, `getMessageEl`, `width` = `CHAT_MINIMAP_WIDTH`

### CHAT_MINIMAP_WIDTH

**Kind:** const

**Signature:** `36`

## `src/components/sessions.js`

### ConversationList

The Claude-Desktop "Chats" column. Sessions grouped by a caller-supplied group label, each row showing title/project, relative time, agent badge, and a running/new-event indicator. Selecting a row switches the active conversation.  another row's `sid` under that row (fork/branch tree), with an indent guide, a branch glyph, and a per-node collapse toggle. Ignored when `groups` is set (grouping and tree-nesting are mutually exclusive row layouts). `expanded`/ `onToggleExpand` are host-driven (kit stays stateless): a `sid` NOT present in the `expanded` Set renders collapsed once it has children. hover-revealed rename action (row becomes an inline text input while active). button click, before `onRename` commits; host flips `renaming` to this sid. delete action; clicking it arms an inline two-button confirm row (same height, no modal), mirroring SessionDashboard's arm-then-confirm stop control.

**Kind:** component

**Signature:** `sessions` = `[]`, `selected`, `groups`, `search`, `caption`, `onSelect`, `onNew`, `newLabel` = `'New chat'`, `emptyText` = `'No conversations yet'`, `loading` = `false`, `error` = `null`, `loadingText` = `'Loading conversations…'`, `hasMore` = `false`, `onLoadMore`, `loadMoreLabel` = `'load more conversations'`, `resultCount`, `tree` = `false`, `expanded`, `onToggleExpand`, `onRename`, `renaming`, `onStartRename`, `onCancelRename`, `onDelete`, `confirmingDelete`, `onArmDelete`, `onCancelDelete`

**Documented params:**

- `props` _(Object)_
- `props.sessions` _(Array<{sid:*, title?:string, project?:string, agent?:string, time?:string, running?:boolean, unread?:boolean, rail?:string, parentSid?:*}>)_
- `props.selected` _(*)_ -- the active sid.
- `props.groups` _(Array<{label:string, sids:Array<*>}>)_ -- OPTIONAL buckets for the rows; else one flat list.
- `props.search` _({value:string, onInput:Function, placeholder?:string})_ -- inline filter (optional).
- `props.onSelect` _(Function)_ -- onSelect(session).
- `props.onNew` _(Function)_ -- onNew().
- `props.emptyText` _(string)_
- `props.loading` _(boolean)_
- `props.error` _(*)_
- `props.tree` _(boolean)_ -- OPTIONAL: nest rows whose `parentSid` matches
- `props.expanded` _(Set<*>|Array<*>)_ -- sids whose children are shown, when `tree`.
- `props.onToggleExpand` _(Function)_ -- onToggleExpand(sid), when `tree`.
- `props.onRename` _(Function)_ -- onRename(session, newTitle). Presence enables the
- `props.renaming` _(*)_ -- sid of the row currently in rename-edit mode (host-driven).
- `props.onStartRename` _(Function)_ -- onStartRename(session) - fired by the rename
- `props.onCancelRename` _(Function)_ -- onCancelRename() - Escape / blur-without-change.
- `props.onDelete` _(Function)_ -- onDelete(session). Presence enables the hover-revealed
- `props.confirmingDelete` _(*)_ -- sid currently showing the armed delete-confirm state.
- `props.onArmDelete` _(Function)_ -- onArmDelete(session) - first delete click.
- `props.onCancelDelete` _(Function)_ -- onCancelDelete() - confirm-row Cancel click.

**Returns:** {*} webjsx vnode

### SessionCard

**Kind:** component

**Signature:** `session` = `{}`, `onStop`, `onOpen`, `onView`, `active` = `false`, `selectable` = `false`, `selected` = `false`, `onToggleSelect`, `density` = `'comfortable'`

### SessionDashboard

The live multi-session command center ("Live" dashboard).  The stop-all / stop-selected danger buttons are two-step (host-driven, the kit is stateless): the first click fires onArmStop* so the host flips confirming* true and re-renders; the armed button reads 'stop N sessions - press again' and only THAT click fires the real onStopAll/onStopSelected. Hosts that wire no onArmStop* keep the old single-click behavior.

**Kind:** component

**Signature:** `sessions` = `[]`, `onStop`, `onOpen`, `onView`, `onStopAll`, `onStopSelected`, `confirmingStopAll` = `false`, `confirmingStopSelected` = `false`, `onArmStopAll`, `onArmStopSelected`, `sort`, `filter`, `errorsOnly` = `false`, `onErrorsOnly`, `selectable` = `false`, `selected`, `onToggleSelect`, `onSelectAll`, `onClearSelection`, `activeSid`, `streamState`, `emptyText` = `'No live sessions'`, `emptyAction`, `offline` = `false`, `density` = `'comfortable'`

**Documented params:**

- `props` _(Object)_
- `props.sessions` _(Array<Object>)_ -- session shape: `{ sid, realSid, title, agent, model, cwd, elapsedMs, counter, lastActivity, currentTool, status, stopping, external, isNew, cost, tokens }`.
- `props.onStop` _(Function)_ -- onStop(session).
- `props.onOpen` _(Function)_ -- onOpen(session).
- `props.onView` _(Function)_ -- onView(session).
- `props.onStopAll` _(Function)_
- `props.onStopSelected` _(Function)_
- `props.confirmingStopAll` _(boolean)_
- `props.confirmingStopSelected` _(boolean)_
- `props.streamState` _('connected'|'connecting'|'lost'|'offline')_

**Returns:** {*} webjsx vnode

### SessionMeta

**Kind:** component

**Signature:** `items` = `[]`

### fmtDuration

**Kind:** component

**Signature:** `ms` _(positional arg)_

### fmtTime

**Kind:** component

**Signature:** `t` _(positional arg)_

### fmtAgo

**Kind:** component

**Signature:** `t` _(positional arg)_

### AgentListSkeleton

**Kind:** component

**Signature:** `rows` = `5`

## `src/components/context-pane.js`

### ContextPane

**Kind:** component

**Signature:** `agent`, `model`, `cwd`, `toolCount` = `0`, `usage`, `session`, `recentFiles`, `onSetCwd`, `onOpenFile`

### ContextMeter

**Kind:** component

**Signature:** `used` = `0`, `total` = `0`, `segments` = `[]`

### ContextTreemap

**Kind:** component

**Signature:** `items` = `[]`, `width` = `280`, `height` = `160`

### ContextXRayPanel

**Kind:** component

**Signature:** `segments` = `[]`, `openId`, `onOpenIdChange`

## `src/components/spreadsheet-preview.js`

### SpreadsheetPreview

**Kind:** component

**Signature:** `workbook`, `activeSheet`, `onSheetChange`, `maxRows` = `DEFAULT_MAX_ROWS`, `maxCols` = `DEFAULT_MAX_COLS`, `truncated`, `loading`, `error`, `errorActionLabel` = `'retry'`, `onErrorAction`, `key`

## `src/components/git-status.js`

### GitStatusPanel

**Kind:** component

**Signature:** `files` = `[]`, `onFileClick`, `emptyText` = `'no changes'`, `active`

### GitDiffView

**Kind:** component

**Signature:** `diff` = `''`, `filename`, `binary` = `false`

## `src/components/worktree-switcher.js`

### WorktreeSwitcher

**Kind:** component

**Signature:** `worktrees` = `[]`, `current`, `onSwitch`, `onCreate`, `ariaLabel` = `'switch worktree'`

## `src/components/plugins-config.js`

### PluginsConfig

**Kind:** component

**Signature:** `plugins` = `[]`, `selected` = `null`, `loading` = `false`, `error` = `null`, `busyName` = `null`, `onSelect`, `onToggle`, `onReload`, `onClose`

## `src/components/skills-config.js`

### SkillsConfig

**Kind:** component

**Signature:** `skills` = `[]`, `selected` = `null`, `loading` = `false`, `error` = `null`, `busyName` = `null`, `query` = `''`, `onQuery`, `onSelect`, `onToggle`, `onClose`

## `src/components/models-config.js`

### ModelsConfig

**Kind:** component

**Signature:** `data`, `loading`, `error`, `selectedProviderId`, `onSelectProvider`, `selectedModel`, `onSelectModel`, `onRefresh`, `onRebuild`, `rebuilding`, `rebuildError`

## `src/components/data-density.js`

### DEFAULT_PHASES

**Kind:** const

**Signature:** `['PLAN', 'EXECUTE', 'EMIT', 'VERIFY', 'CONSOLIDATE', 'COMPLETE']`

### PhaseWalk

**Kind:** component

**Signature:** `phases` = `DEFAULT_PHASES`, `reached` = `[]`, `gapKinds` = `[]`

### TreeNode

**Kind:** component

**Signature:** `ts`, `kind`, `variant` = `''`, `phase`, `id`, `keyLabel`, `reason`, `deviationLabel`, `residuals`

### BarRow

**Kind:** component

**Signature:** `label`, `value`, `pct` = `0`, `tone`

### RateCell

**Kind:** component

**Signature:** `value`, `tone` = `'neutral'`

### StatTile

**Kind:** component

**Signature:** `val`, `lbl`, `cls` = `''`

### StatsGrid

**Kind:** component

**Signature:** `items` = `[]`

### SubGrid

**Kind:** component

**Signature:** `items` = `[]`

### SessionRow

**Kind:** component

**Signature:** `sessId`, `phaseWalkProps`, `events`, `verbs`, `prd`, `muts`, `resid`, `deviations`, `firstTs`, `lastTs`, `onClick`

### DevRow

**Kind:** component

**Signature:** `ts`, `event`, `sess`, `operation`, `residuals`

### LiveLogEntry

**Kind:** component

**Signature:** `ts`, `sub`, `tone`, `event`, `preview`

### LiveLog

**Kind:** component

**Signature:** `entries` = `[]`, `autoScroll` = `true`

### Progress

**Kind:** component

**Signature:** `value` = `0`, `max` = `100`, `label`

## `src/components/files.js`

### fileGlyph

**Kind:** component

**Signature:** `type` _(positional arg)_

### fmtFileSize

**Kind:** component

**Signature:** `bytes` _(positional arg)_

### FileIcon

**Kind:** component

**Signature:** `type` = `'other'`

### FileRow

**Kind:** component

**Signature:** `name`, `type` = `'other'`, `size`, `modified`, `code`, `onOpen`, `onAction`, `active`, `key`, `permissions`, `locked`, `actions` = `FILE_ROW_ACTIONS`, `busy` = `false`, `selectable` = `false`, `selected` = `false`, `onToggleSelect`

### FileGrid

The directory listing.  `loading` and `busy` are NOT two spellings of one state -- they are the two halves of this SDK's standing distinction, and FileGrid is the component that takes both because it is the one place both are in play at once:  loading -- a DATA FETCH is in flight. Owns which SHAPE renders: with no rows yet it is a cold load and the whole grid is replaced by FileSkeleton; with rows already on screen it is a refresh and the existing rows stay mounted and dim (is-refreshing), because flashing a populated directory back to shimmer reads as data loss. busy    -- a USER ACTION is in flight (a rename/move/delete round-trip). Owns INTERACTIVITY, not shape: it is forwarded to each FileRow as `busy`, which disables that row's open + mutation controls so a second click cannot fire the same mutation twice.  A grid can be `busy` while not `loading` (a delete is posting, rows fully rendered) and `loading` while not `busy` (a plain refresh). Passing one for the other is a real bug, not a style choice, so they are deliberately not merged and neither is an alias of the other.

**Kind:** component

**Signature:** `files` = `[]`, `onOpen`, `onAction`, `onUp`, `emptyText` = `'No files here yet'`, `emptyAction`, `sort`, `filter`, `loading` = `false`, `shown`, `onShowMore`, `actions`, `busy`, `selectable` = `false`, `selected`, `onToggleSelect`, `marked` = `selected`, `onMark` = `onToggleSelect`, `onSelectAll`, `onClearSelection`, `density` = `'list'`, `onDensity`, `thumbUrl`

**Documented params:**

- `files` _(Array)_ -- the directory entries to render.
- `loading` _(boolean)_ -- a data fetch is in flight (skeleton when cold, dim when refreshing).
- `busy` _(boolean)_ -- a user-initiated mutation is in flight; disables every row's controls. Per-entry `f.busy` is used when this is not passed.
- `emptyText` _(string)_ -- copy for the empty/filtered-miss state.
- `density` _('list'|'compact'|'thumb')_ -- row density; 'thumb' switches to the multi-column cell grid.

### FileSkeleton

**Kind:** component

**Signature:** `rows` = `12`

### sortFiles

**Kind:** component

**Signature:** `files = [], sort = 'name', dir = 'asc'` _(positional arg)_

### FileToolbar

**Kind:** component

**Signature:** `left` = `[]`, `right` = `[]`

### RootsPicker

**Kind:** component

**Signature:** `roots` = `[]`, `selected`, `onSelect`, `label` = `'roots'`

### DropZone

**Kind:** component

**Signature:** `children`, `dragover`, `rejected`, `onDrop`, `onDragOver`, `onDragLeave`, `label` = `'drop files here'`, `onPick`

### UploadProgress

**Kind:** component

**Signature:** `items` = `[]`, `onDismiss`

### EmptyState

**Kind:** component

**Signature:** `text` = `'nothing here'`, `glyph` = `Icon('circle')`, `action`

### BreadcrumbPath

**Kind:** component

**Signature:** `segments` = `[]`, `onNav`, `root` = `'root'`

### BulkBar

**Kind:** component

**Signature:** `count` = `0`, `noun` = `'file'`, `nounPlural`, `actions` = `[]`, `onClear`, `busy` = `false`

## `src/components/files-modals.js`

### ConfirmDialog

**Kind:** component

**Signature:** `title` = `'Are you sure?'`, `message`, `confirmLabel` = `'confirm'`, `cancelLabel` = `'cancel'`, `destructive`, `onConfirm`, `onCancel`, `error`, `busy` = `false`, `busyLabel` = `'working…'`

### PromptDialog

**Kind:** component

**Signature:** `title` = `'Enter a name'`, `value` = `''`, `placeholder` = `''`, `confirmLabel` = `'ok'`, `cancelLabel` = `'cancel'`, `onConfirm`, `onCancel`, `onInput`, `error`, `busy` = `false`, `busyLabel` = `'working…'`, `roots`, `onPickRoot`

### CountdownDialog

**Kind:** component

**Signature:** `title` = `'Are you sure?'`, `message`, `seconds` = `10`, `onExpire`, `actions`

### FilePreviewMedia

**Kind:** component

**Signature:** `src`, `type` = `'other'`, `name`

### FilePreviewCode

**Kind:** component

**Signature:** `content` = `''`, `lang`, `filename`, `wrap`, `onWrapToggle`, `previewHtml`, `previewLabel` = `'preview'`, `mode`, `onModeChange`

### FilePreviewText

**Kind:** component

**Signature:** `content` = `''`, `truncated`

### FileViewer

**Kind:** component

**Signature:** `file`, `body`, `onClose`, `onAction`, `onPrev`, `onNext`

### FilePreviewPane

**Kind:** component

**Signature:** `file`, `body`, `onClose`, `onAction`, `onPrev`, `onNext`

### Modal

**Kind:** component

**Signature:** `onClose`, `kind` = `''`, `head`, `headClass` = `''`, `headAttrs` = `{}`, `body`, `bodyClass` = `'ds-modal-body'`, `bodyAttrs` = `{}`, `actions`, `busy` = `false`

### modalError

**Kind:** component

**Signature:** `error` _(positional arg)_

## `src/components/community.js`

### ServerIcon

**Kind:** component

**Signature:** `id`, `name`, `icon`, `active`, `badge`, `onClick`

### ServerRail

**Kind:** component

**Signature:** `servers` = `[]`, `activeId`, `onSelect`, `onAdd`

### ChannelItem

**Kind:** component

**Signature:** `id`, `name`, `type` = `'text'`, `active`, `voiceActive`, `voiceConnecting`, `badge`, `draggable`, `actions` = `[]`, `participants` = `[]`, `onClick`, `onContext`

### ChannelCategory

**Kind:** component

**Signature:** `id`, `name`, `channels` = `[]`, `collapsed`, `activeId`, `onToggle`, `onAddChannel`, `onChannelClick`, `onChannelContext`, `onContextMenu`, `extraButton`, `channelDraggable`

### VoiceUser

**Kind:** component

**Signature:** `identity`, `speaking`, `color`, `muted`, `camera`, `videoEl`

### UserPanel

**Kind:** component

**Signature:** `name`, `tag`, `color`, `muted`, `deafened`, `onMute`, `onDeafen`, `onSettings`

### ChannelSidebar

**Kind:** component

**Signature:** `serverName`, `channels` = `[]`, `categories` = `[]`, `activeId`, `collapsedCats`, `onChannelClick`, `onCategoryToggle`, `onAddChannel`, `onChannelContext`, `userPanelProps`, `loading` = `false`

### MemberItem

**Kind:** component

**Signature:** `identity`, `name`, `color`, `nameColor`, `status` = `'online'`, `onClick`

### MemberList

**Kind:** component

**Signature:** `categories` = `[]`, `open`, `loading` = `false`, `onSelectMember`

### UserCard

**Kind:** component

**Signature:** `identity`, `name`, `color`, `bannerUrl`, `status` = `'online'`, `statusLabel`, `bio`, `roles` = `[]`, `joinedAt`, `joinedServerAt`, `serverName`, `actions` = `[]`

### ChatHeader

**Kind:** component

**Signature:** `icon` = `'#'`, `name`, `topic`, `toolbar` = `[]`

### VoiceStrip

**Kind:** component

**Signature:** `channelName`, `status`, `muted`, `deafened`, `onMute`, `onDeafen`, `onLeave`, `open`

### CommunityShell

**Kind:** component

**Signature:** `serverRailProps`, `sidebarProps`, `children`, `memberListProps`, `voiceStripProps`

### MobileHeader

**Kind:** component

**Signature:** `title`, `channelType`, `channelName`, `onMenu`, `onMembers`

### ReplyBar

**Kind:** component

**Signature:** `quotedMessage`, `quotedAuthor`, `onCancel`

### Banner

**Kind:** component

**Signature:** `tone` = `'info'`, `message`, `visible`, `actionLabel`, `onAction`, `onClick`

### ThreadPanel

**Kind:** component

**Signature:** `threads` = `[]`, `activeId` = `null`, `title` = `'Threads'`, `onSelect`, `onCreate`, `onClose`, `loading` = `false`

### ForumView

**Kind:** component

**Signature:** `posts` = `[]`, `onSearch`, `onSort`, `onSelect`, `onNewPost`, `loading` = `false`

### PageView

**Kind:** component

**Signature:** `title` = `''`, `html` = `''`, `author` = `''`, `updatedAt` = `0`, `isAdmin` = `false`, `onEdit`

### RoleRow

**Kind:** component

**Signature:** `id`, `name`, `color`, `memberCount`, `draggable` = `true`, `onClick`, `onDragStart`, `onDragOver`, `onDrop`

### RoleList

**Kind:** component

**Signature:** `roles` = `[]`, `onSelectRole`, `onReorder`, `onAddRole`, `saving` = `false`

### RoleEditor

**Kind:** component

**Signature:** `role` = `{}`, `permissions` = `{}`, `permissionGroups`, `onChangeName`, `onChangeColor`, `onChangeHoist`, `onChangeMentionable`, `onChangePermission`, `onCopyId`, `onDelete`, `onSave`, `onReset`, `dirty` = `false`, `saving` = `false`

### BanList

**Kind:** component

**Signature:** `bans` = `[]`, `filterName` = `''`, `filterReason` = `''`, `onFilterName`, `onFilterReason`, `onUnban`, `loading` = `false`

### InviteList

**Kind:** component

**Signature:** `invites` = `[]`, `onCreate`, `canCreate` = `true`, `onCopy`, `onRevoke`, `loading` = `false`

### WebhookList

**Kind:** component

**Signature:** `webhooks` = `[]`, `onCreate`, `onEdit`, `onDelete`, `busy` = `false`

### WebhookListItem

**Kind:** component

**Signature:** `name`, `avatarUrl`, `color`, `description`, `onEdit`, `onDelete`

### WebhookEditor

**Kind:** component

**Signature:** `name` = `''`, `avatarUrl` = `''`, `url` = `''`, `onNameChange`, `onAvatarChange`, `onCopyUrl`, `onSave`, `onDelete`, `saving` = `false`

### RoleTabs

**Kind:** component

**Signature:** `roles` = `[]`, `activeId`, `onSelect`

### PermissionRow

**Kind:** component

**Signature:** `title`, `description`, `value`, `onCycle`

### PermissionSection

**Kind:** component

**Signature:** `heading`, `permissions` = `[]`, `values` = `{}`, `onChange`

### PermissionsEditor

**Kind:** component

**Signature:** `roles` = `[]`, `activeRoleId`, `onSelectRole`, `sections` = `[]`, `values` = `{}`, `onChange`, `dirty` = `false`, `saving` = `false`, `onSave`, `onReset`

### PermissionsOverview

**Kind:** component

**Signature:** `roles` = `[]`, `overrideRoleIds` = `[]`, `onSelectDefault`, `onSelectRole`

### EmojiManagerGrid

**Kind:** component

**Signature:** `emoji` = `[]`, `onUpload`, `onDelete`, `dragOver` = `false`, `onDragOver`, `onDragLeave`, `onDrop`, `busy` = `false`

### SearchBar

**Kind:** component

**Signature:** `value` = `''`, `placeholder` = `'Search…'`, `onChange`, `onClear`, `onSubmit`, `autofocus` = `false`

### SearchResults

**Kind:** component

**Signature:** `query` = `''`, `groups` = `[]`, `busy` = `false`, `emptyText` = `'No results'`

### SearchResultMessage

**Kind:** component

**Signature:** `author`, `avatarColor`, `text`, `time`, `channelName`, `query`, `onClick`

### SearchResultEntity

**Kind:** component

**Signature:** `kind` = `'channel'`, `name`, `icon`, `color`, `subtitle`, `onClick`

## `src/components/voice.js`

### PttButton

**Kind:** component

**Signature:** `state` = `'idle'`, `mode` = `'ptt'`, `onHoldStart`, `onHoldEnd`, `onClick`, `label` = `'Hold to talk'`

### VadMeter

**Kind:** component

**Signature:** `level` = `0`, `threshold` = `0.5`, `onThresholdChange`

### WebcamPreview

**Kind:** component

**Signature:** `videoStream` = `null`, `resolution` = `'640x480'`, `fps` = `30`, `enabled` = `true`, `resolutions` = `[]`, `fpsOptions` = `[]`, `onResolutionChange`, `onFpsChange`, `onToggle`

### VoiceSettingsModal

**Kind:** component

**Signature:** `open` = `false`, `mode` = `'ptt'`, `inputId`, `outputId`, `inputDevices` = `[]`, `outputDevices` = `[]`, `vadThreshold` = `0.5`, `rnnoise` = `false`, `autoGain` = `false`, `forceTurn` = `false`, `bitrate` = `64`, `volume`, `onChange`, `onSave`, `onCancel`, `onClose`

### AudioQueue

**Kind:** component

**Signature:** `segments` = `[]`, `currentSegmentId` = `null`, `paused` = `false`, `onReplay`, `onSkip`, `onResume`, `onPause`

### VoiceControls

**Kind:** component

**Signature:** `muted` = `false`, `deafened` = `false`, `cameraOn` = `false`, `screenShareOn` = `false`, `collapsed` = `false`, `onMic`, `onDeafen`, `onCamera`, `onScreenShare`, `onSettings`, `onLeave`, `onReturn`

### playCompletionCue

**Kind:** component

**Signature:** _(no props)_

### SettingsRowGroup

**Kind:** component

**Signature:** `children` _(positional arg)_

### SettingsSection

**Kind:** component

**Signature:** `title`, `children`

### SettingsRow

**Kind:** component

**Signature:** `icon` = `'blank'`, `label`, `description`, `action`, `onClick`

### SettingsRowToggle

**Kind:** component

**Signature:** `icon` = `'blank'`, `label`, `description`, `checked` = `false`, `onToggle`

### SettingsRowSelect

**Kind:** component

**Signature:** `icon` = `'blank'`, `label`, `description`, `value`, `options` = `[]`, `onChange`, `ariaLabel`

## `src/components/collab.js`

### LiveCursorOverlay

**Kind:** component

**Signature:** `cursors` = `[]`

### RemoteSelectionRings

**Kind:** component

**Signature:** `selections` = `[]`

### RecentEditHighlightFlash

**Kind:** component

**Signature:** `edits` = `[]`

### AgentPresenceChip

**Kind:** component

**Signature:** `userId`, `label`, `color`, `status` = `'active'`, `key`

### PresenceBar

**Kind:** component

**Signature:** `users` = `[]`

## `src/components/theme-toggle.js`

### ThemeToggle

**Kind:** component

**Signature:** `compact` = `false`, `onChange`

## `src/components/form-primitives.js`

### Checkbox

**Kind:** component

**Signature:** `checked`, `indeterminate`, `disabled`, `label`, `hint`, `onChange`, `ariaLabel`, `key`, `name`, `id`

### Radio

**Kind:** component

**Signature:** `name`, `value`, `checked`, `disabled`, `label`, `hint`, `onChange`, `ariaLabel`, `key`, `id`

### RadioGroup

**Kind:** component

**Signature:** `legend`, `name`, `value`, `options` = `[]`, `onChange`, `orientation` = `'vertical'`, `key`

### Toggle

**Kind:** component

**Signature:** `checked`, `disabled`, `label`, `hint`, `onChange`, `ariaLabel`, `kind` = `'switch'`, `key`, `id`

### Field

**Kind:** component

**Signature:** `label`, `hint`, `error`, `required`, `requiredMarker` = `'*'`, `htmlFor`, `children`, `key`

### useFormValidation

**Kind:** component

**Signature:** `schema = {}` _(positional arg)_

### focusFirstInvalidField

**Kind:** component

**Signature:** `errors, order, getEl` _(positional arg)_

## `src/components/slider.js`

### Slider

A single-value range slider (track + fill + thumb) built on a real, invisible native `<input type="range">` for keyboard/pointer/a11y semantics, matching the overlay approach voice/capture.js's VadMeter pioneered for its threshold handle.

**Kind:** component

**Signature:** `value` = `0`, `min` = `0`, `max` = `100`, `step` = `1`, `onChange`, `label`, `disabled`, `hint`, `key`

**Documented params:**

- `props` _(Object)_
- `props.value` _(number)_
- `props.min` _(number)_
- `props.max` _(number)_
- `props.step` _(number)_
- `props.onChange` _(Function)_ -- called with (value:number, event) on input.
- `props.label` _(string)_ -- accessible name; also rendered visibly when given.
- `props.disabled` _(boolean)_
- `props.hint` _(string)_
- `props.key` _(*)_

**Returns:** {*} webjsx vnode

## `src/components/carousel.js`

### Carousel

A scroll-snap content carousel with prev/next controls.

**Kind:** component

**Signature:** `items` = `[]`, `renderItem`, `orientation` = `'horizontal'`, `label` = `'carousel'`, `key`

**Documented params:**

- `props` _(Object)_
- `props.items` _(Array)_
- `props.renderItem` _(Function)_ -- (item, index) => vnode.
- `props.orientation` _('horizontal'|'vertical')_
- `props.label` _(string)_ -- accessible name for the region.
- `props.key` _(*)_

**Returns:** {*} webjsx vnode

## `src/components/interaction-primitives.js`

### useDraggable

**Kind:** component

**Signature:** `el, { data, kind, onDragStart, onDragEnd } = {}` _(positional arg)_

### useDropTarget

**Kind:** component

**Signature:** `el, { accepts = [], onDrop, onDragOver } = {}` _(positional arg)_

### useNumberScrub

**Kind:** component

**Signature:** `el, { getValue, onChange, step = 0.01, threshold = 3 } = {}` _(positional arg)_

### usePointerDrag

**Kind:** component

**Signature:** `el, { onStart, onMove, onEnd, button = 0 } = {}` _(positional arg)_

### Reorderable

**Kind:** component

**Signature:** `items` = `[]`, `getKey`, `renderItem`, `onReorder`, `axis` = `'vertical'`, `kind` = `'reorder'`

### useKeyboardShortcut

**Kind:** component

**Signature:** `map = {}, { scope = 'global', enabled = true } = {}` _(positional arg)_

### formatShortcut

**Kind:** component

**Signature:** `combo` _(positional arg)_

### ShortcutHint

**Kind:** component

**Signature:** `combo`, `kind` = `'kbd'`

### ShortcutList

**Kind:** component

**Signature:** `shortcuts` = `[]`

### useKeyboardShortcutHelp

**Kind:** component

**Signature:** _(no props)_

### ShortcutHelpDialog

**Kind:** component

**Signature:** `open` = `false`, `onClose`, `registry`

### isMobileNow

**Kind:** component

**Signature:** _(no props)_

### onMobileChange

**Kind:** component

**Signature:** `cb` _(positional arg)_

## `src/components/editor-primitives.js`

### Toolbar

**Kind:** component

**Signature:** `leading` = `[]`, `trailing` = `[]`, `dense` = `false`, `children`

### ToolbarRow

**Kind:** component

**Signature:** `...actions` _(positional arg)_

### Tabs

**Kind:** component

**Signature:** `items` = `[]`, `active`, `onChange`, `children`, `aria-label` _(local: ariaLabel)_, `onClose`, `scroll` = `false`

### TreeView

**Kind:** component

**Signature:** `children`

### TreeItem

**Kind:** component

**Signature:** `label`, `glyph`, `tag`, `depth` = `0`, `selected` = `false`, `expanded` = `false`, `onSelect`, `onToggle`, `children`, `hasChildren`

### PropertyGrid

**Kind:** component

**Signature:** `children`

### PropertyField

**Kind:** component

**Signature:** `label`, `hint`, `inline` = `false`, `children`

### PropertyGridRow

**Kind:** component

**Signature:** `children`, `key`

### InlineEditableField

**Kind:** component

**Signature:** `value` = `''`, `placeholder`, `onInput`, `onChange`, `error`, `multiline` = `false`, `rows` = `3`, `ariaLabel`, `disabled` = `false`

### Dock

**Kind:** component

**Signature:** `top`, `left`, `right`, `bottom`, `center`

### IconButtonGroup

**Kind:** component

**Signature:** `items` = `[]`, `value`, `onChange`, `dense` = `false`

### ResizeHandle

**Kind:** component

**Signature:** `axis` = `'horizontal'`, `onResize`, `ariaLabel`

### SplitPanel

**Kind:** component

**Signature:** `orientation` = `'horizontal'`, `initial` = `'50%'`, `min` = `80`, `max` = `Infinity`, `children`

### ContextMenu

**Kind:** component

**Signature:** `items` = `[]`, `anchor` = `{ x: 0, y: 0 }`, `onClose`

### useContextMenu

**Kind:** component

**Signature:** `targetEl, items, openCb` _(positional arg)_

### Drawer

**Kind:** component

**Signature:** `side` = `'left'`, `open` = `false`, `onClose`, `children`, `ariaLabel`

### Dialog

**Kind:** component

**Signature:** `title`, `open` = `false`, `onClose`, `children`, `actions` = `[]`, `dismissible` = `false`, `ariaLabel`

### FocusTrap

**Kind:** component

**Signature:** `children`

### Toast

**Kind:** component

**Signature:** `message`, `kind` = `'info'`, `duration` = `3000`, `onClose`

### toast

**Kind:** component

**Signature:** `message`, `kind` = `'info'`, `duration` = `3000`, `actionLabel`, `onAction`

### Pager

**Kind:** component

**Signature:** `page` = `1`, `pageCount` = `1`, `onPage`, `total`, `itemLabel` = `'items'`, `numbered` = `false`, `siblingCount` = `1`

### JsonViewer

**Kind:** component

**Signature:** `value`, `emptyText` = `'no data'`, `maxHeight`, `mode` = `'plain'`, `copyable` = `false`, `treeDepth` = `2`

### Grid

**Kind:** component

**Signature:** `gap`, `justify`, `align`, `children`, `key`

### GridItem

**Kind:** component

**Signature:** `xs`, `sm`, `md`, `lg`, `xl`, `children`, `key`

### Collapse

**Kind:** component

**Signature:** `title`, `expanded` = `false`, `onToggle`, `children`, `key`

### CollapseGroup

**Kind:** component

**Signature:** `items` = `[]`, `openId`, `onOpenChange`, `accordion` = `false`, `key`

### Divider

**Kind:** component

**Signature:** `label`, `vertical` = `false`, `key`

### AspectRatio

**Kind:** component

**Signature:** `ratio`, `children`, `key`

### useMediaQuery

**Kind:** component

**Signature:** `query` _(positional arg)_

### BP_SM

**Kind:** const

**Signature:** `480`

### BP_MD

**Kind:** const

**Signature:** `768`

### BP_LG

**Kind:** const

**Signature:** `1024`

### BP_XL

**Kind:** const

**Signature:** `1440`

### InfoRow

**Kind:** component

**Signature:** `label`, `value`, `key`

### InfoSection

**Kind:** component

**Signature:** `title`, `rows`, `key`

### DiagnosticsPanel

**Kind:** component

**Signature:** `title` = `'Diagnostics'`, `sections` = `[]`, `onRefresh`, `refreshing` = `false`, `key`

### BatchProgressLabel

**Kind:** component

**Signature:** `label` = `'Processing'`, `done` = `0`, `total` = `0`, `key`

### formatBatchOutcome

**Kind:** component

**Signature:** `succeeded` = `0`, `total` = `0`, `failedNames` = `[]`, `maxNames` = `3`

### runBatchSequential

**Kind:** component

**Signature:** `items = [], fn, onProgress` _(positional arg)_

## `src/components/overlay-primitives.js`

### Tooltip

**Kind:** component

**Signature:** `children`, `label`, `placement` = `'top'`, `delay` = `350`, `kind` = `'default'`

### Popover

**Kind:** component

**Signature:** `open`, `anchorEl`, `onClose`, `placement` = `'bottom-start'`, `children`, `ariaLabel`

### Dropdown

**Kind:** component

**Signature:** `trigger`, `items` = `[]`, `onSelect`, `placement` = `'bottom-start'`, `ariaLabel`

### useLongPress

**Kind:** component

**Signature:** `targetEl, callback, { ms = 500 } = {}` _(positional arg)_

### useFloating

**Kind:** component

**Signature:** `anchorEl, contentEl, { placement = 'bottom-start', offset = 8 } = {}` _(positional arg)_

### CommandPalette

**Kind:** component

**Signature:** `open`, `items` = `[]`, `onSelect`, `onClose`

### MentionAutocomplete

**Kind:** component

**Signature:** `open`, `kind` = `'user'`, `matches` = `[]`, `selection` = `0`, `onSelect`, `onHover`

### EmojiPicker

**Kind:** component

**Signature:** `open`, `anchorX` = `0`, `anchorY` = `0`, `onSelect`, `onClose`, `query` = `''`

### BootOverlay

**Kind:** component

**Signature:** `progress` = `0`, `phase` = `''`, `errored` = `false`, `visible` = `false`

### SettingsPopover

**Kind:** component

**Signature:** `title` = `'Settings'`, `open`, `anchorX` = `0`, `anchorY` = `0`, `sections` = `[]`, `onClose`

### SettingsShell

**Kind:** component

**Signature:** `title` = `'Settings'`, `open`, `groups` = `[]`, `activeId`, `onSelect`, `onClose`, `children`

### AuthModal

**Kind:** component

**Signature:** `mode` = `'extension'`, `error` = `''`, `busy` = `false`, `open` = `false`, `onModeChange`, `onConnectExtension`, `onGenerate`, `onImport`, `onClose`

### VideoLightbox

**Kind:** component

**Signature:** `src`, `label` = `''`, `open` = `false`, `onClose`

### ImageLightbox

**Kind:** component

**Signature:** `src`, `alt` = `''`, `label` = `''`, `open` = `false`, `onClose`

### PermissionMenu

**Kind:** component

**Signature:** `trigger`, `categories` = `[]`, `approved` = `[]`, `onToggle`, `onToggleAll`, `placement` = `'bottom-start'`, `ariaLabel` = `'Permissions'`

### ApprovalPrompt

**Kind:** component

**Signature:** `toolName`, `categoryLabel`, `argsPreview`, `onDecision`, `autoFocusNote` = `true`

### withBusy

**Kind:** component

**Signature:** `btn, fn, busyLabel = '...'` _(positional arg)_

### MenuButton

**Kind:** component

**Signature:** `trigger`, `items` = `[]`, `selected`, `onSelect`, `onRetry`, `placement` = `'bottom-start'`, `ariaLabel` = `'Menu'`, `emptyText` = `'No options available'`

### HoverCard

**Kind:** component

**Signature:** `trigger`, `content`, `open`, `onOpenChange`, `openDelay` = `700`, `closeDelay` = `300`, `placement` = `'top'`, `ariaLabel`

### Menubar

**Kind:** component

**Signature:** `menus` = `[]`, `openIndex` = `null`, `onOpenIndexChange`, `ariaLabel` = `'Menu bar'`

## `src/components/freddie.js`

### FREDDIE_PAGES

**Kind:** const

**Signature:** `{`

### home

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### chat

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### voice

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### sessions

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### projects

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### agents

**Kind:** const

**Signature:** `s.agents \|\| {}`

### analytics

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### models

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### cron

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### skills

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### plugins

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### config

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### env

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### tools

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### batch

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### gateway

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### chains

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### machines

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### health

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### logs

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### debug

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### git

**Kind:** const (factory-wrapped)

**Signature:** `makePage((ctx) => {`

### skillLabel

**Kind:** component

**Signature:** `input` _(positional arg)_

### getRecentPaths

**Kind:** component

**Signature:** _(no props)_

### saveRecentPath

**Kind:** component

**Signature:** `path` _(positional arg)_

### renderChatMessages

**Kind:** component

**Signature:** `messages = [], opts = {}` _(positional arg)_

### buildNavPaletteActions

**Kind:** component

**Signature:** `routes, { onNavigate } = {}` _(positional arg)_

### renderDashboardSide

**Kind:** component

**Signature:** `routeGroups`, `active`, `onNavigate`

### renderDashboardShell

**Kind:** component

**Signature:** `active`, `body`, `routeGroups`, `onNavigate`, `sampler` = `{ ok: 0, bad: 0, total: 0, error: false }`, `degraded` = `false`, `error` = `null`, `project` = `'default'`, `toolsCount` = `'—'`, `skillsCount` = `'—'`, `ts` = `''`, `brand` = `'freddie'`, `fullBleed` = `false`

## `src/components/freddie/runtime.js`

### makePage

**Kind:** component

**Signature:** `setup, { initial = {} } = {}` _(positional arg)_

### api

**Kind:** component

**Signature:** `path, opts = {}` _(positional arg)_

### loadingState

**Kind:** component

**Signature:** `label = 'loading…'` _(positional arg)_

### errorState

**Kind:** component

**Signature:** `err, onRetry` _(positional arg)_

### emptyState

**Kind:** component

**Signature:** `text = 'nothing here yet', glyph = Icon('circle')` _(positional arg)_

### refreshError

**Kind:** component

**Signature:** `err` _(positional arg)_

## `src/components/dashboard-shell.js`

### openCommandPalette

**Kind:** component

**Signature:** `actions` = `[]`, `onSelect`

### closeCommandPalette

**Kind:** component

**Signature:** _(no props)_

## `src/community-app.js`

### mountCommunityApp

**Kind:** component

**Signature:** `root, adapter = {}` _(positional arg)_

## `src/components/calendar.js`

### Calendar

A month date-grid. Fully controlled: `selected`/`month` are owned by the caller, this component holds no selection state of its own.

**Kind:** component

**Signature:** `mode` = `'single'`, `selected`, `onSelect`, `month`, `onMonthChange`, `minDate`, `maxDate`, `locale` = `getLocale()`

**Documented params:**

- `props` _(Object)_
- `props.mode` _('single'|'range')_
- `props.selected` _(Date|{from:?Date,to:?Date})_ -- a Date in single mode, `{from,to}` in range mode.
- `props.onSelect` _(Function)_ -- single mode: `onSelect(date)`. range mode: `onSelect({from,to})`.
- `props.month` _(Date)_ -- the currently-displayed month (any date within it).
- `props.onMonthChange` _(Function)_ -- `onMonthChange(newMonthDate)`, fired by the prev/next nav.
- `props.minDate` _(Date)_
- `props.maxDate` _(Date)_
- `props.locale` _(string)_ -- BCP-47 locale for weekday/month labels; defaults to the SDK's active locale.

**Returns:** {*} webjsx vnode

### DatePicker

Trigger button that opens a Popover hosting a single-mode Calendar.

**Kind:** component

**Signature:** `value`, `onChange`, `open` = `false`, `onOpenChange`, `month`, `onMonthChange`, `placeholder` = `'Select date'`, `minDate`, `maxDate`, `name` = `'dp'`, `locale` = `getLocale()`

**Documented params:**

- `props` _(Object)_
- `props.value` _(Date)_ -- the selected date.
- `props.onChange` _(Function)_ -- `onChange(date)`, fired on day select.
- `props.open` _(boolean)_ -- popover open state, owned by the caller.
- `props.onOpenChange` _(Function)_ -- `onOpenChange(nextOpen)`, fired by the trigger click and on close (Escape/outside-click/selection).
- `props.month` _(Date)_ -- displayed month; defaults to `value` or today when omitted.
- `props.onMonthChange` _(Function)_ -- `onMonthChange(newMonthDate)`, fired by the prev/next nav.
- `props.placeholder` _(string)_ -- trigger label when `value` is unset.
- `props.minDate` _(Date)_
- `props.maxDate` _(Date)_
- `props.name` _(string)_ -- stable id distinguishing multiple pickers' anchor lookup; set explicitly when rendering more than one DatePicker on a page.
- `props.locale` _(string)_

**Returns:** {*} webjsx vnode

### DateRangePicker

Trigger button that opens a Popover hosting a range-mode Calendar.

**Kind:** component

**Signature:** `value`, `onChange`, `open` = `false`, `onOpenChange`, `month`, `onMonthChange`, `placeholder` = `'Select dates'`, `minDate`, `maxDate`, `name` = `'drp'`, `locale` = `getLocale()`

**Documented params:**

- `props` _(Object)_
- `props.value` _({from:?Date,to:?Date})_
- `props.onChange` _(Function)_ -- `onChange({from,to})`, fired on each click.
- `props.open` _(boolean)_ -- popover open state, owned by the caller.
- `props.onOpenChange` _(Function)_ -- `onOpenChange(nextOpen)`; also fired with `false` once both ends of the range are picked.
- `props.month` _(Date)_
- `props.onMonthChange` _(Function)_
- `props.placeholder` _(string)_
- `props.minDate` _(Date)_
- `props.maxDate` _(Date)_
- `props.name` _(string)_ -- stable id distinguishing multiple pickers' anchor lookup.
- `props.locale` _(string)_

**Returns:** {*} webjsx vnode

### WEEKDAY_LABELS

**Kind:** const

**Signature:** `['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']`

### buildMonthGrid

**Kind:** component

**Signature:** `monthDate` _(positional arg)_

### formatDate

**Kind:** component

**Signature:** `d, locale` _(positional arg)_

### monthLabel

**Kind:** component

**Signature:** `monthDate, locale` _(positional arg)_

---

## Drift warnings

Found by the generator while cross-checking components.js's export list against real source definitions and (where present) JSDoc @param names against the real destructured signature. These indicate the barrel, the source file, or a JSDoc comment disagree with each other and should be reconciled by hand.

- 'createDamageNumbers' exported by components.js but no definition found in src/components/game-editor-kit.js

