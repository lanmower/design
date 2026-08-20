// Voice surfaces — PTT, VAD meter, webcam preview, voice settings, audio queue.
// Pure factories returning webjsx vnodes. Class prefix: vx-*.
//
// This module is a barrel: every component lives in a single-responsibility
// submodule under ./voice/, and the public export surface here is unchanged
// — no consumer import needs to move.

import { playCompletionCue } from './voice/audio-cue.js';
import { PttButton, VadMeter, WebcamPreview } from './voice/capture.js';
import { VoiceSettingsModal } from './voice/settings-modal.js';
import { VoiceControls, AudioQueue } from './voice/playback.js';
import { SettingsRowGroup, SettingsSection, SettingsRow, SettingsRowToggle, SettingsRowSelect } from './voice/settings-row.js';

export {
    playCompletionCue,
    PttButton, VadMeter, WebcamPreview,
    VoiceSettingsModal,
    VoiceControls, AudioQueue,
    SettingsRowGroup, SettingsSection, SettingsRow, SettingsRowToggle, SettingsRowSelect,
};
