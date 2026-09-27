(function () {
  'use strict';

  const prefetched = new Set();
  const pending = new Set();

  // --- Get current playlist ID from URL ---
  const getPlaylistId = () => {
    try {
      return new URL(location.href).searchParams.get('list');
    } catch (e) {
      return null;
    }
  };

  // --- Warm the HTTP cache for a video URL ---
  const prefetchVideo = (videoId, playlistId) => {
    if (!videoId || prefetched.has(videoId)) return;
    prefetched.add(videoId);

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'document';
    link.href = `/watch?v=${videoId}${playlistId ? `&list=${playlistId}` : ''}`;
    document.head.appendChild(link);

    // Also warm the player API endpoint for that video
    const apiLink = document.createElement('link');
    apiLink.rel = 'prefetch';
    apiLink.href = `/youtubei/v1/player?videoId=${videoId}`;
    document.head.appendChild(apiLink);
  };

  // --- Prefetch neighbours of the currently playing video in a playlist ---
  const prefetchPlaylistNeighbours = () => {
    const playlistId = getPlaylistId();
    if (!playlistId) return;

    const items = document.querySelectorAll(
      'ytd-playlist-panel-video-renderer, ytd-playlist-video-renderer'
    );
    if (!items.length) return;

    const currentId = new URL(location.href).searchParams.get('v');
    const ids = [];
    items.forEach((el) => {
      const id =
        el.getAttribute('video-id') ||
        el.querySelector('a#wc-endpoint')?.href?.match(/[?&]v=([^&]+)/)?.[1];
      if (id) ids.push(id);
    });

    const idx = ids.indexOf(currentId);
    if (idx === -1) {
      // Not sure where we are; prefetch the first few
      ids.slice(0, 3).forEach((id) => prefetchVideo(id, playlistId));
      return;
    }

    // Prefetch 2 ahead and 1 behind
    [ids[idx + 1], ids[idx + 2], ids[idx - 1]].forEach((id) => {
      if (id) prefetchVideo(id, playlistId);
    });
  };

  // --- Prefetch a whole playlist page (for the sidebar list) ---
  // Triggered when the user hovers a playlist link.
  const prefetchPlaylistData = async (playlistId) => {
    if (!playlistId || pending.has(playlistId)) return;
    pending.add(playlistId);

    try {
      const res = await fetch('/youtubei/v1/browse?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Youtube-Client-Name': '1',
          'X-Youtube-Client-Version': '2.20240101.00.00'
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20240101.00.00',
              hl: navigator.language?.split('-')[0] || 'en',
              gl: 'US'
            }
          },
          browseId: playlistId.startsWith('VL') ? playlistId : `VL${playlistId}`,
          params: 'wgYCCAA%3D'
        }),
        credentials: 'include'
      });
      // Don't need the body; the browser cache now holds it.
      // Consume it so the connection is freed.
      await res.arrayBuffer();
    } catch (e) {
      // Network failure — ignore, this is best-effort
    }
  };

  // --- Hover listener: prefetch playlist data before click ---
  const onHover = (e) => {
    const link = e.target.closest?.('a[href*="list="]');
    if (!link) return;
    try {
      const id = new URL(link.href).searchParams.get('list');
      if (id) prefetchPlaylistData(id);
    } catch (err) {}
  };
  document.addEventListener('mouseover', onHover, { passive: true, capture: true });

  // --- On SPA navigation, prefetch playlist neighbours ---
  const runNeighbours = () => {
    // Wait for the playlist panel to render
    setTimeout(prefetchPlaylistNeighbours, 800);
    setTimeout(prefetchPlaylistNeighbours, 2500);
  };

  // Hook SPA navigation
  const hookNavigation = () => {
    const fire = () => runNeighbours();
    window.addEventListener('yt-navigate-finish', fire);
    window.addEventListener('yt-page-data-updated', fire);
    window.addEventListener('popstate', fire);
    fire(); // initial load
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookNavigation, { once: true });
  } else {
    hookNavigation();
  }

  // --- Prefetch the current playlist's first N items on initial load ---
  const bootPrefetch = () => {
    const playlistId = getPlaylistId();
    if (!playlistId) return;
    // Prefetch the playlist browse data itself (cached for sidebar rendering)
    prefetchPlaylistData(playlistId);
    runNeighbours();
  };
  document.addEventListener('DOMContentLoaded', bootPrefetch, { once: true });
})();