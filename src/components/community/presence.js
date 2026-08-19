// Who-is-here surfaces: the speaking-state voice user chip, the local user's
// own mic/deafen/settings panel, the member roster, and the connected-voice
// control strip.

import * as webjsx from '../../../vendor/webjsx/index.js';
import { Icon } from '../shell.js';
import { avatarInitial, avatarContrastFg } from '../content.js';
const h = webjsx.createElement;

function avatarStyle(color) {
    if (!color) return null;
    const fg = avatarContrastFg(color);
    return fg ? `--avatar-bg:${color};--avatar-fg:${fg}` : `--avatar-bg:${color}`;
}

// 16:9 participant tile (stoat for-web's ParticipantTile shape): video fills
// the tile when a camera track is present, otherwise a centered avatar; a
// bottom overlay carries the name plus mic/camera status glyphs, and an
// outline glow marks the currently-speaking participant. `videoEl` is an
// already-attached <video>/<canvas> element the consumer owns (this
// component never touches media APIs) — omit it to fall back to avatar-only.
export function VoiceUser({ identity, speaking, color, muted, camera, videoEl } = {}) {
    const initial = avatarInitial(identity);
    const hasVideo = !!(camera && videoEl);
    return h('div', { class: 'cm-voice-tile' + (speaking ? ' speaking' : '') + (hasVideo ? ' has-video' : '') },
        hasVideo
            ? h('div', { class: 'cm-voice-tile-video' }, videoEl)
            : h('div', { class: 'cm-voice-tile-avatar-wrap' },
                h('div', { class: 'cm-voice-user-avatar', style: avatarStyle(color) }, initial)),
        h('div', { class: 'cm-voice-tile-overlay' },
            h('span', { class: 'cm-voice-user-name' }, identity),
            h('span', { class: 'cm-voice-tile-icons' },
                muted ? Icon('mic-off', { size: 14 }) : null,
                camera === false ? Icon('camera-off', { size: 14 }) : null)
        )
    );
}

export function UserPanel({ name, tag, color, muted, deafened, onMute, onDeafen, onSettings } = {}) {
    const initial = avatarInitial(name);
    const handleSettings = (e) => {
        e.preventDefault();
        if (onSettings) {
            // onSettings callback should open a drawer/modal with quick toggles
            onSettings({
                audioDevice: null, // controlled by consumer
                micOn: !muted,
                speakerOn: !deafened,
            });
        }
    };
    return h('div', { class: 'cm-user-panel' },
        h('div', { class: 'cm-user-avatar', style: avatarStyle(color) },
            h('span', { class: 'cm-user-status-dot' }),
            initial
        ),
        h('div', { class: 'cm-user-info' },
            h('div', { class: 'cm-user-name' }, name || 'You'),
            tag ? h('div', { class: 'cm-user-tag' }, tag) : null
        ),
        h('div', { class: 'cm-user-controls' },
            h('button', { class: 'cm-user-btn' + (muted ? ' muted' : ''), onclick: onMute, 'aria-label': muted ? 'Unmute microphone' : 'Mute microphone', 'aria-pressed': muted ? 'true' : 'false' }, Icon(muted ? 'mic-off' : 'mic')),
            h('button', { class: 'cm-user-btn' + (deafened ? ' deafened' : ''), onclick: onDeafen, 'aria-label': deafened ? 'Undeafen' : 'Deafen', 'aria-pressed': deafened ? 'true' : 'false' }, Icon(deafened ? 'speaker-off' : 'speaker')),
            h('button', { class: 'cm-user-btn', onclick: handleSettings, 'aria-label': 'Audio settings', title: 'Open audio settings' }, Icon('settings'))
        )
    );
}

const MEMBER_STATUS_CLASS = { online: 'online', idle: 'idle', busy: 'busy', focus: 'status-focus' };

export function MemberItem({ identity, name, color, nameColor, status = 'online', onClick } = {}) {
    const initial = avatarInitial(name || identity);
    const statusClass = MEMBER_STATUS_CLASS[status];
    return h('div', {
        class: 'cm-member-item', tabindex: onClick ? '0' : undefined, role: onClick ? 'button' : undefined,
        onclick: onClick, onkeydown: onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } : undefined,
    },
        h('div', { class: 'cm-member-avatar', style: avatarStyle(color) },
            h('span', { class: 'cm-member-status' + (statusClass ? ' ' + statusClass : '') }),
            initial
        ),
        h('span', { class: 'cm-member-name', style: nameColor ? `color:${nameColor}` : null }, name || identity)
    );
}

