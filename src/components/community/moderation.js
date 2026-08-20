// Server moderation surfaces — stoat for-web's settings/server shape ported
// to the design SDK: role list + role editor (name, colour swatch picker,
// permission-toggle grid, hoist/mentionable), a ban list, and an invite list.
// Composed from the same SettingsRow/SettingsSection primitives Voice
// Settings already uses (settings-row.js) so a permission grid reads as the
// same visual language as every other settings surface, and from the same
// list-row shape MemberItem/UserCard already establish (avatar + name +
// trailing action). No backend anywhere in this file — every mutation is a
// callback prop, matching every other component in this SDK.

import * as webjsx from '../../../vendor/webjsx/index.js';
import { Icon } from '../shell.js';
import { avatarInitial, avatarContrastFg } from '../content.js';
import { SettingsSection, SettingsRowToggle } from '../voice/settings-row.js';
const h = webjsx.createElement;

function avatarStyle(color) {
    if (!color) return null;
    const fg = avatarContrastFg(color);
    return fg ? `--avatar-bg:${color};--avatar-fg:${fg}` : `--avatar-bg:${color}`;
}

// A single role row: drag handle, colour swatch, name, member count, chevron.
export function RoleRow({ id, name, color, memberCount, draggable = true, onClick, onDragStart, onDragOver, onDrop } = {}) {
    return h('div', {
        class: 'cm-role-row',
        draggable: draggable ? 'true' : null,
        ondragstart: draggable ? (e) => onDragStart && onDragStart(id, e) : null,
        ondragover: draggable ? (e) => { e.preventDefault(); onDragOver && onDragOver(id, e); } : null,
        ondrop: draggable ? (e) => { e.preventDefault(); onDrop && onDrop(id, e); } : null,
    },
        draggable ? h('span', { class: 'cm-role-drag', 'aria-hidden': 'true', title: 'drag to reorder' }, Icon('rows-tight', { size: 16 })) : null,
        h('button', {
            type: 'button', class: 'cm-role-btn', onclick: onClick,
        },
            h('span', { class: 'cm-role-swatch', style: color ? `background:${color}` : null, 'data-empty': color ? null : 'true' }),
            h('span', { class: 'cm-role-name' }, name),
            memberCount != null ? h('span', { class: 'cm-role-count' }, String(memberCount)) : null,
            Icon('chevron-right', { size: 16 })
        )
    );
}

// Full role list — draggable-reorder rows plus a trailing "everyone"
// (default-permissions) row and an add-role affordance, matching
// ServerRoleOverview's Draggable list + pinned @everyone row + Fab shape.
export function RoleList({ roles = [], onSelectRole, onReorder, onAddRole, saving = false } = {}) {
    let dragId = null;
    const handleDrop = (targetId) => {
        if (dragId == null || dragId === targetId || !onReorder) { dragId = null; return; }
        const ids = roles.map(r => r.id);
        const from = ids.indexOf(dragId), to = ids.indexOf(targetId);
        if (from === -1 || to === -1) { dragId = null; return; }
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        onReorder(ids);
        dragId = null;
    };
    return h('div', { class: 'cm-role-list' },
        h('div', { class: 'cm-role-list-head' },
            h('span', { class: 'cm-role-list-title' }, 'Server roles' + (saving ? ' — saving…' : '')),
            onAddRole ? h('button', { type: 'button', class: 'cm-role-add', 'aria-label': 'add role', title: 'Add role', onclick: onAddRole }, Icon('plus', { size: 18 })) : null
        ),
        h('div', { class: 'cm-role-rows' },
            ...roles.map(r => RoleRow({
                ...r,
                onClick: () => onSelectRole && onSelectRole(r.id),
                onDragStart: (id) => { dragId = id; },
                onDrop: handleDrop,
            })),
            RoleRow({ id: 'default', name: 'Everyone', color: null, memberCount: null, draggable: false, onClick: () => onSelectRole && onSelectRole('default') })
        )
    );
}

