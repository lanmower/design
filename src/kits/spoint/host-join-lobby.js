// Host/join lobby paint surface for the spoint multiplayer setup.
// renderHostJoinLobby({ onHost, onJoin, onClose }) -> { node, showHosting,
// showError, dispose }. The consumer owns transport/navigation; this module
// owns layout + classes. Two actions: Host (start a room, then showHosting
// surfaces the code + copyable join link) and Join (enter a code or paste a
// join link). onHost() -> Promise|void; onJoin(rawCodeOrLink) -> void.

export function renderHostJoinLobby(opts = {}) {
  const { onHost, onJoin, onClose } = opts

  const node = document.createElement('div')
  node.className = 'sp-lobby ds-247420'
  node.dataset.component = 'host-join-lobby'

  const card = document.createElement('div')
  card.className = 'sp-lobby-card'
  node.appendChild(card)

  const mk = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text != null) el.textContent = text; return el }

  function _idle() {
    card.replaceChildren()
    card.append(
      mk('h2', 'sp-lobby-title', 'Multiplayer'),
      mk('p', 'sp-lobby-sub', 'Host a match others can join, or join with a code.')
    )
    const hostBtn = mk('button', 'sp-lobby-btn sp-lobby-btn-primary', 'Host a Game')
    hostBtn.addEventListener('click', () => { hostBtn.disabled = true; hostBtn.textContent = 'Starting...'; onHost?.() })
    card.appendChild(hostBtn)

    const joinRow = mk('div', 'sp-lobby-join')
    const input = mk('input', 'sp-lobby-input')
    input.type = 'text'
    input.placeholder = 'Enter room code or link'
    input.autocapitalize = 'characters'
    const joinBtn = mk('button', 'sp-lobby-btn', 'Join')
    const submit = () => { const v = (input.value || '').trim(); if (!v) { showError('Enter a code'); return } onJoin?.(v) }
    joinBtn.addEventListener('click', submit)
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit() })
    joinRow.append(input, joinBtn)
    card.appendChild(joinRow)

    const err = mk('div', 'sp-lobby-err'); err.id = 'sp-lobby-err'
    card.appendChild(err)

    if (onClose) {
      const close = mk('button', 'sp-lobby-close', 'x')
      close.addEventListener('click', () => onClose())
      card.appendChild(close)
    }
  }

  function showHosting(code, link) {
    card.replaceChildren()
    card.append(
      mk('h2', 'sp-lobby-title', 'Hosting'),
      mk('p', 'sp-lobby-sub', 'Share this so others can join:'),
      mk('div', 'sp-lobby-code', code)
    )
    const linkField = mk('input', 'sp-lobby-input sp-lobby-link')
    linkField.type = 'text'; linkField.readOnly = true; linkField.value = link
    card.appendChild(linkField)
    const copyBtn = mk('button', 'sp-lobby-btn sp-lobby-btn-primary', 'Copy Join Link')
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(link) } catch (_) { linkField.select(); document.execCommand && document.execCommand('copy') }
      copyBtn.textContent = 'Copied'
      setTimeout(() => { copyBtn.textContent = 'Copy Join Link' }, 1600)
    })
    card.appendChild(copyBtn)
    card.appendChild(mk('p', 'sp-lobby-sub', 'Waiting for players...'))
  }

  function showError(msg) {
    const err = card.querySelector('#sp-lobby-err')
    if (err) err.textContent = msg
  }

  _idle()

  return { node, showHosting, showError, dispose: () => node.remove() }
}
