# Quick Migration Reference

A one-page cheat sheet for updating component props.

## Find & Replace Quick Patterns

### Btn Component
```
Find:   Btn({ primary: true
Replace: Btn({ variant: 'primary'

Find:   Btn({ ghost: true
Replace: Btn({ variant: 'ghost'
```

### Row Component
```
Find:   Row({ active: true
Replace: Row({ state: 'active'

Find:   Row({ selected: true
Replace: Row({ state: 'active'

Find:   active: true,
Replace: state: 'active',
```

### ChatMessage Component
```
Find:   who: 'you'
Replace: role: 'user'

Find:   who: 'them'
Replace: role: 'assistant'

Find:   { who: 'you',
Replace: { role: 'user',

Find:   { who: 'them',
Replace: { role: 'assistant',
```

## Props at a Glance

| Component | Old Prop | New Prop | Example |
|-----------|----------|----------|---------|
| **Btn** | `primary: true` | `variant: 'primary'` | `Btn({ variant: 'primary' })` |
| **Btn** | `ghost: true` | `variant: 'ghost'` | `Btn({ variant: 'ghost' })` |
| **Btn** | (none) | `variant: 'default'` | `Btn({ variant: 'default' })` |
| **Row** | `active: true` | `state: 'active'` | `Row({ state: 'active' })` |
| **Row** | `active: false` | `state: 'default'` | `Row({ state: 'default' })` |
| **Row** | `selected: true` | `state: 'active'` | `Row({ state: 'active' })` |
| **ChatMessage** | `who: 'you'` | `role: 'user'` | `ChatMessage({ role: 'user' })` |
| **ChatMessage** | `who: 'them'` | `role: 'assistant'` | `ChatMessage({ role: 'assistant' })` |
| **TreeItem** | (internal) | `hasChildren?: boolean` | (optional) |

## Code Conversion Examples

### Before → After

#### Btn
```js
// Before
Btn({ primary: true, children: 'Save' })
Btn({ ghost: true, children: 'Cancel' })

// After
Btn({ variant: 'primary', children: 'Save' })
Btn({ variant: 'ghost', children: 'Cancel' })
```

#### Row
```js
// Before
Row({ title: 'item', active: true })
Row({ title: 'item', selected: true })

// After
Row({ title: 'item', state: 'active' })
Row({ title: 'item', state: 'active' })
```

#### ChatMessage
```js
// Before
ChatMessage({ who: 'you', text: 'hello' })
ChatMessage({ who: 'them', text: 'hi' })

// After
ChatMessage({ role: 'user', text: 'hello' })
ChatMessage({ role: 'assistant', text: 'hi' })
```

## VSCode Find & Replace

1. Open Find & Replace: `Ctrl+H` (or `Cmd+H`)
2. Use these patterns:

```
# Pattern 1: Btn.primary
Find:    Btn\(\{\s*primary:\s*true
Replace: Btn({ variant: 'primary'

# Pattern 2: Btn.ghost
Find:    Btn\(\{\s*ghost:\s*true
Replace: Btn({ variant: 'ghost'

# Pattern 3: Row.active
Find:    active:\s*true
Replace: state: 'active'

# Pattern 4: Row.selected
Find:    selected:\s*true
Replace: state: 'active'

# Pattern 5: ChatMessage.who.you
Find:    who:\s*['"]you['"]
Replace: role: 'user'

# Pattern 6: ChatMessage.who.them
Find:    who:\s*['"]them['"]
Replace: role: 'assistant'
```

## Status Check

After migration, verify:
- [ ] No instances of `primary: true` remain
- [ ] No instances of `ghost: true` remain
- [ ] No instances of `active:` remain (unless it's a different component)
- [ ] No instances of `selected:` in Row remain
- [ ] No instances of `who: 'you'` or `who: 'them'` remain
- [ ] All CSS classes still match (should be automatic)
- [ ] App renders without console errors

## Full Docs

For complete details, see:
- `COMPONENT_API.md` — Full API reference
- `MIGRATION_GUIDE.md` — Detailed migration instructions
- `STANDARDIZATION_SUMMARY.md` — Project summary

## Timeline

| Milestone | Status | Notes |
|-----------|--------|-------|
| v0.0.127 | ✅ Live | New props available, old props deprecated |
| v0.0.128-v1.0.0-dev | Migration window | Encourage codebase updates |
| v1.0.0 | Breaking | Old props removed entirely |

**No action required** until v1.0.0, but migration recommended now.
