const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const cp = require('node:child_process');
const read = p => fs.readFileSync(p, 'utf8');
const html = read('index.html');
const cleanup = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const legacy = Buffer.from(JSON.stringify({ n: '<img src=x onerror=alert(1)>', b: '20000101', g: 'F', m: 'INTJ' })).toString('base64url');

test('app invitations contain only the app address, never queries or fragments', () => {
    const c = vm.createContext({ URL });
    vm.runInContext(read('js/compat.js') + '\nglobalThis.compat = Compat;', c);
    for (const suffix of ['', '?invite=' + legacy, '?name=PRIVATE&birth=20000101#INTJ', '#invite=secret']) {
        assert.equal(c.compat.inviteUrl('https://example.test/destiny/' + suffix), 'https://example.test/destiny/');
    }
    assert.equal(c.compat.readInvite, undefined);
    assert.doesNotMatch(read('js/compat.js'), /atob|btoa|TextDecoder|TextEncoder/);
});

test('legacy, duplicate, empty, encoded-key and malformed invitations are stripped without interpretation', () => {
    for (const search of ['?invite=' + legacy, '?invite=', '?invite=%ZZ', '?invite=one&invite=two', '?%69nvite=secret&name=PRIVATE']) {
        let replaced;
        const c = vm.createContext({ URLSearchParams, window: {}, location: { search, pathname: '/destiny/', hash: '#secret' }, history: { replaceState: (...args) => { replaced = args; } } });
        vm.runInContext(cleanup, c);
        assert.equal(c.window.destinyLegacyInvite, true);
        assert.deepEqual(replaced, [null, '', '/destiny/']);
        assert.deepEqual(Object.keys(c.window), ['destinyLegacyInvite']);
    }
});

test('ordinary visits are unchanged and unavailable history does not break startup', () => {
    const c = vm.createContext({ URLSearchParams, window: {}, location: { search: '?other=1', pathname: '/destiny/' }, history: { replaceState: () => { throw Error('should not call'); } } });
    vm.runInContext(cleanup, c);
    assert.equal(c.window.destinyLegacyInvite, false);
    c.location.search = '?invite=x';
    assert.doesNotThrow(() => vm.runInContext(cleanup, c));
    assert.ok(html.indexOf('name="referrer" content="no-referrer"') < html.indexOf('<script>'));
    assert.ok(html.indexOf('history.replaceState') < html.indexOf('<link'));
});

test('no invitation autofill remains; sharing invitation does not read the user profile', () => {
    const app = read('js/app.js');
    const handler = app.split("$('btnInvite').addEventListener('click', () => {")[1].split("$('btnShareCompat')")[0];
    assert.doesNotMatch(handler, /state\.user|\.name|\.birth|\.gender|\.mbti/);
    assert.doesNotMatch(app, /state\.invite|readInvite/);
    assert.match(app, /inviteBanner'\)\.textContent/);
    assert.match(html, /id="rememberMe" checked/);
});

test('manual compatibility and user keys exactly match previous revision', () => {
    const dependencies = ['js/vendor/korean-lunar-calendar.min.js', 'js/engine.js', 'js/saju.js', 'js/data/saju-data.js', 'js/data/fortune-data.js', 'js/fortune.js'];
    const current = vm.createContext({});
    const baseline = vm.createContext({});
    for (const file of dependencies) {
        const code = read(file);
        vm.runInContext(code, current); vm.runInContext(code, baseline);
    }
    vm.runInContext(read('js/compat.js'), current);
    vm.runInContext(cp.execFileSync('git', ['show', 'ea9c06be9e5468d97acb4425800c1abb68ba354c:js/compat.js'], { encoding: 'utf8' }), baseline);
    const expr = `JSON.stringify([Compat.compute({name:'테스트 A',birth:'19900101',gender:'F',mbti:'INTJ',time:''},{name:'테스트 B',birth:'19920202',gender:'M',mbti:'ENFP',time:''}),Fortune.userKey({name:'테스트 A',birth:'19900101',gender:'F',mbti:'INTJ',time:''})])`;
    assert.equal(vm.runInContext(expr, current), vm.runInContext(expr, baseline));
});

test('service worker strips legacy query before network and cache', async () => {
    const handlers = {}; let fetched, cached;
    const response = { ok: true, clone() { return this; } };
    const c = vm.createContext({ URL, Request, self: { location: { origin: 'https://example.test' }, addEventListener: (name, fn) => handlers[name] = fn }, fetch: async req => { fetched = req; return response; }, caches: { open: async () => ({ put: req => { cached = req; } }) } });
    vm.runInContext(read('sw.js'), c);
    let completion;
    handlers.fetch({ request: new Request('https://example.test/destiny/?invite=' + legacy), respondWith: promise => completion = promise });
    await completion; await Promise.resolve();
    assert.equal(fetched.url, 'https://example.test/destiny/');
    assert.equal(fetched.referrerPolicy, 'no-referrer');
    assert.equal(cached.url, 'https://example.test/destiny/');
});

test('new service worker precaches required scripts/styles before activation', () => {
    const c = vm.createContext({ self: { addEventListener() {} } });
    vm.runInContext(read('sw.js') + '\nglobalThis.shell = APP_SHELL;', c);
    for (const match of html.matchAll(/<script src="([^"]+)"/g)) assert.ok(c.shell.includes('./' + match[1]), match[1]);
    assert.ok(c.shell.includes('./css/style.css'));
    assert.doesNotMatch(read('sw.js').split("self.addEventListener('activate'")[0], /\.catch/);
});

test('legacy navigation still falls back to app shell offline', async () => {
    const handlers = {}; const fallback = { appShell: true }; let completion;
    const c = vm.createContext({ URL, Request, self: { location: { origin: 'https://example.test' }, addEventListener: (name, fn) => handlers[name] = fn }, fetch: async () => { throw Error('offline'); }, caches: { match: async key => key === './index.html' ? fallback : undefined } });
    vm.runInContext(read('sw.js'), c);
    handlers.fetch({ request: { url: 'https://example.test/destiny/?invite=private', method: 'GET', mode: 'navigate' }, respondWith: promise => completion = promise });
    assert.equal(await completion, fallback);
});
