// 별빛 나침반 서비스 워커: 앱 설치(홈 화면에 추가)와 오프라인 열기를 돕는다.
// 파일을 바꿔도 새 버전을 먼저 받아 오므로 보통은 CACHE_VERSION을 올릴 필요가 없다.
const CACHE_VERSION = 'destiny-v5';
// 같은 주소(gmlduqzhd123-lab.github.io)의 다른 앱들과 저장소를 함께 쓰므로, 이 앱의 이전 캐시만 지운다.
const CACHE_PREFIX = 'destiny-v';
const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./ys-install.js",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/apple-touch-icon.png",
    "./js/app.js",
    "./js/compat.js",
    "./js/data/extra-data.js",
    "./js/data/fortune-data.js",
    "./js/data/saju-data.js",
    "./js/data/tarot-data.js",
    "./js/engine.js",
    "./js/fortune.js",
    "./js/journal.js",
    "./js/keepsake.js",
    "./js/saju.js",
    "./js/tarot.js",
    "./js/vendor/korean-lunar-calendar.min.js",
    "./css/style.css",
    "./fonts/pretendard/pretendardvariable-dynamic-subset.css"
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION).map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

// 우리 사이트 파일만: 새 버전을 먼저 받아 오고, 인터넷이 없으면 저장해 둔 것을 보여준다
self.addEventListener('fetch', event => {
    let request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    // Do not forward/cache legacy invitation query values once this worker controls the page.
    if (url.searchParams.has('invite')) {
        url.search = '';
        url.hash = '';
        request = new Request(url.href, { credentials: 'same-origin', referrerPolicy: 'no-referrer' });
    }
    event.respondWith(
        fetch(request)
            .then(response => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
                }
                return response;
            })
            .catch(() => caches.match(request, { ignoreSearch: true })
                .then(cached => cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
});
