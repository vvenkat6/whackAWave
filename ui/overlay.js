// Dispatch custom events that InputHub listens to: 'phaser:input'
const PHASER_INPUT = 'phaser:input'

/** @typedef {'MOVE'|'MOVE_LEFT'|'MOVE_RIGHT'|'MOVE_UP'|'MOVE_DOWN'|'JUMP'|'FIRE'|'PAUSE'} ActionId */
/** @typedef {'down'|'up'|'change'} ActionPhase */

function getDeviceType(ua) {
  const s = ua.toLowerCase()
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return 'Tablet'
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/.test(s)) return 'Mobile'
  return 'Desktop'
}

document.body.classList.add(getDeviceType(navigator.userAgent) === 'Desktop' ? 'desktop' : 'mobile')

/** @param {ActionId} action @param {ActionPhase} phase @param {{x?:number,y?:number}=} axis @param {number=} value */
function dispatchInput(action, phase, axis, value) {
  const detail = { action, phase }
  if (axis) detail.axis = axis
  if (typeof value === 'number') detail.value = value
  window.dispatchEvent(new CustomEvent(PHASER_INPUT, { detail }))
}

// ----- Keyboard for Desktop -----
class InputManager {
  constructor() {
    this.keysDown = new Set()
    this.attached = false
  }
  attachKeyboardIfDesktop() {
    if (this.attached || document.body.classList.contains('mobile')) return
    const map = {
      ArrowLeft: 'MOVE_LEFT',
      KeyA: 'MOVE_LEFT',
      ArrowRight: 'MOVE_RIGHT',
      KeyD: 'MOVE_RIGHT',
      ArrowUp: 'MOVE_UP',
      KeyW: 'MOVE_UP',
      ArrowDown: 'MOVE_DOWN',
      KeyS: 'MOVE_DOWN',
      Space: 'JUMP',
      KeyJ: 'FIRE',
      Escape: 'PAUSE'
    }
    const onDown = (e) => {
      const act = map[e.code]
      if (!act) return
      e.preventDefault()
      if (act === 'PAUSE') {
        dispatchInput('PAUSE', 'down')
        setTimeout(() => dispatchInput('PAUSE', 'up'), 30)
        return
      }
      if (!this.keysDown.has(e.code)) {
        this.keysDown.add(e.code)
        dispatchInput(act, 'down')
      }
    }
    const onUp = (e) => {
      const act = map[e.code]
      if (!act) return
      e.preventDefault()
      if (this.keysDown.has(e.code)) {
        this.keysDown.delete(e.code)
        dispatchInput(act, 'up')
      }
    }
    window.addEventListener('keydown', onDown, { passive: false })
    window.addEventListener('keyup', onUp, { passive: false })
    this._detach = () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      this.keysDown.clear()
      this.attached = false
    }
    this.attached = true
  }
  detachKeyboard() {
    this._detach?.()
  }
}

