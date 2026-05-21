# AnEntrypoint Design System — UX Audit & Improvement Plan

**Date:** 2026-05-21  
**Scope:** Complete UX optimization across desktop, tablet (768px), and mobile (375px) viewports  
**Goal:** Absolutely perfect user experience from a user's perspective

## Current State Assessment

### ✅ Strengths
1. **Responsive Design** — Comprehensive media queries (480px, 768px+ breakpoints) + container queries
2. **Touch Targets** — Mobile buttons already have `min-height: 44px` compliance
3. **Typography** — Fluid type scaling with `clamp()` for smooth scaling across viewports
4. **Theme System** — Light/dark mode with `prefers-color-scheme` media query support
5. **Focus Visibility** — `:focus-visible` implemented across buttons, links, and form inputs
6. **Semantic Colors** — Consistent tonal system using CSS custom properties
7. **Motion** — `--dur-snap`, `--dur-base`, `--dur-slow` timing tokens defined
8. **Dark Mode** — Full `data-theme="ink"` implementation with inheritance safety

### 🔍 Audit Findings & Improvement Opportunities

#### 1. **Drag-and-Drop Support** ⚠️
**Status:** Not implemented  
**Priority:** HIGH  
**Scope:** Implement native HTML5 drag-and-drop for reorderable lists/components
- Add `.draggable` state styles
- Implement `.drag-over`, `.drag-active`, `.drag-ghost` states
- Support `.drop-zone` visual feedback
- Touch device fallback (long-press detection)

#### 2. **Context Menu Support** ⚠️
**Status:** Not implemented  
**Priority:** MEDIUM  
**Scope:** Add right-click context menus for interactive components
- Implement `.ds-context-menu` container
- Support keyboard access (Shift+F10, Ctrl+M)
- Mobile fallback (long-press triggers context menu)
- Position management (viewport-aware)

#### 3. **Accessibility Refinements** ✅ (Mostly Done)
**Status:** Partially complete  
**Priority:** HIGH  
**Action Items:**
- ✅ Focus indicators present (2px solid accent)
- ⚠️ Add focus-visible to `.row` and `.row-clickable`
- ⚠️ Add `role="button"` semantics where needed
- ⚠️ Ensure color contrast ≥ 4.5:1 in all themes (verify mascot on paper bg)
- ⚠️ Add ARIA labels to icon-only buttons
- ⚠️ Test keyboard navigation order

#### 4. **Component State Completeness** ⚠️
**Status:** Partial  
**Priority:** HIGH  
**Missing States:**
- `.disabled` state for all interactive elements
- `.loading` state with spinner feedback
- `.error` state with validation styling
- `.success` state with confirmation feedback
- `.readonly` state for inputs
- Indeterminate states (e.g., checkboxes)

#### 5. **Micro-Interactions & Polish** ⚠️
**Status:** Basic implementation  
**Priority:** MEDIUM  
**Improvements Needed:**
- `.active:scale(0.98)` on buttons (micro-press feedback)
- Smooth color transitions on hover (200ms)
- Subtle scale on row hover (1.01x)
- Loading spinner animation
- Toast notification slide-in
- Modal backdrop fade-in
- Skeleton loading states

#### 6. **Mobile-Specific Enhancements** ⚠️
**Status:** Good baseline, needs polish  
**Priority:** MEDIUM  
**Action Items:**
- Double-tap zoom disable for buttons
- `-webkit-user-select: none` on interactive elements
- `-webkit-tap-highlight-color: transparent` standardization
- Prevent viewport zoom on input focus (iOS)
- Bottom sheet patterns for mobile modals
- Swipe gesture feedback

#### 7. **Theme Transition Smoothness** ⚠️
**Status:** Instantaneous switching  
**Priority:** LOW  
**Action Item:** Add `transition: background-color 200ms, color 200ms` on theme change

#### 8. **Performance Optimizations** ⚠️
**Status:** Good baseline  
**Priority:** MEDIUM  
**Action Items:**
- Add `will-change: background-color` on hover-interactive elements
- Use `transform: translateZ(0)` for GPU acceleration on animations
- Lazy-load font weights (only load 400, 600, 700)
- Minimize repaints with ` contain: layout`

#### 9. **Form Input Polish** ⚠️
**Status:** Basic styling  
**Priority:** MEDIUM  
**Action Items:**
- Add placeholder color consistency
- Implement `.invalid` state with error styling
- Add `.required` indicator styling
- Implement `.optional` label styling
- Password visibility toggle
- Clear button for text inputs

#### 10. **Color Contrast Verification** ⚠️
**Status:** Needs verification  
**Priority:** HIGH  
**Action Items:**
- Verify `--mascot` (#E84B8A) on paper (#F6F5F1) — ratio ~3.2:1 ❌
- Verify `--flame` (#FF5A1F) on paper — ratio ~5.1:1 ✅
- Verify all text colors on backgrounds (WCAG AA minimum 4.5:1)
- Test in both light and dark modes

#### 11. **Responsive Image/Media** ⚠️
**Status:** Not implemented  
**Priority:** MEDIUM  
**Action Items:**
- Add `max-width: 100%` to images
- Implement picture elements for responsive images
- Add `aspect-ratio` containers for video embeds
- Lazy-load images below fold

#### 12. **Edge Case Handling** ⚠️
**Status:** Partial  
**Priority:** MEDIUM  
**Action Items:**
- Long text overflow: add `text-overflow: ellipsis` where needed
- Empty states: `.empty` class exists, needs icon/imagery
- Loading states: implement skeleton screens
- Error boundaries: `.error-state` styling
- RTL language support: prepare CSS for RTL (haven't tested)
- Emoji rendering: baseline-align emojis
- Overflow scrolling: implement momentum scroll on iOS (`-webkit-overflow-scrolling: touch`)

## Implementation Roadmap

### Phase 1: Critical Fixes (High Impact)
- [ ] Accessibility improvements (focus, ARIA, color contrast)
- [ ] Add missing component states (disabled, error, loading)
- [ ] Form input enhancements
- [ ] Mobile-specific fixes

### Phase 2: Enhancements (Medium Impact)
- [ ] Micro-interactions and polish
- [ ] Drag-and-drop support
- [ ] Context menus
- [ ] Theme transition smoothness

### Phase 3: Polish & Optimization (Low Impact)
- [ ] Performance optimizations
- [ ] Edge case handling
- [ ] Documentation updates

## Testing Checklist

- [ ] Desktop (1440px+): all components, all states, light/dark modes
- [ ] Tablet (768px): layout changes, touch targets, interaction polish
- [ ] Mobile (375px): single-column, button sizing, keyboard access
- [ ] Keyboard navigation: Tab, Enter, Esc, arrow keys
- [ ] Screen reader (NVDA/JAWS): semantic HTML, ARIA labels
- [ ] Theme switching: instant, no FOUC, state preservation
- [ ] Performance: <100ms interaction response, 60fps animations
- [ ] Browser compatibility: Chrome, Safari, Firefox (latest 2 versions)

## Success Criteria

✅ **100%** of interactive elements have `:focus-visible` styles  
✅ **100%** of clickable targets ≥44px on mobile  
✅ **100%** of text has ≥4.5:1 color contrast  
✅ **0** console errors or warnings  
✅ **Keyboard navigable** — all features accessible via Tab + Enter/Esc/arrows  
✅ **Screen reader tested** — all interactive components announced correctly  
✅ **Smooth animations** — all transitions 60fps, no jank  
✅ **Responsive** — no layout breaks at any viewport width  
✅ **Perfect UX** — delightful, smooth, predictable behavior across all devices
