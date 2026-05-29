import * as webjsx from 'webjsx';
import { Topbar, Crumb, Status, AppShell, Panel, Heading, Lede, Chip } from 'ds/components.js';
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
        class: 'btn',
        style: 'flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px' + (isLoading ? ';opacity:0.7;pointer-events:none' : ''),
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
        h('span', { style: 'font-family:var(--ff-mono);color:var(--panel-text-3)' }, isLoading ? '⟳' : glyph),
        h('span', {}, isLoading ? 'redirecting…' : label)
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
        return h('div', { style: 'padding:18px;display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center' },
            h('div', { style: 'font-size:32px;color:var(--panel-accent)' }, '[x]'),
            h('p', { style: 'margin:0;font-weight:600' }, state.mode === 'magic' ? 'check your email' : (state.mode === 'reset' ? 'reset link sent' : 'welcome back')),
            h('p', { style: 'margin:0;color:var(--panel-text-2)' }, state.mode === 'magic' ? 'we sent a sign-in link to ' + state.email : (state.mode === 'reset' ? 'follow the link to set a new password.' : 'redirecting…'))
        );
    }
    return h('form', { onsubmit: submit, style: 'padding:18px;display:flex;flex-direction:column;gap:10px' },
        h('label', { style: 'display:flex;flex-direction:column;gap:4px' },
            h('span', { style: 'font-family:var(--ff-mono);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:var(--panel-text-3)' }, 'email'),
            h('input', { class: 'input', type: 'email', placeholder: 'you@247420.xyz', value: state.email, autocomplete: 'email', oninput: (e) => { state.email = e.target.value; } })
        ),
        state.mode !== 'magic' && state.mode !== 'reset' ? h('label', { style: 'display:flex;flex-direction:column;gap:4px' },
            h('span', { style: 'font-family:var(--ff-mono);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:var(--panel-text-3)' }, 'password'),
            h('input', { class: 'input', type: 'password', placeholder: '••••••••', value: state.password, autocomplete: state.mode === 'signup' ? 'new-password' : 'current-password', oninput: (e) => { state.password = e.target.value; } })
        ) : null,
        state.mode === 'signin' ? h('div', { style: 'display:flex;align-items:center;justify-content:space-between' },
            h('label', { style: 'display:flex;align-items:center;gap:6px;cursor:pointer' },
                h('input', { type: 'checkbox', checked: state.remember, onchange: (e) => { state.remember = e.target.checked; } }),
                h('span', { style: 'color:var(--panel-text-2);font-size:13px' }, 'remember me')
            ),
            h('a', { href: '#reset', onclick: (e) => { e.preventDefault(); setMode('reset'); }, style: 'font-size:13px' }, 'forgot password?')
        ) : null,
        state.error ? h('div', { style: 'padding:8px 10px;background:var(--panel-1);border-radius:8px;color:var(--danger);font-size:13px' }, state.error) : null,
        h('button', { class: 'btn btn-primary', type: 'submit' },
            state.mode === 'signup' ? 'create account ->' :
            state.mode === 'magic'  ? 'send magic link ->' :
            state.mode === 'reset'  ? 'send reset link ->' : 'sign in ->'
        ),
        state.mode !== 'reset' ? h('div', { style: 'display:flex;align-items:center;gap:10px;margin:6px 0;color:var(--panel-text-3);font-size:12px' },
            h('div', { style: 'flex:1;height:1px;background:var(--panel-2)' }),
            h('span', {}, 'or'),
            h('div', { style: 'flex:1;height:1px;background:var(--panel-2)' })
        ) : null,
        state.mode !== 'reset' ? h('div', { style: 'display:flex;gap:8px' },
            Provider({ glyph: '◆', label: 'github', provider: 'github' }),
            Provider({ glyph: '◇', label: 'google', provider: 'google' }),
            Provider({ glyph: '✦', label: 'sso', provider: 'sso' })
        ) : null,
        state.mode !== 'reset' && state.mode !== 'magic' ? h('button', { class: 'btn', onclick: (e) => { e.preventDefault(); setMode('magic'); } }, 'use a magic link instead') : null
    );
}

function App() {
    const headings = {
        signin: ['sign in',     'welcome back. pick a provider or use email.'],
        signup: ['create',      'join the 247420 portfolio. one account, every kit.'],
        magic:  ['magic link',  'we’ll email you a one-tap sign-in link. no password.'],
        reset:  ['reset',       'enter your email to receive a reset link.']
    }[state.mode];
    return AppShell({
        narrow: true,
        topbar: Topbar({ brand: '247420', leaf: 'auth', items: [['index', '../../']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'signin · ' + state.mode }),
        main: [
            h('div', { class: 'ds-section', style: 'padding:8px;display:flex;flex-direction:column;align-items:center' },
                h('div', { style: 'width:100%;max-width:440px;display:flex;flex-direction:column;gap:8px;margin:24px 0' },
                    Heading({ level: 1, children: headings[0] }),
                    Lede({ children: headings[1] }),
                    Panel({ children: Form() }),
                    h('div', { style: 'display:flex;justify-content:center;gap:14px;margin-top:8px;font-size:13px' },
                        ['signin', 'signup', 'magic'].map((m) =>
                            h('a', { key: m, href: '#' + m,
                                onclick: (e) => { e.preventDefault(); setMode(m); },
                                style: 'color:' + (state.mode === m ? 'var(--panel-text)' : 'var(--panel-text-3)') + ';text-decoration:' + (state.mode === m ? 'underline' : 'none')
                            }, m === 'signin' ? 'sign in' : m === 'signup' ? 'create account' : 'magic link')
                        )
                    ),
                    h('p', { style: 'text-align:center;font-size:12px;color:var(--panel-text-3);margin:6px 0' },
                        'by continuing you agree to the ',
                        Chip({ tone: 'dim', children: 'terms' }), ' and ',
                        Chip({ tone: 'dim', children: 'privacy notice' }), '.'
                    )
                )
            )
        ],
        status: Status({
            left: ['auth', '• ' + state.mode, state.error ? '• error' : '• ok'],
            right: ['247420 / mmxxvi']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '11 Sign in' });
