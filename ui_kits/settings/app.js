import * as webjsx from 'webjsx';
// Imported directly from owning submodules, not the ds/components.js barrel
// -- see aicat/app.js for the measured rationale (200+ serial unbundled
// module requests when every kit pulls the full 30+-submodule barrel).
import { Topbar, Crumb, Status, Side, AppShell, Heading, Lede, Chip, Btn, Icon } from 'ds/components/shell.js';
import { Panel, Row } from 'ds/components/content.js';
import { Toggle as DsToggle, Field as DsField, useFormValidation } from 'ds/components/form-primitives.js';
import { toast } from 'ds/components/editor-primitives.js';
import { Modal, ConfirmDialog } from 'ds/components/files-modals.js';
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
    showConfirmDelete: false,
    showRestorePrompt: false,
    // Which state the notifications surface renders in. Toggled from the
    // sidebar so loading / empty / error are reachable here, not just on a
    // real backend failure.
    phase: 'ready'
};

// Inline validation for the profile fields — reuses the shared
// form-primitives Field/useFormValidation (aria-invalid + role="alert"
// ds-field-error message under the offending control) instead of inventing a
// second validation UI. Kept module-level like `state` so it survives
// re-renders; `profileValidation.errors` is read directly by Profile().
const profileValidation = useFormValidation({
    name:  [{ rule: 'required', message: 'name is required.' }],
    email: [{ rule: 'required', message: 'email is required.' }, { rule: 'email', message: 'enter a valid email address.' }]
});

