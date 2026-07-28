import * as webjsx from 'webjsx';
import { Topbar, Crumb, Status, AppShell, Panel, Heading, Lede, Chip, Icon, Divider } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
import { shortUid } from 'ds/uid.js';
const h = webjsx.createElement;

const root = document.getElementById('root');
const state = { mode: 'signin', email: '', password: '', remember: true, sent: false, error: '', loading: null };

function setMode(m) { state.mode = m; state.sent = false; state.error = ''; state.loading = null; kit.render(); }

function submit(e) {
    e.preventDefault();
    // Name the problem and the fix, in the surface's terse lowercase voice.
    // "enter a real email" told the user they were wrong without saying what
    // would be right.
    if (!state.email.trim()) { state.error = 'email is empty — enter the address on your account.'; kit.render(); return; }
    if (!state.email.includes('@')) { state.error = 'that address has no @ — check for a typo.'; kit.render(); return; }
    if (state.mode !== 'magic' && state.mode !== 'reset' && state.password.length < 6) {
        state.error = 'password is too short — 6 characters minimum.'; kit.render(); return;
    }
    state.error = '';
    state.sent = true;
    kit.render();
}

function Provider({ glyph, label, provider }) {
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
        h('span', { class: 'ds-auth-provider-glyph' + (isLoading ? ' ds-spin' : '') }, isLoading ? Icon('refresh') : glyph),
        h('span', {}, isLoading ? 'redirecting...' : label)
    );
}

function startOAuthFlow(provider) {
    const config = {
        github: {
            clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || 'demo-github-client-id',
            redirectUri: window.location.origin + '/auth/callback/github'
        },
        google: {
            clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'demo-google-client-id',
            redirectUri: window.location.origin + '/auth/callback/google'
        },
        sso: {
            endpoint: import.meta.env.VITE_SSO_ENDPOINT || 'https://sso.247420.xyz/authorize',
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
            window.location.href = 'https://github.com/login/oauth/authorize?' + params;
        } else if (provider === 'google') {
            const scopes = ['openid', 'email', 'profile'].join(' ');
            const params = new URLSearchParams({
                client_id: config.clientId,
                redirect_uri: config.redirectUri,
                response_type: 'code',
                scope: scopes,
                state: generateState()
            });
            window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params;
        } else if (provider === 'sso') {
            const params = new URLSearchParams({
                redirect_uri: config.redirectUri,
                state: generateState()
            });
            window.location.href = config.endpoint + '?' + params;
        }
    } catch (err) {
        state.error = 'oauth flow failed: ' + (err.message || 'unknown error');
        state.loading = null;
        kit.render();
    }
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
        return h('div', { class: 'ds-auth-form ds-auth-sent' },
            h('div', { class: 'ds-auth-sent-glyph' }, '[x]'),
            h('p', { class: 'ds-auth-sent-title' }, state.mode === 'magic' ? 'check your email' : (state.mode === 'reset' ? 'reset link sent' : 'welcome back')),
            h('p', { class: 'ds-auth-sent-sub' }, state.mode === 'magic'
                ? 'we sent a sign-in link to ' + state.email + '. it expires in 15 minutes.'
                : (state.mode === 'reset' ? 'we sent a reset link to ' + state.email + '. follow it to set a new password.' : 'signed in. taking you to the index.')),
            waiting ? h('button', {
                class: 'btn',
                onclick: (e) => { e.preventDefault(); state.sent = false; kit.render(); }
            }, 'use a different email') : null
        );
    }
    return h('form', { onsubmit: submit, class: 'ds-auth-form' },
        h('label', { class: 'ds-auth-field' },
            h('span', { class: 'ds-auth-field-label' }, 'email'),
            h('input', { class: 'input', type: 'email', placeholder: 'you@247420.xyz', value: state.email, autocomplete: 'email', oninput: (e) => { state.email = e.target.value; } })
        ),
        state.mode !== 'magic' && state.mode !== 'reset' ? h('label', { class: 'ds-auth-field' },
            h('span', { class: 'ds-auth-field-label' }, 'password'),
            h('input', { class: 'input', type: 'password', placeholder: '********', value: state.password, autocomplete: state.mode === 'signup' ? 'new-password' : 'current-password', oninput: (e) => { state.password = e.target.value; } })
        ) : null,
        state.mode === 'signin' ? h('div', { class: 'ds-auth-row-between' },
            h('label', { class: 'ds-auth-remember' },
                h('input', { type: 'checkbox', checked: state.remember, onchange: (e) => { state.remember = e.target.checked; } }),
                h('span', { class: 'ds-auth-remember-text' }, 'remember me')
            ),
            h('a', { href: '#reset', onclick: (e) => { e.preventDefault(); setMode('reset'); }, class: 'ds-auth-forgot' }, 'forgot password?')
        ) : null,
        // role=alert so the validation message is announced, not just painted.
        state.error ? h('div', { class: 'ds-auth-error', role: 'alert' }, state.error) : null,
        h('button', { class: 'btn btn-primary', type: 'submit' },
            state.mode === 'signup' ? 'create account ->' :
            state.mode === 'magic'  ? 'send magic link ->' :
            state.mode === 'reset'  ? 'send reset link ->' : 'sign in ->'
        ),
        state.mode !== 'reset' ? Divider({ label: 'or' }) : null,
        state.mode !== 'reset' ? h('div', { class: 'ds-auth-providers' },
            Provider({ glyph: 'gh', label: 'github', provider: 'github' }),
            Provider({ glyph: 'g', label: 'google', provider: 'google' }),
            Provider({ glyph: '@', label: 'sso', provider: 'sso' })
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
            h('div', { class: 'ds-section ds-auth-wrap' },
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
