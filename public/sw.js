if (!self.define) {
    let e,
        s = {};
    const i = (i, n) => (
        (i = new URL(i + ".js", n).href),
        s[i] ||
            new Promise((s) => {
                if ("document" in self) {
                    const e = document.createElement("script");
                    (e.src = i), (e.onload = s), document.head.appendChild(e);
                } else (e = i), importScripts(i), s();
            }).then(() => {
                let e = s[i];
                if (!e) throw new Error(`Module ${i} didn’t register its module`);
                return e;
            })
    );
    self.define = (n, t) => {
        const c = e || ("document" in self ? document.currentScript.src : "") || location.href;
        if (s[c]) return;
        let a = {};
        const o = (e) => i(e, c),
            r = { module: { uri: c }, exports: a, require: o };
        s[c] = Promise.all(n.map((e) => r[e] || o(e))).then((e) => (t(...e), a));
    };
}
define(["./workbox-4754cb34"], function (e) {
    "use strict";
    importScripts(),
        self.skipWaiting(),
        e.clientsClaim(),
        e.precacheAndRoute(
            [
                { url: "/_next/app-build-manifest.json", revision: "1d01d09b7f246af8bd34ce66526f20fa" },
                { url: "/_next/static/chunks/191-974e8e9f7f648cfb.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/318-19b72d0131c148cf.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/494-5131f0b3398bc342.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/4bd1b696-16382627bb8db231.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/517-7087a67fa09dd2d8.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/815-f38d85d318069a1f.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/app/_not-found/page-4143de369cab8df6.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/app/host/page-0c1aa5252e83a6c0.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/app/join/page-c2e4312b6697b170.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/app/layout-74e1df4462780a4f.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/app/page-3bfce167089fa617.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/framework-0d635b52335dc518.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/main-a433fb73f58a529a.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/main-app-b4d99712fc544fe9.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/pages/_app-d23763e3e6c904ff.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/pages/_error-9b7125ad1a1e68fa.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/chunks/polyfills-42372ed130431b0a.js", revision: "846118c33b2c0e922d7b3a7676f81f6f" },
                { url: "/_next/static/chunks/webpack-959132df112c83f6.js", revision: "hcxPlR1sJgoHyYiUwMMAL" },
                { url: "/_next/static/css/58801eb70d09464d.css", revision: "58801eb70d09464d" },
                { url: "/_next/static/css/c8cc940626592c13.css", revision: "c8cc940626592c13" },
                { url: "/_next/static/hcxPlR1sJgoHyYiUwMMAL/_buildManifest.js", revision: "0aa897fa0112a8a492fb85e195a23f5f" },
                { url: "/_next/static/hcxPlR1sJgoHyYiUwMMAL/_ssgManifest.js", revision: "b6652df95db52feb4daf4eca35380933" },
                { url: "/_next/static/media/26a46d62cd723877-s.woff2", revision: "befd9c0fdfa3d8a645d5f95717ed6420" },
                { url: "/_next/static/media/55c55f0601d81cf3-s.woff2", revision: "43828e14271c77b87e3ed582dbff9f74" },
                { url: "/_next/static/media/581909926a08bbc8-s.woff2", revision: "f0b86e7c24f455280b8df606b89af891" },
                { url: "/_next/static/media/6d93bde91c0c2823-s.woff2", revision: "621a07228c8ccbfd647918f1021b4868" },
                { url: "/_next/static/media/97e0cb1ae144a2a9-s.woff2", revision: "e360c61c5bd8d90639fd4503c829c2dc" },
                { url: "/_next/static/media/a34f9d1faa5f3315-s.p.woff2", revision: "d4fe31e6a2aebc06b8d6e558c9141119" },
                { url: "/_next/static/media/df0a9ae256c0569c-s.woff2", revision: "d54db44de5ccb18886ece2fda72bdfe0" }
            ],
            { ignoreURLParametersMatching: [] }
        ),
        e.cleanupOutdatedCaches(),
        e.registerRoute("/", new e.NetworkFirst({ cacheName: "start-url", plugins: [{ cacheWillUpdate: async ({ request: e, response: s, event: i, state: n }) => (s && "opaqueredirect" === s.type ? new Response(s.body, { status: 200, statusText: "OK", headers: s.headers }) : s) }] }), "GET"),
        e.registerRoute(/^https:\/\/fonts\.(?:gstatic)\.com\/.*/i, new e.CacheFirst({ cacheName: "google-fonts-webfonts", plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 })] }), "GET"),
        e.registerRoute(/^https:\/\/fonts\.(?:googleapis)\.com\/.*/i, new e.StaleWhileRevalidate({ cacheName: "google-fonts-stylesheets", plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 })] }), "GET"),
        e.registerRoute(/\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i, new e.StaleWhileRevalidate({ cacheName: "static-font-assets", plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 })] }), "GET"),
        e.registerRoute(/\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i, new e.StaleWhileRevalidate({ cacheName: "static-image-assets", plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 })] }), "GET"),
        e.registerRoute(/\/_next\/image\?url=.+$/i, new e.StaleWhileRevalidate({ cacheName: "next-image", plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 })] }), "GET"),
        e.registerRoute(/\.(?:mp3|wav|ogg)$/i, new e.CacheFirst({ cacheName: "static-audio-assets", plugins: [new e.RangeRequestsPlugin(), new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })] }), "GET"),
        e.registerRoute(/\.(?:mp4)$/i, new e.CacheFirst({ cacheName: "static-video-assets", plugins: [new e.RangeRequestsPlugin(), new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })] }), "GET"),
        e.registerRoute(/\.(?:js)$/i, new e.StaleWhileRevalidate({ cacheName: "static-js-assets", plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })] }), "GET"),
        e.registerRoute(/\.(?:css|less)$/i, new e.StaleWhileRevalidate({ cacheName: "static-style-assets", plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })] }), "GET"),
        e.registerRoute(/\/_next\/data\/.+\/.+\.json$/i, new e.StaleWhileRevalidate({ cacheName: "next-data", plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })] }), "GET"),
        e.registerRoute(/\.(?:json|xml|csv)$/i, new e.NetworkFirst({ cacheName: "static-data-assets", plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })] }), "GET"),
        e.registerRoute(
            ({ url: e }) => {
                if (!(self.origin === e.origin)) return !1;
                const s = e.pathname;
                return !s.startsWith("/api/auth/") && !!s.startsWith("/api/");
            },
            new e.NetworkFirst({ cacheName: "apis", networkTimeoutSeconds: 10, plugins: [new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 })] }),
            "GET"
        ),
        e.registerRoute(
            ({ url: e }) => {
                if (!(self.origin === e.origin)) return !1;
                return !e.pathname.startsWith("/api/");
            },
            new e.NetworkFirst({ cacheName: "others", networkTimeoutSeconds: 10, plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })] }),
            "GET"
        ),
        e.registerRoute(({ url: e }) => !(self.origin === e.origin), new e.NetworkFirst({ cacheName: "cross-origin", networkTimeoutSeconds: 10, plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 })] }), "GET");
});
