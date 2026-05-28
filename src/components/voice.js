// Voice surfaces — PTT, VAD meter, webcam preview, voice settings, audio queue.
// Pure factories returning webjsx vnodes. Class prefix: vx-*.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Icon } from './shell.js';
const h = webjsx.createElement;

function fmtDur(s) {
    s = Math.max(0, Math.round(Number(s) || 0));
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + String(r).padStart(2, '0');
}

export function PttButton({ state = 'idle', mode = 'ptt', onHoldStart, onHoldEnd, onClick, label = 'Hold to talk' } = {}) {
    const active = state === 'live' || state === 'recording' || state === 'vad';
    const start = (e) => { onHoldStart && onHoldStart(e); };
    const end = (e) => { onHoldEnd && onHoldEnd(e); };
    return h('button', {
        type: 'button',
        class: 'vx-ptt vx-ptt-' + state + ' vx-ptt-mode-' + mode,
        'data-state': state,
        'data-mode': mode,
        'aria-pressed': active ? 'true' : 'false',
        'aria-label': label,
        onclick: onClick ? (e) => onClick(e) : null,
        onpointerdown: (e) => { e.preventDefault(); start(e); },
        onpointerup: (e) => { e.preventDefault(); end(e); },
        onpointerleave: (e) => end(e),
        oncontextmenu: (e) => e.preventDefault(),
        ontouchstart: (e) => start(e),
        ontouchend: (e) => { e.preventDefault(); end(e); }
    },
        h('span', { class: 'vx-ptt-glow', 'aria-hidden': 'true' }),
        h('span', { class: 'vx-ptt-icon', 'aria-hidden': 'true' }, state === 'idle' ? Icon('mic') : '●'),
        h('span', { class: 'vx-ptt-label' }, label)
    );
}

export function VadMeter({ level = 0, threshold = 0.5, onThresholdChange } = {}) {
    const lvl = Math.max(0, Math.min(1, Number(level) || 0));
    const thr = Math.max(0, Math.min(1, Number(threshold) || 0));
    const over = lvl >= thr;
    return h('div', { class: 'vx-vad', role: 'group', 'aria-label': 'voice activity meter' },
        h('div', { class: 'vx-vad-track' },
            h('div', { class: 'vx-vad-fill' + (over ? ' vx-vad-fill-over' : ''), style: 'width:' + (lvl * 100).toFixed(1) + '%' }),
            h('div', { class: 'vx-vad-marker', style: 'left:' + (thr * 100).toFixed(1) + '%', 'aria-hidden': 'true' }),
            h('input', {
                class: 'vx-vad-range',
                type: 'range', min: '0', max: '1', step: '0.01',
                value: String(thr),
                'aria-label': 'VAD threshold',
                oninput: onThresholdChange ? (e) => onThresholdChange(parseFloat(e.target.value)) : null
            })
        ),
        h('div', { class: 'vx-vad-readout' },
            h('span', {}, 'lvl ' + Math.round(lvl * 100)),
            h('span', {}, 'thr ' + Math.round(thr * 100))
        )
    );
}

export function WebcamPreview({ videoStream = null, resolution = '640x480', fps = 30, enabled = true, resolutions = [], fpsOptions = [], onResolutionChange, onFpsChange, onToggle } = {}) {
    const videoRef = (el) => {
        if (!el) return;
        if (el.srcObject !== videoStream) el.srcObject = videoStream || null;
    };
    const resOpts = (resolutions.length ? resolutions : [resolution]).map(r =>
        h('option', { key: 'r-' + r, value: r, selected: r === resolution }, r));
    const fpsList = fpsOptions.length ? fpsOptions : [fps];
    const fpsOpts = fpsList.map(f =>
        h('option', { key: 'f-' + f, value: String(f), selected: Number(f) === Number(fps) }, f + ' fps'));
    return h('div', { class: 'vx-cam' + (enabled ? '' : ' vx-cam-off') },
        h('div', { class: 'vx-cam-stage' },
            enabled
                ? h('video', { class: 'vx-cam-video', ref: videoRef, autoplay: true, muted: true, playsinline: true })
                : h('div', { class: 'vx-cam-placeholder' }, h('span', {}, Icon('camera')), h('span', {}, 'Camera off'))
        ),
        h('div', { class: 'vx-cam-controls' },
            h('select', {
                class: 'vx-select', 'aria-label': 'resolution',
                onchange: onResolutionChange ? (e) => onResolutionChange(e.target.value) : null
            }, ...resOpts),
            h('select', {
                class: 'vx-select', 'aria-label': 'frame rate',
                onchange: onFpsChange ? (e) => onFpsChange(Number(e.target.value)) : null
            }, ...fpsOpts),
            h('button', {
                type: 'button',
                class: 'vx-btn' + (enabled ? ' vx-btn-on' : ''),
                'aria-pressed': enabled ? 'true' : 'false',
                onclick: onToggle ? () => onToggle() : null
            }, enabled ? 'Disable' : 'Enable')
        )
    );
}

