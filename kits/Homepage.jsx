/* Homepage.jsx — narrative rewrite.
   Lede answers what & who in one screen.
   Then: one featured work · the rest · writing · who we are. */

function HomepageHeader() {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'color-mix(in oklab, var(--bg) 88%, transparent)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      padding: '20px var(--pad-x)',
      display: 'flex', alignItems: 'center', gap: 'var(--space-5)',
    }}>
      <a href="#" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700, fontSize: 'var(--fs-sm)', letterSpacing: '-0.01em' }}>
        247420
      </a>
      <span style={{ flex: 1 }} />
      <nav style={{ display: 'flex', gap: 4, fontSize: 'var(--fs-sm)' }} className="hp-nav">
        <a href="#works"   style={{ color: 'var(--fg-2)', textDecoration: 'none', padding: '8px 16px', borderRadius: 'var(--r-pill)' }}>works</a>
        <a href="#writing" style={{ color: 'var(--fg-2)', textDecoration: 'none', padding: '8px 16px', borderRadius: 'var(--r-pill)' }}>writing</a>
        <a href="#about"   style={{ color: 'var(--fg-2)', textDecoration: 'none', padding: '8px 16px', borderRadius: 'var(--r-pill)' }}>about</a>
        <a href="#"        style={{ color: 'var(--fg-3)', textDecoration: 'none', padding: '8px 16px', borderRadius: 'var(--r-pill)' }}>source<sup style={{ marginLeft: 3, fontSize: '0.7em' }}>↗</sup></a>
      </nav>
    </header>
  );
}

function HomepageLede() {
  return (
    <section style={{
      padding: 'var(--space-9) var(--pad-x) var(--space-7)',
      display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--space-5)',
      maxWidth: 980,
    }} className="hp-lede">
      <span className="eyebrow">an entrypoint</span>
      <h1 className="t-h1" style={{ fontSize: 'clamp(34px, 6.4cqi, 80px)', fontWeight: 600, maxWidth: '18ch' }}>
        Small, weird, useful tools — built in public.
      </h1>
      <p className="t-lede" style={{ maxWidth: '52ch' }}>
        247420 is a creative collective of eight, scattered across three timezones. We've been shipping
        open-source tools for the web since 2018. Some of them become the future. Most don't. That's the deal.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
        <a className="btn btn-accent" href="#works">see what we make</a>
        <a className="btn btn-ghost" href="#">read the source</a>
      </div>
    </section>
  );
}

