// SkillsConfig — skill list + detail panel, ported from pi-web's
// SkillsConfig.tsx UX (modal, sidebar list grouped/searchable, detail pane
// with enable/disable toggle) but rebuilt over freddie's real skill contract,
// not pi-web's installable-package model:
//
//   { file, name, description, frontmatter, body, platforms? }
//
// (see freddie's AGENTS.md — `src/skills/index.js::listSkills/loadSkill`,
// `skills/<category>/<name>/SKILL.md` with YAML frontmatter). There is no
// install/update/search-registry flow here: freddie skills are local
// filesystem discovery only (`skills/`, `~/.freddie/skills/`), so the only
// host-facing action is enable/disable. `category` (derived from the skill's
// path — the directory directly under a `skills/` root) replaces pi-web's
// source/scope grouping (project/global/path), and `platforms` renders as
// chips in place of pi-web's version/update-check UI.
//
// Usage (consumer wires its own state/fetch, this is presentation-only):
//   SkillsConfig({ skills, selected, onSelect, onToggle, onClose })
//
// Props:
//   skills    : [{ file, name, description, category?, platforms?, enabled, frontmatter?, body? }]
//               category is derived from `file`'s path when not passed explicitly
//               (segment directly under the nearest `skills` directory).
//               enabled drives the toggle and the sidebar status dot.
//   selected  : name of the currently-selected skill, or null
//   loading   : bool — sidebar shows a loading row instead of the list
//   error     : string|null — sidebar shows this instead of the list
//   busyName  : name of the skill currently mid-toggle, or null
//   query     : current search text (string) — controlled by the consumer
//   onQuery   : (text) => void — fired on search input
//   onSelect  : (name) => void
//   onToggle  : (skill) => void — fired with the full skill row to flip enabled
//   onClose   : () => void
//
// No decorative glyphs beyond the kit's Icon SVGs — status communicated by a
// tone dot + text label, never color alone.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Icon } from './shell.js';
import { SearchInput } from './content.js';
const h = webjsx.createElement;

const CATEGORY_ORDER = ['software-development', 'ops', 'data', 'planning', 'creative'];

function deriveCategory(skill) {
    if (skill.category) return skill.category;
    const file = skill.file || '';
    const parts = file.split(/[/\\]/).filter(Boolean);
    const idx = parts.lastIndexOf('skills');
    if (idx >= 0 && parts.length > idx + 1) return parts[idx + 1];
    return 'other';
}

function statusTone(skill) {
    return skill.enabled === false ? 'neutral' : 'add';
}

function statusLabel(skill) {
    return skill.enabled === false ? 'disabled' : 'enabled';
}

function matchesQuery(skill, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    return (skill.name || '').toLowerCase().includes(q) ||
        (skill.description || '').toLowerCase().includes(q);
}

function SkillSidebarRow({ key, skill, active, busy, onSelect }) {
    return h('button', {
        key,
        type: 'button',
        class: 'ds-plugins-row' + (active ? ' active' : ''),
        onclick: () => onSelect(skill.name),
        'aria-pressed': active ? 'true' : 'false',
        'aria-label': skill.name + ': ' + statusLabel(skill),
    },
        h('span', { class: 'ds-plugins-dot tone-' + statusTone(skill), 'aria-hidden': 'true' }),
        h('span', { class: 'ds-plugins-row-body' },
            h('span', { class: 'ds-plugins-row-name' }, skill.name),
            skill.description
                ? h('span', { class: 'ds-plugins-row-meta' }, skill.description)
                : null),
        busy ? h('span', { class: 'ds-plugins-row-busy' }, '…') : null);
}

function SkillDetail({ skill, busy, onToggle }) {
    if (!skill) {
        return h('div', { class: 'ds-plugins-empty', role: 'status' },
            h('span', { 'aria-hidden': 'true' }, Icon('circle-dot', { size: 22 })),
            h('span', {}, 'Select a skill'));
    }
    const platforms = Array.isArray(skill.platforms) ? skill.platforms : [];
    return h('div', { class: 'ds-plugins-detail' },
        h('div', { class: 'ds-plugins-detail-head' },
            h('div', { class: 'ds-plugins-detail-title' },
                h('span', { class: 'ds-plugins-dot tone-' + statusTone(skill), 'aria-hidden': 'true' }),
                h('span', { class: 'name' }, skill.name)),
            // Only render when a consumer actually wired onToggle -- an
            // unwired toggle is a live-looking control that silently no-ops.
            onToggle
                ? h('button', {
                    type: 'button',
                    class: 'ds-plugins-toggle' + (skill.enabled !== false ? ' on' : ''),
                    disabled: busy ? true : null,
                    onclick: () => onToggle(skill),
                    'aria-pressed': skill.enabled !== false ? 'true' : 'false',
                    'aria-label': skill.enabled !== false ? 'Disable skill' : 'Enable skill',
                }, h('span', { class: 'ds-plugins-toggle-knob' }))
                : null),
        skill.description
            ? h('div', { class: 'ds-skills-description' }, skill.description)
            : null,
        h('div', { class: 'ds-plugins-fact-grid' },
            h('div', { class: 'ds-plugins-fact-label' }, 'status'),
            h('div', { class: 'ds-plugins-fact-value tone-text-' + statusTone(skill) }, statusLabel(skill)),
            h('div', { class: 'ds-plugins-fact-label' }, 'category'),
            h('div', { class: 'ds-plugins-fact-value' }, deriveCategory(skill)),
            skill.file ? h('div', { class: 'ds-plugins-fact-label' }, 'path') : null,
            skill.file ? h('div', { class: 'ds-plugins-fact-value ds-plugins-mono' }, skill.file) : null),
        h('div', { class: 'ds-plugins-requires' },
            h('div', { class: 'ds-plugins-group-label' }, 'platforms'),
            platforms.length
                ? h('div', { class: 'ds-plugins-requires-list' },
                    ...platforms.map((p) => h('span', { key: p, class: 'ds-plugins-chip' }, p)))
                : h('div', { class: 'ds-plugins-requires-empty' }, 'all platforms')),
        skill.body
            ? h('div', { class: 'ds-skills-body-group' },
                h('div', { class: 'ds-plugins-group-label' }, 'body preview'),
                h('pre', { class: 'ds-skills-body-preview' }, skill.body.slice(0, 2000)))
            : null);
}

