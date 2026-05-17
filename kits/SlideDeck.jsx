/* SlideDeck.jsx — calmer template, story-first.
   Slide 1 sets the topic. Slide 2 frames the problem. Slide 3 is evidence.
   Slide 4 is the close. The "fart" line is now a quiet sign-off. */

function Slide({ children, kind = 'paper', label, idx, total }) {
  const bg = kind === 'ink' ? 'var(--ink)' : kind === 'accent' ? 'var(--accent)' : 'var(--paper)';
  const fg = kind === 'ink' ? 'var(--paper)' : kind === 'accent' ? 'var(--accent-fg)' : 'var(--ink)';
  return (
    <div style={{
      aspectRatio: '16/9', background: bg, color: fg,
      padding: 'clamp(28px, 4.5cqi, 72px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      fontFamily: 'var(--ff-body)', containerType: 'inline-size',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 16, fontSize: 'clamp(10px, 1.1cqi, 13px)',
      }}>
        <span style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>247420</span>
        <span style={{ opacity: 0.6 }}>{label}</span>
        <span style={{ flex: 1 }} />
        <span style={{ opacity: 0.4, fontFamily: 'var(--ff-mono)' }}>{idx}/{total}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {children}
      </div>
      <div style={{
        opacity: 0.5, fontSize: 'clamp(10px, 1cqi, 12px)', fontFamily: 'var(--ff-mono)',
      }}>
        deck 001 · still emerging 🌀
      </div>
    </div>
  );
}

function SlideDeck() {
  return (
    <div style={{ background: 'var(--bg-2)', padding: 'var(--space-4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }} className="kit-deck">
      <Slide kind="paper" label="title" idx={1} total={6}>
        <div>
          <div style={{ fontSize: 'clamp(11px, 1.3cqi, 15px)', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tr-caps)', marginBottom: 18 }}>
            an internal review · apr 20 · 2026
          </div>
          <div style={{
            fontFamily: 'var(--ff-body)', fontWeight: 600,
            fontSize: 'clamp(34px, 7cqi, 80px)', lineHeight: 1.05, letterSpacing: '-0.025em',
            maxWidth: '20ch',
          }}>
            What we shipped this quarter, and what's next.
          </div>
          <div style={{ fontFamily: 'var(--ff-body)', fontSize: 'clamp(14px, 1.8cqi, 22px)', marginTop: 18, maxWidth: '34ch', color: 'var(--fg-2)' }}>
            The 247420 collective. Three projects in detail, eight in summary, one bet.
          </div>
        </div>
      </Slide>

      <Slide label="section" idx={2} total={6}>
        <div>
          <div style={{ fontSize: 'clamp(11px, 1.3cqi, 15px)', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tr-caps)', marginBottom: 14 }}>
            01 · the problem
          </div>
          <div style={{
            fontFamily: 'var(--ff-body)', fontWeight: 600,
            fontSize: 'clamp(28px, 6cqi, 64px)', lineHeight: 1.1, letterSpacing: '-0.02em', maxWidth: '20ch'
          }}>
            Coding agents drift. They forget where they are.
          </div>
          <div style={{ fontFamily: 'var(--ff-body)', fontSize: 'clamp(14px, 1.7cqi, 20px)', marginTop: 16, maxWidth: '40ch', color: 'var(--fg-2)' }}>
            We needed something simpler than a planner and more reliable than a prompt.
          </div>
        </div>
      </Slide>

      <Slide kind="ink" label="evidence" idx={3} total={6}>
        <div>
          <div style={{ fontSize: 'clamp(11px, 1.3cqi, 15px)', color: 'var(--green-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tr-caps)', marginBottom: 14 }}>
            gm · by the numbers
          </div>
          <div style={{ fontFamily: 'var(--ff-body)', fontSize: 'clamp(13px, 1.6cqi, 20px)', maxWidth: 700 }}>
            {[
              ['Live since',           'sep 2024'],
              ['Weekly downloads',     '47,000'],
              ['Editors integrated',   '14'],
              ['Runtime dependencies', '0'],
              ['Avg session length',   '4 h 20 m'],
              ['People who get it',    'enough'],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, padding: '7px 0', borderTop: i === 0 ? '1px solid #6A6A70' : 'none', borderBottom: '1px solid #6A6A70' }}>
                <span style={{ color: '#9A9AA2' }}>{k}</span>
                <span style={{ fontFamily: 'var(--ff-body)', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </Slide>

      <Slide kind="accent" label="close" idx={6} total={6}>
        <div>
          <div style={{
            fontFamily: 'var(--ff-body)', fontWeight: 600,
            fontSize: 'clamp(56px, 13cqi, 160px)', lineHeight: 0.95, letterSpacing: '-0.04em',
          }}>
            That's it.
          </div>
          <div style={{ fontFamily: 'var(--ff-body)', fontSize: 'clamp(15px, 1.8cqi, 22px)', marginTop: 16, maxWidth: '36ch' }}>
            Questions? Open a PR. We'll read it before the next stand-up.
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 'clamp(11px, 1.2cqi, 14px)', marginTop: 32, opacity: 0.75 }}>
            — the collective. we fart in its general direction.
          </div>
        </div>
      </Slide>

      <style>{`
        @container (max-width: 700px) {
          .kit-deck { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

window.SlideDeck = SlideDeck;
