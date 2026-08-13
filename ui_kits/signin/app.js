import * as webjsx from 'webjsx';
// Imported directly from owning submodules, not the ds/components.js barrel
// -- see aicat/app.js for the measured rationale (200+ serial unbundled
// module requests when every kit pulls the full 30+-submodule barrel).
import { Topbar, Crumb, Status, AppShell, Heading, Lede, Chip, Icon } from 'ds/components/shell.js';
import { Panel, InputOTP } from 'ds/components/content.js';
import { Divider } from 'ds/components/editor-primitives.js';
import { mountKit } from 'ds/bootstrap.js';
import { shortUid } from 'ds/uid.js';
const h = webjsx.createElement;

const root = document.getElementById('root');
const state = { mode: 'signin', email: '', password: '', remember: false, sent: false, error: '', loading: null, demoUrl: '', otp: '', otpVerified: false, otpError: '', emailError: '', passwordError: '', showPassword: false };

function setMode(m) { state.mode = m; state.sent = false; state.error = ''; state.emailError = ''; state.passwordError = ''; state.loading = null; state.demoUrl = ''; state.otp = ''; state.otpVerified = false; state.otpError = ''; state.showPassword = false; kit.render(); }

// Same copy submit() uses, run early so a mistake surfaces on blur/input
// instead of only after the whole form is filled out and submitted.
function validateEmail() {
    if (!state.email.trim()) { state.emailError = ''; return; }
    state.emailError = state.email.includes('@') ? '' : 'that address has no @ — check for a typo.';
}
function validatePassword() {
    if (state.mode === 'magic' || state.mode === 'reset') { state.passwordError = ''; return; }
    if (!state.password) { state.passwordError = ''; return; }
    state.passwordError = state.password.length < 6 ? 'password is too short — 6 characters minimum.' : '';
}

// A specimen page cannot actually deliver an email, so the interactive
// stand-in for "click the link in your inbox" is a fixed demo code the
// sent-state copy tells the visitor to type back — exercises real InputOTP
// wiring (auto-advance, backspace-retreat, paste-split, onComplete) without
// pretending to be a real server round trip.
const DEMO_CODE = '247420';

function verifyOtp(code) {
    state.otp = code;
    if (code.length < 6) { state.otpError = ''; kit.render(); return; }
    if (code === DEMO_CODE) {
        state.otpVerified = true;
        state.otpError = '';
    } else {
        state.otpError = 'that code doesn\'t match — demo code is ' + DEMO_CODE + '.';
    }
    kit.render();
}

function submit(e) {
    e.preventDefault();
    // Name the problem and the fix, in the surface's terse lowercase voice.
    // "enter a real email" told the user they were wrong without saying what
    // would be right.
    if (!state.email.trim()) { state.error = 'email is empty — enter the address on your account.'; kit.render(); return; }
    validateEmail();
    if (state.emailError) { state.error = state.emailError; kit.render(); return; }
    if (state.mode !== 'magic' && state.mode !== 'reset') {
        validatePassword();
        if (state.passwordError) { state.error = state.passwordError; kit.render(); return; }
    }
    state.error = '';
    state.sent = true;
    kit.render();
}

function Provider({ icon, label, provider }) {
    const isLoading = state.loading === provider;
    return h('button', {
        class: 'btn ds-auth-provider-btn' + (isLoading ? ' ds-auth-provider-btn--loading' : ''),
        onclick: (e) => {
            e.preventDefault();
            if (isLoading) return;
            state.loading = provider;
            state.error = '';
            kit.render();
            startOAuthFlow(provider);
        },
        disabled: isLoading
    },
        h('span', { class: 'ds-auth-provider-glyph' + (isLoading ? ' ds-spin' : '') }, Icon(isLoading ? 'refresh' : icon)),
        h('span', {}, isLoading ? 'redirecting...' : label)
    );
}

