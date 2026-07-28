// CommunityShell — the four-column community frame: server rail, channel
// sidebar, main content column, member list, plus the floating voice strip.

import * as webjsx from '../../../vendor/webjsx/index.js';
import { ServerRail, ChannelSidebar } from './navigation.js';
import { MemberList, VoiceStrip } from './presence.js';
const h = webjsx.createElement;

export function CommunityShell({ serverRailProps, sidebarProps, children, memberListProps, voiceStripProps } = {}) {
    return h('div', { class: 'cm-shell' },
        serverRailProps ? ServerRail(serverRailProps) : null,
        sidebarProps ? ChannelSidebar(sidebarProps) : null,
        h('div', { class: 'cm-main' }, ...(Array.isArray(children) ? children : [children])),
        memberListProps ? MemberList(memberListProps) : null,
        voiceStripProps ? VoiceStrip(voiceStripProps) : null
    );
}
