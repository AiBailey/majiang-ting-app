// 麻将听牌计算器 · 离线缓存
// 页面用「网络优先」（联网时总是拿到最新版），图标等静态资源用「缓存优先」。
// 注意：index.html 每次联网都会重新拉取，改了它无需改这里；改了跳转页或图标才需要把 CACHE 版本号 +1。
const CACHE = 'mahjong-ting-v3';

const SHELL = [
    './index.html',
    './mahjong-ting-calculator.html',
    './manifest.json',
    './favicon-32.png',
    './icon-192.png',
    './icon-512.png',
    './icon-maskable-512.png',
    './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

function isDocumentRequest(request) {
    if (request.mode === 'navigate') return true;
    try {
        return /\.html?$/.test(new URL(request.url).pathname);
    } catch (e) {
        return false;
    }
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    if (isDocumentRequest(request)) {
        // 网络优先，离线回落到缓存
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
                    return response;
                })
                .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')))
        );
        return;
    }

    // 缓存优先
    event.respondWith(
        caches.match(request).then((hit) => {
            if (hit) return hit;
            return fetch(request).then((response) => {
                const copy = response.clone();
                caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
                return response;
            });
        })
    );
});