// ----- Touch overlay (Joystick + A/B/Pause) -----
function mountTouchControls({ analogOnly = false, threshold = 0.35, deadzone = 0.08 } = {}) {
  if (document.body.classList.contains('desktop')) return () => {}
  const joyBase = document.getElementById('joyBase')
  const knob = document.getElementById('joyKnob')
  const btnA = document.getElementById('btnA')
  const btnB = document.getElementById('btnB')
  const btnP = document.getElementById('btnPause')

  const radius = 52
  const centerOffset = { x: 44, y: 44 }
  const state = {
    joyActive: false,
    center: { x: 0, y: 0 },
    axis: { x: 0, y: 0 },
    digital: { left: false, right: false, up: false, down: false }
  }

  const emitAnalog = (x, y) => {
    const ax = Math.abs(x) < deadzone ? 0 : x
    const ay = Math.abs(y) < deadzone ? 0 : y
    state.axis = { x: +ax.toFixed(3), y: +ay.toFixed(3) }
    dispatchInput('MOVE', 'change', state.axis)
  }
  const maybeEmitDigitalsFromAxis = (x, y) => {
    if (analogOnly) return
    const next = {
      left: x <= -threshold,
      right: x >= threshold,
      up: y <= -threshold,
      down: y >= threshold
    }
    const prev = state.digital
    if (next.left !== prev.left) dispatchInput('MOVE_LEFT', next.left ? 'down' : 'up')
    if (next.right !== prev.right) dispatchInput('MOVE_RIGHT', next.right ? 'down' : 'up')
    if (next.up !== prev.up) dispatchInput('MOVE_UP', next.up ? 'down' : 'up')
    if (next.down !== prev.down) dispatchInput('MOVE_DOWN', next.down ? 'down' : 'up')
    state.digital = next
  }
  const getLocalPos = (e, el) => {
    const r = el.getBoundingClientRect()
    const t = e.touches?.[0]
    const cx = t ? t.clientX : e.clientX
    const cy = t ? t.clientY : e.clientY
    return { x: cx - r.left, y: cy - r.top }
  }
  const setKnob = (dx, dy) => {
    knob.style.left = `${centerOffset.x + dx}px`
    knob.style.top = `${centerOffset.y + dy}px`
  }

  const onStart = (e) => {
    e.preventDefault()
    const p = getLocalPos(e, joyBase)
    state.joyActive = true
    state.center = { x: p.x, y: p.y }
    setKnob(0, 0)
    emitAnalog(0, 0)
    maybeEmitDigitalsFromAxis(0, 0)
  }
  const onMove = (e) => {
    if (!state.joyActive) return
    e.preventDefault()
    const p = getLocalPos(e, joyBase)
    let dx = p.x - state.center.x,
      dy = p.y - state.center.y
    const len = Math.hypot(dx, dy) || 1
    const clamped = Math.min(len, radius)
    dx *= clamped / len
    dy *= clamped / len
    setKnob(dx, dy)
    const ax = dx / radius,
      ay = dy / radius
    emitAnalog(ax, ay)
    maybeEmitDigitalsFromAxis(ax, ay)
  }
  const onEnd = (e) => {
    if (!state.joyActive) return
    state.joyActive = false
    setKnob(0, 0)
    emitAnalog(0, 0)
    maybeEmitDigitalsFromAxis(0, 0)
  }

  joyBase.addEventListener('pointerdown', onStart)
  window.addEventListener('pointermove', onMove, { passive: false })
  window.addEventListener('pointerup', onEnd)

  // Buttons
  const press = (el, onDown, onUp) => {
    const d = (e) => {
      e.preventDefault()
      el.style.background = 'rgba(255,255,255,0.25)'
      onDown()
    }
    const u = (e) => {
      e.preventDefault()
      el.style.background = 'rgba(255,255,255,0.1)'
      onUp()
    }
    el.addEventListener('pointerdown', d)
    el.addEventListener('pointerup', u)
    el.addEventListener('pointercancel', u)
    el.addEventListener('pointerleave', u)
    return () => {
      el.removeEventListener('pointerdown', d)
      el.removeEventListener('pointerup', u)
      el.removeEventListener('pointercancel', u)
      el.removeEventListener('pointerleave', u)
    }
  }
  const offA = press(
    btnA,
    () => dispatchInput('JUMP', 'down'),
    () => dispatchInput('JUMP', 'up')
  )
  const offB = press(
    btnB,
    () => dispatchInput('FIRE', 'down'),
    () => dispatchInput('FIRE', 'up')
  )

  const pauseDown = (e) => {
    e.preventDefault()
    btnP.style.color = 'rgba(255,255,255,0.25)'
    dispatchInput('PAUSE', 'down')
    setTimeout(() => dispatchInput('PAUSE', 'up'), 30)
  }
  const pauseUp = () => {
    btnP.style.color = 'rgba(255,255,255,1)'
  }
  btnP.addEventListener('pointerdown', pauseDown)
  btnP.addEventListener('pointerup', pauseUp)

  return () => {
    joyBase.removeEventListener('pointerdown', onStart)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onEnd)
    offA()
    offB()
    btnP.removeEventListener('pointerdown', pauseDown)
    btnP.removeEventListener('pointerup', pauseUp)
  }
}

// Boot
const input = new InputManager()
input.attachKeyboardIfDesktop()
const unmountTouch = mountTouchControls()
window.addEventListener('beforeunload', () => {
  unmountTouch?.()
  input.detachKeyboard()
})