// Config comes from a plain global, NOT import.meta.env. There is no Vite in
// this repo, so `import.meta.env` is undefined in the browser and reading a
// property off it THROWS — and because the config object was built before the
// try below, that throw escaped the catch entirely and left every provider
// button stuck on "redirecting..." forever with no error shown. A host app that
// wants real credentials sets globalThis.__DS_AUTH before mounting.
const AUTH_ENV = (typeof globalThis !== 'undefined' && globalThis.__DS_AUTH) || {};

function startOAuthFlow(provider) {
    const config = {
        github: {
            clientId: AUTH_ENV.githubClientId || 'demo-github-client-id',
            redirectUri: window.location.origin + '/auth/callback/github'
        },
        google: {
            clientId: AUTH_ENV.googleClientId || 'demo-google-client-id',
            redirectUri: window.location.origin + '/auth/callback/google'
        },
        sso: {
            endpoint: AUTH_ENV.ssoEndpoint || 'https://sso.247420.xyz/authorize',
            redirectUri: window.location.origin + '/auth/callback/sso'
        }
    }[provider];

    if (!config) {
        state.error = 'provider not configured';
        state.loading = null;
        kit.render();
        return;
    }

    try {
        if (provider === 'github') {
            const scopes = ['user:email', 'read:user'].join(' ');
            const params = new URLSearchParams({
                client_id: config.clientId,
                redirect_uri: config.redirectUri,
                scope: scopes,
                state: generateState()
            });
            go('https://github.com/login/oauth/authorize?' + params);
        } else if (provider === 'google') {
            const scopes = ['openid', 'email', 'profile'].join(' ');
            const params = new URLSearchParams({
                client_id: config.clientId,
                redirect_uri: config.redirectUri,
                response_type: 'code',
                scope: scopes,
                state: generateState()
            });
            go('https://accounts.google.com/o/oauth2/v2/auth?' + params);
        } else if (provider === 'sso') {
            const params = new URLSearchParams({
                redirect_uri: config.redirectUri,
                state: generateState()
            });
            go(config.endpoint + '?' + params);
        }
    } catch (err) {
        state.error = 'oauth flow failed: ' + (err.message || 'unknown error');
        state.loading = null;
        kit.render();
    }
}

// A specimen must not actually leave the specimen. Without real credentials the
// navigation above would send a visitor to github.com with the literal client id
// "demo-github-client-id" and strand them on a provider error page, so unless a
// host app supplied real config we show the exact URL that WOULD be opened and
// stay put. That is more useful than a redirect anyway: it makes the request
// this component builds inspectable, which is what a specimen is for.
function isDemoConfig() {
    return !AUTH_ENV.githubClientId && !AUTH_ENV.googleClientId && !AUTH_ENV.ssoEndpoint;
}

function go(url) {
    if (isDemoConfig()) {
        state.loading = null;
        state.demoUrl = url;
        kit.render();
        return;
    }
    window.location.href = url;
}

function generateState() {
    return btoa(JSON.stringify({
        nonce: shortUid(11),
        timestamp: Date.now()
    }));
}

