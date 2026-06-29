// Zenify Service Worker — Audio Cache on Play
// Caches audio files as they are played so they're available offline.
// Only intercepts /api/audio/* and /api/local-audio/* requests.

const AUDIO_CACHE = "zenify-audio-v1";
const COVER_CACHE = "zenify-covers-v1";

// Max cache size in bytes (2 GB default — adjustable)
const MAX_CACHE_BYTES = 2 * 1024 * 1024 * 1024;

// Patterns to cache
const AUDIO_PATTERN = /^\/api\/(audio|local-audio)\//;
const COVER_PATTERN = /^\/api\/cover\//;

// Install: activate immediately without waiting
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Activate: claim all clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch: cache-first for audio and covers, network-first for everything else
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  if (AUDIO_PATTERN.test(url.pathname)) {
    event.respondWith(handleAudioRequest(event.request));
  } else if (COVER_PATTERN.test(url.pathname)) {
    event.respondWith(handleCoverRequest(event.request));
  }
  // Everything else falls through to the network (default browser behavior)
});

// Audio: cache-first strategy. If cached, serve from cache. Otherwise fetch,
// cache the full response for next time, and return it.
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE);

  // For range requests, check if we have the full resource cached.
  // If so, we can satisfy range requests from the cached full response.
  const cacheKey = stripRange(request);
  const cached = await cache.match(cacheKey);

  if (cached) {
    // If this is a range request, slice the cached response
    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      return handleRangeFromCache(cached, rangeHeader);
    }
    return cached;
  }

  // Not cached — fetch the stream directly from network to ensure instant playback (fast TTFB).
  // In the background, request the full audio file with X-Full-Audio header to populate the offline cache.
  try {
    const streamResponse = await fetch(request);

    // Run full caching in the background without blocking the active audio stream
    const fullHeaders = filterHeaders(request.headers, ["range"]);
    fullHeaders.set("X-Full-Audio", "1");
    const fullRequest = new Request(cacheKey.url, {
      method: "GET",
      headers: fullHeaders,
    });

    fetch(fullRequest).then(res => {
      if (res.status === 200) {
        cache.put(cacheKey, res.clone()).then(() => evictIfNeeded());
      }
    }).catch(() => {});

    return streamResponse;
  } catch (err) {
    // Network failed and no cache — return offline error
    return new Response("Audio not available offline", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

// Covers: cache-first, simpler since no range requests
async function handleCoverRequest(request) {
  const cache = await caches.open(COVER_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Cover not available offline", { status: 503 });
  }
}

// Create a key without the Range header so we store/lookup the full resource
function stripRange(request) {
  return new Request(request.url, {
    method: request.method,
    headers: filterHeaders(request.headers, ["range"]),
  });
}

// Filter out specific headers
function filterHeaders(headers, remove) {
  const filtered = new Headers();
  for (const [key, value] of headers.entries()) {
    if (!remove.includes(key.toLowerCase())) {
      filtered.set(key, value);
    }
  }
  return filtered;
}

// Serve a byte range from a cached full response
async function handleRangeFromCache(cachedResponse, rangeHeader) {
  const body = await cachedResponse.arrayBuffer();
  const total = body.byteLength;
  const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  const start = match ? parseInt(match[1], 10) : 0;
  const end = match && match[2] ? parseInt(match[2], 10) : total - 1;
  const slice = body.slice(start, end + 1);

  return new Response(slice, {
    status: 206,
    headers: {
      "Content-Type": cachedResponse.headers.get("Content-Type") || "application/octet-stream",
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(slice.byteLength),
    },
  });
}

// Serve a byte range from a fresh network fetch (full response)
async function handleRangeFromFetch(response, rangeHeader) {
  const body = await response.arrayBuffer();
  const total = body.byteLength;
  const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  const start = match ? parseInt(match[1], 10) : 0;
  const end = match && match[2] ? parseInt(match[2], 10) : total - 1;
  const slice = body.slice(start, end + 1);

  return new Response(slice, {
    status: 206,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(slice.byteLength),
    },
  });
}

// Evict oldest entries if cache exceeds MAX_CACHE_BYTES.
// Uses a simple LRU-style: delete oldest entries first.
async function evictIfNeeded() {
  const cache = await caches.open(AUDIO_CACHE);
  const keys = await cache.keys();

  let totalSize = 0;
  const entries = [];

  for (const request of keys) {
    const response = await cache.match(request);
    if (!response) continue;
    const blob = await response.clone().blob();
    entries.push({ request, size: blob.size });
    totalSize += blob.size;
  }

  // Evict oldest (first inserted) entries until under the limit
  while (totalSize > MAX_CACHE_BYTES && entries.length > 0) {
    const oldest = entries.shift();
    if (oldest) {
      await cache.delete(oldest.request);
      totalSize -= oldest.size;
    }
  }
}

// Listen for messages from the app (cache management)
self.addEventListener("message", async (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case "GET_CACHE_STATS": {
      const cache = await caches.open(AUDIO_CACHE);
      const keys = await cache.keys();
      let totalSize = 0;
      const tracks = [];

      for (const request of keys) {
        const response = await cache.match(request);
        if (!response) continue;
        const blob = await response.clone().blob();
        const url = new URL(request.url);
        tracks.push({
          url: url.pathname,
          size: blob.size,
        });
        totalSize += blob.size;
      }

      event.source.postMessage({
        type: "CACHE_STATS",
        payload: { totalSize, trackCount: tracks.length, tracks },
      });
      break;
    }

    case "CLEAR_AUDIO_CACHE": {
      await caches.delete(AUDIO_CACHE);
      event.source.postMessage({ type: "CACHE_CLEARED" });
      break;
    }

    case "DELETE_CACHED_TRACK": {
      if (payload?.url) {
        const cache = await caches.open(AUDIO_CACHE);
        const keys = await cache.keys();
        for (const req of keys) {
          if (new URL(req.url).pathname === payload.url) {
            await cache.delete(req);
            break;
          }
        }
        event.source.postMessage({ type: "TRACK_DELETED", payload: { url: payload.url } });
      }
      break;
    }

    default:
      break;
  }
});
