// VoiceSettingsModal — mode (PTT / VAD / live), input+output device pickers,
// VAD threshold, processing toggles, bitrate and master volume, composed from
// the SettingsRow/SettingsSection primitives (settings-row.js).

import * as webjsx from '../../../vendor/webjsx/index.js';
import { Icon } from '../shell.js';
import { SettingsSection, SettingsRow, SettingsRowToggle, SettingsRowSelect } from './settings-row.js';
const h = webjsx.createElement;

function devOptions(devices) {
    return (devices || []).map(d => ({ value: d.value, label: d.label }));
}

function sliderRow({ icon, label, min, max, step, value, format, onInput, ariaLabel }) {
    return SettingsRow({
        icon, label,
        description: h('div', { class: 'vx-stg-range-row' },
            h('input', {
                type: 'range', class: 'vx-stg-range', min: String(min), max: String(max), step: String(step),
                value: String(value), 'aria-label': ariaLabel || label,
                onclick: (e) => e.stopPropagation(),
                oninput: onInput ? (e) => onInput(parseFloat(e.target.value)) : null
            }),
            h('span', { class: 'vx-stg-range-val' }, format(value))
        )
    });
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
                h('button', { type: 'button', class: 'vx-modal-x', 'aria-label': 'close', onclick: () => onClose && onClose() }, Icon('x'))
            ),
            h('div', { class: 'vx-modal-body' },
                SettingsSection({ title: 'Mode', children:
                    h('div', { class: 'vx-segmented', role: 'group', 'aria-label': 'mode' },
                        ...modes.map(m => h('button', {
                            key: 'm-' + m, type: 'button',
                            class: 'vx-seg' + (m === mode ? ' vx-seg-on' : ''),
                            'aria-pressed': m === mode ? 'true' : 'false',
                            onclick: () => patch({ mode: m })
                        }, m.toUpperCase())))
                }),
                SettingsSection({ title: 'Devices', children: [
                    SettingsRowSelect({
                        icon: 'mic', label: 'Input device', ariaLabel: 'input device',
                        value: inputId, options: devOptions(inputDevices),
                        onChange: (v) => patch({ inputId: v })
                    }),
                    SettingsRowSelect({
                        icon: 'speaker', label: 'Output device', ariaLabel: 'output device',
                        value: outputId, options: devOptions(outputDevices),
                        onChange: (v) => patch({ outputId: v })
                    })
                ]}),
                mode === 'vad' ? SettingsSection({ title: 'Voice activity', children:
                    sliderRow({
                        icon: 'blank', label: 'VAD threshold', min: 0, max: 1, step: 0.01, value: vadThreshold,
                        format: (v) => Math.round((Number(v) || 0) * 100) + '%',
                        onInput: (v) => patch({ vadThreshold: v }), ariaLabel: 'VAD threshold'
                    })
                }) : null,
                SettingsSection({ title: 'Processing', children: [
                    SettingsRowToggle({ icon: 'blank', label: 'RNNoise', checked: rnnoise, onToggle: (v) => patch({ rnnoise: v }) }),
                    SettingsRowToggle({ icon: 'blank', label: 'Auto gain', checked: autoGain, onToggle: (v) => patch({ autoGain: v }) }),
                    SettingsRowToggle({ icon: 'blank', label: 'Force TURN', checked: forceTurn, onToggle: (v) => patch({ forceTurn: v }) })
                ]}),
                SettingsSection({ title: 'Bandwidth & volume', children: [
                    sliderRow({
                        icon: 'blank', label: 'Bitrate', min: 8, max: 256, step: 8, value: bitrate,
                        format: (v) => (Number(v) || 0) + ' kbps',
                        onInput: (v) => patch({ bitrate: Math.round(v) }), ariaLabel: 'bitrate'
                    }),
                    sliderRow({
                        icon: 'blank', label: 'Master volume', min: 0, max: 1, step: 0.01, value: vol,
                        format: (v) => Math.round(v * 100) + '%',
                        onInput: (v) => patch({ volume: v }), ariaLabel: 'master volume'
                    })
                ]})
            ),
            h('div', { class: 'vx-modal-foot' },
                h('button', { type: 'button', class: 'vx-btn', onclick: () => onCancel && onCancel() }, 'Cancel'),
                h('button', { type: 'button', class: 'vx-btn vx-btn-primary', onclick: () => onSave && onSave() }, 'Save')
            )
        )
    );
}