export function SkillsConfig({
    skills = [],
    selected = null,
    loading = false,
    error = null,
    busyName = null,
    query = '',
    onQuery,
    onSelect,
    onToggle,
    onClose,
} = {}) {
    const selectedSkill = skills.find((s) => s.name === selected) || null;
    const filtered = skills.filter((s) => matchesQuery(s, query));

    // Group filtered skills by category, ordering freddie's five bundled
    // categories first, then any others (custom/`~/.freddie/skills/`) alphabetically.
    const byCategory = new Map();
    for (const s of filtered) {
        const cat = deriveCategory(s);
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat).push(s);
    }
    const otherCats = [...byCategory.keys()].filter((c) => !CATEGORY_ORDER.includes(c)).sort();
    const orderedCats = [...CATEGORY_ORDER.filter((c) => byCategory.has(c)), ...otherCats];

    // Each branch gets a distinct `key` -- without it, a transition between
    // branches (loading -> list is the common one, on the very first data
    // arrival) reuses the same DOM node in place at this tree position, and
    // webjsx's diff was observed live leaving the old branch's TEXT content
    // ("Loading…") stuck in the DOM while patching the wrapper's class/role/
    // aria-label attributes to the new (list) branch's — i.e. the skills page
    // rendered a correctly-labeled `.ds-plugins-list[role=listbox]` container
    // that still displayed "Loading…" with none of the real, already-fetched
    // skill rows visible. Distinct keys force a clean unmount/remount across
    // branches instead of an in-place patch, which a same-shaped list (this
    // one, going from a lone text child to N mapped element children) cannot
    // safely resolve as effectively-in-place attribute patch.
    const sidebarBody = loading
        ? h('div', { key: 'loading', class: 'ds-plugins-sidebar-status' }, 'Loading…')
        : error
            ? h('div', { key: 'error', class: 'ds-plugins-sidebar-status ds-plugins-status-error' }, error)
            : filtered.length === 0
                ? h('div', { key: 'empty', class: 'ds-plugins-sidebar-status' }, skills.length === 0 ? 'No skills found' : 'No skills match your search')
                : h('div', { key: 'list', class: 'ds-plugins-list', role: 'listbox', 'aria-label': 'skill list' },
                    ...orderedCats.map((cat) => h('div', { key: 'grp-' + cat, class: 'ds-skills-group' },
                        h('div', { class: 'ds-skills-group-label' }, cat),
                        ...byCategory.get(cat).map((s) => SkillSidebarRow({
                            key: s.name,
                            skill: s,
                            active: selected === s.name,
                            busy: busyName === s.name,
                            onSelect,
                        })))));

    const footerText = filtered.length + ' skill' + (filtered.length === 1 ? '' : 's') +
        (query ? ' (of ' + skills.length + ')' : '');

    return h('div', { class: 'ds-plugins-overlay', onclick: (e) => { if (e.target === e.currentTarget && onClose) onClose(); } },
        h('div', { class: 'ds-plugins-modal', role: 'dialog', 'aria-label': 'Skills' },
            h('div', { class: 'ds-plugins-header' },
                h('span', { class: 'ds-plugins-title' }, 'Skills'),
                onClose ? h('button', { type: 'button', class: 'ds-plugins-close', onclick: onClose, 'aria-label': 'Close' }, '×') : null),
            h('div', { class: 'ds-skills-search-row' },
                SearchInput({ value: query, placeholder: 'search skills…', onInput: onQuery, label: 'search skills' })),
            h('div', { class: 'ds-plugins-body' },
                h('div', { class: 'ds-plugins-sidebar' }, sidebarBody),
                h('div', { class: 'ds-plugins-main' },
                    SkillDetail({ skill: selectedSkill, busy: busyName === (selectedSkill && selectedSkill.name), onToggle }))),
            h('div', { class: 'ds-plugins-footer' },
                h('span', { class: 'ds-plugins-footer-count' }, footerText))));
}