// Icon names resolve via ds's shared line-icon set (never literal ASCII
// glyphs -- AGENTS.md bans decorative unicode chars in source).
const sections = [
    { id: 'profile',   label: 'profile',      icon: 'user' },
    { id: 'theme',     label: 'theme',        icon: 'settings' },
    { id: 'notify',    label: 'notifications',icon: 'megaphone' },
    { id: 'api',       label: 'api keys',     icon: 'lock' },
    { id: 'danger',    label: 'danger zone',  icon: 'warn' }
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

// Routed through the shared Modal shell (files-modals/modal-shell.js) rather
// than hand-rolled .ds-modal-backdrop markup, so this dialog gets the same
// focus trap / Escape-to-close / autofocus wiring every other modal in the
// SDK gets for free instead of silently having none of it.
function DiscardConfirmModal({ onConfirm, onCancel }) {
    const draft = state.draft;
    const timestamp = draft?.timestamp ? new Date(draft.timestamp).toLocaleString() : 'unknown time';
    return Modal({
        onClose: onCancel,
        kind: 'small',
        head: 'Discard unsaved changes?',
        bodyClass: 'ds-modal-body ds-modal-body-form',
        body: [
            h('p', { class: 'ds-modal-note' }, 'You have unsaved changes. A draft was saved at ' + timestamp + '.'),
            h('div', { class: 'ds-draft-preview' },
                'Name: ' + state.name, h('br'), 'Email: ' + state.email, h('br'),
                draft && draft.theme && draft.theme !== 'auto' ? ['Theme: ' + draft.theme, h('br')] : null
            )
        ],
        actions: [
            h('button', { class: 'btn', onclick: () => { restoreDraft(draft); onCancel(); } }, 'Restore draft'),
            h('button', { class: 'btn btn-primary danger ds-btn-warn', onclick: onConfirm }, 'Discard & continue')
        ]
    });
}

// Mount-time counterpart to DiscardConfirmModal: a prior session's autosave
// was found in localStorage before this view's first render. Same Modal
// shell (focus trap / Escape / autofocus for free), different framing --
// there is no in-progress edit to discard here, only a past one to apply or
// drop.
function RestoreDraftModal({ onRestore, onDismiss }) {
    const draft = state.draft;
    const timestamp = draft?.timestamp ? new Date(draft.timestamp).toLocaleString() : 'unknown time';
    return Modal({
        onClose: onDismiss,
        kind: 'small',
        head: 'Restore unsaved draft?',
        bodyClass: 'ds-modal-body ds-modal-body-form',
        body: [
            h('p', { class: 'ds-modal-note' }, 'A draft from a previous session was saved at ' + timestamp + '.'),
            h('div', { class: 'ds-draft-preview' },
                'Name: ' + (draft?.name ?? '') , h('br'), 'Email: ' + (draft?.email ?? '')
            )
        ],
        actions: [
            h('button', { class: 'btn', onclick: onDismiss }, 'Discard draft'),
            h('button', { class: 'btn btn-primary', onclick: onRestore }, 'Restore draft')
        ]
    });
}

function Field({ label, hint, children }) {
    // Label voice matches the shared form-primitives Field used by name/email
    // just above (.ds-field-label -- normal-case, fs-sm) instead of the
    // .ds-field-eyebrow "eyebrow" motif (uppercase, mono, letter-spaced) that
    // .ds-slide-eyebrow / .ds-auth-field-label / .ds-lightbox-tag share. That
    // motif is for category tags sitting above a heading/card, not a form
    // field's own label -- reusing it here for handle/bio made this one panel
    // mix two label casings (HANDLE/BIO vs name/email) for no reason tied to
    // meaning. Picked lowercase over normalizing name/email up to match
    // signin's password/email fields (which DO use the eyebrow class) because
    // .t-label, the house label recipe both classes build on, is normal-case
    // by default -- uppercase there is an auth-screen embellishment, not a
    // form-field-label convention -- and because it makes handle/bio consistent
    // with the majority (and more capable: validation-aware) Field usage
    // already in this same panel.
    return h('label', { class: 'ds-field ds-field-block' },
        h('span', { class: 'ds-field-label' }, label),
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

// Validate one field on blur (not on every keystroke — errors should not
// flash while a user is mid-type) and re-render so the inline ds-field-error
// message appears/clears under the control.
function validateProfileField(name, value) {
    profileValidation.validateField(name, value);
    kit.render();
}

// Save-bar handler: re-validate the profile fields before persisting, same
// as any real form. On failure, surface it as a toast (transient, ambient
// feedback for an already-applied action attempt) AND jump to the profile
// section so the two inline ds-field-error messages are actually visible —
// a toast alone would tell the user something failed without showing where.
function onSaveClick() {
    const { valid } = profileValidation.validate({ name: state.name, email: state.email });
    if (!valid) {
        state.section = 'profile';
        toast({ message: 'could not save — fix the highlighted fields.', kind: 'error' });
        kit.render();
        return;
    }
    saveDraft();
    state.dirty = false;
    state.lastSaved = Date.now();
    toast({ message: 'settings saved.', kind: 'success' });
    kit.render();
}

// Bio is "one sentence, plain text" (its own hint says so) but the fixed
// rows:3 box left ~2 empty lines below a real one-line bio -- confirmed live
// via screenshot. Auto-grow to content instead of a bigger-than-needed fixed
// box: same technique as ChatComposer's autoGrow (src/components/chat/
// composer.js) -- reset height to 'auto' then read scrollHeight. The rAF here
// is load-bearing, not just parity with the composer's own debounce: webjsx's
// createDOMElement (vendor/webjsx/createDOMElement.js) calls `ref` BEFORE the
// node is appended to its parent, so a synchronous read on mount hits a
// still-detached textarea whose scrollHeight is always 0 (confirmed live --
// the field collapsed to a sliver on first paint). Deferring one frame runs
// the measurement after the node is actually in the document, on both mount
// and the oninput-triggered re-render. CSS (.ds-bio-input, kits-appended.css)
// sets resize:none + max-height so a pasted wall of text scrolls internally
// instead of growing unbounded.
function autoGrowBio(el) {
    if (!el) return;
    requestAnimationFrame(() => {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    });
}

function Profile() {
    // Was panel-spine (accent left rail on every panel) for a settings-kit
    // "visual identity" -- an accent stripe repeated on every card is the
    // generic AI-dashboard tell, not identity; dropped in favor of the same
    // plain .panel every other generic-utility kit uses.
    return Panel({ title: 'profile', class: 'ds-panel-gap', children: h('div', { class: 'ds-settings-body' },
        // name/email use the shared form-primitives Field (inline
        // aria-invalid + role="alert" error message), not the local
        // hint-only Field() above, so validation feedback is real and
        // reachable by assistive tech rather than a decorative note.
        DsField({ label: 'name', hint: profileValidation.errors.name ? null : 'shown on commits and PRs.', error: profileValidation.errors.name, required: true, children:
            h('input', { class: 'input', value: state.name,
                oninput: (e) => { state.name = e.target.value; state.dirty = true; saveDraft(); kit.render(); },
                onblur: (e) => validateProfileField('name', e.target.value) }) }),
        DsField({ label: 'email', hint: profileValidation.errors.email ? null : 'used for git identity. never mailed.', error: profileValidation.errors.email, required: true, children:
            h('input', { class: 'input', type: 'email', value: state.email,
                oninput: (e) => { state.email = e.target.value; state.dirty = true; saveDraft(); kit.render(); },
                onblur: (e) => validateProfileField('email', e.target.value) }) }),
        Field({ label: 'handle', children:
            h('input', { class: 'input', value: state.handle, oninput: (e) => { state.handle = e.target.value; state.dirty = true; saveDraft(); kit.render(); } }) }),
        Field({ label: 'bio', hint: 'one sentence. plain text.', children:
            h('textarea', { class: 'input ds-bio-input', rows: 2,
                ref: autoGrowBio,
                oninput: (e) => { state.bio = e.target.value; state.dirty = true; saveDraft(); autoGrowBio(e.target); kit.render(); } }, state.bio) })
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
            Toggle({ on: state.motion, onChange: (v) => state.motion = v, label: state.motion ? 'animations on' : 'animations off' }) }),
        // Static reference pair -- every live toggle above only ever shows ONE
        // of its two states at a time (whatever state.* currently holds), so
        // there was no place a viewer could see checked vs unchecked side by
        // side to confirm the visual difference is legible. These two are
        // deliberately non-interactive (no onChange) and exist only as a
        // documentation strip, not a real setting.
        Field({ label: 'toggle states (reference)', hint: 'both states shown together — not a live setting.', children:
            h('div', { class: 'ds-btn-row ds-btn-row-tight' },
                h('div', { class: 'ds-toggle-state-sample' },
                    DsToggle({ checked: false, label: 'unchecked', onChange: (v) => { /* lint-dead-controls:allow -- static reference pair, not a live setting */ } }),
                    h('span', { class: 'ds-hint-sm' }, 'unchecked')
                ),
                h('div', { class: 'ds-toggle-state-sample' },
                    DsToggle({ checked: true, label: 'checked', onChange: (v) => { /* lint-dead-controls:allow -- static reference pair, not a live setting */ } }),
                    h('span', { class: 'ds-hint-sm' }, 'checked')
                )
            ) })
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
            // Export is reversible (a copy of your own data) -- it should
            // read as a normal, safe action, not share the alarming
            // hot-pink/red severity signal that delete needs to actually mean
            // something. Same size/weight/position as delete previously made
            // "harmless" and "irreversible" indistinguishable at a glance.
            h('button', { class: 'btn' }, 'export account'),
            h('button', { class: 'btn ds-btn-warn', onclick: () => { state.showConfirmDelete = true; kit.render(); } }, 'delete account')
        )
    ) });
}

