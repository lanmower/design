/* Docs.jsx — calmer docs.
   Clear breadcrumb in plain English · sidebar · article · TOC. */

function DocsSidebar() {
  const sections = [
    { label: 'Getting started', items: [['Introduction', true], ['Install', false], ['Quickstart', false]] },
    { label: 'Concepts',        items: [['States & transitions', false], ['The loop', false], ['Tools', false]] },
    { label: 'Reference',       items: [['executenodejs', false], ['executedeno', false], ['astgrep_*', false], ['batch_execute', false]] },
    { label: 'More',            items: [['Philosophy', false], ['Changelog ↗', false], ['Source ↗', false]] },
  ];
  return (
    <aside style={{
      padding: 'var(--space-5) var(--space-4)',
      background: 'var(--bg-2)',
      overflowY: 'auto',
    }} className="docs-aside">
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--fs-sm)', letterSpacing: '-0.01em' }}>gm</div>
        <div className="t-meta" style={{ fontSize: 'var(--fs-xs)' }}>v0.4.1 · documentation</div>
      </div>
      <input type="text" placeholder="Search the docs…" style={{
        width: '100%', background: 'var(--bg-2)', border: 0,
        padding: '10px 12px', fontFamily: 'inherit', fontSize: 'var(--fs-sm)', color: 'inherit', outline: 'none',
        marginBottom: 'var(--space-4)'
      }} />
      {sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{
            padding: '0 var(--space-2) 6px', fontSize: 'var(--fs-xs)',
            fontWeight: 600, color: 'var(--fg-3)', letterSpacing: 0
          }}>{s.label}</div>
          {s.items.map(([n, active], j) => (
            <a key={j} href="#" style={{
              display: 'block', padding: '7px var(--space-2)',
              fontSize: 'var(--fs-sm)',
              color: active ? 'var(--accent)' : 'inherit', textDecoration: 'none',
              borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              paddingLeft: active ? 'calc(var(--space-2) - 2px)' : 'var(--space-2)',
              fontWeight: active ? 600 : 400,
            }}>
              {n}
            </a>
          ))}
        </div>
      ))}
    </aside>
  );
}

function DocsToc() {
  return (
    <aside style={{
      padding: 'var(--space-6) var(--space-4) var(--space-4) 0',
      fontSize: 'var(--fs-sm)',
    }} className="docs-toc">
      <div className="t-meta" style={{ fontSize: 'var(--fs-xs)', marginBottom: 'var(--space-3)', fontWeight: 600 }}>On this page</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          ['What is gm?',  false],
          ['Install',      false],
          ['Quickstart',   true],
          ['The loop',     false],
          ['Tools',        false],
          ['Philosophy',   false],
        ].map(([n, active], i) => (
          <a key={i} href="#" style={{
            color: active ? 'var(--accent)' : 'var(--fg-2)', textDecoration: 'none',
            borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
            paddingLeft: 12,
            fontWeight: active ? 600 : 400,
          }}>{n}</a>
        ))}
      </div>
    </aside>
  );
}

