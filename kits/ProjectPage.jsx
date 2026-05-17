/* ProjectPage.jsx — story-first rewrite.
   Lede answers what & for whom. One install. One concept. Then changelog. */

function ProjectHeader() {
  return (
    <header style={{
      padding: '20px var(--pad-x)',
      display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
    }}>
      <a className="t-meta" href="#" style={{ color: 'inherit', textDecoration: 'none', fontSize: 'var(--fs-sm)' }}>← 247420</a>
      <span style={{ fontWeight: 700, fontSize: 'var(--fs-sm)', letterSpacing: '-0.01em' }}>gm</span>
      <span style={{ flex: 1 }} />
      <nav style={{ display: 'flex', gap: 4, fontSize: 'var(--fs-sm)' }} className="pp-nav">
        <a href="#" style={{ color: 'var(--accent-fg)', textDecoration: 'none', background: 'var(--accent)', padding: '8px 16px', borderRadius: 'var(--r-pill)', fontWeight: 600 }}>overview</a>
        <a href="#" style={{ color: 'var(--fg-2)',      textDecoration: 'none', padding: '8px 16px', borderRadius: 'var(--r-pill)' }}>docs</a>
        <a href="#" style={{ color: 'var(--fg-2)',      textDecoration: 'none', padding: '8px 16px', borderRadius: 'var(--r-pill)' }}>changelog</a>
        <a href="#" style={{ color: 'var(--fg-3)',      textDecoration: 'none', padding: '8px 16px', borderRadius: 'var(--r-pill)' }}>source ↗</a>
      </nav>
    </header>
  );
}

function ProjectLede() {
  return (
    <section style={{
      padding: 'var(--space-9) var(--pad-x) var(--space-7)',
      display: 'grid', gap: 'var(--space-5)', maxWidth: 1000,
    }} className="pp-lede">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span className="eyebrow">a 247420 project</span>
        <span style={{
          padding: '4px 12px', background: 'var(--green-tint)', color: 'var(--green-deep)',
          fontSize: 'var(--fs-tiny)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tr-caps)',
          borderRadius: 'var(--r-pill)',
        }}>● live · v0.4.1</span>
      </div>
      <h1 style={{
        fontFamily: 'var(--ff-body)',
        fontWeight: 600,
        fontSize: 'clamp(34px, 6.4cqi, 80px)',
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
        margin: 0,
      }}>gm.</h1>
      <p style={{
        fontFamily: 'var(--ff-body)', fontWeight: 500, fontSize: 'clamp(22px, 2.6cqi, 36px)',
        lineHeight: 1.25, margin: 0, maxWidth: '24ch'
      }}>
        A state machine for coding agents. It thinks, so you don't have to. (As much.)
      </p>
      <p className="t-prose" style={{ maxWidth: '56ch', color: 'var(--fg-2)', marginTop: 'var(--space-2)' }}>
        gm gives an LLM a small, deterministic runtime. Six states, one loop. The agent picks the next move from a
        finite set. Predictable on the inside; useful on the outside. Built for Claude Code, OpenCode, Cursor, and twelve other editors.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
        <a className="btn btn-accent" href="#install">install</a>
        <a className="btn btn-ghost" href="#">read the docs</a>
      </div>
    </section>
  );
}

function ProjectInstall() {
  return (
    <section id="install" style={{
      padding: 'var(--space-7) var(--pad-x)',
    }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <span className="eyebrow">install in 30 seconds</span>
      </div>
      <div className="pp-install" style={{
        background: 'var(--ink)', color: 'var(--paper)',
        padding: 'var(--space-5) var(--space-6)',
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-4)', alignItems: 'center',
        borderRadius: 'var(--r-3)',
      }}>
        <pre style={{
          background: 'transparent', padding: 0, color: 'var(--paper)',
          fontSize: 'var(--fs-lg)', fontFamily: 'var(--ff-mono)', letterSpacing: 0, margin: 0,
        }}>
          <span style={{ color: 'var(--green-2)' }}>$</span> npx -y <span style={{ color: 'var(--sun)' }}>@anentrypoint/mcp-gm</span>
        </pre>
        <button style={{
          padding: '10px 18px', background: 'transparent', color: 'var(--paper)',
          border: '1px solid #6A6A70', cursor: 'pointer',
          fontFamily: 'var(--ff-mono)', fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.08em',
          borderRadius: 'var(--r-pill)',
        }}>copy</button>
      </div>
      <p className="t-meta" style={{ marginTop: 'var(--space-3)', fontSize: 'var(--fs-sm)' }}>
        Or use the plugin for your editor of choice — Claude Code, Cursor, Zed, JetBrains, VS Code, Codex, Kilo, Windsurf, Hermes, Antigravity, Copilot CLI, and Qwen.
      </p>
    </section>
  );
}