const DEFAULT_ROLE_COLORS = [
    '#fca5a5', '#fdba74', '#fcd34d', '#86efac', '#6ee7b7', '#67e8f9', '#93c5fd', '#c4b5fd', '#f0abfc', '#f9a8d4', '#cbd5e1',
    '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b',
];

function ColorSwatchPicker({ colors = DEFAULT_ROLE_COLORS, value, onChange } = {}) {
    return h('div', { class: 'cm-role-color-picker' },
        h('div', { class: 'cm-role-color-grid', role: 'group', 'aria-label': 'role colour' },
            ...colors.map(c => h('button', {
                type: 'button', key: c,
                class: 'cm-role-color-swatch' + (value === c ? ' is-selected' : ''),
                style: `background:${c}`,
                'aria-label': 'set role colour to ' + c,
                'aria-pressed': value === c ? 'true' : 'false',
                onclick: () => onChange && onChange(c),
            }))
        ),
        h('div', { class: 'cm-role-color-actions' },
            h('label', { class: 'cm-role-color-custom' },
                h('input', {
                    type: 'color', value: value || '#ffffff',
                    oninput: (e) => onChange && onChange(e.target.value),
                }),
                'Custom colour'
            ),
            h('button', {
                type: 'button', class: 'cm-role-color-none' + (value == null ? ' is-selected' : ''),
                onclick: () => onChange && onChange(null),
            }, 'No colour')
        )
    );
}

const PERMISSION_GROUPS = [
    { label: 'General', permissions: [
        { key: 'manageChannels', label: 'Manage channels' },
        { key: 'manageServer', label: 'Manage server' },
        { key: 'manageRoles', label: 'Manage roles' },
        { key: 'viewAuditLog', label: 'View audit log' },
        { key: 'createInvite', label: 'Create invite' },
    ]},
    { label: 'Membership', permissions: [
        { key: 'kickMembers', label: 'Kick members' },
        { key: 'banMembers', label: 'Ban members' },
        { key: 'timeoutMembers', label: 'Timeout members' },
        { key: 'changeNickname', label: 'Change own nickname' },
        { key: 'manageNicknames', label: "Manage others' nicknames" },
    ]},
    { label: 'Text', permissions: [
        { key: 'sendMessages', label: 'Send messages' },
        { key: 'manageMessages', label: 'Manage messages' },
        { key: 'embedLinks', label: 'Embed links' },
        { key: 'attachFiles', label: 'Attach files' },
        { key: 'mentionEveryone', label: 'Mention @everyone' },
        { key: 'useReactions', label: 'Use reactions' },
    ]},
    { label: 'Voice', permissions: [
        { key: 'voiceConnect', label: 'Connect' },
        { key: 'voiceSpeak', label: 'Speak' },
        { key: 'voiceMuteMembers', label: 'Mute members' },
        { key: 'voiceDeafenMembers', label: 'Deafen members' },
        { key: 'voiceMoveMembers', label: 'Move members' },
    ]},
];

function PermissionGrid({ permissions = {}, groups = PERMISSION_GROUPS, onChange } = {}) {
    return h('div', { class: 'cm-role-perm-grid' },
        ...groups.map(g => SettingsSection({
            title: g.label,
            children: g.permissions.map(p => SettingsRowToggle({
                icon: 'blank',
                label: p.label,
                checked: !!permissions[p.key],
                onToggle: (v) => onChange && onChange(p.key, v),
            })),
        }))
    );
}

