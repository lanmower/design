// Game-HUD paint surface for the spoint TPS client (webjsx vnode tree).
// renderGameHud(h, { hp, ammo, magazine, reloading, reloadProgress, boostSec })
// -> a vnode the consumer mounts. Pure presentation; the app owns all state.
// `h` is the consumer's createElement (webjsx) so the tree composes into the
// app's existing render() return.

export function renderGameHud(h, state = {}) {
  const {
    hp = 100,
    ammo = 0,
    magazine = 30,
    reloading = false,
    reloadProgress = 0,
    boostSec = 0,
  } = state

  const hpClass = hp > 60 ? 'sp-hud-hp-high' : hp > 30 ? 'sp-hud-hp-mid' : 'sp-hud-hp-low'

  return h('div', { class: 'sp-hud' },
    h('div', { class: 'sp-hud-crosshair' }, '+'),
    h('div', { class: 'sp-hud-ammo' },
      reloading
        ? h('span', { class: 'sp-hud-ammo-reloading' }, `RELOADING ${reloadProgress}%`)
        : h('span', null, `${ammo}/${magazine}`)
    ),
    h('div', { class: 'sp-hud-health' },
      h('div', { class: `sp-hud-health-fill ${hpClass}`, style: `width:${hp}%` }),
      h('span', { class: 'sp-hud-health-num' }, String(hp))
    ),
    boostSec > 0 ? h('div', { class: 'sp-hud-boost' }, `BOOSTED ${boostSec}s`) : null
  )
}