function ProjectStates() {
  const states = [
    ['1. idle',      'Sit. Wait for instruction.'],
    ['2. reading',   'Read the code that matters.'],
    ['3. planning',  'Decide what to do, in steps.'],
    ['4. editing',   'Make the change.'],
    ['5. verifying', 'Run the tests.'],
    ['6. done',      'Stop. Tell the human.'],
  ];
  return (
    <section style={{ padding: 'var(--space-7) var(--pad-x)', background: 'var(--bg-2)' }}>
      <div style={{ marginBottom: 'var(--space-6)', maxWidth: 760 }}>
        <span className="eyebrow">how it works</span>
        <h2 className="t-h2" style={{ marginTop: 8, maxWidth: '20ch' }}>Six states. One loop. The agent picks the next move.</h2>
        <p className="t-prose" style={{ color: 'var(--fg-2)', marginTop: 'var(--space-3)' }}>
          The model isn't asked to be smart. It's asked to pick a transition. The state graph is what makes the
          behaviour predictable — and what lets us pause, replay, and reason about a session after the fact.
        </p>
      </div>
      <ol className="pp-states" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6, background: 'transparent' }}>
        {states.map(([s, blurb], i) => (
          <li key={i} style={{
            background: 'var(--bg)',
            padding: 'var(--space-4) var(--space-5)',
            display: 'grid', gridTemplateColumns: 'minmax(140px, 14ch) minmax(0, 1fr)',
            gap: 'var(--space-4)', alignItems: 'baseline',
            borderRadius: 'var(--r-3)',
          }} className="pp-state-row">
            <span style={{ fontFamily: 'var(--ff-body)', fontWeight: 600, fontSize: 'var(--fs-xl)', letterSpacing: '-0.01em' }}>{s}</span>
            <span className="t-body" style={{ color: 'var(--fg-2)' }}>{blurb}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ProjectChangelog() {
  const entries = [
    { date: 'apr 20 2026', ver: 'v0.4.1', msg: 'Fixed the thing everyone was complaining about.' },
    { date: 'mar 22 2026', ver: 'v0.4.0', msg: 'New state-machine runtime. Broke a lot on purpose; the postmortem is on the blog.' },
    { date: 'feb 09 2026', ver: 'v0.3.7', msg: 'astgrep_search is now astgrep_enhanced_search.' },
    { date: 'dec 11 2025', ver: 'v0.3.0', msg: 'First public release. gm, world.' },
  ];
  return (
    <section style={{ padding: 'var(--space-7) var(--pad-x)' }}>
      <div style={{ marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <span className="eyebrow">what's changed</span>
          <h2 className="t-h2" style={{ marginTop: 8 }}>Recent releases.</h2>
        </div>
        <a href="#" className="t-link" style={{ fontSize: 'var(--fs-sm)' }}>full changelog →</a>
      </div>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }}>
        {entries.map((e, i) => (
          <li key={i} style={{
            display: 'grid', gridTemplateColumns: 'minmax(120px, 14ch) minmax(80px, 10ch) minmax(0, 1fr)',
            gap: 'var(--space-4)', alignItems: 'baseline',
            padding: '18px 22px',
            borderRadius: 'var(--r-2)',
            background: i % 2 === 0 ? 'var(--bg-2)' : 'transparent',
          }} className="pp-cl-row">
            <span className="t-meta">{e.date}</span>
            <span style={{ fontFamily: 'var(--ff-body)', fontWeight: 600, fontSize: 'var(--fs-body)' }}>{e.ver}</span>
            <span style={{ fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-body)', color: 'var(--fg-2)' }}>{e.msg}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ProjectPage() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100%' }} className="kit-project">
      <ProjectHeader />
      <ProjectLede />
      <ProjectInstall />
      <ProjectStates />
      <ProjectChangelog />
      <footer style={{
        padding: 'var(--space-6) var(--pad-x)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap'
      }}>
        <span className="t-meta">gm is part of 247420. <span style={{ color: 'var(--accent)' }}>●</span> still emerging 🌀</span>
        <a href="#" className="t-link" style={{ fontSize: 'var(--fs-sm)' }}>source ↗</a>
      </footer>
      <style>{`
        .kit-project { --pad-x: clamp(20px, 5cqw, 96px); }
        @container (max-width: 760px) {
          .kit-project .pp-lede { padding: var(--space-6) var(--pad-x) var(--space-5) !important; }
          .kit-project .pp-lede h1 { font-size: clamp(56px, 18cqi, 120px) !important; }
          .kit-project .pp-install { grid-template-columns: 1fr !important; gap: var(--space-3) !important; padding: var(--space-4) var(--space-5) !important; }
          .kit-project .pp-install pre, .kit-project .pp-install code { font-size: var(--fs-body) !important; }
          .kit-project .pp-cl-row { grid-template-columns: 1fr auto !important; row-gap: 4px !important; padding: 14px 16px !important; }
          .kit-project .pp-cl-row > :last-child { grid-column: 1 / -1; }
          .kit-project .pp-state-row { grid-template-columns: 1fr !important; gap: 4px !important; padding: var(--space-4) var(--space-5) !important; }
          .kit-project section { padding-top: var(--space-6) !important; padding-bottom: var(--space-6) !important; }
        }
        @container (max-width: 500px) {
          .kit-project header { padding: 14px 18px !important; gap: 8px !important; flex-wrap: nowrap; }
          .kit-project .pp-nav { gap: 2px !important; font-size: 12px !important; }
          .kit-project .pp-nav a { padding: 6px 10px !important; }
          .kit-project .pp-nav a:last-child,
          .kit-project .pp-nav a:nth-last-child(2) { display: none; }
          .kit-project .pp-lede .btn,
          .kit-project .pp-lede .btn-ghost { flex: 1; justify-content: center; }
        }
      `}</style>
    </div>
  );
}

window.ProjectPage = ProjectPage;
