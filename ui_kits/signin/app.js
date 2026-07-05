import * as webjsx from 'webjsx';
import { Topbar, Crumb, Status, AppShell, Panel, Heading, Lede, Chip, Icon } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const root = document.getElementById('root');
const state = { mode: 'signin', email: '', password: '', remember: true, sent: false, error: '', loading: null };

function setMode(m) { state.mode = m; state.sent = false; state.error = ''; state.loading = null; kit.render(); }

function submit(e) {
    e.preventDefault();
    if (!state.email.includes('@')) { state.error = 'enter a real email.'; kit.render(); return; }
    if (state.mode !== 'magic' && state.password.length < 6) { state.error = 'password must be at least 6 characters.'; kit.render(); return; }
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
        nonce: Math.random().toString(36).slice(2),
        timestamp: Date.now()
    }));
}

function Form() {
    if (state.sent) {
        return h('div', { class: 'ds-auth-form ds-auth-sent' },
            h('div', { class: 'ds-auth-sent-glyph' }, '[x]'),
            h('p', { class: 'ds-auth-sent-title' }, state.mode === 'magic' ? 'check your email' : (state.mode === 'reset' ? 'reset link sent' : 'welcome back')),
            h('p', { class: 'ds-auth-sent-sub' }, state.mode === 'magic' ? 'we sent a sign-in link to ' + state.email : (state.mode === 'reset' ? 'follow the link to set a new password.' : 'redirecting...'))
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
        state.error ? h('div', { class: 'ds-auth-error' }, state.error) : null,
        h('button', { class: 'btn btn-primary', type: 'submit' },
            state.mode === 'signup' ? 'create account ->' :
            state.mode === 'magic'  ? 'send magic link ->' :
            state.mode === 'reset'  ? 'send reset link ->' : 'sign in ->'
        ),
        state.mode !== 'reset' ? h('div', { class: 'ds-auth-divider' },
            h('div', { class: 'ds-auth-divider-line' }),
            h('span', {}, 'or'),
            h('div', { class: 'ds-auth-divider-line' })
        ) : null,
        state.mode !== 'reset' ? h('div', { class: 'ds-auth-providers' },
            Provider({ glyph: 'gh', label: 'github', provider: 'github' }),
            Provider({ glyph: 'g', label: 'google', provider: 'google' }),
            Provider({ glyph: '@', label: 'sso', provider: 'sso' })
        ) : null,
        state.mode !== 'reset' && state.mode !== 'magic' ? h('button', { class: 'btn', onclick: (e) => { e.preventDefault(); setMode('magic'); } }, 'use a magic link instead') : null
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
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'signin · ' + state.mode }),
        main: [
            h('div', { class: 'ds-section ds-auth-wrap' },
                h('div', { class: 'ds-auth-col' },
                    Heading({ level: 1, children: headings[0] }),
                    Lede({ children: headings[1] }),
                    Panel({ children: Form() }),
                    h('div', { class: 'ds-auth-modes' },
                        ['signin', 'signup', 'magic'].map((m) =>
                            h('a', { key: m, href: '#' + m,
                                onclick: (e) => { e.preventDefault(); setMode(m); },
                                class: 'ds-auth-mode-link' + (state.mode === m ? ' ds-auth-mode-link--active' : '')
                            }, m === 'signin' ? 'sign in' : m === 'signup' ? 'create account' : 'magic link')
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