function DocsMain() {
  return (
    <main style={{ padding: 'var(--space-7) var(--space-7)', maxWidth: 760 }} className="docs-main">
      <nav className="t-meta" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--fs-xs)' }}>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>247420</a>
        <span style={{ margin: '0 8px', opacity: 0.5 }}>/</span>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>gm</a>
        <span style={{ margin: '0 8px', opacity: 0.5 }}>/</span>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>docs</a>
        <span style={{ margin: '0 8px', opacity: 0.5 }}>/</span>
        <span style={{ color: 'var(--fg)' }}>Introduction</span>
      </nav>

      <h1 className="t-h1" style={{ marginBottom: 'var(--space-3)', fontSize: 'clamp(32px, 5.4cqi, 56px)' }}>Introduction</h1>
      <p className="t-lede" style={{ marginBottom: 'var(--space-6)', maxWidth: '32ch' }}>
        A state machine for coding agents. It thinks, so you don't have to. (As much.)
      </p>

      <p style={{ fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-lg)', lineHeight: 1.7, margin: '0 0 var(--space-4)', maxWidth: '64ch' }}>
        gm is what happens when you stop trying to make an LLM smart and start giving it a scaffolding to be useful inside of.
        A small, deterministic runtime that says: <em>here is where you are, here are the transitions available, pick one.</em>
      </p>
      <p style={{ fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-lg)', lineHeight: 1.7, margin: '0 0 var(--space-6)', color: 'var(--fg-2)', maxWidth: '64ch' }}>
        This document explains how to install it, how to wire it up, and how to stay out of its way.
      </p>

      <h2 style={{
        marginTop: 'var(--space-7)', marginBottom: 'var(--space-3)',
        fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-h2)', fontWeight: 600, letterSpacing: '-0.02em',
      }}>Install</h2>
      <p style={{ fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-lg)', lineHeight: 1.7, margin: '0 0 var(--space-3)', maxWidth: '64ch' }}>
        One command. If you've used a Node toolchain in the last decade, this will look familiar.
      </p>
      <pre><span className="c"># claude code plugin marketplace</span>{'\n'}<span className="k">claude</span> plugin marketplace add AnEntrypoint/gm-cc{'\n'}<span className="k">claude</span> plugin install -s user gm@gm-cc</pre>

      <div style={{
        background: 'var(--accent-tint)', color: 'var(--fg)',
        padding: 'var(--space-4) var(--space-5)',
        marginTop: 'var(--space-5)',
        borderLeft: 'var(--bw-chunk) solid var(--accent)',
        fontSize: 'var(--fs-sm)', lineHeight: 1.5,
      }}>
        <strong style={{ fontWeight: 700, marginRight: 6 }}>Heads up.</strong>
        Running gm without Claude Code? See <a href="#" className="t-link">reference / executenodejs</a>. You'll want Bun 1.1 or later.
      </div>

      <h2 style={{
        marginTop: 'var(--space-7)', marginBottom: 'var(--space-3)',
        fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-h2)', fontWeight: 600, letterSpacing: '-0.02em',
      }}>Quickstart</h2>
      <h3 style={{
        marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)',
        fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-lg)', fontWeight: 600
      }}>The thirty-second version</h3>
      <p style={{ fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-lg)', lineHeight: 1.7, margin: '0 0 var(--space-3)', maxWidth: '64ch' }}>
        Start the REPL, ask it to do something, watch it work. Press <kbd style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.82em', background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 'var(--r-1)' }}>ctrl-c</kbd> if it goes somewhere you didn't mean.
      </p>
      <pre><span className="k">gm</span> start{'\n'}<span className="c">→ state: idle</span>{'\n'}<span className="c">→ tools: 19</span>{'\n'}<span style={{ color: 'var(--mascot)' }}>&gt;</span> fix the failing test in src/router.ts{'\n'}<span className="c">→ state: reading</span>{'\n'}<span className="c">→ state: editing</span>{'\n'}<span className="c">→ state: verifying</span>{'\n'}<span className="c">→ state: </span><span className="n">done</span></pre>

      <h2 style={{
        marginTop: 'var(--space-7)', marginBottom: 'var(--space-3)',
        fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-h2)', fontWeight: 600, letterSpacing: '-0.02em',
      }}>Philosophy</h2>
      <p style={{ fontFamily: 'var(--ff-body)', fontSize: 'var(--fs-lg)', lineHeight: 1.7, margin: 0, maxWidth: '64ch' }}>
        There isn't one. <a href="#" className="t-link">Read the source.</a>
      </p>

      <div style={{
        marginTop: 'var(--space-8)', paddingTop: 'var(--space-5)',
        display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)',
      }} className="docs-pagination">
        <a href="#" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="t-meta" style={{ fontSize: 'var(--fs-xs)' }}>← Previous</span>
          <span style={{ fontFamily: 'var(--ff-body)', fontWeight: 600, fontSize: 'var(--fs-lg)' }}>Welcome</span>
        </a>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'right' }}>
          <span className="t-meta" style={{ fontSize: 'var(--fs-xs)' }}>Next →</span>
          <span style={{ fontFamily: 'var(--ff-body)', fontWeight: 600, fontSize: 'var(--fs-lg)' }}>Install</span>
        </a>
      </div>
    </main>
  );
}

function Docs() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100%' }} className="kit-docs">
      <header style={{
        padding: '14px var(--space-5)',
        background: 'color-mix(in oklab, var(--bg) 88%, transparent)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700, fontSize: 'var(--fs-sm)' }}>247420</a>
        <span style={{ color: 'var(--fg-3)' }}>·</span>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none', fontSize: 'var(--fs-sm)' }}>gm docs</a>
        <span style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 'var(--fs-xs)' }}>v0.4.1</span>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none', fontSize: 'var(--fs-sm)' }}>source ↗</a>
      </header>
      <div style={{
        display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr) 200px',
        minHeight: 'calc(100% - 52px)'
      }} className="docs-layout">
        <DocsSidebar />
        <DocsMain />
        <DocsToc />
      </div>
      <style>{`
        .kit-docs pre { font-size: var(--fs-sm); margin: var(--space-2) 0 var(--space-4); }
        @container (max-width: 980px) {
          .kit-docs .docs-layout { grid-template-columns: 220px minmax(0, 1fr) !important; }
          .kit-docs .docs-toc { display: none; }
        }
        @container (max-width: 720px) {
          .kit-docs .docs-layout { grid-template-columns: 1fr !important; }
          .kit-docs .docs-aside { border-right: 0; border-bottom: 1px solid color-mix(in oklab, currentColor 14%, transparent); max-height: 260px; }
          .kit-docs .docs-main { padding: var(--space-5) var(--space-4) !important; }
        }
      `}</style>
    </div>
  );
}

window.Docs = Docs;
