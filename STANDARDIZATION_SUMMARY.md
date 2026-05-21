# Component Prop Standardization Summary

**Project**: anentrypoint-design  
**Version**: 0.0.127  
**Date**: 2026-05-21  
**Status**: ✅ Backward Compatible

## What Changed

Standardized component prop naming across the SDK for consistency, clarity, and future TypeScript support.

### Btn Component
```js
// Old → New
Btn({ primary: true })      → Btn({ variant: 'primary' })
Btn({ ghost: true })        → Btn({ variant: 'ghost' })
Btn({ })                    → Btn({ variant: 'default' }) // or omit
```

**Files Modified**: `src/components/shell.js`

### Row Component
```js
// Old → New
Row({ active: true })       → Row({ state: 'active' })
Row({ active: false })      → Row({ state: 'default' }) // or omit
Row({ selected: true })     → Row({ state: 'active' })
```

**Files Modified**: `src/components/content.js`

### ChatMessage Component
```js
// Old → New
ChatMessage({ who: 'you' })         → ChatMessage({ role: 'user' })
ChatMessage({ who: 'them' })        → ChatMessage({ role: 'assistant' })
```

**Files Modified**: `src/components/chat.js`

### TreeItem Component
```js
// Internal refactor only — no API change
// hasKids variable → hasChildren prop (optional)
```

**Files Modified**: `src/components/editor-primitives.js`

## Key Principles

1. **Explicit over implicit**: Enum props vs. multiple boolean flags
2. **Semantic clarity**: `role` instead of `who`, `state` instead of `active`
3. **Consistency**: All variants use same pattern
4. **Backward compatible**: Old props still work during deprecation period

## Files Changed

### Core Components
- `/src/components/shell.js` — Btn variant prop
- `/src/components/content.js` — Row state prop
- `/src/components/chat.js` — ChatMessage role prop
- `/src/components/editor-primitives.js` — TreeItem hasChildren prop

### Documentation (New)
- `/COMPONENT_API.md` — Complete prop reference and examples
- `/MIGRATION_GUIDE.md` — Step-by-step migration instructions
- `/STANDARDIZATION_SUMMARY.md` — This file

## Backward Compatibility

All changes maintain full backward compatibility:

| Component | Old Prop | Status | Replacement |
|-----------|----------|--------|------------|
| Btn | `primary` | ⚠️ Deprecated (v0.0.127+) | `variant: 'primary'` |
| Btn | `ghost` | ⚠️ Deprecated (v0.0.127+) | `variant: 'ghost'` |
| Row | `active` | ⚠️ Deprecated (v0.0.127+) | `state: 'active'` |
| Row | `selected` | ⚠️ Deprecated (v0.0.127+) | `state: 'active'` |
| ChatMessage | `who` | ⚠️ Deprecated (v0.0.127+) | `role: 'user' \| 'assistant'` |

**Deprecation Period**: v0.0.127 → v1.0.0 (estimated 6-12 months)  
**Removal**: v1.0.0+ (full removal)

## Migration Path

### Phase 1: Awareness (Now)
- Review COMPONENT_API.md for new prop names
- Understand deprecation timeline
- Plan migration schedule

### Phase 2: Update (Next 1-3 sprints)
- Replace old props with new ones
- Run tests to verify no regressions
- Update internal examples and docs

### Phase 3: Cleanup (Before v1.0)
- Audit codebase for any remaining old props
- Update all downstream consumers
- Prepare for v1.0 release

## Build & Test

```bash
# Install dependencies
npm install

# Build with new props
node scripts/build.mjs

# Test (if applicable)
npm test

# Visual verification
# Open dist/ in browser and test Btn, Row, ChatMessage components
```

## Examples

### Before Migration
```js
import { Btn, Row, ChatMessage } from './components';

Btn({ primary: true, children: 'Save' })
Row({ title: 'item', active: true })
ChatMessage({ who: 'you', text: 'hello' })
```

### After Migration
```js
import { Btn, Row, ChatMessage } from './components';

Btn({ variant: 'primary', children: 'Save' })
Row({ title: 'item', state: 'active' })
ChatMessage({ role: 'user', text: 'hello' })
```

## API Surface

### Btn Variants
- `variant="primary"` — Primary action (high emphasis)
- `variant="ghost"` — Secondary action (low emphasis)
- `variant="default"` — Default button (medium emphasis)

### Row States
- `state="active"` — Selected/active state
- `state="default"` — Inactive/unselected state

### ChatMessage Roles
- `role="user"` — User message (side: right)
- `role="assistant"` — Assistant message (side: left)

### TreeItem
- `hasChildren?: boolean` — Optional explicit flag
- Inferred from `children` prop by default

## Documentation & Resources

1. **Full API Reference**: `COMPONENT_API.md`
   - Complete prop signatures
   - Usage examples
   - CSS classes
   - Accessibility standards

2. **Migration Guide**: `MIGRATION_GUIDE.md`
   - Step-by-step instructions
   - Find & replace patterns
   - Troubleshooting
   - FAQ

3. **Component Source**: `src/components/*.js`
   - Implementation details
   - Backward compatibility logic
   - Comments explaining mapping

## Testing Checklist

- [ ] All components render without errors
- [ ] Styles apply correctly (CSS classes match)
- [ ] Old props trigger correct CSS classes (backward compat)
- [ ] New props work as documented
- [ ] Accessibility attributes present (role, aria-*)
- [ ] No console warnings/errors
- [ ] Build completes successfully

## Long-term Benefits

1. **Consistency**: Unified API across all components
2. **Clarity**: Enum props are self-documenting
3. **TypeScript**: Union type props = better IDE support
4. **Maintainability**: Single pattern is easier to document
5. **Future-proof**: Foundation for v1.0 and beyond

## Questions?

- **API Questions**: See COMPONENT_API.md
- **Migration Help**: See MIGRATION_GUIDE.md
- **Implementation Details**: Check component source files
- **Issue Reports**: GitHub issues with `[standardization]` tag

---

**Summary**: Component prop naming is now standardized for consistency and clarity. All changes are backward compatible during a 6-12 month deprecation period. See COMPONENT_API.md and MIGRATION_GUIDE.md for complete details.
