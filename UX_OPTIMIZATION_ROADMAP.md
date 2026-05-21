# anentrypoint-design UX Optimization Roadmap

**Audit Date:** 2026-05-21  
**Scope:** Mobile/responsive, accessibility, animations, performance, user flows  
**Goal:** Perfect UX across all viewport sizes and interaction modes

---

## Consolidated Ranked List: 25 UX Improvements

### TIER 1: CRITICAL (Ship First)

#### 1. **[MOBILE] Channel action buttons undersized — 18×18px → 44×44px**
- **File:** `community.css:425-427`
- **Issue:** `.cm-ch-action-btn` fails 48px touch target minimum. Users cannot tap mute/delete on mobile.
- **Severity:** CRITICAL
- **Effort:** 5min
- **Impact:** ~40% of channel interactions on mobile fail
- **Fix:**
```css
.cm-ch-action-btn {
  width: 44px;
  height: 44px;
  padding: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

#### 2. **[A11Y] ServerIcon missing role, aria-label, keyboard support**
- **File:** `src/components/community.js:6-12`
- **Issue:** Renders as `<div onclick>`, not semantic button. Screen readers don't identify it. Tab key skips it.
- **Severity:** CRITICAL
- **Effort:** 10min
- **Impact:** Entire server list inaccessible to keyboard/screen reader users
- **Fix:**
```javascript
return h('div', { 
  class: 'cm-server-icon' + (active ? ' active' : ''), 
  onclick: onClick, 
  role: 'button',
  'aria-label': name,
  'tabindex': '0',
  'aria-pressed': active ? 'true' : 'false',
  'data-id': id 
}, ...)
```

#### 3. **[AUTH] OAuth provider buttons are stubs — no real OAuth flow**
- **File:** `ui_kits/signin/app.js:24`
- **Issue:** GitHub/Google/SSO buttons show "(stub) provider not wired". Users can't complete signup.
- **Severity:** CRITICAL
- **Effort:** 30min (requires OAuth endpoint config)
- **Impact:** ~100% of users blocked on sign-up
- **Fix:** Wire OAuth redirects, add loading states, surface auth errors with guidance

---

### TIER 2: HIGH (Ship Next)

#### 4. **[MOBILE] Multiple 18×18px icon buttons scattered throughout**
- **File:** `community.css:278-279, 426-427, 359-360`
- **Issue:** Category add, channel actions, icons all 18×18px. 30% of header controls untappable.
- **Severity:** HIGH
- **Effort:** 15min
- **Impact:** Mobile usability degraded across all surfaces
- **Fix:** Add `@media (max-width: 480px)` rule with 44×44px + padding for all icon buttons

#### 5. **[MOBILE] Server rail + sidebar layout collapse broken on 375px viewport**
- **File:** `community.css:162-170, sdk-shell.css`
- **Issue:** Server rail (72px) + sidebar (240px) = 312px of 375px screen. Chat compressed to 63px width.
- **Severity:** HIGH
- **Effort:** 20min
- **Impact:** Chat illegible on iPhone SE; unreadable message threads
- **Fix:**
```css
@media (max-width: 480px) {
  .cm-server-rail { flex: 0 0 48px; width: 48px; }
  .cm-channel-sidebar.open { width: 80vw; max-width: 200px; }
}
```

#### 6. **[A11Y] Icon-only buttons lack aria-label (mute, deafen, settings)**
- **File:** `src/components/community.js:68-103, community.css:669-694`
- **Issue:** Buttons use `title="Mute"` only. Title tooltips are mouse-only. Keyboard users don't see them.
- **Severity:** HIGH
- **Effort:** 15min
- **Impact:** Keyboard users can't discover mute/deafen/settings functions
- **Fix:** Replace `title` with `aria-label` on all icon buttons
```javascript
h('button', { 
  'aria-label': 'Mute microphone',
  onclick: onMute,
  class: 'cm-user-btn'
}, '🎤')
```

#### 7. **[A11Y] Drag-drop and context menus lack keyboard fallback**
- **File:** `src/components/community.js:24-55, files.js:68-82`
- **Issue:** Channel reorder (drag-drop) and context menus (right-click) have no keyboard alternative.
- **Severity:** HIGH
- **Effort:** 25min
- **Impact:** Keyboard-only users cannot reorder channels or access context actions
- **Fix:** Add `onkeydown` handler for Ctrl+ArrowUp/Down (reorder) and ContextMenu key (open menu)

#### 8. **[ANIMATIONS] Spinner animation (700ms) outside token system + no prefers-reduced-motion**
- **File:** `community.css:910-912`
- **Issue:** Hardcoded `700ms linear infinite` vs. design token system (80-280ms). No motion reduction support.
- **Severity:** HIGH
- **Effort:** 10min
- **Impact:** Janky animation on slow devices, accessibility non-compliance
- **Fix:**
```css
@media (prefers-reduced-motion: no-preference) {
  .cm-ch-spinner {
    animation: spin var(--dur-slow) linear infinite;
  }
}
```

#### 9. **[MESSAGING] ChatComposer missing attachment UI entirely**
- **File:** `src/components/chat.js:139-162`
- **Issue:** Only textarea + send button visible. No attach, emoji, or menu. Users can't discover attachment feature.
- **Severity:** HIGH
- **Effort:** 35min
- **Impact:** Users cannot send files, use emoji, or discover advanced composer features
- **Fix:** Add button row below composer: `[📎 attach] [😊 emoji] [⋯ more]` with file picker + async upload UI

#### 10. **[ACCESSIBILITY] Color contrast: fg-3 (#6A6A70) fails WCAG AA on light backgrounds**
- **File:** `colors_and_type.css:16, 43-44` (affects community.css:316, 459, 677, 795)
- **Issue:** ~4.2:1 contrast fails AA for small text. Affects category headers, voice names, member metadata.
- **Severity:** HIGH
- **Effort:** 10min
- **Impact:** ~30% of secondary text unreadable for low-vision users
- **Fix:** Increase `--ink-3` to `#5A5A62` (~5.1:1 contrast). Test on light backgrounds.