function seg({ label, children, className = '' }) {
    return h('div', { class: 'vx-section ' + className },
        label != null ? h('div', { class: 'vx-section-label' }, label) : null,
        ...(Array.isArray(children) ? children : [children])
    );
}

function devSelect(value, devices, onChange, aria) {
    return h('select', {
        class: 'vx-select', 'aria-label': aria,
        onchange: onChange ? (e) => onChange(e.target.value) : null
    }, ...(devices || []).map(d =>
        h('option', { key: 'd-' + d.value, value: d.value, selected: d.value === value }, d.label)));
}

function toggleRow(label, checked, onToggle) {
    return h('label', { class: 'vx-toggle-row' },
        h('span', {}, label),
        h('input', {
            type: 'checkbox', class: 'vx-toggle',
            checked: checked ? true : null,
            onchange: onToggle ? (e) => onToggle(e.target.checked) : null
        })
    );
}

export function VoiceSettingsModal({ open = false, mode = 'ptt', inputId, outputId, inputDevices = [], outputDevices = [], vadThreshold = 0.5, rnnoise = false, autoGain = false, forceTurn = false, bitrate = 64, volume, onChange, onSave, onCancel, onClose } = {}) {
    if (!open) return null;
    const patch = (p) => onChange && onChange(p);
    const modes = ['ptt', 'vad', 'live'];
    const vol = volume == null ? 1 : volume;
    return h('div', {
        class: 'vx-modal-backdrop',
        onclick: (e) => { if (e.target === e.currentTarget) onClose && onClose(); },
        onkeydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose && onClose(); } }
    },
        h('div', { class: 'vx-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Voice settings' },
            h('div', { class: 'vx-modal-head' },
                h('h2', { class: 'vx-modal-title' }, 'Voice settings'),
                h('button', { type: 'button', class: 'vx-modal-x', 'aria-label': 'close', onclick: () => onClose && onClose() }, '×')
            ),
            h('div', { class: 'vx-modal-body' },
                seg({ label: 'Mode', children:
                    h('div', { class: 'vx-segmented', role: 'group', 'aria-label': 'mode' },
                        ...modes.map(m => h('button', {
                            key: 'm-' + m, type: 'button',
                            class: 'vx-seg' + (m === mode ? ' vx-seg-on' : ''),
                            'aria-pressed': m === mode ? 'true' : 'false',
                            onclick: () => patch({ mode: m })
                        }, m.toUpperCase())))
                }),
                seg({ label: 'Input device', children: devSelect(inputId, inputDevices, (v) => patch({ inputId: v }), 'input device') }),
                seg({ label: 'Output device', children: devSelect(outputId, outputDevices, (v) => patch({ outputId: v }), 'output device') }),
                mode === 'vad' ? seg({ label: 'VAD threshold', children:
                    h('div', { class: 'vx-range-row' },
                        h('input', {
                            type: 'range', class: 'vx-range', min: '0', max: '1', step: '0.01',
                            value: String(vadThreshold), 'aria-label': 'VAD threshold',
                            oninput: (e) => patch({ vadThreshold: parseFloat(e.target.value) })
                        }),
                        h('span', { class: 'vx-range-val' }, Math.round((Number(vadThreshold) || 0) * 100) + '%')
                    )
                }) : null,
                seg({ label: 'Processing', children: [
                    toggleRow('RNNoise', rnnoise, (v) => patch({ rnnoise: v })),
                    toggleRow('Auto gain', autoGain, (v) => patch({ autoGain: v })),
                    toggleRow('Force TURN', forceTurn, (v) => patch({ forceTurn: v }))
                ]}),
                seg({ label: 'Bitrate', children:
                    h('div', { class: 'vx-range-row' },
                        h('input', {
                            type: 'range', class: 'vx-range', min: '8', max: '256', step: '8',
                            value: String(bitrate), 'aria-label': 'bitrate',
                            oninput: (e) => patch({ bitrate: parseInt(e.target.value, 10) })
                        }),
                        h('span', { class: 'vx-range-val' }, (Number(bitrate) || 0) + ' kbps')
                    )
                }),
                seg({ label: 'Master volume', children:
                    h('div', { class: 'vx-range-row' },
                        h('input', {
                            type: 'range', class: 'vx-range', min: '0', max: '1', step: '0.01',
                            value: String(vol), 'aria-label': 'master volume',
                            oninput: (e) => patch({ volume: parseFloat(e.target.value) })
                        }),
                        h('span', { class: 'vx-range-val' }, Math.round(vol * 100) + '%')
                    )
                })
            ),
            h('div', { class: 'vx-modal-foot' },
                h('button', { type: 'button', class: 'vx-btn', onclick: () => onCancel && onCancel() }, 'Cancel'),
                h('button', { type: 'button', class: 'vx-btn vx-btn-primary', onclick: () => onSave && onSave() }, 'Save')
            )
        )
    );
}

