/* AppShell.jsx — generic web-app chrome (top nav, side rail, content), calmer */

function AppShell() {
  const { useState } = React;
  const [tab, setTab] = useState('runs');
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }} className="kit-app">
      <header style={{
        padding: '14px 22px',
        background: 'color-mix(in oklab, var(--bg) 88%, transparent)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'grid', gridTemplateColumns: 'auto auto 1fr auto auto', alignItems: 'center', gap: 16,
        position: 'sticky', top: 0, zIndex: 5,
      }}>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700, fontSize: 'var(--fs-sm)' }}>247420</a>
        <nav className="t-meta app-crumb-inline" style={{ fontSize: 'var(--fs-sm)' }}>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>workspace</a>
          <span style={{ margin: '0 8px', opacity: 0.5 }}>/</span>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>gm</a>
          <span style={{ margin: '0 8px', opacity: 0.5 }}>/</span>
          <span style={{ color: 'var(--fg)' }}>production</span>
        </nav>
        <span />
        <button onClick={() => setPaletteOpen(true)} className="app-search-trigger" style={{
          padding: '9px 18px', background: 'var(--bg-2)', color: 'var(--fg-2)', border: 0, cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 'var(--fs-sm)',
          display: 'flex', alignItems: 'center', gap: 10,
          borderRadius: 'var(--r-pill)',
        }}>
          <span style={{ color: 'var(--fg-3)' }}>⌕</span>
          <span className="label-long" style={{ color: 'var(--fg-3)' }}>Search · jump to…</span>
          <span className="label-short" style={{ color: 'var(--fg-3)', display: 'none' }}>Search</span>
          <kbd style={{ background: 'var(--bg-3)', padding: '1px 6px', fontFamily: 'var(--ff-mono)', fontSize: 'var(--fs-micro)' }}>⌘K</kbd>
        </button>
        <div style={{
          width: 30, height: 30, background: 'var(--accent)', color: 'var(--accent-fg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-xs)', fontWeight: 700, borderRadius: '50%'
        }}>b0</div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: 0, flex: 1 }} className="app-body">
        <aside style={{
          padding: 'var(--space-4) var(--space-3)',
          background: 'var(--bg-2)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
          fontSize: 'var(--fs-sm)'
        }} className="app-rail">
          {[
            ['Main',  [['Runs', '⊞', 3], ['Flows', '⇄', null], ['Tools', '⌁', null]]],
            ['Data',  [['Logs', '☰', null], ['Traces', '⌬', null], ['Storage', '◰', null]]],
            ['Admin', [['Team', '◉', null], ['Billing', '$', null], ['Settings', '⚙', null]]],
          ].map(([sec, items], i) => (
            <div key={i}>
              <div className="t-meta" style={{ fontSize: 'var(--fs-xs)', marginBottom: 6, padding: '0 8px', fontWeight: 600 }}>{sec}</div>
              {items.map(([n, ic, badge], j) => {
                const active = tab === n.toLowerCase();
                return (
                  <button key={j} onClick={() => setTab(n.toLowerCase())} style={{
                    width: '100%', textAlign: 'left',
                    display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: 10, alignItems: 'center',
                    padding: '10px 14px', border: 0, cursor: 'pointer',
                    background: active ? 'var(--accent)' : 'transparent',
                    color: active ? 'var(--accent-fg)' : 'inherit',
                    fontFamily: 'inherit', fontSize: 'inherit', fontWeight: active ? 600 : 400,
                    borderRadius: 'var(--r-pill)',
                    marginBottom: 2,
                  }}>
                    <span style={{ opacity: 0.7 }}>{ic}</span>
                    <span>{n}</span>
                    {badge && <span style={{
                      background: 'var(--mascot)', color: 'var(--ink)',
                      padding: '0 8px', fontSize: 'var(--fs-micro)', fontWeight: 700, borderRadius: 'var(--r-pill)'
                    }}>{badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        <main style={{ padding: 'var(--space-6) var(--space-7)' }} className="app-main">
          <div className="app-page-head" style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
            <div>
              <span className="eyebrow">production · workspace</span>
              <h1 className="t-h1" style={{ fontSize: 'clamp(28px, 4.6cqi, 52px)', marginTop: 8 }}>Runs</h1>
              <p className="t-meta" style={{ marginTop: 4, fontSize: 'var(--fs-sm)' }}>
                What your agents are doing right now, with a small archive.
              </p>
            </div>
            <div className="app-page-actions" style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ padding: '10px 16px', fontSize: 'var(--fs-xs)' }}>Filter</button>
              <button className="btn btn-primary" style={{ padding: '10px 16px', fontSize: 'var(--fs-xs)' }}>+ New run</button>
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)',
            marginBottom: 'var(--space-6)'
          }} className="app-stats">
            {[
              ['Live now',      '3',   'var(--green-tint)',  'var(--green-deep)'],
              ['Queued',        '12',  'var(--bg-2)',        'var(--fg)'],
              ['Failed today',  '1',   'var(--mascot-tint)', 'var(--ink)'],
              ['This week',     '47',  'var(--bg-2)',        'var(--fg)'],
            ].map(([l, v, bg, fg], i) => (
              <div key={i} style={{ padding: 'var(--space-5)', background: bg, color: fg, borderRadius: 'var(--r-3)' }}>
                <div style={{ fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-xs)', fontWeight: 600, marginBottom: 8, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 'var(--tr-caps)' }}>{l}</div>
                <div style={{ fontFamily: 'var(--ff-body)', fontWeight: 600, fontSize: 'clamp(32px, 3.8cqi, 52px)', lineHeight: 1, letterSpacing: '-0.02em' }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: 'var(--ff-body)', fontWeight: 600, fontSize: 'var(--fs-lg)' }}>Active runs</h2>
            <span className="t-meta" style={{ fontSize: 'var(--fs-xs)' }}>updated 12s ago</span>
          </div>
          <div className="app-table" style={{ background: 'var(--bg-2)', borderRadius: 'var(--r-3)', padding: 'var(--space-2)' }}>
            {[
              { id: '01821', state: 'editing',   model: 'sonnet-4.5', t: '0:14',  user: 'b0',  c: 'purple' },
              { id: '01820', state: 'verifying', model: 'sonnet-4.5', t: '1:02',  user: 'jb',  c: 'sky' },
              { id: '01819', state: 'planning',  model: 'haiku-4.5',  t: '0:08',  user: 'b0',  c: 'mascot' },
              { id: '01818', state: 'done',      model: 'sonnet-4.5', t: '11.4s', user: 'sch', c: 'green' },
              { id: '01817', state: 'failed',    model: 'haiku-4.5',  t: '2.1s',  user: 'jb',  c: 'flame' },
            ].map((r, i) => {
              const c = { green: 'var(--green)', sun: 'var(--sun)', mascot: 'var(--mascot)', purple: 'var(--purple-2)', sky: 'var(--sky)', flame: 'var(--flame)' }[r.c];
              const fg = (r.c === 'sun' || r.c === 'mascot') ? 'var(--ink)' : 'var(--paper)';
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '90px 130px 1fr 80px 100px 20px',
                  gap: 'var(--space-3)', alignItems: 'center',
                  padding: '14px 18px',
                  background: 'var(--bg)',
                  borderRadius: 'var(--r-2)',
                  marginTop: i === 0 ? 0 : 3,
                  fontSize: 'var(--fs-sm)',
                }} className="app-table-row">
                  <span className="t-meta" style={{ fontFamily: 'var(--ff-mono)' }}>#{r.id}</span>
                  <span style={{ background: c, color: fg, padding: '4px 12px', textAlign: 'center', fontSize: 'var(--fs-micro)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, borderRadius: 'var(--r-pill)' }}>{r.state}</span>
                  <span style={{ fontFamily: 'var(--ff-body)', fontWeight: 500 }}>{r.model}</span>
                  <span className="t-meta" style={{ fontFamily: 'var(--ff-mono)' }}>{r.t}</span>
                  <span style={{ fontFamily: 'var(--ff-mono)' }}>{r.user}</span>
                  <span className="t-meta">↗</span>
                </div>
              );
            })}
          </div>

          <div className="t-meta" style={{ marginTop: 'var(--space-4)', textAlign: 'center', fontSize: 'var(--fs-sm)' }}>
            Showing 5 of 47 · <a href="#" className="t-link">load all →</a>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav — visible only via @container query below */}
      <nav className="app-bottom-nav" style={{
        display: 'none',
        position: 'sticky', bottom: 0, zIndex: 10,
        background: 'color-mix(in oklab, var(--bg) 92%, transparent)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        padding: '8px 12px', gap: 4,
        justifyContent: 'space-around',
      }}>
        {[
          ['runs',     '⊞'],
          ['flows',    '⇄'],
          ['logs',     '☰'],
          ['settings', '⚙'],
        ].map(([n, ic], i) => {
          const active = tab === n;
          return (
            <button key={i} onClick={() => setTab(n)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '8px 4px', border: 0, cursor: 'pointer',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--accent-fg)' : 'var(--fg-2)',
              fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-micro)', fontWeight: active ? 600 : 500,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              borderRadius: 'var(--r-2)',
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{ic}</span>
              <span>{n}</span>
            </button>
          );
        })}
      </nav>

      {paletteOpen && (
        <div onClick={() => setPaletteOpen(false)} style={{
          position: 'absolute', inset: 0, background: 'rgba(15,13,10,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: 'min(560px, 90%)', background: 'var(--bg)', color: 'var(--fg)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column',
            borderRadius: 'var(--r-3)', overflow: 'hidden',
          }}>
            <input autoFocus placeholder="Type a command, or a thing to find…" style={{
              padding: '18px 22px', border: 0,
              background: 'var(--bg-2)', color: 'inherit', fontFamily: 'inherit', fontSize: 'var(--fs-lg)',
              outline: 'none', borderRadius: 0,
            }} />
            {[
              ['New run',          'g r'],
              ['Switch workspace', 'g w'],
              ['Toggle theme',     '⌘.'],
              ['Open docs',        '?'],
            ].map(([n, kb], i) => (
              <div key={i} style={{
                padding: '12px 20px',
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center',
                background: i === 0 ? 'var(--bg-2)' : 'transparent',
                fontSize: 'var(--fs-body)'
              }}>
                <span>{n}</span>
                <kbd style={{ background: 'var(--bg-3)', padding: '2px 8px', fontFamily: 'var(--ff-mono)', fontSize: 'var(--fs-xs)' }}>{kb}</kbd>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @container (max-width: 980px) {
          .kit-app header { grid-template-columns: auto 1fr auto auto !important; }
          .kit-app header .app-crumb-inline { display: none !important; }
          .kit-app .app-search-trigger .label-long { display: none; }
          .kit-app .app-search-trigger .label-short { display: inline; }
        }
        @container (max-width: 720px) {
          .kit-app .app-body { grid-template-columns: 1fr !important; }
          .kit-app .app-rail { display: none !important; }
          .kit-app .app-main { padding: var(--space-5) var(--space-4) !important; }
          .kit-app .app-stats { grid-template-columns: 1fr 1fr !important; }
          .kit-app .app-table-row { grid-template-columns: 70px 1fr auto !important; padding: 14px 16px !important; }
          .kit-app .app-table-row > :nth-child(3),
          .kit-app .app-table-row > :nth-child(5),
          .kit-app .app-table-row > :nth-child(6) { display: none; }
          .kit-app .app-page-head { flex-direction: column !important; align-items: stretch !important; gap: var(--space-3) !important; }
          .kit-app .app-page-head .app-page-actions { width: 100%; }
          .kit-app .app-page-head .app-page-actions .btn,
          .kit-app .app-page-head .app-page-actions .btn-primary,
          .kit-app .app-page-head .app-page-actions .btn-ghost { flex: 1; justify-content: center; }
        }
        @container (max-width: 500px) {
          .kit-app header { padding: 12px 16px !important; gap: 10px !important; }
          .kit-app header > a:first-child { font-size: var(--fs-sm) !important; }
          .kit-app .app-search-trigger { padding: 9px 14px !important; }
          .kit-app .app-search-trigger kbd { display: none; }
          .kit-app .app-stats { grid-template-columns: 1fr 1fr !important; gap: 6px !important; }
          .kit-app .app-stats > div { padding: var(--space-4) !important; }
          .kit-app .app-bottom-nav { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

window.AppShell = AppShell;