#### 11. **[ANIMATIONS] Width/flex-basis transitions cause layout thrashing (member list collapse)**
- **File:** `community.css:764, 99`
- **Issue:** `.cm-member-list` uses `transition: width ... flex-basis ...` animating via `width: 0`. Forces reflow every frame.
- **Severity:** HIGH
- **Effort:** 20min
- **Impact:** 30fps on repeated sidebar toggle; janky mobile UX
- **Fix:** Replace with `transform: scaleX(0)` or `max-width` clamp + `overflow: hidden`:
```css
.cm-member-list:not(.open) {
  transform: scaleX(0);
  transform-origin: right;
  transition: transform var(--dur-base) var(--ease);
}
```

---

### TIER 3: MEDIUM (Ship in Follow-up Sprint)

#### 12. **[A11Y] Modal focus trap and Escape key handling missing**
- **File:** `src/components/files-modals.js:8-14`
- **Issue:** Modals close on backdrop click but don't trap focus or handle Escape. Users can Tab to background.
- **Severity:** MEDIUM
- **Effort:** 30min
- **Impact:** Screen reader users can navigate out of modal; Escape key expected pattern missing
- **Fix:** Implement focus trap + Escape handler in Backdrop component

#### 13. **[ANIMATIONS] Chat message hover micro-animations inconsistent timing (multiple 0.12s vs 0.16s)**
- **File:** `app-shell.css:654-665`
- **Issue:** Avatar scale, bubble lift, shadow blur animate at different timings. Creates visual jank.
- **Severity:** MEDIUM
- **Effort:** 15min
- **Impact:** Hover state feels jerky; reduces visual polish
- **Fix:** Consolidate to single `var(--dur-base)` (160ms). Reduce avatar scale to 1.03 (not 1.08).

