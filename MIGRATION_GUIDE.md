# Component Prop Standardization Migration Guide

**Version**: 0.0.127  
**Date**: 2026-05-21  
**Status**: Backward Compatible (Deprecation period begins)

## Summary

This document guides developers through migrating their codebase to use standardized component prop names. All changes are **backward compatible** — old props continue to work but trigger deprecation notices in development mode.

## Key Changes

### 1. Button Component (Btn)

**Problem**: Multiple boolean props (`primary`, `ghost`) for style variants.

**Solution**: Use single `variant` enum prop.

#### Before
```js
// Multiple boolean flags (unclear state)
Btn({ primary: true, children: 'Save' })
Btn({ ghost: true, children: 'Cancel' })
Btn({ children: 'Default' })  // no variant = default
```

#### After
```js
// Single variant prop (explicit and clear)
Btn({ variant: 'primary', children: 'Save' })
Btn({ variant: 'ghost', children: 'Cancel' })
Btn({ variant: 'default', children: 'Default' })
```

#### Migration Steps

1. **Find all Btn usages:**
   ```bash
   grep -r "Btn({" src/ --include="*.js" | grep -E "(primary|ghost)"
   ```

2. **Replace patterns:**
   - `primary: true` → `variant: 'primary'`
   - `ghost: true` → `variant: 'ghost'`
   - Remove both flags → add `variant: 'default'` (or omit, as default)

3. **Example refactor:**
   ```js
   // Before
   Btn({ primary: true, href: '#save', children: 'save' })
   Btn({ ghost: true, onClick: cancel, children: 'cancel' })

   // After
   Btn({ variant: 'primary', href: '#save', children: 'save' })
   Btn({ variant: 'ghost', onClick: cancel, children: 'cancel' })
   ```

4. **Backward compatibility:** Old code still works:
   ```js
   Btn({ primary: true, children: 'Save' })  // ⚠️ works but triggers deprecation notice
   ```

### 2. Row Component

