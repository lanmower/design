// PermissionsEditor — stoat for-web's ChannelPermissionsOverview/Editor
// shape: a role-tab selector (pills) plus a scrollable, section-grouped
// permission list. Each permission is TRI-STATE (allow / neutral / deny),
// cycled by a dedicated SettingsRowTriState control living alongside the
// binary SettingsRowToggle in voice/settings-row.js.

import * as webjsx from '../../../vendor/webjsx/index.js';
import { Icon } from '../shell.js';
import { SettingsRow, SettingsRowGroup, SettingsSection } from '../voice/settings-row.js';
const h = webjsx.createElement;

export function RoleTabs({ roles = [], activeId, onSelect } = {}) {
    return h('div', { class: 'cm-perm-roletabs', role: 'tablist', 'aria-label': 'Roles' },
        ...roles.map((r) => h('button', {
            type: 'button', class: 'cm-perm-roletab' + (r.id === activeId ? ' is-active' : ''),
            role: 'tab', 'aria-selected': r.id === activeId ? 'true' : 'false',
            style: r.color ? `--perm-role-color:${r.color}` : null,
            onclick: () => onSelect && onSelect(r.id),
        },
            r.color ? h('span', { class: 'cm-perm-roletab-dot' }) : null,
            h('span', null, r.name || r.id)
        ))
    );
}

// value: 'allow' | 'deny' | null (neutral/inherit)
export function PermissionRow({ title, description, value, onCycle } = {}) {
    const next = value === 'allow' ? 'deny' : value === 'deny' ? null : 'allow';
    const label = value === 'allow' ? 'Allowed' : value === 'deny' ? 'Denied' : 'Neutral';
    const icon = value === 'allow' ? 'check' : value === 'deny' ? 'x' : 'minus';
    return h('div', { class: 'cm-perm-row' },
        h('div', { class: 'cm-perm-row-body' },
            h('div', { class: 'cm-perm-row-title' }, title),
            description != null ? h('div', { class: 'cm-perm-row-desc' }, description) : null
        ),
        h('button', {
            type: 'button', class: 'cm-perm-tristate cm-perm-tristate-' + (value || 'neutral'),
            'aria-label': `${title}: ${label} — click to cycle`, title: label,
            onclick: () => onCycle && onCycle(next),
        }, Icon(icon, { size: 16 }))
    );
}

export function PermissionSection({ heading, permissions = [], values = {}, onChange } = {}) {
    return h('div', { class: 'cm-perm-section' },
        heading ? h('div', { class: 'cm-perm-section-title' }, heading) : null,
        h('div', { class: 'cm-perm-section-rows' },
            ...permissions.map((p) => h('div', { key: p.key }, PermissionRow({
                title: p.title, description: p.description, value: values[p.key] ?? null,
                onCycle: (next) => onChange && onChange(p.key, next),
            })))
        )
    );
}

export function PermissionsEditor({ roles = [], activeRoleId, onSelectRole, sections = [], values = {}, onChange, dirty = false, saving = false, onSave, onReset } = {}) {
    return h('div', { class: 'cm-perm-editor' },
        roles.length ? RoleTabs({ roles, activeId: activeRoleId, onSelect: onSelectRole }) : null,
        h('div', { class: 'cm-perm-sections' },
            ...sections.map((s) => h('div', { key: s.heading || 'default' }, PermissionSection({
                heading: s.heading, permissions: s.permissions, values, onChange,
            })))
        ),
        dirty ? h('div', { class: 'cm-perm-editor-actions' },
            h('button', { type: 'button', class: 'cm-perm-save', disabled: saving, onclick: onSave }, saving ? 'Saving…' : 'Save Changes'),
            h('button', { type: 'button', class: 'cm-perm-reset', onclick: onReset }, 'Reset')
        ) : null
    );
}

// PermissionsOverview — the role/everyone picker menu preceding the editor:
// "Everyone" default plus role rows, split into overrides-present vs. not.
export function PermissionsOverview({ roles = [], overrideRoleIds = [], onSelectDefault, onSelectRole } = {}) {
    const withOverrides = roles.filter((r) => overrideRoleIds.includes(r.id));
    const withoutOverrides = roles.filter((r) => !overrideRoleIds.includes(r.id));
    return h('div', { class: 'cm-perm-overview' },
        SettingsSection({
            children: [SettingsRow({
                icon: 'globe', label: 'Everyone', description: 'Permissions available when no role overrides apply',
                onClick: onSelectDefault, action: Icon('chevron-right'),
            })],
        }),
        withOverrides.length ? SettingsSection({
            title: 'Role Overrides',
            children: withOverrides.map((r) => SettingsRow({
                icon: r.color ? h('span', { class: 'cm-perm-role-dot', style: `background:${r.color}` }) : 'shield',
                label: r.name, description: 'Has permission overrides',
                onClick: () => onSelectRole && onSelectRole(r.id), action: Icon('chevron-right'),
            })),
        }) : null,
        withoutOverrides.length ? SettingsSection({
            title: 'Roles with No Overrides',
            children: withoutOverrides.map((r) => SettingsRow({
                icon: r.color ? h('span', { class: 'cm-perm-role-dot', style: `background:${r.color}` }) : 'shield',
                label: r.name, description: 'No permissions set yet',
                onClick: () => onSelectRole && onSelectRole(r.id), action: Icon('chevron-right'),
            })),
        }) : null
    );
}
