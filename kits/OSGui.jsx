/* OSGui.jsx — Sequential-OS / web desktop. Previously un-exemplified. */

function OSGui() {
  const { useState } = React;
  const [focused, setFocused] = useState('terminal');
  const apps = [
    { id: 'finder',   name: 'finder',   icon: '◰' },
    { id: 'terminal', name: 'terminal', icon: '⌘' },
    { id: 'editor',   name: 'editor',   icon: '✎' },
    { id: 'flow',     name: 'flow',     icon: '⇄' },
    { id: 'tools',    name: 'tools',    icon: '⌁' },
    { id: 'debug',    name: 'debug',    icon: '⏵' },
  ];

  return (
    <div style={{ containerType: 'inline-size', position: 'relative', background: '#131318', color: 'var(--paper)', minHeight: '100%', overflow: 'hidden', fontFamily: 'var(--ff-mono)' }} className="kit-os">
      {/* Wallpaper: subtle 247420 grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(36,116,32,0.18) 0, transparent 40%),
          radial-gradient(circle at 80% 70%, rgba(66,2,71,0.20) 0, transparent 45%),
          linear-gradient(to right, rgba(239,233,221,0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(239,233,221,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 32px 32px, 32px 32px'
      }} />

      {/* Top menu bar */}
      <div style={{
        position: 'relative', zIndex: 5,
        padding: '6px 14px', background: '#0A0A0E',
        borderBottom: '1px solid #34343C',
        display: 'flex', alignItems: 'center', gap: 16,
        fontSize: 'var(--fs-tiny)', textTransform: 'uppercase', letterSpacing: '0.14em'
      }}>
        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>247420</span>
        <span>file</span><span>edit</span><span>view</span><span>flow</span><span>window</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: '#9A9AA2' }}>⌬ <span style={{ color: 'var(--green-2)' }}>online</span> · gm@v0.4.1</span>
        <span style={{ color: 'var(--paper)' }}>04:20 · tue</span>
      </div>

      {/* Window: terminal */}
      <Window
        title="terminal · gm" id="terminal" focused={focused === 'terminal'} onFocus={() => setFocused('terminal')}
        x={40} y={32} w={520} h={300} accent="green"
      >
        <pre style={{ background: 'transparent', color: 'var(--paper)', padding: '14px 18px', fontSize: 'var(--fs-tiny)', lineHeight: 1.55 }}>
{`▸ gm start
→ state: idle · tools: 19
› fix the failing test
→ state: reading · src/router.ts
`}<span style={{ color: 'var(--mascot)' }}>▸ astgrep_search</span>{` "$.test.skip(...)"
↪ 1 match @ line 42
`}<span style={{ color: 'var(--sun)' }}>▸ state: editing</span>{`
`}<span style={{ color: 'var(--green-2)' }}>▸ state: done · 11.4s</span>{` `}<span className="cursor-blink" />
        </pre>
      </Window>

      {/* Window: editor */}
      <Window
        title="editor · src/router.ts" id="editor" focused={focused === 'editor'} onFocus={() => setFocused('editor')}
        x={420} y={120} w={460} h={280} accent="purple"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr', fontSize: 'var(--fs-tiny)', fontFamily: 'var(--ff-mono)' }}>
          <div style={{ background: '#0A0A0E', color: '#6A6A70', padding: '12px 8px', textAlign: 'right', lineHeight: 1.7 }}>
            {Array.from({ length: 10 }, (_, i) => <div key={i}>{40 + i}</div>)}
          </div>
          <pre style={{ background: 'transparent', color: 'var(--paper)', padding: 12, fontSize: 'var(--fs-tiny)', lineHeight: 1.7, margin: 0 }}>
{`router.get('/api/works', `}<span style={{ color: 'var(--mascot)' }}>async</span>{` (req, res) => {
  `}<span style={{ color: 'var(--ink-3)', color: '#6A6A70' }}>// handler restored — was skipped</span>{`
  `}<span style={{ color: 'var(--mascot)' }}>const</span>{` works = `}<span style={{ color: 'var(--mascot)' }}>await</span>{` db.works();
  res.json(works);
});
            `}
          </pre>
        </div>
      </Window>

      {/* Window: flow editor */}
      <Window
        title="flow · gm.state-machine" id="flow" focused={focused === 'flow'} onFocus={() => setFocused('flow')}
        x={140} y={300} w={580} h={220} accent="mascot"
      >
        <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {['idle','reading','planning','editing','verifying','done'].map((s, i) => (
            <React.Fragment key={i}>
              <span style={{
                padding: '6px 10px',
                background: i === 5 ? 'var(--green)' : (i === 0 ? 'var(--bg-3)' : '#34343C'),
                color: 'var(--paper)',
                fontSize: 'var(--fs-tiny)', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>{s}</span>
              {i < 5 && <span style={{ color: '#6A6A70' }}>→</span>}
            </React.Fragment>
          ))}
        </div>
        <div style={{ padding: '0 14px 14px', fontSize: 'var(--fs-tiny)', color: '#9A9AA2' }}>
          <div>transitions · 24 · last fired · 11s ago</div>
          <div>guards · 6 enabled · 0 violated</div>
        </div>
      </Window>

      {/* Dock */}
      <div style={{
        position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 6, padding: '6px 10px',
        background: 'rgba(15,13,10,0.88)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 0, zIndex: 20
      }} className="os-dock">
        {apps.map((a, i) => (
          <button key={i} onClick={() => setFocused(a.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '8px 12px', background: focused === a.id ? 'var(--accent)' : 'transparent',
            color: focused === a.id ? 'var(--accent-fg)' : 'var(--paper)',
            border: 0, cursor: 'pointer', fontFamily: 'var(--ff-mono)', fontSize: 'var(--fs-micro)',
            textTransform: 'uppercase', letterSpacing: '0.1em'
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{a.icon}</span>
            <span>{a.name}</span>
          </button>
        ))}
      </div>

      <style>{`
        .kit-os .os-window { position: absolute; background: #131318; box-shadow: 0 12px 40px rgba(0,0,0,0.5); border-radius: 14px; overflow: hidden; }
        @container (max-width: 720px) {
          .kit-os .os-window { left: 8px !important; right: 8px !important; width: auto !important; }
          .kit-os .os-window[data-id="editor"] { top: 350px !important; }
          .kit-os .os-window[data-id="flow"] { top: 660px !important; }
        }
      `}</style>
    </div>
  );
}

function Window({ title, id, focused, onFocus, x, y, w, h, accent, children }) {
  const accentColor = { green: 'var(--green)', purple: 'var(--purple-2)', mascot: 'var(--mascot)', sky: 'var(--sky)' }[accent || 'green'];
  return (
    <div className="os-window" data-id={id} onMouseDown={onFocus} style={{
      left: x, top: y, width: w, minHeight: h,
      zIndex: focused ? 12 : 10,
      outline: focused ? `2px solid ${accentColor}` : 'none',
      outlineOffset: -1
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 8,
        padding: '7px 10px',
        background: focused ? accentColor : '#25252C',
        color: 'var(--paper)',
        fontFamily: 'var(--ff-mono)', fontSize: 'var(--fs-tiny)',
        textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={{ width: 9, height: 9, background: '#0A0A0E', borderRadius: 0 }} />
          <span style={{ width: 9, height: 9, background: '#0A0A0E', borderRadius: 0 }} />
          <span style={{ width: 9, height: 9, background: '#0A0A0E', borderRadius: 0 }} />
        </div>
        <span style={{ textAlign: 'center', opacity: focused ? 1 : 0.7 }}>{title}</span>
        <span style={{ opacity: 0.6 }}>×</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

window.OSGui = OSGui;