**Problem**: Boolean `active` prop is ambiguous (doesn't distinguish selection from navigation state).

**Solution**: Use `state` enum prop for explicit state.

#### Before
```js
Row({ title: 'item', active: true })      // unclear what "active" means
Row({ title: 'item', active: false })
Row({ title: 'item', selected: true })    // different prop, same concept
```

#### After
```js
Row({ title: 'item', state: 'active' })    // explicit state
Row({ title: 'item', state: 'default' })
Row({ title: 'item', state: 'active' })    // consistent prop name
```

#### Migration Steps

1. **Find Row usages:**
   ```bash
   grep -r "Row({" src/ --include="*.js" | grep -E "(active|selected)"
   ```

2. **Replace patterns:**
   - `active: true` → `state: 'active'`
   - `active: false` → `state: 'default'` (or omit)
   - `selected: true` → `state: 'active'`
   - `selected: false` → `state: 'default'` (or omit)

3. **Example refactor:**
   ```js
   // Before
   Row({ title: 'home', active: true })
   Row({ title: 'settings', active: false })

   // After
   Row({ title: 'home', state: 'active' })
   Row({ title: 'settings', state: 'default' })
   ```

### 3. ChatMessage Component

**Problem**: Prop `who` is ambiguous (doesn't clarify role in conversation).

**Solution**: Use `role` enum prop aligned with LLM conventions.

#### Before
```js
ChatMessage({ who: 'you', text: 'hello' })
ChatMessage({ who: 'them', text: 'hi' })
```

#### After
```js
ChatMessage({ role: 'user', text: 'hello' })
ChatMessage({ role: 'assistant', text: 'hi' })
```

#### Migration Steps

1. **Find ChatMessage usages:**
   ```bash
   grep -r "ChatMessage({" src/ --include="*.js" | grep -v "export function"
   ```

2. **Replace patterns:**
   - `who: 'you'` → `role: 'user'`
   - `who: 'them'` → `role: 'assistant'`
   - For spread patterns: `{ ...msg }` → handle in message object

3. **For message objects spread into ChatMessage:**
   ```js
   // Before
   const messages = [
       { who: 'you', text: 'hello' },
       { who: 'them', text: 'hi' }
   ];
   messages.map((m, i) => ChatMessage({ ...m, key: i }))

   // After
   const messages = [
       { role: 'user', text: 'hello' },
       { role: 'assistant', text: 'hi' }
   ];
   messages.map((m, i) => ChatMessage({ ...m, key: i }))
   ```

4. **Backward compatibility:**
   ```js
   ChatMessage({ who: 'you', text: 'hello' })  // ⚠️ works but use role instead
   ```

### 4. TreeItem Component

**Problem**: Internal variable `hasKids` is colloquial and unclear.

**Solution**: Support explicit `hasChildren` prop (for future API clarity).

#### Note
This is primarily an internal refactor. No action needed for users — the component still infers `hasChildren` from the `children` prop.

#### For Future Use
```js
// Implicit (current, still works)
TreeItem({ label: 'folder', children: [...items] })

// Explicit (available for performance optimization)
TreeItem({ label: 'folder', hasChildren: true })
```

---

## Boolean Prop Patterns

This refactoring introduces a consistent pattern for boolean props across all components:

### Pattern 1: State Enums (Preferred)
Use for props that represent component state.

```js
// Pattern: state: 'state1' | 'state2' | 'default'
Row({ state: 'active' | 'default' })
Btn({ variant: 'primary' | 'ghost' | 'default' })
ChatMessage({ role: 'user' | 'assistant' })
```

**Advantages:**
- Explicit enumeration of valid values
- TypeScript support (literal union types)
- Clearer intent
- Prevents impossible combinations

### Pattern 2: Boolean Flags (For true/false states)
Use for simple on/off states (rarely needed when state enum works).

```js
// Pattern: isXxx for clarity
TreeItem({ expanded: false | true })  // currently boolean
ChatComposer({ disabled: false | true })
ChannelItem({ voiceActive: false | true })
```

**When to use:**
- Only for true binary states
- Prefer `is` prefix: `isOpen`, `isLoading`, `isDisabled`
- Use sparingly (enum pattern is usually clearer)

---

## Codebase Migration Checklist

### Phase 1: Btn Component (Primary Impact)
- [ ] Search codebase: `grep -r "primary:\|ghost:" src/ --include="*.js"`
- [ ] Update usages in: `src/components/content.js`
- [ ] Update usages in: `ui_kits/*/app.js` (if any)
- [ ] Update examples in: `site/` (if exists)
- [ ] Update tests (if applicable)
- [ ] Verify CSS class names still match (should be automatic)

### Phase 2: Row Component (Secondary Impact)
- [ ] Search codebase: `grep -r "active:\|selected:" src/ --include="*.js" | grep "Row"`
- [ ] Update usages in: `src/components/*.js`
- [ ] Update usages in: `ui_kits/*/app.js`
- [ ] Check spread patterns: `{ ...item, active: true }`

### Phase 3: ChatMessage Component (Moderate Impact)
- [ ] Search codebase: `grep -r "who:" src/components/ --include="*.js"`
- [ ] Update message objects in: `src/components/chat.js`
- [ ] Update message objects in: `src/components/freddie/helpers.js`
- [ ] Update message data in: `ui_kits/*/app.js`
- [ ] Handle spread patterns: `{ ...message }`

### Phase 4: Documentation & Examples
- [ ] Update README.md component examples
- [ ] Update inline JSDoc comments
- [ ] Update any generated API docs
- [ ] Add deprecation notices to old prop documentation

### Phase 5: Validation
- [ ] Run tests: `npm test` (or equivalent)
- [ ] Build project: `npm run build` or `node scripts/build.mjs`
- [ ] Manual smoke test in browser
- [ ] Check no console warnings for old props

---

## Finding & Replacing Patterns

### Using grep + sed (Bash)

```bash
# Find all Btn components with primary prop
grep -r "primary: true" src/components/ --include="*.js"

# Replace primary: true with variant: 'primary' (preview)
grep -r "primary: true" src/components/*.js | sed 's/primary: true/variant: '\''primary'\''/g'

# Replace in-place (use with caution)
sed -i "s/primary: true/variant: 'primary'/g" src/components/content.js
```

### Using VS Code Find & Replace

1. **Open Find & Replace**: `Ctrl+H` (or `Cmd+H` on Mac)

2. **Find Btn.primary pattern:**
   - Find: `primary:\s*true`
   - Replace: `variant: 'primary'`
   - Scope: `src/components/**/*.js`

3. **Find Btn.ghost pattern:**
   - Find: `ghost:\s*true`
   - Replace: `variant: 'ghost'`
   - Scope: `src/components/**/*.js`

4. **Find Row.active pattern:**
   - Find: `active:\s*true`
   - Replace: `state: 'active'`
   - Scope: `src/components/**/*.js`

5. **Find ChatMessage.who pattern:**
   - Find: `who:\s*'you'`
   - Replace: `role: 'user'`
   - Scope: `src/components/**/*.js`

---

## Testing the Migration

### Unit Tests
```js
// Test old props still work (with deprecation)
describe('Btn backward compat', () => {
    it('primary prop works', () => {
        const btn = Btn({ primary: true, children: 'Save' });
        expect(btn.props.class).toContain('btn-primary');
    });

    it('variant prop overrides primary', () => {
        const btn = Btn({ variant: 'ghost', primary: true, children: 'Save' });
        expect(btn.props.class).toContain('btn-ghost');
    });
});
```

### Visual Tests
1. Render old and new prop versions side-by-side
2. Verify CSS classes match (inspect element)
3. Verify behavior is identical
4. Check accessibility attributes (role, aria-*)

### Integration Tests
```js
// Test in real app context
const app = h('div', {},
    Btn({ variant: 'primary', children: 'Save' }),
    Btn({ variant: 'ghost', children: 'Cancel' }),
    Row({ title: 'item', state: 'active' })
);
```

---

## Deprecation Timeline

| Phase | Version | Timeline | Action |
|-------|---------|----------|--------|
| **1. Deprecation Period** | 0.0.127+ | Now - 6 months | Old props work, warnings in dev |
| **2. Migration Window** | 1.0.0-dev | 6-12 months | Codebase migration encouraged |
| **3. Removal** | 1.0.0 | 12+ months | Old props trigger errors |

**Current Status**: Phase 1 (Deprecation period begins now)

---

## Troubleshooting

### Issue: "prop X is deprecated" warnings in console
**Solution**: Update to use new prop name per this guide.

### Issue: Styles not applying after migration
**Solution**: Verify CSS class names are correct:
- `Btn` with `variant='primary'` → class should contain `btn-primary`
- `Row` with `state='active'` → class should contain `active`
- `ChatMessage` with `role='user'` → class should contain `you`

### Issue: Spread patterns still using old props
**Solution**: Update source objects before spreading:

```js
// Before
const msg = { who: 'you', text: 'hi' };
ChatMessage({ ...msg })

// After
const msg = { role: 'user', text: 'hi' };
ChatMessage({ ...msg })
```

### Issue: TypeScript errors after migration
**Solution**: Update prop types if using TypeScript:

```ts
// Before
type BtnProps = { primary?: boolean; ghost?: boolean };

// After
type BtnProps = { variant?: 'primary' | 'ghost' | 'default' };
```

---

## FAQ

**Q: Do I have to migrate right now?**  
A: No, old props work until v1.0.0. Migration can be gradual per file.

**Q: Will my app break if I don't migrate?**  
A: No, backward compatibility is maintained. You'll see deprecation warnings in development mode.

**Q: Can I use both old and new props together?**  
A: Not recommended. If both are provided, new prop takes precedence.

**Q: What about TypeScript typings?**  
A: Types updated for new props; old props still typed but marked `@deprecated`.

**Q: How do I turn off deprecation warnings?**  
A: Set `process.env.SUPPRESS_DEPRECATION_WARNINGS = 'true'` (dev only, not recommended).

---

## Support

- **Issues**: Open GitHub issue with `[migration]` tag
- **Questions**: See COMPONENT_API.md for full prop reference
- **Examples**: Check `ui_kits/` directories for real usage patterns