// Role editor form — name, colour swatch picker (matching the accent-picker
// shape), a live name/colour preview, hoist + mentionable checkboxes, a
// permission-toggle grid built from SettingsRow primitives, and copy-id /
// delete-role actions.
export function RoleEditor({
    role = {}, permissions = {}, permissionGroups,
    onChangeName, onChangeColor, onChangeHoist, onChangeMentionable, onChangePermission,
    onCopyId, onDelete, onSave, onReset, dirty = false, saving = false,
} = {}) {
    const name = role.name || '';
    const color = role.color ?? role.colour ?? null;
    return h('div', { class: 'cm-role-editor' },
        h('div', { class: 'cm-role-editor-field' },
            h('label', { class: 'cm-role-editor-label', for: 'cm-role-name' }, 'Role name'),
            h('input', {
                id: 'cm-role-name', type: 'text', class: 'cm-role-editor-input',
                value: name, maxlength: '32',
                oninput: (e) => onChangeName && onChangeName(e.target.value),
            })
        ),
        h('div', { class: 'cm-role-editor-field' },
            h('span', { class: 'cm-role-editor-label' }, 'Role colour'),
            ColorSwatchPicker({ value: color, onChange: onChangeColor }),
            h('div', { class: 'cm-role-preview', style: avatarStyle(color) },
                h('span', { class: 'cm-role-preview-avatar' }, avatarInitial(name || '?')),
                h('span', { class: 'cm-role-preview-name', style: color ? `color:${color}` : null }, name || 'Role Name')
            )
        ),
        SettingsSection({ title: 'Display', children: [
            SettingsRowToggle({ icon: 'blank', label: 'Hoist role', description: 'Display members with this role separately in the member list', checked: !!role.hoist, onToggle: onChangeHoist }),
            SettingsRowToggle({ icon: 'blank', label: 'Mentionable', description: 'Allow anyone to @mention this role', checked: !!role.mentionable, onToggle: onChangeMentionable }),
        ]}),
        PermissionGrid({ permissions, groups: permissionGroups, onChange: onChangePermission }),
        h('div', { class: 'cm-role-editor-actions' },
            h('button', { type: 'button', class: 'cm-role-editor-btn', onclick: () => onCopyId && onCopyId(role.id) }, Icon('copy', { size: 16 }), ' Copy role ID'),
            h('button', { type: 'button', class: 'cm-role-editor-btn danger', onclick: () => onDelete && onDelete(role.id) }, Icon('trash', { size: 16 }), ' Delete role')
        ),
        dirty ? h('div', { class: 'cm-role-editor-save-bar' },
            h('span', {}, saving ? 'saving…' : 'you have unsaved changes'),
            h('button', { type: 'button', class: 'cm-role-editor-btn', onclick: onReset }, 'Reset'),
            h('button', { type: 'button', class: 'cm-role-editor-btn cm-role-editor-btn-primary', onclick: onSave }, 'Save changes')
        ) : null
    );
}

// Shared list-row shell for bans/invites: avatar + primary/secondary text +
// trailing action button — the same composition MemberItem/UserCard use.
function ModListRow({ identity, name, color, primary, secondary, actionIcon, actionLabel, danger, onAction } = {}) {
    const initial = avatarInitial(name || identity);
    return h('div', { class: 'cm-modlist-row' },
        h('div', { class: 'cm-modlist-avatar', style: avatarStyle(color) }, initial),
        h('div', { class: 'cm-modlist-text' },
            h('div', { class: 'cm-modlist-primary' }, primary),
            secondary ? h('div', { class: 'cm-modlist-secondary' }, secondary) : null
        ),
        onAction ? h('button', {
            type: 'button', class: 'cm-modlist-action' + (danger ? ' danger' : ''),
            'aria-label': actionLabel, title: actionLabel, onclick: onAction,
        }, Icon(actionIcon, { size: 16 })) : null
    );
}