export function VoiceControls({ muted = false, deafened = false, cameraOn = false, screenShareOn = false, onMic, onDeafen, onCamera, onScreenShare, onSettings, onLeave } = {}) {
    const btn = (cls, on, label, glyph, handler) => h('button', {
        type: 'button',
        class: 'vx-vc-btn ' + cls + (on ? ' vx-vc-on' : '') + (handler ? '' : ' vx-vc-disabled'),
        'aria-pressed': on ? 'true' : 'false',
        'aria-label': label,
        title: label,
        disabled: handler ? null : true,
        onclick: handler ? (e) => handler(e) : null
    },
        h('span', { class: 'vx-vc-glyph', 'aria-hidden': 'true' }, glyph)
    );
    return h('div', { class: 'vx-vc', role: 'toolbar', 'aria-label': 'voice controls' },
        btn('vx-vc-mic', !muted, muted ? 'Unmute' : 'Mute', Icon(muted ? 'mic-off' : 'mic'), onMic),
        btn('vx-vc-deafen', !deafened, deafened ? 'Undeafen' : 'Deafen', Icon(deafened ? 'speaker-off' : 'speaker'), onDeafen),
        btn('vx-vc-camera', cameraOn, cameraOn ? 'Stop camera' : 'Start camera', Icon('camera'), onCamera),
        btn('vx-vc-screen', screenShareOn, screenShareOn ? 'Stop sharing' : 'Share screen', Icon('screen'), onScreenShare),
        btn('vx-vc-settings', false, 'Voice settings', Icon('settings'), onSettings),
        h('button', {
            type: 'button', class: 'vx-vc-btn vx-vc-leave', 'aria-label': 'Leave voice', title: 'Leave voice',
            onclick: onLeave ? (e) => onLeave(e) : null
        }, h('span', { class: 'vx-vc-glyph', 'aria-hidden': 'true' }, Icon('phone')))
    );
}

export function AudioQueue({ segments = [], currentSegmentId = null, paused = false, onReplay, onSkip, onResume, onPause } = {}) {
    if (!segments || !segments.length) {
        return h('div', { class: 'vx-queue vx-queue-empty' },
            h('span', { class: 'vx-queue-empty-text' }, 'No audio queued'));
    }
    return h('div', { class: 'vx-queue', role: 'group', 'aria-label': 'audio queue' },
        h('div', { class: 'vx-queue-ctrls' },
            h('button', {
                type: 'button', class: 'vx-queue-btn',
                'aria-label': paused ? 'resume' : 'pause',
                onclick: () => paused ? (onResume && onResume()) : (onPause && onPause())
            }, paused ? '▶' : '⏸'),
            h('button', {
                type: 'button', class: 'vx-queue-btn',
                'aria-label': 'skip', onclick: () => onSkip && onSkip()
            }, '⏭')
        ),
        h('div', { class: 'vx-queue-strip' },
            ...segments.map(s => h('button', {
                key: 'q-' + s.id,
                type: 'button',
                class: 'vx-chip' + (s.id === currentSegmentId ? ' vx-chip-current' : '') + (s.isLive ? ' vx-chip-live' : ''),
                'data-id': s.id,
                onclick: () => onReplay && onReplay(s.id)
            },
                h('span', { class: 'vx-chip-dot', style: s.color ? 'background:' + s.color : null, 'aria-hidden': 'true' }),
                h('span', { class: 'vx-chip-name' }, s.speaker || '—'),
                s.isLive
                    ? h('span', { class: 'vx-chip-tag' }, 'LIVE')
                    : h('span', { class: 'vx-chip-dur' }, fmtDur(s.duration))
            ))
        )
    );
}