#### 14. **[MOBILE] Member list collapse sudden display:none — no fade transition**
- **File:** `community.css:917, 766-771`
- **Issue:** Uses `display: none` toggle, causing instant disappearance instead of smooth animation.
- **Severity:** MEDIUM
- **Effort:** 15min
- **Impact:** Mobile member list open/close feels abrupt
- **Fix:** Use `visibility: hidden + opacity: 0 + transform: translateX(100%)` with smooth transition (matches channel sidebar pattern)

#### 15. **[PERFORMANCE] Textarea auto-grow reads scrollHeight synchronously on every keystroke**
- **File:** `src/components/chat.js:145-155`
- **Issue:** `oninput: autoGrow` reads `ta.scrollHeight` sync, forces layout recalc. 100 keystrokes = 100 reflows.
- **Severity:** MEDIUM
- **Effort:** 20min
- **Impact:** 15-30ms frame delay on large messages on slow devices
- **Fix:** Debounce with `requestAnimationFrame` or use CSS `field-sizing: content`

#### 16. **[PERFORMANCE] Scroll position check causes DOM thrashing on message stream**
- **File:** `src/components/chat.js:168-172`
- **Issue:** Every message arrival reads `scrollHeight - clientHeight` + writes `scrollTop`. 100 messages = 100 sync reads/writes.
- **Severity:** MEDIUM
- **Effort:** 25min
- **Impact:** Event loop blocked during fast message arrival; noticeable UI stall
- **Fix:** Replace with `IntersectionObserver` watching bottom-of-thread sentinel element

#### 17. **[ANIMATIONS] Textarea height transition (0.08s) hardcoded outside token system**
- **File:** `app-shell.css:1019`
- **Issue:** `transition: height 0.08s ease` hardcoded. Should be `var(--dur-snap) var(--ease)`.
- **Severity:** MEDIUM
- **Effort:** 5min
- **Impact:** Animation timing inconsistent with design system
- **Fix:** Replace hardcoded `0.08s ease` with `var(--dur-snap) var(--ease)`

#### 18. **[SETTINGS] UserPanel.onSettings is no-op — settings navigation broken**
- **File:** `src/components/community.js:89-106` (line 113)
- **Issue:** Settings button callback is empty. Users can't access audio device, mic preferences.
- **Severity:** MEDIUM
- **Effort:** 20min
- **Impact:** Users buried 3 clicks deep to find settings; no quick access from main panel
- **Fix:** Wire onSettings to open modal/drawer with quick toggles (audio device, mic, speaker) + link to full settings

#### 19. **[VOICE] Voice channel icons identical to text channels — low discoverability**
- **File:** `src/components/community.js:25-35`
- **Issue:** Both text and voice use ambiguous icons. No visual distinction in sidebar when collapsed.
- **Severity:** MEDIUM
- **Effort:** 15min
- **Impact:** Users can't quickly scan to find voice channels
- **Fix:** Add visual indicator (animated pulse, color tint, or badge) when voice is active/connecting

#### 20. **[SETTINGS] Unsaved changes state lacks confirmation before discard**
- **File:** `ui_kits/settings/app.js:119-123`
- **Issue:** "Discard" button has no confirmation. Users can accidentally lose changes.
- **Severity:** MEDIUM
- **Effort:** 20min
- **Impact:** Data loss risk; no draft recovery if crash
- **Fix:** Add confirmation modal, show diff preview, auto-save to localStorage, offer undo

---

### TIER 4: LOW-PRIORITY ENHANCEMENTS

#### 21. **[MOBILE] Chat composer send button not responsive to landscape orientation**
- **File:** `app-shell.css:951-959`
- **Issue:** Send button stays 44×44px on tablet landscape. Becomes visually undersized.
- **Severity:** LOW
- **Effort:** 10min
- **Impact:** Landscape tablet discoverability slightly reduced
- **Fix:** Add `@media (orientation: landscape) { .send { width: 52px; height: 52px; } }`

#### 22. **[MOBILE] Member list horizontal scroll on narrow screens**
- **File:** `community.css:788-847`
- **Issue:** Member names overflow, forcing horizontal scroll instead of ellipsis.
- **Severity:** LOW
- **Effort:** 10min
- **Impact:** Member list requires two-axis scrolling on narrow phones
- **Fix:** Add `max-width: 100%; min-width: 0` to `.cm-member-item`

