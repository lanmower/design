import * as webjsx from 'webjsx';
// Imported directly from owning submodules, not the ds/components.js barrel
// -- see aicat/app.js for the measured rationale (200+ serial unbundled
// module requests when every kit pulls the full 30+-submodule barrel).
import { Topbar, Crumb, Status, Side, AppShell, Heading, Lede, Chip, Btn } from 'ds/components/shell.js';
import { Panel, Row } from 'ds/components/content.js';
import { Toggle as DsToggle } from 'ds/components/form-primitives.js';
import { mountKit } from 'ds/bootstrap.js';
import { shortUid } from 'ds/uid.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

const state = {
    section: 'profile',
    name: 'lanmower',
    email: 'almagestfraternite@247420.xyz',
    handle: '@247420',
    bio: 'creative department of the internet. always open. always a little high.',
    theme: 'auto',
    motion: true,
    notify: { mentions: true, releases: true, marketing: false },
    api_key: 'sk-247420-*******-c2a',
    dirty: false,
    lastSaved: null,
    draft: null,
    showConfirmDiscard: false,
    // Which state the notifications surface renders in. Toggled from the
    // sidebar so loading / empty / error are reachable here, not just on a
    // real backend failure.
    phase: 'ready'
};

const sections = [
    { id: 'profile',   label: 'profile',      glyph: '@' },
    { id: 'theme',     label: 'theme',        glyph: '*' },
    { id: 'notify',    label: 'notifications',glyph: '~' },
    { id: 'api',       label: 'api keys',     glyph: '⌘' },
    { id: 'danger',    label: 'danger zone',  glyph: '!' }
];

// Draft management: auto-save to localStorage on every dirty change
function saveDraft() {
    const draft = {
        name: state.name,
        email: state.email,
        handle: state.handle,
        bio: state.bio,
        theme: state.theme,
        motion: state.motion,
        notify: { ...state.notify },
        timestamp: Date.now()
    };
    localStorage.setItem('settings-draft', JSON.stringify(draft));
    state.draft = draft;
}

function loadDraft() {
    const stored = localStorage.getItem('settings-draft');
    if (stored) {
        try {
            const draft = JSON.parse(stored);
            state.draft = draft;
            return draft;
        } catch (e) {
            return null;
        }
    }
    return null;
}

function restoreDraft(draft) {
    if (draft) {
        state.name = draft.name;
        state.email = draft.email;
        state.handle = draft.handle;
        state.bio = draft.bio;
        state.theme = draft.theme;
        state.motion = draft.motion;
        state.notify = { ...draft.notify };
    }
}

function clearDraft() {
    localStorage.removeItem('settings-draft');
    state.draft = null;
}

function DiscardConfirmModal({ onConfirm, onCancel }) {
    const draft = state.draft;
    const timestamp = draft?.timestamp ? new Date(draft.timestamp).toLocaleString() : 'unknown time';
    return h('div', { class: 'ds-modal-backdrop', onclick: (e) => { if (e.target === e.currentTarget) onCancel(); } },
        h('div', { class: 'ds-modal ds-modal-small ds-settings-modal' },
            h('div', { class: 'ds-modal-head' }, 'Discard unsaved changes?'),
            h('div', { class: 'ds-modal-body ds-modal-body-form' },
                h('p', { class: 'ds-modal-note' }, 'You have unsaved changes. A draft was saved at ' + timestamp + '.'),
                h('div', { class: 'ds-draft-preview' },
                    'Name: ' + state.name, h('br'), 'Email: ' + state.email, h('br'),
                    draft && draft.theme && draft.theme !== 'auto' ? ['Theme: ' + draft.theme, h('br')] : null
                ),
                h('div', { class: 'ds-modal-actions' },
                    h('button', { class: 'btn', onclick: () => { restoreDraft(draft); onCancel(); } }, 'Restore draft'),
                    h('button', { class: 'btn btn-primary danger ds-btn-warn', onclick: onConfirm }, 'Discard & continue')
                )
            )
        )
    );
}

function Field({ label, hint, children }) {
    return h('label', { class: 'ds-field ds-field-block' },
        h('span', { class: 'ds-field-eyebrow' }, label),
        children,
        hint ? h('span', { class: 'ds-hint-sm' }, hint) : null
    );
}

