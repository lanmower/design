/* CLI.jsx — gm terminal UI, animated. Currently un-exemplified. */

function CLI() {
  const { useState, useEffect, useRef } = React;
  const [step, setStep] = useState(0);
  const scrollRef = useRef(null);

  const log = [
    { t: 'sys',  s: 'gm', a: 'start',     c: 'green' },
    { t: 'sys',  s: '→ state',   v: 'idle',       c: 'sun' },
    { t: 'sys',  s: '→ tools',   v: '19 loaded',  c: 'mascot' },
    { t: 'sys',  s: '→ model',   v: 'sonnet-4.5', c: 'sky' },
    { t: 'spacer' },
    { t: 'user', s: 'fix the failing test in src/router.ts' },
    { t: 'spacer' },
    { t: 'state',  s: 'reading',   note: 'src/router.ts · 184 LOC',  c: 'sun' },
    { t: 'tool',   s: 'astgrep_search', a: '$.test.skip(...)', r: '1 match @ line 42',  c: 'mascot' },
    { t: 'state',  s: 'planning',  note: '3 steps · ~12s',  c: 'mascot' },
    { t: 'tool',   s: 'executenodejs', a: 'npm test -- router', r: 'FAIL · "expected 200, got 404"',  c: 'flame' },
    { t: 'state',  s: 'editing',   note: 'src/router.ts:42 — restore handler',  c: 'purple' },
    { t: 'tool',   s: 'writefile', a: 'src/router.ts', r: '+3 -1 lines',  c: 'purple' },
    { t: 'state',  s: 'verifying', note: 'npm test',  c: 'sky' },
    { t: 'tool',   s: 'executenodejs', a: 'npm test -- router', r: 'PASS · 8/8',  c: 'green' },
    { t: 'state',  s: 'done',      note: 'wheels-up @ 11.4s',  c: 'green' },
    { t: 'spacer' },
    { t: 'sys',  s: '→ press', v: '⏎ for next · q to quit', c: 'sun' },
  ];

  useEffect(() => {
    if (step >= log.length) return;
    const id = setTimeout(() => setStep(step + 1), step === 0 ? 200 : (log[step]?.t === 'spacer' ? 80 : 350));
    return () => clearTimeout(id);
  }, [step]);

  // restart loop
  useEffect(() => {
    if (step === log.length) {
      const id = setTimeout(() => setStep(0), 5000);
      return () => clearTimeout(id);
    }
  }, [step]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [step]);

  const color = (c) => ({
    green: 'var(--green-2)', sun: 'var(--sun)', mascot: 'var(--mascot)',
    purple: '#C277FF', sky: '#7AA0FF', flame: 'var(--flame)'
  })[c] || 'var(--paper)';

  // Animated state pill at top — always shows the latest state line
  const lastState = log.slice(0, step).reverse().find(x => x.t === 'state') || { s: 'idle', c: 'sun' };

  return (
    <div style={{ containerType: 'inline-size', background: 'var(--ink)', color: 'var(--paper)', minHeight: '100%', display: 'flex', flexDirection: 'column' }} className="kit-cli">
      {/* Terminal chrome */}
      <div style={{
        padding: '10px 16px', display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center', gap: 16,
        borderBottom: '1px solid #34343C', background: '#0A0A0E'
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FF5F56' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FFBD2E' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#27C93F' }} />
        </div>
        <span className="t-mono" style={{ fontSize: 'var(--fs-xs)', color: '#9A9AA2' }}>
          247420 // gm · session · 04:20:13
        </span>
        <span className="t-mono" style={{ fontSize: 'var(--fs-tiny)', color: color(lastState.c), display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, background: color(lastState.c), borderRadius: '50%', animation: 'pulse 1.4s infinite' }} />
          state · {lastState.s}
        </span>
        <span className="t-mono" style={{ fontSize: 'var(--fs-tiny)', color: '#6A6A70' }}>
          ⌥ tools (19) · ⌃ help
        </span>
      </div>

      {/* Sidebar + main log */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: 0 }} className="cli-body">
        <aside style={{
          borderRight: '1px solid #34343C', padding: 'var(--space-3)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
          fontFamily: 'var(--ff-mono)', fontSize: 'var(--fs-tiny)'
        }} className="cli-aside">
          <div>
            <div className="t-micro" style={{ marginBottom: 8 }}>states</div>
            {['idle','reading','planning','editing','verifying','done'].map((s, i) => {
              const active = lastState.s === s;
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '12px 1fr', gap: 8, alignItems: 'center',
                  padding: '3px 0', color: active ? color(lastState.c) : '#6A6A70'
                }}>
                  <span>{active ? '●' : '·'}</span>
                  <span>{s}</span>
                </div>
              );
            })}
          </div>
          <div>
            <div className="t-micro" style={{ marginBottom: 8 }}>tool calls</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, color: '#9A9AA2' }}>
              <div>astgrep_search · <span style={{ color: 'var(--green-2)' }}>1</span></div>
              <div>executenodejs · <span style={{ color: 'var(--green-2)' }}>2</span></div>
              <div>writefile · <span style={{ color: 'var(--green-2)' }}>1</span></div>
            </div>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <div className="t-micro" style={{ marginBottom: 6 }}>session</div>
            <div style={{ color: '#9A9AA2', fontSize: 'var(--fs-tiny)' }}>tokens · 14,331</div>
            <div style={{ color: '#9A9AA2', fontSize: 'var(--fs-tiny)' }}>turn · 03</div>
            <div style={{ color: color('green'), fontSize: 'var(--fs-tiny)' }}>cost · $0.04</div>
          </div>
        </aside>

        <div ref={scrollRef} style={{
          padding: 'var(--space-4) var(--space-5)',
          fontFamily: 'var(--ff-mono)', fontSize: 'var(--fs-sm)', lineHeight: 1.55,
          overflowY: 'auto'
        }} className="cli-log">
          {log.slice(0, step).map((l, i) => {
            if (l.t === 'spacer') return <div key={i} style={{ height: 10 }} />;
            if (l.t === 'sys') return (
              <div key={i} style={{ color: '#9A9AA2' }}>
                <span style={{ color: color(l.c) }}>{l.s}</span>
                {l.a && <> <span style={{ color: 'var(--paper)' }}>{l.a}</span></>}
                {l.v && <> · <span style={{ color: color(l.c) }}>{l.v}</span></>}
              </div>
            );
            if (l.t === 'user') return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: 8 }}>
                <span style={{ color: 'var(--mascot)' }}>›</span>
                <span style={{ color: 'var(--paper)' }}>{l.s}</span>
              </div>
            );
            if (l.t === 'state') return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'baseline', padding: '2px 0' }}>
                <span style={{
                  background: color(l.c), color: l.c === 'sun' || l.c === 'mascot' ? 'var(--ink)' : 'var(--paper)',
                  padding: '1px 8px', fontSize: 'var(--fs-tiny)', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.1em'
                }}>{l.s}</span>
                <span style={{ color: '#9A9AA2' }}>{l.note}</span>
                <span style={{ color: '#6A6A70', fontSize: 'var(--fs-tiny)' }}>{i.toString().padStart(2,'0')}</span>
              </div>
            );
            if (l.t === 'tool') return (
              <div key={i} style={{ paddingLeft: 16, color: '#9A9AA2' }}>
                <span style={{ color: color(l.c) }}>⌁</span> <span style={{ color: 'var(--paper)' }}>{l.s}</span>
                {l.a && <> <span style={{ color: 'var(--sun)' }}>"{l.a}"</span></>}
                <div style={{ paddingLeft: 24, color: l.r?.startsWith('FAIL') ? 'var(--flame)' : '#9A9AA2' }}>↪ {l.r}</div>
              </div>
            );
            return null;
          })}
          {step < log.length && <span className="cursor-blink" style={{ color: 'var(--paper)' }} />}
        </div>
      </div>

      {/* Input footer */}
      <div style={{
        borderTop: '1px solid #34343C', background: '#0A0A0E',
        padding: '10px 16px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center',
        fontFamily: 'var(--ff-mono)', fontSize: 'var(--fs-xs)'
      }}>
        <span style={{ color: 'var(--mascot)' }}>›</span>
        <span style={{ color: '#6A6A70' }}>type · or paste · or just press ⏎ to retry</span>
        <span style={{ color: '#9A9AA2' }}>⌃c quit · ⌃l clear</span>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @container (max-width: 600px) {
          .kit-cli .cli-body { grid-template-columns: 1fr !important; }
          .kit-cli .cli-aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}

window.CLI = CLI;
