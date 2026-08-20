// Webhook management — stoat for-web's WebhooksList/ViewWebhook shape: a
// list of channel webhooks (avatar + name + trailing edit/delete) plus an
// editor form (name/avatar/URL-copy) built from the SettingsRow primitives.

import * as webjsx from '../../../vendor/webjsx/index.js';
import { Icon } from '../shell.js';
import { avatarInitial, avatarContrastFg } from '../content.js';
import { SettingsRow, SettingsRowGroup, SettingsSection } from '../voice/settings-row.js';
const h = webjsx.createElement;

function avatarStyle(color) {
    if (!color) return null;
    const fg = avatarContrastFg(color);
    return fg ? `--avatar-bg:${color};--avatar-fg:${fg}` : `--avatar-bg:${color}`;
}

function WebhookAvatar({ name, avatarUrl, color }) {
    if (avatarUrl) return h('img', { class: 'cm-webhook-avatar', src: avatarUrl, alt: '' });
    return h('div', { class: 'cm-webhook-avatar cm-webhook-avatar-fallback', style: avatarStyle(color) }, avatarInitial(name));
}

export function WebhookListItem({ name, avatarUrl, color, description, onEdit, onDelete } = {}) {
    return h('div', { class: 'cm-webhook-item' },
        WebhookAvatar({ name, avatarUrl, color }),
        h('div', { class: 'cm-webhook-item-body' },
            h('div', { class: 'cm-webhook-item-name' }, name || 'Webhook'),
            description != null ? h('div', { class: 'cm-webhook-item-desc' }, description) : null
        ),
        h('div', { class: 'cm-webhook-item-actions' },
            h('button', { type: 'button', class: 'cm-webhook-action', 'aria-label': 'Edit webhook', title: 'Edit', onclick: onEdit }, Icon('edit')),
            h('button', { type: 'button', class: 'cm-webhook-action cm-webhook-action-danger', 'aria-label': 'Delete webhook', title: 'Delete', onclick: onDelete }, Icon('trash'))
        )
    );
}

export function WebhookList({ webhooks = [], onCreate, onEdit, onDelete, busy = false } = {}) {
    return h('div', { class: 'cm-webhook-list' },
        h('button', { type: 'button', class: 'cm-webhook-create', onclick: onCreate },
            h('span', { class: 'cm-webhook-create-icon' }, Icon('cloud')),
            h('span', null, 'Create Webhook')
        ),
        busy
            ? h('div', { class: 'cm-webhook-empty' }, 'Loading webhooks…')
            : (webhooks.length
                ? h('div', { class: 'cm-webhook-items' },
                    ...webhooks.map((w) => h('div', { key: w.id }, WebhookListItem({
                        name: w.name, avatarUrl: w.avatarUrl, color: w.color, description: w.id,
                        onEdit: () => onEdit && onEdit(w.id),
                        onDelete: () => onDelete && onDelete(w.id),
                    }))))
                : h('div', { class: 'cm-webhook-empty' }, 'No webhooks yet.'))
    );
}

export function WebhookEditor({ name = '', avatarUrl = '', url = '', onNameChange, onAvatarChange, onCopyUrl, onSave, onDelete, saving = false } = {}) {
    return h('div', { class: 'cm-webhook-editor' },
        h('div', { class: 'cm-webhook-editor-head' },
            WebhookAvatar({ name }),
            h('div', { class: 'cm-webhook-editor-title' }, name || 'Webhook')
        ),
        SettingsSection({
            title: 'General',
            children: [
                SettingsRow({
                    icon: 'edit', label: 'Name', description: 'Shown as the message author',
                    action: h('input', {
                        type: 'text', class: 'cm-webhook-input', value: name, placeholder: 'Webhook name',
                        onclick: (e) => e.stopPropagation(),
                        oninput: (e) => onNameChange && onNameChange(e.target.value),
                    }),
                }),
                SettingsRow({
                    icon: 'image', label: 'Avatar URL', description: 'Custom avatar for this webhook',
                    action: h('input', {
                        type: 'text', class: 'cm-webhook-input', value: avatarUrl, placeholder: 'https://…',
                        onclick: (e) => e.stopPropagation(),
                        oninput: (e) => onAvatarChange && onAvatarChange(e.target.value),
                    }),
                }),
            ],
        }),
        SettingsSection({
            title: 'Webhook URL',
            children: [
                SettingsRow({
                    icon: 'link', label: 'URL', description: url || '—',
                    action: h('button', { type: 'button', class: 'cm-webhook-copy', onclick: onCopyUrl }, Icon('copy'), h('span', null, 'Copy')),
                }),
            ],
        }),
        h('div', { class: 'cm-webhook-editor-actions' },
            h('button', { type: 'button', class: 'cm-webhook-save', disabled: saving, onclick: onSave }, saving ? 'Saving…' : 'Save Changes'),
            h('button', { type: 'button', class: 'cm-webhook-delete', onclick: onDelete }, 'Delete Webhook')
        )
    );
}