// UserCard — stoat for-web's profile popout shape: a banner strip (color or
// image) with the avatar overlapping its bottom edge, then name/status,
// then optional bio/roles/joined-date sections stacked below. Sized for a
// popover/hovercard body, not a full modal.
export function UserCard({ identity, name, color, bannerUrl, status = 'online', statusLabel, bio, roles = [], joinedAt, joinedServerAt, serverName, actions = [] } = {}) {
    const initial = avatarInitial(name || identity);
    const statusClass = MEMBER_STATUS_CLASS[status];
    const fmt = (ts) => {
        if (!ts) return null;
        const d = ts instanceof Date ? ts : new Date(ts);
        if (isNaN(d.getTime())) return null;
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };
    const joined = fmt(joinedAt);
    const joinedServer = fmt(joinedServerAt);
    return h('div', { class: 'cm-user-card', role: 'dialog', 'aria-label': (name || identity || 'user') + ' profile' },
        h('div', {
            class: 'cm-uc-banner',
            style: bannerUrl ? `background-image:linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.55)),url('${bannerUrl}')` : avatarStyle(color),
        },
            h('div', { class: 'cm-uc-avatar-wrap' },
                h('div', { class: 'cm-uc-avatar', style: avatarStyle(color) },
                    initial,
                    h('span', { class: 'cm-uc-status' + (statusClass ? ' ' + statusClass : '') })
                )
            )
        ),
        h('div', { class: 'cm-uc-body' },
            h('div', { class: 'cm-uc-name' }, name || identity),
            h('div', { class: 'cm-uc-status-label' }, statusLabel || status || ''),
            bio ? h('div', { class: 'cm-uc-section' },
                h('div', { class: 'cm-uc-section-title' }, 'about'),
                h('div', { class: 'cm-uc-bio' }, bio)) : null,
            roles.length ? h('div', { class: 'cm-uc-section' },
                h('div', { class: 'cm-uc-section-title' }, 'roles'),
                h('div', { class: 'cm-uc-roles' },
                    ...roles.map((r, i) => h('span', { class: 'cm-uc-role', key: r.id || i },
                        h('span', { class: 'cm-uc-role-dot', style: `background:${r.color || 'var(--fg-3)'}` }),
                        r.name)))) : null,
            (joined || joinedServer) ? h('div', { class: 'cm-uc-section' },
                h('div', { class: 'cm-uc-section-title' }, 'joined'),
                joined ? h('div', { class: 'cm-uc-joined-row' }, Icon('calendar', { size: 14 }), h('span', {}, 'stoat — ' + joined)) : null,
                joinedServer ? h('div', { class: 'cm-uc-joined-row' }, Icon('calendar', { size: 14 }), h('span', {}, (serverName || 'server') + ' — ' + joinedServer)) : null) : null,
            actions.length ? h('div', { class: 'cm-uc-actions' },
                ...actions.map((a, i) => h('button', {
                    type: 'button', class: 'cm-uc-action-btn' + (a.danger ? ' danger' : ''), key: a.id || i, onclick: a.onClick,
                }, a.label))) : null
        )
    );
}

// Skeleton rows for a cold member-list load, matching FileSkeleton/session
// skeleton shape (icon + title placeholder), never a bare spinner.
function MemberListSkeleton({ rows = 6 } = {}) {
    return h('div', { class: 'cm-member-list cm-member-skeleton open', 'aria-hidden': 'true' },
        ...Array.from({ length: rows }, (_, i) => h('div', { key: 'msk' + i, class: 'cm-member-item-skeleton' },
            h('span', { class: 'ds-skel ds-skel-icon' }), h('span', { class: 'ds-skel ds-skel-title' }))));
}

export function MemberList({ categories = [], open, loading = false, onSelectMember } = {}) {
    if (loading) return MemberListSkeleton();
    const total = categories.reduce((n, cat) => n + (cat.members ? cat.members.length : 0), 0);
    return h('div', { class: 'cm-member-list' + (open ? ' open' : '') },
        total === 0
            ? h('div', { key: '_empty', class: 'cm-member-empty', role: 'status' },
                Icon('members', { size: 20 }),
                h('span', { class: 'cm-member-empty-text' }, 'no members in this channel yet'))
            : null,
        ...categories.flatMap(cat => [
            h('div', { class: 'cm-member-category', key: cat.label }, `${cat.label} — ${cat.members.length}`),
            ...cat.members.map((m, i) => MemberItem({
                ...m, key: m.identity || i,
                onClick: onSelectMember ? (e) => onSelectMember(m, e) : undefined,
            }))
        ])
    );
}

export function VoiceStrip({ channelName, status, muted, deafened, onMute, onDeafen, onLeave, open } = {}) {
    return h('div', { class: 'cm-voice-strip' + (open ? ' open' : ''), role: 'region', 'aria-label': 'voice controls' },
        h('div', { class: 'cm-vs-label' },
            h('span', { class: 'cm-vs-channel' }, Icon('speaker'), ' ' + (channelName || 'voice')),
            h('span', { class: 'cm-vs-status' }, status || 'connected')
        ),
        h('button', {
            class: 'cm-vs-btn', type: 'button', onclick: onMute,
            title: muted ? 'Unmute' : 'Mute',
            'aria-label': muted ? 'unmute microphone' : 'mute microphone',
            'aria-pressed': muted ? 'true' : 'false'
        }, Icon(muted ? 'mic-off' : 'mic')),
        h('button', {
            class: 'cm-vs-btn', type: 'button', onclick: onDeafen,
            title: deafened ? 'Undeafen' : 'Deafen',
            'aria-label': deafened ? 'undeafen' : 'deafen',
            'aria-pressed': deafened ? 'true' : 'false'
        }, Icon(deafened ? 'speaker-off' : 'speaker')),
        h('button', {
            class: 'cm-vs-btn danger', type: 'button', onclick: onLeave,
            title: 'Leave voice', 'aria-label': 'leave voice channel'
        }, Icon('x'))
    );
}
