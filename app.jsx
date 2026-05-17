/* app.jsx — assemble the canvas */

const { useEffect, useState } = React;

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "auto",
  "density": "comfortable",
  "accent": "green",
  "typescale": "md",
  "grid": false,
  "randomHue": false,
  "device": "desktop"
}/*EDITMODE-END*/;

function applyTweaks(t) {
  const root = document.documentElement;
  if (t.theme === 'paper')     root.removeAttribute('data-theme');
  else if (t.theme === 'ink')  root.setAttribute('data-theme', 'ink');
  else { // auto
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) root.setAttribute('data-theme', 'ink');
    else root.removeAttribute('data-theme');
  }
  root.setAttribute('data-density', t.density);
  root.setAttribute('data-accent',   t.accent);
  root.setAttribute('data-typescale', t.typescale);
  root.classList.toggle('with-grid-overlay', !!t.grid);
}

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULTS);
  useEffect(() => { applyTweaks(tweaks); }, [tweaks]);

  // Interactive homepage width driven by device tweak
  const interactiveW = tweaks.device === 'mobile' ? 380 : tweaks.device === 'tablet' ? 760 : 1280;
  const interactiveH = tweaks.device === 'mobile' ? 3800 : tweaks.device === 'tablet' ? 3200 : 2400;

  return (
    <>
      <DesignCanvas>
        <DCSection id="sdk" title="The SDK — live" subtitle="This is the actual published shape (mount + components.AppShell + scope). Same API as anentrypoint-design@latest — swap unpkg for this directory and it Just Works.">
          <DCArtboard id="sdk-home" label="app.html · home (real SDK · webjsx · .ds-247420)" width={1280} height={1800}>
            <iframe src="app.html#home" style={{ width: '100%', height: '100%', border: 0, display: 'block' }} title="SDK demo — home" />
          </DCArtboard>
          <DCArtboard id="sdk-project" label="app.html · project" width={1280} height={1400}>
            <iframe src="app.html#project" style={{ width: '100%', height: '100%', border: 0, display: 'block' }} title="SDK demo — project" />
          </DCArtboard>
          <DCArtboard id="sdk-docs" label="app.html · docs (rail + main)" width={1280} height={1300}>
            <iframe src="app.html#docs" style={{ width: '100%', height: '100%', border: 0, display: 'block' }} title="SDK demo — docs" />
          </DCArtboard>
          <DCArtboard id="sdk-app" label="app.html · admin (Table + Kpi + Chip)" width={1280} height={1100}>
            <iframe src="app.html#app" style={{ width: '100%', height: '100%', border: 0, display: 'block' }} title="SDK demo — app" />
          </DCArtboard>
        </DCSection>

        <DCSection id="primer" title="The system" subtitle="palette, type, primitives — the calm chassis">
          <DCArtboard id="system" label="design system" width={1400} height={1700}>
            <SystemPrimer />
          </DCArtboard>
        </DCSection>

        <DCSection id="interactive" title="Live preview" subtitle={`The homepage at the active device width — use the Tweaks panel to switch. Currently: ${tweaks.device}.`}>
          <DCArtboard id="interactive-home" label={`homepage · ${tweaks.device} · ${interactiveW}px`} width={interactiveW} height={interactiveH}>
            <Homepage randomHue={tweaks.randomHue} />
          </DCArtboard>
        </DCSection>

        <DCSection id="responsive" title="Three-tier responsive" subtitle="Same component, three widths — container queries do the layout work.">
          <DCArtboard id="resp-desktop" label="desktop · 1280" width={1280} height={2400}>
            <Homepage randomHue={tweaks.randomHue} />
          </DCArtboard>
          <DCArtboard id="resp-tablet" label="tablet · 760" width={760} height={3200}>
            <Homepage randomHue={tweaks.randomHue} />
          </DCArtboard>
          <DCArtboard id="resp-mobile" label="mobile · 380" width={380} height={3800}>
            <Homepage randomHue={tweaks.randomHue} />
          </DCArtboard>
        </DCSection>

        <DCSection id="marketing" title="Marketing surfaces" subtitle="Project landing page and a long-form post.">
          <DCArtboard id="project" label="project page · gm" width={1280} height={2200}>
            <ProjectPage />
          </DCArtboard>
          <DCArtboard id="blog" label="blog · long-form" width={900} height={2000}>
            <Blog />
          </DCArtboard>
        </DCSection>

        <DCSection id="docs" title="Documentation" subtitle="Three-pane on desktop; gracefully collapses on mobile.">
          <DCArtboard id="docs-desktop" label="docs · desktop" width={1280} height={1700}>
            <Docs />
          </DCArtboard>
          <DCArtboard id="docs-mobile" label="docs · mobile" width={400} height={2200}>
            <Docs />
          </DCArtboard>
        </DCSection>

        <DCSection id="product" title="Product surfaces" subtitle="CLI session, web desktop, admin dashboard — the previously-missing kits.">
          <DCArtboard id="cli" label="cli · gm session (animated)" width={960} height={620}>
            <CLI />
          </DCArtboard>
          <DCArtboard id="os" label="os gui · sequential desktop" width={960} height={620}>
            <OSGui />
          </DCArtboard>
          <DCArtboard id="app" label="app shell · admin / dashboard" width={1280} height={920}>
            <AppShell />
          </DCArtboard>
          <DCArtboard id="app-mobile" label="app shell · mobile" width={400} height={960}>
            <AppShell />
          </DCArtboard>
        </DCSection>

        <DCSection id="deck" title="Slide deck template" subtitle="Four representative slides; 16:9 fixed.">
          <DCArtboard id="deck-tmpl" label="deck · template" width={1280} height={900}>
            <SlideDeck />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakRadio label="mode" value={tweaks.theme} options={['auto','paper','ink']} onChange={(v) => setTweak('theme', v)} />
          <TweakRadio label="density" value={tweaks.density} options={['compact','comfortable','spacious']} onChange={(v) => setTweak('density', v)} />
          <TweakRadio label="type scale" value={tweaks.typescale} options={['sm','md','lg']} onChange={(v) => setTweak('typescale', v)} />
        </TweakSection>

        <TweakSection label="Accent">
          <TweakColor
            label="accent hue"
            value={tweaks.accent === 'green' ? '#247420' : tweaks.accent === 'purple' ? '#420247' : '#E84B8A'}
            options={['#247420', '#420247', '#E84B8A']}
            onChange={(v) => {
              const map = { '#247420': 'green', '#420247': 'purple', '#E84B8A': 'mascot' };
              setTweak('accent', map[v] || 'green');
            }}
          />
        </TweakSection>

        <TweakSection label="Device preview">
          <TweakRadio label="width (top frame)" value={tweaks.device} options={['mobile','tablet','desktop']} onChange={(v) => setTweak('device', v)} />
        </TweakSection>

        <TweakSection label="Debug & utilities">
          <TweakToggle label="8pt grid overlay" value={tweaks.grid} onChange={(v) => setTweak('grid', v)} />
          <TweakToggle label="randomize list-item hues" value={tweaks.randomHue} onChange={(v) => setTweak('randomHue', v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
