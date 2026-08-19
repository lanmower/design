import * as webjsx from '../../../vendor/webjsx/index.js';
import { Icon } from '../shell.js';
const h = webjsx.createElement;

export function SettingsRowGroup(children) {
    return h('div', { class: 'vx-stg-group' }, ...(Array.isArray(children) ? children : [children]));
}

export function SettingsSection({ title, children } = {}) {
    return h('div', { class: 'vx-stg-section' },
        title != null ? h('div', { class: 'vx-stg-section-title' }, title) : null,
        SettingsRowGroup(children)
    );
}

function iconWrap(icon) {
    if (icon === 'blank') return h('div', { class: 'vx-stg-icon vx-stg-icon-blank' });
    return h('div', { class: 'vx-stg-icon' }, icon != null ? Icon(icon) : null);
}

export function SettingsRow({ icon = 'blank', label, description, action, onClick } = {}) {
    return h('div', {
        class: 'vx-stg-row' + (onClick ? ' vx-stg-row-click' : ''),
        role: onClick ? 'button' : null,
        tabindex: onClick ? '0' : null,
        onclick: onClick || null,
        onkeydown: onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } : null
    },
        iconWrap(icon),
        h('div', { class: 'vx-stg-row-content' },
            label != null ? h('div', { class: 'vx-stg-row-label' }, label) : null,
            description != null ? h('div', { class: 'vx-stg-row-desc' }, description) : null
        ),
        action != null ? h('div', { class: 'vx-stg-row-action' }, action) : null
    );
}

export function SettingsRowToggle({ icon = 'blank', label, description, checked = false, onToggle } = {}) {
    return SettingsRow({
        icon, label, description,
        onClick: () => onToggle && onToggle(!checked),
        action: h('input', {
            type: 'checkbox', class: 'vx-stg-toggle',
            checked: checked ? true : null,
            onclick: (e) => e.stopPropagation(),
            onchange: (e) => onToggle && onToggle(e.target.checked)
        })
    });
}

// SettingsRowTriState — cycles allow -> deny -> neutral (null) -> allow,
// same row shell as SettingsRow/SettingsRowToggle, with a distinct
// icon+color per state instead of a checkbox.
export function SettingsRowTriState({ icon = 'blank', label, description, value = null, onChange } = {}) {
    const next = value === 'allow' ? 'deny' : value === 'deny' ? null : 'allow';
    const stateLabel = value === 'allow' ? 'Allow' : value === 'deny' ? 'Deny' : 'Neutral';
    const stateIcon = value === 'allow' ? 'check' : value === 'deny' ? 'x' : 'minus';
    return SettingsRow({
        icon, label, description,
        onClick: () => onChange && onChange(next),
        action: h('span', {
            class: 'vx-stg-tristate vx-stg-tristate-' + (value || 'neutral'),
            role: 'button', 'aria-label': `${label}: ${stateLabel}`,
        }, Icon(stateIcon, { size: 14 })),
    });
}

export function SettingsRowSelect({ icon = 'blank', label, description, value, options = [], onChange, ariaLabel } = {}) {
    const active = options.find(o => o.value === value);
    return SettingsRow({
        icon, label,
        description: description != null ? description : (active ? active.label : null),
        action: h('div', { class: 'vx-stg-select-wrap' },
            h('select', {
                class: 'vx-stg-select', 'aria-label': ariaLabel || label,
                onclick: (e) => e.stopPropagation(),
                onchange: onChange ? (e) => onChange(e.target.value) : null
            }, ...options.map(o => h('option', { key: 'o-' + o.value, value: o.value, selected: o.value === value }, o.label))),
            Icon('chevron-down')
        )
    });
}