// Ban list — avatar + username + reason + unban button per row, plus a
// name/reason filter pair matching ListBans' two filter TextFields.
export function BanList({ bans = [], filterName = '', filterReason = '', onFilterName, onFilterReason, onUnban, loading = false } = {}) {
    const q = filterName.trim().toLowerCase(), qr = filterReason.trim().toLowerCase();
    const visible = bans.filter(b =>
        (!q || (b.name || '').toLowerCase().includes(q)) &&
        (!qr || (b.reason || '').toLowerCase().includes(qr))
    );
    return h('div', { class: 'cm-modlist' },
        h('div', { class: 'cm-modlist-head' },
            h('span', { class: 'cm-modlist-title' }, 'Banned users'),
            h('div', { class: 'cm-modlist-filters' },
                h('input', { type: 'text', class: 'cm-modlist-filter', placeholder: 'Filter by user', value: filterName, oninput: (e) => onFilterName && onFilterName(e.target.value) }),
                h('input', { type: 'text', class: 'cm-modlist-filter', placeholder: 'Filter by reason', value: filterReason, oninput: (e) => onFilterReason && onFilterReason(e.target.value) })
            )
        ),
        loading ? h('div', { class: 'cm-modlist-empty', role: 'status' }, 'loading bans…')
            : visible.length === 0
                ? h('div', { class: 'cm-modlist-empty', role: 'status' }, Icon('user', { size: 20 }), h('span', {}, bans.length === 0 ? 'no banned users' : 'no bans match this filter'))
                : h('div', { class: 'cm-modlist-rows' },
                    ...visible.map(b => ModListRow({
                        identity: b.id, name: b.name, color: b.color,
                        primary: b.name || b.id, secondary: b.reason || 'no reason given',
                        actionIcon: 'x', actionLabel: 'pardon user', danger: true,
                        onAction: () => onUnban && onUnban(b.id),
                    }))
                )
    );
}

// Invite list — creator avatar/name + channel, invite code with a copy
// button, expiry, and a revoke button, plus a "Create invite" affordance.
export function InviteList({ invites = [], onCreate, canCreate = true, onCopy, onRevoke, loading = false } = {}) {
    const fmtExpiry = (exp) => {
        if (!exp) return 'never expires';
        const d = exp instanceof Date ? exp : new Date(exp);
        if (isNaN(d.getTime())) return 'never expires';
        return d.getTime() < Date.now() ? 'expired' : 'expires ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };
    return h('div', { class: 'cm-modlist' },
        h('div', { class: 'cm-modlist-head' },
            h('span', { class: 'cm-modlist-title' }, 'Server invites'),
            h('button', {
                type: 'button', class: 'cm-role-editor-btn cm-role-editor-btn-primary', disabled: !canCreate ? 'true' : null,
                title: canCreate ? null : 'Create a channel before inviting others',
                onclick: onCreate,
            }, Icon('plus', { size: 16 }), ' Create invite')
        ),
        loading ? h('div', { class: 'cm-modlist-empty', role: 'status' }, 'loading invites…')
            : invites.length === 0
                ? h('div', { class: 'cm-modlist-empty', role: 'status' }, Icon('link', { size: 20 }), h('span', {}, 'no active invites'))
                : h('div', { class: 'cm-modlist-rows' },
                    ...invites.map(i => h('div', { class: 'cm-modlist-row', key: i.code || i.id },
                        h('div', { class: 'cm-modlist-avatar', style: avatarStyle(i.creatorColor) }, avatarInitial(i.creatorName || '?')),
                        h('div', { class: 'cm-modlist-text' },
                            h('div', { class: 'cm-modlist-primary' }, i.creatorName || 'Unknown user'),
                            h('div', { class: 'cm-modlist-secondary' }, '#' + (i.channelName || 'unknown') + ' · ' + fmtExpiry(i.expiresAt))
                        ),
                        h('code', { class: 'cm-modlist-code' }, i.code || i.id),
                        h('button', { type: 'button', class: 'cm-modlist-action', 'aria-label': 'copy invite link', title: 'Copy invite link', onclick: () => onCopy && onCopy(i.code || i.id) }, Icon('copy', { size: 16 })),
                        h('button', { type: 'button', class: 'cm-modlist-action danger', 'aria-label': 'revoke invite', title: 'Revoke invite', onclick: () => onRevoke && onRevoke(i.code || i.id) }, Icon('trash', { size: 16 }))
                    ))
                )
    );
}

export { PERMISSION_GROUPS };