// Same shared-Modal-shell reasoning as DiscardConfirmModal above.
function DeleteConfirmModal({ onConfirm, onCancel }) {
    return ConfirmDialog({
        title: 'Delete account?',
        message: 'This permanently deletes your account and cannot be undone. There is no recovery.',
        confirmLabel: 'delete account',
        destructive: true,
        onConfirm,
        onCancel
    });
}

function App() {
    const view = { profile: Profile, theme: Theme, notify: Notify, api: ApiKeys, danger: Danger }[state.section]();
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'settings', items: [['index', '../../'], ['source', 'https://github.com/AnEntrypoint/design']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'settings · ' + state.section }),
        side: Side({
            sections: [
                { group: 'sections', items: sections.map((s) => ({
                    glyph: Icon(s.icon, { size: 14 }), label: s.label,
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
                state.showRestorePrompt ? RestoreDraftModal({
                    onDismiss: () => { clearDraft(); state.showRestorePrompt = false; kit.render(); },
                    onRestore: () => { restoreDraft(state.draft); state.dirty = true; state.showRestorePrompt = false; kit.render(); }
                }) : null,
                state.showConfirmDiscard ? DiscardConfirmModal({
                    onCancel: () => { state.showConfirmDiscard = false; kit.render(); },
                    onConfirm: () => { state.dirty = false; clearDraft(); state.showConfirmDiscard = false; kit.render(); }
                }) : null,
                state.showConfirmDelete ? DeleteConfirmModal({
                    onCancel: () => { state.showConfirmDelete = false; kit.render(); },
                    onConfirm: () => { state.showConfirmDelete = false; state.section = 'profile'; kit.render(); }
                }) : null,
                state.dirty ? h('div', { class: 'ds-savebar' },
                    h('span', { class: 'ds-savebar-note' }, 'unsaved changes · draft auto-saved'),
                    h('button', { class: 'btn', onclick: () => { state.showConfirmDiscard = true; kit.render(); } }, 'discard'),
                    h('button', { class: 'btn btn-primary', onclick: onSaveClick }, 'save')
                ) : null
            )
        ],
        status: Status({
            left: ['settings', '- ' + state.section, state.dirty ? '- dirty' : '- saved', '- prefs ' + state.phase],
            right: ['247420 / mmxxvi']
        })
    });
}

// A draft auto-saved in a prior session (loadDraft() reads localStorage, not
// the in-memory `state.draft` that saveDraft()/restoreDraft() operate on
// mid-session) is otherwise invisible on a fresh load: the seed profile
// renders as if nothing happened, silently orphaning the autosave forever.
// Surfacing it here — before first mount — is what makes a returning user's
// unsaved work reachable at all.
if (loadDraft()) state.showRestorePrompt = true;

const kit = mountKit({ root, view: App, screen: '10 Settings' });