function Form() {
    if (state.sent) {
        // A confirmation with no way back is a trap: mistype the address and
        // the only recovery was a page reload. Every sent state that waits on
        // an email now offers the correction path.
        const waiting = state.mode === 'magic' || state.mode === 'reset';
        const magicVerify = state.mode === 'magic' && !state.otpVerified;
        return h('div', { class: 'ds-auth-form ds-auth-sent' },
            h('div', { class: 'ds-auth-sent-glyph' }, state.otpVerified ? '[ok]' : '[x]'),
            h('p', { class: 'ds-auth-sent-title' },
                state.otpVerified ? 'verified' :
                state.mode === 'magic' ? 'check your email' : (state.mode === 'reset' ? 'reset link sent' : (state.mode === 'signup' ? 'account created' : 'welcome back'))),
            h('p', { class: 'ds-auth-sent-sub' },
                // This is a specimen page, not a live host app — there is no
                // real index route to send anyone to, so the copy says what
                // actually happens (nothing further) instead of promising a
                // redirect that this file never wires up.
                state.otpVerified ? '(demo) signed in — this specimen stops here.' :
                state.mode === 'magic'
                ? 'we sent a sign-in link to ' + state.email + '. it expires in 15 minutes — or enter the ' + DEMO_CODE.length + '-digit code from the email below (demo code: ' + DEMO_CODE + ').'
                : (state.mode === 'reset' ? 'we sent a reset link to ' + state.email + '. follow it to set a new password.' : '(demo) signed in — this specimen stops here.')),
            magicVerify ? h('div', { class: 'ds-auth-otp-wrap' },
                InputOTP({
                    length: DEMO_CODE.length, value: state.otp,
                    onChange: (code) => verifyOtp(code),
                    onComplete: (code) => verifyOtp(code),
                    error: Boolean(state.otpError),
                    label: 'sign-in code',
                }),
                state.otpError ? h('div', { class: 'ds-auth-error', role: 'alert' }, state.otpError) : null
            ) : null,
            waiting && !state.otpVerified ? h('button', {
                class: 'btn',
                onclick: (e) => { e.preventDefault(); state.sent = false; state.otp = ''; state.otpVerified = false; state.otpError = ''; kit.render(); }
            }, 'use a different email') : null
        );
    }
    return h('form', { onsubmit: submit, class: 'ds-auth-form' },
        h('label', { class: 'ds-auth-field' },
            h('span', { class: 'ds-auth-field-label' }, 'email'),
            h('input', {
                class: 'input', type: 'email', placeholder: 'you@247420.xyz', value: state.email,
                autocomplete: 'email', required: true, 'aria-required': 'true',
                'aria-invalid': state.emailError ? 'true' : 'false',
                oninput: (e) => { state.email = e.target.value; if (state.emailError) validateEmail(); kit.render(); },
                onblur: () => { validateEmail(); kit.render(); }
            }),
            state.emailError ? h('div', { class: 'ds-auth-error', role: 'alert' }, state.emailError) : null
        ),
        state.mode !== 'magic' && state.mode !== 'reset' ? h('label', { class: 'ds-auth-field' },
            h('span', { class: 'ds-auth-field-label' }, 'password'),
            h('div', { class: 'ds-auth-field-input-row' },
                h('input', {
                    class: 'input', type: state.showPassword ? 'text' : 'password', placeholder: '********',
                    value: state.password, autocomplete: state.mode === 'signup' ? 'new-password' : 'current-password',
                    required: true, 'aria-required': 'true',
                    'aria-invalid': state.passwordError ? 'true' : 'false',
                    oninput: (e) => { state.password = e.target.value; validatePassword(); kit.render(); }
                }),
                h('button', {
                    type: 'button', class: 'ds-icon-btn ds-icon-btn-sm ds-icon-btn-ghost ds-auth-pw-toggle',
                    'aria-pressed': state.showPassword ? 'true' : 'false',
                    'aria-label': state.showPassword ? 'hide password' : 'show password',
                    onclick: (e) => { e.preventDefault(); state.showPassword = !state.showPassword; kit.render(); }
                }, Icon(state.showPassword ? 'eye-off' : 'eye'))
            ),
            state.passwordError ? h('div', { class: 'ds-auth-error', role: 'alert' }, state.passwordError) : null
        ) : null,
        state.mode === 'signin' ? h('div', { class: 'ds-auth-row-between' },
            h('label', { class: 'ds-auth-remember' },
                h('input', { type: 'checkbox', checked: state.remember, onchange: (e) => { state.remember = e.target.checked; } }),
                h('span', { class: 'ds-auth-remember-text' }, 'remember me')
            ),
            h('a', { href: '#reset', onclick: (e) => { e.preventDefault(); setMode('reset'); }, class: 'ds-auth-forgot' }, 'forgot password?')
        ) : null,
        // role=alert so the validation message is announced, not just painted.
        // Suppressed when it duplicates a field-level error already shown
        // inline above (email/password), which is the common submit() path
        // now that both of those validate before submit runs.
        state.error && state.error !== state.emailError && state.error !== state.passwordError
            ? h('div', { class: 'ds-auth-error', role: 'alert' }, state.error) : null,
        // Shows the exact authorize URL this component built, instead of
        // navigating away from the specimen with placeholder credentials.
        // .ds-auth-status, not .ds-auth-error: this is informational, not a
        // failure, and needs a visually distinct channel from a real error —
        // color alone was the only signal before (WCAG 1.4.1).
        state.demoUrl ? h('div', { class: 'ds-auth-status', role: 'status' },
            'demo mode — would open: ' + state.demoUrl) : null,
        // No trailing arrow: this button submits the form in place (state
        // change, no navigation to another page) -- the arrow is reserved
        // for CTAs that take the visitor somewhere else (row links, the
        // hero's GitHub/247420 links).
        h('button', { class: 'btn btn-primary', type: 'submit' },
            state.mode === 'signup' ? 'create account' :
            state.mode === 'magic'  ? 'send magic link' :
            state.mode === 'reset'  ? 'send reset link' : 'sign in'
        ),
        state.mode !== 'reset' ? Divider({ label: 'or' }) : null,
        state.mode !== 'reset' ? h('div', { class: 'ds-auth-providers' },
            Provider({ icon: 'github', label: 'github', provider: 'github' }),
            Provider({ icon: 'google', label: 'google', provider: 'google' }),
            Provider({ icon: 'sso', label: 'sso', provider: 'sso' })
        ) : null
        // The "use a magic link instead" button was removed from here: it was
        // a full-width default button sitting directly under the three OAuth
        // buttons, so it read as a fourth provider, and it duplicated the
        // magic-link entry already present in the mode row below the panel.
        // One control per action.
    );
}