function Toggle({ on, onChange, label }) {
    return DsToggle({
        checked: on,
        label,
        onChange: (v) => { onChange(v); state.dirty = true; kit.render(); }
    });
}

function Profile() {
    return Panel({ title: 'profile', class: 'ds-panel-gap', children: h('div', { class: 'ds-settings-body' },
        Field({ label: 'name', hint: 'shown on commits and PRs.', children:
            h('input', { class: 'input', value: state.name, oninput: (e) => { state.name = e.target.value; state.dirty = true; saveDraft(); kit.render(); } }) }),
        Field({ label: 'email', hint: 'used for git identity. never mailed.', children:
            h('input', { class: 'input', type: 'email', value: state.email, oninput: (e) => { state.email = e.target.value; state.dirty = true; saveDraft(); kit.render(); } }) }),
        Field({ label: 'handle', children:
            h('input', { class: 'input', value: state.handle, oninput: (e) => { state.handle = e.target.value; state.dirty = true; } }) }),
        Field({ label: 'bio', hint: 'one sentence. plain text.', children:
            h('textarea', { class: 'input', rows: 3, oninput: (e) => { state.bio = e.target.value; state.dirty = true; saveDraft(); kit.render(); } }, state.bio) })
    ) });
}

function Theme() {
    const opts = [['auto', 'auto'], ['light', 'light'], ['dark', 'dark']];
    return Panel({ title: 'theme', class: 'ds-panel-gap', children: h('div', { class: 'ds-settings-body' },
        Field({ label: 'mode', children: h('div', { class: 'ds-btn-row ds-btn-row-tight' },
            ...opts.map(([k, l]) => h('button', { key: k,
                class: state.theme === k ? 'btn btn-primary' : 'btn',
                onclick: () => { state.theme = k; state.dirty = true; kit.render(); } }, l))
        ) }),
        Field({ label: 'motion', hint: 'honour prefers-reduced-motion regardless.', children:
            Toggle({ on: state.motion, onChange: (v) => state.motion = v, label: state.motion ? 'animations on' : 'animations off' }) })
    ) });
}

const PHASES = ['ready', 'loading', 'empty', 'error'];

// Row-shaped shimmer for preferences still being fetched. Reuses
// .ds-event-row-skeleton + .ds-skel* (app-shell/files.css) — Row() renders the
// same title / sub / trailing-control rhythm.
function PrefsSkeleton() {
    return h('div', {},
        ...Array.from({ length: 3 }, (_, i) => h('div', { key: 'sk' + i, class: 'ds-event-row-skeleton' },
            h('span', { class: 'ds-skel ds-skel-title' }),
            h('span', { class: 'ds-skel ds-skel-meta' })
        ))
    );
}

function PrefsEmpty() {
    return h('div', { class: 'ds-empty-state' },
        h('div', { class: 'ds-empty-state-glyph' }, '[ ]'),
        h('p', { class: 'ds-empty-state-msg' }, 'no notification channels connected'),
        h('p', { class: 'ds-empty-state-hint' }, 'mentions, releases and product updates need somewhere to go. verify an email or add a webhook and the toggles for it appear here.')
    );
}

function PrefsError() {
    return h('div', { class: 'ds-alert ds-alert-error' },
        h('span', { class: 'ds-alert-icon' }, '!'),
        h('div', { class: 'ds-alert-content' },
            h('div', { class: 'ds-alert-title' }, 'preferences did not save'),
            h('div', { class: 'ds-alert-message' }, 'the server holds a newer copy of these toggles than this tab does, so saving would overwrite a change made elsewhere. reloading pulls the current values and keeps your draft alongside them.'),
            h('div', { class: 'ds-alert-retry' },
                h('button', { class: 'btn', onclick: () => { state.phase = 'ready'; kit.render(); } }, 'reload preferences')
            )
        )
    );
}

