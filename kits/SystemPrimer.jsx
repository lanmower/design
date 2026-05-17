/* SystemPrimer.jsx — overview of the design system, calmer. */

function SystemPrimer() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100%' }} className="kit-system">
      <header style={{
        padding: 'var(--space-8) var(--space-7) var(--space-7)',
      }}>
        <span className="eyebrow">the design system</span>
        <h1 style={{
          fontFamily: 'var(--ff-body)', fontWeight: 600,
          fontSize: 'clamp(34px, 6cqi, 64px)', lineHeight: 1.05, letterSpacing: 'var(--tr-tight)',
          margin: '12px 0 12px', maxWidth: '16ch'
        }}>
          247420 — a calmer chassis for loud ideas.
        </h1>
        <p className="t-lede" style={{ maxWidth: '56ch' }}>
          A small, opinionated set of tokens and patterns shared across every project in the collective. Built around a
          lore palette, three typefaces used purposefully, and generous breathing room. No decoration; just orientation.
        </p>
      </header>

      <div style={{ padding: 'var(--space-7)' }}>
        <section style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <span className="eyebrow">palette</span>
            <h2 className="t-h2" style={{ marginTop: 8 }}>Six colors, with stories.</h2>
            <p className="t-prose" style={{ color: 'var(--fg-2)', maxWidth: '52ch', marginTop: 8 }}>
              The first two are the brand — encoded in the name. The rest are signals: success, attention, warning, link.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }} className="sys-palette">
            {[
              ['Green',  '#247420', 'Primary lore · 247420'],
              ['Purple', '#420247', 'Secondary lore · 420247'],
              ['Pink',   '#E84B8A', 'Mascot · used sparingly'],
              ['Sun',    '#F5C344', 'Highlight'],
              ['Flame',  '#FF5A1F', 'Warning'],
              ['Sky',    '#3A6EFF', 'Long-form link'],
            ].map(([n, hex, role], i) => (
              <div key={i}>
                <div style={{ background: hex, height: 120, borderRadius: 'var(--r-3)' }} />
                <div style={{ padding: '14px 4px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontFamily: 'var(--ff-body)', fontWeight: 600, fontSize: 'var(--fs-lg)' }}>{n}</div>
                  <div className="t-meta" style={{ fontSize: 'var(--fs-xs)', fontFamily: 'var(--ff-mono)' }}>{hex}</div>
                  <div className="t-meta" style={{ fontSize: 'var(--fs-xs)' }}>{role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <span className="eyebrow">typography</span>
            <h2 className="t-h2" style={{ marginTop: 8 }}>One family. Two roles.</h2>
            <p className="t-prose" style={{ color: 'var(--fg-2)', maxWidth: '52ch', marginTop: 8 }}>
              Space Grotesk does everything on-screen — from a hero to a footnote. JetBrains Mono shows up only when it
              would actually be code, metadata, or terminal output.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }} className="sys-type">
            <div>
              <div className="t-meta" style={{ marginBottom: 6, fontSize: 'var(--fs-xs)' }}>Display — Space Grotesk, semibold</div>
              <div style={{ fontFamily: 'var(--ff-body)', fontWeight: 600, fontSize: 'clamp(34px, 6.4cqi, 80px)', lineHeight: 1.05, letterSpacing: 'var(--tr-tight)' }}>
                One bold moment per page.
              </div>
              <p className="t-meta" style={{ marginTop: 10, fontSize: 'var(--fs-xs)', maxWidth: '32ch' }}>
                Used for the page's anchor headline only. Not for every heading.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <div className="t-meta" style={{ marginBottom: 6, fontSize: 'var(--fs-xs)' }}>Body & headings — Space Grotesk</div>
                <div style={{ fontFamily: 'var(--ff-body)', fontWeight: 600, fontSize: 'var(--fs-h2)' }}>Everything else comes from here.</div>
                <p style={{ fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-lg)', lineHeight: 1.6, margin: '6px 0 0', color: 'var(--fg-2)', maxWidth: '48ch' }}>
                  Body text in 400, headings in 600. One family, used purposefully. Calm, readable, friendly to long-form.
                </p>
              </div>
              <div>
                <div className="t-meta" style={{ marginBottom: 6, fontSize: 'var(--fs-xs)' }}>Mono — JetBrains Mono</div>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 'var(--fs-sm)' }}>
                  <span style={{ color: 'var(--mascot)' }}>async</span> <span style={{ color: 'var(--green-2)' }}>function</span> step(state) {'{ … }'}
                </div>
                <p className="t-meta" style={{ marginTop: 6, fontSize: 'var(--fs-xs)' }}>For code, metadata, and terminal contexts. Not for decoration.</p>
              </div>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <span className="eyebrow">components</span>
            <h2 className="t-h2" style={{ marginTop: 8 }}>Primitives, not decoration.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-3)' }} className="sys-components">
            <div style={{ padding: 'var(--space-5)', background: 'var(--bg-2)', borderRadius: 'var(--r-3)' }}>
              <div className="t-meta" style={{ marginBottom: 14, fontSize: 'var(--fs-xs)' }}>Buttons</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
                <button className="btn">primary</button>
                <button className="btn btn-primary">accent</button>
                <button className="btn btn-ghost">ghost</button>
              </div>
            </div>
            <div style={{ padding: 'var(--space-5)', background: 'var(--bg-2)', borderRadius: 'var(--r-3)' }}>
              <div className="t-meta" style={{ marginBottom: 14, fontSize: 'var(--fs-xs)' }}>Status chips</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <span style={{
                  padding: '4px 12px', background: 'var(--green-tint)', color: 'var(--green-deep)',
                  fontSize: 'var(--fs-tiny)', fontWeight: 600, borderRadius: 'var(--r-pill)',
                }}>● live</span>
                <span style={{
                  padding: '4px 12px', background: 'var(--bg-3)', color: 'var(--fg-2)',
                  fontSize: 'var(--fs-tiny)', fontWeight: 600, borderRadius: 'var(--r-pill)',
                }}>wip</span>
                <span style={{
                  padding: '4px 12px', background: 'var(--mascot-tint)', color: 'var(--ink)',
                  fontSize: 'var(--fs-tiny)', fontWeight: 600, borderRadius: 'var(--r-pill)',
                }}>new</span>
              </div>
            </div>
            <div style={{ padding: 'var(--space-5)', background: 'var(--bg-2)', borderRadius: 'var(--r-3)' }}>
              <div className="t-meta" style={{ marginBottom: 14, fontSize: 'var(--fs-xs)' }}>Eyebrow + heading</div>
              <span className="eyebrow">section opener</span>
              <div style={{ fontFamily: 'var(--ff-body)', fontWeight: 600, fontSize: 'var(--fs-h3)', marginTop: 6 }}>
                A real heading.
              </div>
            </div>
            <div style={{ padding: 'var(--space-5)', background: 'var(--bg-2)', gridColumn: 'span 2', borderRadius: 'var(--r-3)' }} className="sys-code">
              <div className="t-meta" style={{ marginBottom: 12, fontSize: 'var(--fs-xs)' }}>Code blocks (mono, with hues)</div>
              <pre style={{ fontSize: 'var(--fs-xs)' }}><span className="c"># gm · the loop, in 4 lines</span>{'\n'}<span className="k">while</span> state !== <span className="n">'done'</span>:{'\n'}  next = agent.pick(transitions[state]){'\n'}  state = step(next)</pre>
            </div>
          </div>
        </section>

        <section>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <span className="eyebrow">spacing</span>
            <h2 className="t-h2" style={{ marginTop: 8 }}>An 8-point scale.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 'var(--space-2)', alignItems: 'end' }}>
            {[0, 4, 8, 16, 24, 32, 48, 96].map((v, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ background: 'var(--accent)', height: Math.max(v, 2), borderRadius: 'var(--r-1)' }} />
                <div className="t-meta" style={{ fontSize: 'var(--fs-xs)' }}>{v}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        @container (max-width: 760px) {
          .kit-system .sys-type { grid-template-columns: 1fr !important; }
          .kit-system .sys-code { grid-column: span 1 !important; }
        }
      `}</style>
    </div>
  );
}

window.SystemPrimer = SystemPrimer;
