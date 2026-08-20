// Community surface — matches upstream signatures.
//
// This module is a barrel: every component lives in a single-responsibility
// submodule under ./community/, and the public export surface here is unchanged
// — no consumer import needs to move.

import { ServerIcon, ServerRail, ChannelItem, ChannelCategory, ChannelSidebar } from './community/navigation.js';
import { VoiceUser, UserPanel, MemberItem, MemberList, VoiceStrip, UserCard } from './community/presence.js';
import { ChatHeader, MobileHeader, ReplyBar, Banner } from './community/chrome.js';
import { ThreadPanel, ForumView, PageView } from './community/views.js';
import { CommunityShell } from './community/shell.js';
import { RoleRow, RoleList, RoleEditor, BanList, InviteList, PERMISSION_GROUPS } from './community/moderation.js';
import { WebhookList, WebhookListItem, WebhookEditor } from './community/webhooks.js';
import { RoleTabs, PermissionRow, PermissionSection, PermissionsEditor, PermissionsOverview } from './community/permissions.js';
import { EmojiManagerGrid } from './community/emoji-manager.js';
import { SearchBar, SearchResults, SearchResultMessage, SearchResultEntity } from './community/search.js';

export {
    ServerIcon, ServerRail, ChannelItem, ChannelCategory, ChannelSidebar,
    VoiceUser, UserPanel, MemberItem, MemberList, VoiceStrip, UserCard,
    ChatHeader, MobileHeader, ReplyBar, Banner,
    ThreadPanel, ForumView, PageView,
    CommunityShell,
    RoleRow, RoleList, RoleEditor, BanList, InviteList, PERMISSION_GROUPS,
    WebhookList, WebhookListItem, WebhookEditor,
    RoleTabs, PermissionRow, PermissionSection, PermissionsEditor, PermissionsOverview,
    EmojiManagerGrid,
    SearchBar, SearchResults, SearchResultMessage, SearchResultEntity,
};