function HomepageFeatured() {
  return (
    <section style={{
      padding: 'var(--space-7) var(--pad-x)',
      background: 'var(--bg-2)',
    }} className="hp-featured">
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <span className="eyebrow">currently shipping</span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
        gap: 'var(--space-7)', alignItems: 'start',
      }} className="hp-feat">
        <div>
          <h2 className="t-h2" style={{ marginBottom: 'var(--space-3)', maxWidth: '14ch' }}>
            gm — a state machine for coding agents.
          </h2>
          <p className="t-prose" style={{ fontSize: 'var(--fs-lg)', color: 'var(--fg-2)', marginBottom: 'var(--space-5)' }}>
            It thinks, so you don't have to. As much. A small deterministic runtime that gives an LLM a
            scaffolding to be useful inside of: this is where you are, these are the moves available, pick one.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a className="btn" href="#">try it</a>
            <a href="#" className="t-link" style={{ fontSize: 'var(--fs-sm)' }}>read the docs →</a>
          </div>
        </div>
        <dl style={{
          margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4) var(--space-5)'
        }} className="hp-feat-facts">
          {[
            ['live since',   'sep 2024'],
            ['version',      'v0.4.1'],
            ['stars',        '3,124'],
            ['runtime deps', '0'],
            ['integrations', '14 editors'],
            ['license',      'mit'],
          ].map(([k, v], i) => (
            <div key={i}>
              <dt className="t-meta" style={{ marginBottom: 2 }}>{k}</dt>
              <dd style={{ margin: 0, fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-lg)', fontWeight: 600 }}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function HomepageWorks({ randomHue = false }) {
  const works = [
    { name: 'zellous',   sub: 'push-to-talk, with opus codec',          state: 'live', meta: 'v1.2'   },
    { name: 'thebird',   sub: 'anthropic ↔ gemini streaming bridge',    state: 'wip',  meta: 'soon'   },
    { name: 'spoint',    sub: 'the spawnpoint — entrypoint directory',  state: 'live', meta: 'v0.8'   },
    { name: 'mcp-repl',  sub: 'repl for mcp · 19 tools',                state: 'live', meta: 'v0.7'   },
    { name: 'mutagen',   sub: 'adaptogen server',                       state: 'live', meta: 'v0.3'   },
    { name: 'playread',  sub: 'playwright mcp wrapper',                 state: 'live', meta: 'v0.4'   },
    { name: 'flatspace', sub: '—',                                       state: 'wip',  meta: 'soon'   },
  ];
  return (
    <section id="works" style={{ padding: 'var(--space-7) var(--pad-x)' }}>
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div>
          <span className="eyebrow" style={{ marginBottom: 8, display: 'inline-flex' }}>everything else</span>
          <h2 className="t-h2" style={{ marginTop: 8, maxWidth: '20ch' }}>Seven more things we ship, with varying degrees of seriousness.</h2>
        </div>
        <a href="#" className="t-link" style={{ fontSize: 'var(--fs-sm)' }}>all 61 repos →</a>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }} className="hp-works">
        {works.map((w, i) => (
          <li key={i} data-hue={randomHue ? (i % 6) : undefined}>
            <a href="#" style={{
              display: 'grid', gridTemplateColumns: 'minmax(140px, 18ch) minmax(0, 1fr) auto auto',
              gap: 'var(--space-4)', alignItems: 'baseline',
              padding: '18px 22px',
              borderRadius: 'var(--r-2)',
              color: 'inherit', textDecoration: 'none',
              transition: 'background var(--dur-base) var(--ease)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontFamily: 'var(--ff-body)', fontWeight: 600, fontSize: 'var(--fs-xl)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center' }}>
                {randomHue && <span className="huechip" />}
                {w.name}
              </span>
              <span className="t-meta" style={{ fontSize: 'var(--fs-sm)' }}>{w.sub}</span>
              <span style={{
                fontSize: 'var(--fs-tiny)', fontFamily: 'var(--ff-mono)', textTransform: 'uppercase', letterSpacing: '0.08em',
                color: w.state === 'live' ? 'var(--green-2)' : 'var(--fg-3)',
              }}>● {w.state}</span>
              <span className="t-meta" style={{ fontSize: 'var(--fs-sm)', minWidth: '5ch', textAlign: 'right' }}>{w.meta}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HomepageWriting() {
  const posts = [
    { date: 'apr 14',  year: '2026', title: 'We were here first.',                         read: '8 min' },
    { date: 'mar 22',  year: '2026', title: 'A postmortem of gm v0.4.',                    read: '12 min' },
    { date: 'feb 09',  year: '2026', title: 'Push-to-talk is a protocol, not a feature.',  read: '6 min' },
    { date: 'dec 11',  year: '2025', title: 'Against the vibe-coded interface.',           read: '14 min' },
  ];
  return (
    <section id="writing" style={{
      padding: 'var(--space-7) var(--pad-x)',
      background: 'var(--bg-2)',
    }}>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <span className="eyebrow">writing</span>
        <h2 className="t-h2" style={{ marginTop: 8, maxWidth: '22ch' }}>We write about what we ship — when we have something to say.</h2>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }} className="hp-writing">
        {posts.map((p, i) => (
          <li key={i}>
            <a href="#" style={{
              display: 'grid', gridTemplateColumns: 'minmax(80px, 10ch) minmax(0, 1fr) auto',
              gap: 'var(--space-4)', alignItems: 'baseline',
              padding: '18px 22px',
              borderRadius: 'var(--r-2)',
              color: 'inherit', textDecoration: 'none',
              transition: 'background var(--dur-base) var(--ease)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <span className="t-meta">{p.date} <span style={{ opacity: 0.6 }}>{p.year}</span></span>
              <span style={{ fontFamily: 'var(--ff-body)', fontWeight: 500, fontSize: 'var(--fs-xl)' }}>{p.title}</span>
              <span className="t-meta" style={{ fontSize: 'var(--fs-xs)' }}>{p.read}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HomepageAbout() {
  return (
    <section id="about" style={{ padding: 'var(--space-7) var(--pad-x)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: 'var(--space-7)', alignItems: 'start' }} className="hp-about">
        <div>
          <span className="eyebrow">who's here</span>
          <h2 className="t-h2" style={{ marginTop: 8, maxWidth: '14ch' }}>Eight people, three timezones, one ongoing conversation.</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p className="t-prose" style={{ maxWidth: '56ch', margin: 0 }}>
            247420 started in 2018 over a late call about how hard it was to enter web3 — too many barriers,
            too much gatekeeping. We registered the github org that night, named it AnEntrypoint, and started shipping.
          </p>
          <p className="t-prose" style={{ maxWidth: '56ch', margin: 0, color: 'var(--fg-2)' }}>
            We move fast. We break things. We document honestly. We ship the rough draft. We treat humor
            as load-bearing. These are the only rules.
          </p>
          <blockquote style={{
            margin: 'var(--space-3) 0 0',
            paddingLeft: 'var(--space-4)',
            borderLeft: 'var(--bw-chunk) solid var(--accent)',
            fontFamily: 'var(--ff-body)', fontWeight: 500, fontStyle: 'italic',
            fontSize: 'var(--fs-h3)', lineHeight: 1.3, maxWidth: '24ch',
            color: 'var(--fg)',
          }}>
            we fart in its general direction.
          </blockquote>
          <span className="t-meta" style={{ fontSize: 'var(--fs-xs)' }}>— the collective, an internal motto</span>
        </div>
      </div>
    </section>
  );
}

function HomepageFooter() {
  return (
    <footer style={{
      padding: 'var(--space-6) var(--pad-x)',
      display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'baseline', gap: 'var(--space-4)',
      marginTop: 'var(--space-5)',
    }} className="hp-footer">
      <div>
        <div style={{ fontWeight: 700, fontSize: 'var(--fs-sm)', letterSpacing: '-0.01em', marginBottom: 6 }}>247420</div>
        <div className="t-meta">
          <span style={{ color: 'var(--accent)' }}>●</span> still emerging 🌀 · built in public · no analytics
        </div>
      </div>
      <div style={{ display: 'flex', gap: 20, fontSize: 'var(--fs-sm)' }}>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>github ↗</a>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>rss</a>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>contact</a>
      </div>
    </footer>
  );
}

function Homepage({ randomHue = false }) {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100%' }} className="kit-homepage">
      <HomepageHeader />
      <HomepageLede />
      <HomepageFeatured />
      <HomepageWorks randomHue={randomHue} />
      <HomepageWriting />
      <HomepageAbout />
      <HomepageFooter />
      <style>{`
        .kit-homepage { --pad-x: clamp(20px, 5cqw, 96px); }
        @container (max-width: 980px) {
          .kit-homepage .hp-feat   { grid-template-columns: 1fr !important; gap: var(--space-5) !important; }
        }
        @container (max-width: 760px) {
          .kit-homepage .hp-lede   { padding: var(--space-7) var(--pad-x) var(--space-5) !important; gap: var(--space-4) !important; }
          .kit-homepage .hp-lede h1 { font-size: clamp(30px, 7.8cqi, 56px) !important; }
          .kit-homepage .hp-feat   { grid-template-columns: 1fr !important; gap: var(--space-5) !important; }
          .kit-homepage .hp-feat-facts { grid-template-columns: 1fr 1fr !important; }
          .kit-homepage .hp-about  { grid-template-columns: 1fr !important; gap: var(--space-4) !important; }
          .kit-homepage .hp-footer { grid-template-columns: 1fr !important; gap: var(--space-3) !important; }
          .kit-homepage .hp-works li a { grid-template-columns: 1fr auto !important; row-gap: 4px !important; padding: 16px 18px !important; }
          .kit-homepage .hp-works li a > :nth-child(2) { grid-column: 1 / -1; order: 3; }
          .kit-homepage .hp-works li a > :nth-child(3) { order: 2; }
          .kit-homepage .hp-works li a > :nth-child(4) { display: none; }
          .kit-homepage .hp-writing li a { grid-template-columns: minmax(70px, 9ch) 1fr !important; padding: 16px 18px !important; }
          .kit-homepage .hp-writing li a > :nth-child(3) { display: none; }
          .kit-homepage section[id] { padding-top: var(--space-6) !important; padding-bottom: var(--space-6) !important; }
        }
        @container (max-width: 500px) {
          .kit-homepage header { padding: 14px 18px !important; gap: 12px !important; }
          .kit-homepage .hp-nav { gap: 2px !important; font-size: 12px !important; }
          .kit-homepage .hp-nav a { padding: 6px 10px !important; }
          .kit-homepage .hp-nav a:last-child { display: none; }
          .kit-homepage .hp-lede { padding-top: var(--space-6) !important; }
          .kit-homepage .hp-lede .btn,
          .kit-homepage .hp-lede .btn-ghost { flex: 1; justify-content: center; }
          .kit-homepage .hp-feat-facts { gap: var(--space-3) var(--space-4) !important; }
          .kit-homepage .hp-works li a { padding: 14px 16px !important; gap: var(--space-2) !important; }
          .kit-homepage .hp-writing li a { padding: 14px 16px !important; }
          .kit-homepage section h2 { font-size: clamp(22px, 5.6cqi, 32px) !important; }
          .kit-homepage .hp-about h2 { max-width: 18ch !important; }
          .kit-homepage .hp-about blockquote { font-size: var(--fs-xl) !important; padding-left: var(--space-3) !important; }
          .kit-homepage .hp-footer { padding: var(--space-5) var(--pad-x) !important; }
        }
      `}</style>
    </div>
  );
}

window.Homepage = Homepage;