#### 23. **[PERFORMANCE] Inline arrow functions in action button maps waste allocation**
- **File:** `src/components/community.js:40-46`
- **Issue:** Each render creates new function instances for every action button (50 channels × 5 actions = 250 allocs).
- **Severity:** LOW
- **Effort:** 15min
- **Impact:** Minor GC pressure; doesn't block frames
- **Fix:** Extract action handlers to module-level or use stable dispatcher closure

#### 24. **[PERFORMANCE] Spinning and pulsing animations lack will-change + contain hints**
- **File:** `community.css:382, app-shell.css:904, 922`
- **Issue:** `.cm-spin`, `.chat-typing`, `.chat-msg` animations lack GPU acceleration hints.
- **Severity:** LOW
- **Effort:** 10min
- **Impact:** Animations don't GPU-accelerate; missed compositing optimization
- **Fix:** Add `will-change: transform; contain: layout` to animated elements

#### 25. **[PERFORMANCE] Markdown/code rendering caches by string, not content hash — 100+ reparse on message stream**
- **File:** `src/components/chat.js:46-70`
- **Issue:** Every parent rerender causes all `MdNode`/`CodeNode` to re-run markdown parse + prism highlight, even if content unchanged.
- **Severity:** LOW
- **Effort:** 30min
- **Impact:** Large chat histories (100+ messages) incur 50-200ms per new message
- **Fix:** Implement LRU cache keyed by `hash(content)` to skip re-parsing

---

## Implementation Strategy

### Phase 1: CRITICAL FIXES (90min)
1. Mobile touch targets (10min)
2. ServerIcon a11y (10min)
3. OAuth stub → real flow (30min)
4. Multiple icon button fixes (15min)
5. Layout collapse on mobile (20min)

**Result:** Mobile UX functional, auth working, basic a11y.

### Phase 2: HIGH-PRIORITY (90min)
6. Icon button a11y labels (15min)
7. Drag-drop keyboard fallback (25min)
8. Spinner animation + prefers-reduced-motion (10min)
9. ChatComposer attachment UI (35min)
10. Contrast fix (10min)

**Result:** Full a11y compliance, messaging features discoverable, animation accessible.

### Phase 3: MEDIUM-PRIORITY (120min)
11-20: Focus traps, animation consistency, textarea perf, scroll perf, settings wiring, voice icons, unsaved changes, memory list, micro-interactions.

**Result:** Polish, performance, user flows complete.

### Phase 4: LOW-PRIORITY (60min)
21-25: Landscape scaling, member list overflow, function allocation, GPU hints, markdown caching.

**Result:** Optimization complete, 60fps sustained.

---

## Validation Checklist

- [ ] Parse check: `node --check` all .js files
- [ ] Mobile viewport: Test 375px, 768px, 1920px
- [ ] Touch: All interactive elements ≥48px
- [ ] Keyboard: Tab through all UI; Escape closes modals
- [ ] Screen reader (NVDA/JAWS): Announce buttons, headings, form labels
- [ ] Contrast: WCAG AA (4.5:1 small, 3:1 large) via WebAIM or browser tools
- [ ] Animation: No jank @ 60fps; Ctrl+Shift+P > Rendering > FPS meter
- [ ] Performance: Lighthouse Perf score ≥90; no CLS/LCP > 2.5s
- [ ] Voice icon clarity: Users identify voice vs. text channels without tooltip

---

## Success Metrics

- **Mobile:** 100% of controls ≥48px touch target
- **Accessibility:** WCAG 2.1 AA compliance; keyboard-only nav possible
- **Animation:** 60fps sustained; no frame drops >33ms
- **Auth:** Real OAuth flow working; <3s signin time
- **Messaging:** Attachment UI discoverable; emoji picker accessible
- **Performance:** Markdown cache hits >80%; textarea input latency <16ms
