/* Blog.jsx — quiet long-form. */

function Blog() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100%' }} className="kit-blog">
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'color-mix(in oklab, var(--bg) 88%, transparent)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        padding: '18px var(--pad-x)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)'
      }}>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700, fontSize: 'var(--fs-sm)' }}>247420</a>
        <a href="#" className="t-meta" style={{ fontSize: 'var(--fs-sm)' }}>← All writing</a>
      </header>

      <article style={{
        maxWidth: 700, margin: '0 auto',
        padding: 'var(--space-9) var(--pad-x) var(--space-9)',
      }}>
        <div className="t-meta" style={{ marginBottom: 'var(--space-5)', fontSize: 'var(--fs-sm)' }}>
          April 14, 2026 · 8 min read
        </div>

        <h1 className="t-h1" style={{ marginBottom: 'var(--space-4)', fontSize: 'clamp(34px, 6cqi, 64px)', fontWeight: 600, letterSpacing: '-0.02em' }}>
          We were here first.
        </h1>
        <p className="t-lede" style={{ marginBottom: 'var(--space-7)', maxWidth: '34ch', fontSize: 'var(--fs-xl)' }}>
          A short, slightly smug history of the creative department of the internet.
        </p>

        <div className="prose">
          <p style={{ fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-xl)', lineHeight: 1.55, margin: '0 0 var(--space-4)', fontWeight: 400 }}>
            There's a particular feeling — you know the one — of watching something you made five years ago get
            repackaged, re-skinned, and re-announced as if it were new.
          </p>

          <p style={{ fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-lg)', lineHeight: 1.75, margin: '0 0 var(--space-5)' }}>
            The web has a very long memory and a very short attention span, and 247420 has been quietly around for most
            of it. This isn't a victory lap. It's a map. Because if you're showing up to the party now, you should at
            least know who set the table.
          </p>

          <blockquote style={{
            margin: 'var(--space-7) 0',
            paddingLeft: 'var(--space-5)',
            borderLeft: 'var(--bw-chunk) solid var(--accent)',
            fontFamily: 'var(--ff-body)', fontStyle: 'italic',
            fontSize: 'clamp(22px, 2.8cqi, 30px)', lineHeight: 1.35, maxWidth: '34ch',
            color: 'var(--fg)', fontWeight: 500,
          }}>
            We don't know which ideas become the future. We just know most of them come from the same few rooms.
          </blockquote>

          <p style={{ fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-lg)', lineHeight: 1.75, margin: '0 0 var(--space-5)' }}>
            The rooms have moved — from IRC to forums to Discord to whatever-this-is-now — but the pattern is the same.
            A handful of people, each a little too weird to hold a normal job, trading prototypes at 2 a.m., throwing
            away 90% of them, and shipping the 10% that's too strange to ignore. <a href="#" className="t-link">adaptogen</a>, <code>gm</code>, zellous,
            and <a href="#" className="t-link">a long list of things you've never heard of</a> — all came out of the same 2 a.m.
          </p>

          <h2 style={{
            marginTop: 'var(--space-8)', marginBottom: 'var(--space-3)',
            fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-h2)', fontWeight: 600, letterSpacing: '-0.02em'
          }}>
            So what's the point?
          </h2>

          <p style={{ fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-lg)', lineHeight: 1.75, margin: '0 0 var(--space-4)' }}>
            Stop asking permission. Ship the rough draft. Document honestly. Treat humor as load-bearing.
          </p>
          <p style={{ fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-lg)', lineHeight: 1.75, margin: '0 0 var(--space-4)' }}>
            And if you're reading this and thinking <em>"that's obvious"</em> — good. You're home.
          </p>
        </div>

        <hr style={{ border: 0, height: 1, background: 'color-mix(in oklab, currentColor 12%, transparent)', margin: 'var(--space-7) 0 var(--space-4)' }} />

        <div className="t-meta" style={{ fontSize: 'var(--fs-sm)' }}>
          Reply by opening a PR. <a href="#" className="t-link">Source ↗</a>
        </div>
      </article>

      <section style={{ padding: 'var(--space-7) var(--pad-x)', background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <span className="eyebrow">keep reading</span>
            <h2 className="t-h2" style={{ marginTop: 8 }}>Three more things from the collective.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            {[
              ['A postmortem of gm v0.4.',                   'mar 22'],
              ['Push-to-talk is a protocol, not a feature.', 'feb 09'],
              ['Against the vibe-coded interface.',          'dec 11'],
            ].map(([t, d], i) => (
              <a key={i} href="#" style={{
                padding: 'var(--space-4)', background: 'var(--bg)', color: 'inherit', textDecoration: 'none',
                display: 'flex', flexDirection: 'column', gap: 10,
                transition: 'transform var(--dur-base) var(--ease)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
                <span className="t-meta" style={{ fontSize: 'var(--fs-xs)' }}>{d} 2026</span>
                <span style={{ fontFamily: 'var(--ff-body)', fontWeight: 600, fontSize: 'var(--fs-lg)', lineHeight: 1.3 }}>{t}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer style={{
        padding: 'var(--space-6) var(--pad-x)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap'
      }}>
        <span className="t-meta">247420 · <span style={{ color: 'var(--accent)' }}>●</span> still emerging 🌀</span>
        <a href="#" className="t-link" style={{ fontSize: 'var(--fs-sm)' }}>source ↗</a>
      </footer>

      <style>{`
        .kit-blog { --pad-x: clamp(18px, 5cqw, 64px); }
        @container (max-width: 720px) {
          .kit-blog article { padding: var(--space-6) var(--pad-x) !important; }
          .kit-blog article h1 { font-size: clamp(30px, 8cqi, 48px) !important; }
          .kit-blog blockquote { margin-left: 0 !important; margin-right: 0 !important; font-size: var(--fs-xl) !important; padding-left: var(--space-3) !important; }
        }
        @container (max-width: 500px) {
          .kit-blog header { padding: 14px var(--pad-x) !important; }
          .kit-blog article .t-lede { font-size: var(--fs-lg) !important; }
        }
      `}</style>
    </div>
  );
}

window.Blog = Blog;