function Notify() {
    if (state.phase === 'loading') return Panel({ title: 'notifications', class: 'ds-panel-gap', children: PrefsSkeleton() });
    if (state.phase === 'error') return Panel({ title: 'notifications', class: 'ds-panel-gap', children: PrefsError() });
    if (state.phase === 'empty') return Panel({ title: 'notifications', class: 'ds-panel-gap', children: PrefsEmpty() });
    // No `code` — these are settings, not an indexed list. Carrying a one-glyph
    // code would reserve the row's 12ch leading gutter for a single character
    // and strand the label far right of its own panel edge.
    return Panel({ title: 'notifications', class: 'ds-panel-gap', children: [
        Row({ key: 'n1', title: 'mentions',  sub: 'when someone @s you',        meta: Toggle({ on: state.notify.mentions,  onChange: (v) => state.notify.mentions = v }) }),
        Row({ key: 'n2', title: 'releases',  sub: 'on every tagged build',      meta: Toggle({ on: state.notify.releases,  onChange: (v) => state.notify.releases = v }) }),
        Row({ key: 'n3', title: 'marketing', sub: 'occasional product updates', meta: Toggle({ on: state.notify.marketing, onChange: (v) => state.notify.marketing = v }) })
    ] });
}

function ApiKeys() {
    return Panel({ title: 'api keys', count: 1, class: 'ds-panel-gap', children: h('div', { class: 'ds-settings-body' },
        Field({ label: 'production key', hint: 'rotate quarterly.', children:
            h('div', { class: 'ds-btn-row' },
                h('input', { class: 'input ds-key-input', value: state.api_key, readonly: true }),
                h('button', { class: 'btn', onclick: () => { navigator.clipboard?.writeText(state.api_key); } }, 'copy'),
                h('button', { class: 'btn', onclick: () => { state.api_key = 'sk-247420-' + shortUid(8) + '-' + shortUid(5); state.dirty = true; kit.render(); } }, 'rotate')
            ) })
    ) });
}

function Danger() {
    return Panel({ title: 'danger zone', kind: 'danger', class: 'ds-panel-gap', children: h('div', { class: 'ds-settings-body ds-settings-body-stack' },
        h('p', { class: 'ds-note-quiet' }, 'these actions are permanent.'),
        h('div', { class: 'ds-btn-row' },
            h('button', { class: 'btn ds-btn-mascot' }, 'export account'),
            h('button', { class: 'btn ds-btn-warn' }, 'delete account')
        )
    ) });
}

function App() {
    const view = { profile: Profile, theme: Theme, notify: Notify, api: ApiKeys, danger: Danger }[state.section]();
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'settings', items: [['index', '../../'], ['source ->', 'https://github.com/AnEntrypoint/design']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'settings · ' + state.section }),
        side: Side({
            sections: [
                { group: 'sections', items: sections.map((s) => ({
                    glyph: s.glyph, label: s.label,
                    href: '#' + s.id, active: state.section === s.id, key: s.id,
                    onClick: (e) => { e.preventDefault(); state.section = s.id; kit.render(); }
                })) },
                // Reachable state switcher — applies to the notifications
                // section, this kit's list-shaped data surface.
                { group: 'prefs state', items: PHASES.map((p) => ({
                    glyph: h('span', { class: state.phase === p ? 'ds-dot ds-dot-on' : 'ds-dot ds-dot-off' }),
                    label: p, key: 'ph-' + p, active: state.phase === p,
                    onClick: (e) => { e.preventDefault(); state.phase = p; state.section = 'notify'; kit.render(); }
                })) }
            ]
        }),
        main: [
            h('div', { class: 'ds-app-surface ds-settings-main' },
                Heading({ level: 1, children: 'settings' }),
                Lede({ children: 'every input primitive in one surface — fields, toggles, segmented buttons, danger panel, save bar.' }),
                view,
                state.showConfirmDiscard ? DiscardConfirmModal({
                    onCancel: () => { state.showConfirmDiscard = false; kit.render(); },
                    onConfirm: () => { state.dirty = false; clearDraft(); state.showConfirmDiscard = false; kit.render(); }
                }) : null,
                state.dirty ? h('div', { class: 'ds-savebar' },
                    h('span', { class: 'ds-savebar-note' }, 'unsaved changes · draft auto-saved'),
                    h('button', { class: 'btn', onclick: () => { state.showConfirmDiscard = true; kit.render(); } }, 'discard'),
                    h('button', { class: 'btn btn-primary', onclick: () => { saveDraft(); state.dirty = false; state.lastSaved = Date.now(); kit.render(); } }, 'save')
                ) : null
            )
        ],
        status: Status({
            left: ['settings', '- ' + state.section, state.dirty ? '- dirty' : '- saved', '- prefs ' + state.phase],
            right: ['247420 / mmxxvi']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '10 Settings' });