function App() {
    const headings = {
        signin: ['sign in',     'welcome back. pick a provider or use email.'],
        signup: ['create',      'join the 247420 portfolio. one account, every kit.'],
        magic:  ['magic link',  "we'll email you a one-tap sign-in link. no password."],
        reset:  ['reset',       'enter your email to receive a reset link.']
    }[state.mode];
    return AppShell({
        narrow: true,
        topbar: Topbar({ brand: '247420', leaf: 'auth', items: [['index', '../../']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: state.mode === 'signin' ? 'signin' : 'signin · ' + state.mode }),
        main: [
            // .ds-app-surface, not .ds-section: an auth screen is an Operate
            // surface, so its h1 belongs on the app typescale. Under .ds-section
            // the title rendered at the 64px marketing display ceiling (77px
            // measured) and the root carried a 96px editorial margin, which
            // together pushed a 430px card to a 946px scroll height inside a
            // ~514px pane and gave .app-main its own inner scrollbar at every
            // real window height.
            h('div', { class: 'ds-app-surface ds-auth-wrap' },
                h('div', { class: 'ds-auth-col' },
                    Heading({ level: 1, children: headings[0] }),
                    Lede({ children: headings[1] }),
                    Panel({ children: Form() }),
                    // `reset` is a sub-flow of signin, not a fourth mode, so it
                    // marks signin as its origin. Without this the mode row
                    // showed nothing active during reset and offered no route
                    // back — "forgot password?" was a one-way door.
                    h('div', { class: 'ds-auth-modes' },
                        ['signin', 'signup', 'magic'].map((m) =>
                            h('a', { key: m, href: '#' + m,
                                onclick: (e) => { e.preventDefault(); setMode(m); },
                                class: 'ds-auth-mode-link' + ((state.mode === m || (state.mode === 'reset' && m === 'signin')) ? ' ds-auth-mode-link--active' : '')
                            }, m === 'signin' ? (state.mode === 'reset' ? '<- back to sign in' : 'sign in') : m === 'signup' ? 'create account' : 'magic link')
                        )
                    ),
                    h('p', { class: 'ds-auth-fineprint' },
                        'by continuing you agree to the ',
                        Chip({ tone: 'dim', children: 'terms' }), ' and ',
                        Chip({ tone: 'dim', children: 'privacy notice' }), '.'
                    )
                )
            )
        ],
        status: Status({
            left: ['auth', '- ' + state.mode, state.error ? '- error' : '- ok'],
            right: ['247420 / mmxxvi']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '11 Sign in' });
