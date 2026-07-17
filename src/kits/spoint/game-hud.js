// Game-HUD paint surface for the spoint TPS client (webjsx vnode tree).
// renderGameHud(h, { hp, ammo, magazine, reloading, reloadProgress, boostSec })
// -> a vnode the consumer mounts. Pure presentation; the app owns all state.
// `h` is the consumer's createElement (webjsx) so the tree composes into the
// app's existing render() return.
//
// Composed from four independent primitives below (Crosshair, AmmoCounter,
// HealthBar, BoostIndicator) -- each takes the same `h` + a narrow slice of
// props and returns its own vnode, so a consumer that wants a custom HUD
// layout (e.g. reposition the ammo counter, drop the boost badge) can import
// just the pieces it needs instead of the whole composed tree.

/** Center-screen aim reticle. No props beyond `h`. */
export function Crosshair(h) {
  return h('div', { class: 'sp-hud-crosshair' }, '+')
}

/**
 * Ammo readout — `ammo/magazine`, or a reload-progress label while reloading.
 * @param {Object} [props]
 * @param {number} [props.ammo=0]
 * @param {number} [props.magazine=30]
 * @param {boolean} [props.reloading=false]
 * @param {number} [props.reloadProgress=0]
 */
export function AmmoCounter(h, props = {}) {
  const { ammo = 0, magazine = 30, reloading = false, reloadProgress = 0 } = props
  return h('div', { class: 'sp-hud-ammo' },
    reloading
      ? h('span', { class: 'sp-hud-ammo-reloading' }, `RELOADING ${reloadProgress}%`)
      : h('span', null, `${ammo}/${magazine}`)
  )
}

/**
 * Bottom-center health bar with a threshold-colored fill and a numeric label.
 * @param {Object} [props]
 * @param {number} [props.hp=100]
 */
export function HealthBar(h, props = {}) {
  const { hp = 100 } = props
  const hpClass = hp > 60 ? 'sp-hud-hp-high' : hp > 30 ? 'sp-hud-hp-mid' : 'sp-hud-hp-low'
  return h('div', { class: 'sp-hud-health' },
    h('div', { class: `sp-hud-health-fill ${hpClass}`, style: `width:${hp}%` }),
    h('span', { class: 'sp-hud-health-num' }, String(hp))
  )
}

/**
 * Top-right boost badge. Renders nothing while boostSec <= 0 (consumer can
 * check this before calling too; kept internal so composition stays a
 * one-liner in renderGameHud).
 * @param {Object} [props]
 * @param {number} [props.boostSec=0]
 */
export function BoostIndicator(h, props = {}) {
  const { boostSec = 0 } = props
  if (boostSec <= 0) return null
  return h('div', { class: 'sp-hud-boost' }, `BOOSTED ${boostSec}s`)
}

export function renderGameHud(h, state = {}) {
  const {
    hp = 100,
    ammo = 0,
    magazine = 30,
    reloading = false,
    reloadProgress = 0,
    boostSec = 0,
  } = state

  return h('div', { class: 'sp-hud' },
    Crosshair(h),
    AmmoCounter(h, { ammo, magazine, reloading, reloadProgress }),
    HealthBar(h, { hp }),
    BoostIndicator(h, { boostSec })
  )
}
