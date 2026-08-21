// openCommandPalette / closeCommandPalette — the freddie dashboard's Cmd+K
// palette trigger. `renderDashboardShell`/`buildNavPaletteActions` (the
// AppShell/Topbar/Side/Status composition and the palette's action list)
// live in ./freddie/dashboard-shell.js; this module only owns the imperative
// open/close over the CommandPalette overlay primitive, since freddie's own
// src/web/app.js dynamic-imports open/closeCommandPalette for its Ctrl+K
// handler and neither existed anywhere in this SDK before.

import * as webjsx from '../../vendor/webjsx/index.js';
import { CommandPalette } from './overlay-primitives.js';

// ---- openCommandPalette / closeCommandPalette ------------------------------
//
// Imperative singleton mount over the CommandPalette component, mirroring
// the toast() pattern in editor-primitives/toast.js: one host element
// lazily appended to <body>, applyDiff'd in place rather than requiring the
// consumer to own palette open/closed state in their own render loop.
let _paletteHost = null;
function ensurePaletteHost() {
    if (typeof document === 'undefined') return null;
    if (_paletteHost && document.body.contains(_paletteHost)) return _paletteHost;
    _paletteHost = document.createElement('div');
    _paletteHost.className = 'ds-command-palette-host';
    document.body.appendChild(_paletteHost);
    return _paletteHost;
}

export function closeCommandPalette() {
    const host = ensurePaletteHost();
    if (host) webjsx.applyDiff(host, null);
}

// openCommandPalette({ actions, onSelect })
//   actions: palette items — [{ id, label, group?, icon?, hint?, action?|run? }]
//   onSelect(item): optional override; default behavior invokes the item's
//   own handler. buildNavPaletteActions() (./freddie/dashboard-shell.js)
//   builds items with an `action` callback; support `run` too so any
//   consumer-built item using that naming keeps working.
export function openCommandPalette({ actions = [], onSelect } = {}) {
    const host = ensurePaletteHost();
    if (!host) return;
    const handleSelect = (item) => {
        closeCommandPalette();
        if (onSelect) onSelect(item);
        else if (item && typeof item.action === 'function') item.action();
        else if (item && typeof item.run === 'function') item.run();
    };
    webjsx.applyDiff(host, CommandPalette({
        open: true, items: actions,
        onSelect: handleSelect,
        onClose: closeCommandPalette,
    }));
}
