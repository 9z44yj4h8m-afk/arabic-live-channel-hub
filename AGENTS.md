<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture

- Keep home, live broadcasts and category views explicit in PortalPage, with AppBottomNav shared by channel and movie pages, so the homepage never mounts a player or content lists and each navigation button opens its own section.

- Keep src/lib/channels.ts as the seed; all live views and AI consumers resolve the shared persisted catalog through channel-catalog modules, so administrator changes cannot leave stale static lists. Preserve existing deep links and section slugs.
- Keep /manage-channels unlinked and noindexed; its public password shell reads and saves only through server functions that verify an encrypted HTTP-only session against the server-secret password version before loading the privileged client, because a hidden URL is not authorization. Retain CSRF protection and atomic catalog saving.
- Save the entire channel catalog atomically with a revision check and soft deletion, so restoration preserves order and concurrent editors cannot silently overwrite each other.
- Keep AI channel search server-side and validate returned IDs against the supplied catalog so generated channels can never enter the player.
- Keep the AI chat streaming through the /api/chat server route with history stored only in the visitor's browser, so no login or database is needed.
- Resolve each YouTube channel's current live video server-side (resolveYoutubeLive, using youtubeChannelId) and embed by video ID, because YouTube's embed/live_stream?channel= URL shows "video unavailable".
- Keep player behaviour (volume, quality, auto-reconnect with backoff, settings in localStorage) in src/components/live-player.tsx so every page shares one player.
- Ship the site as an installable web app via public/manifest.webmanifest (start_url /live) with no service worker, so installs never serve stale cached files.
- Relay streams whose CDN demands a specific Referer through /api/public/hls (host allow-list, playlists rewritten), because browsers cannot set Referer.
- Build the featured-movies list server-side from official YouTube channel searches (getFeaturedMovies, 1h cache, full-length filter) with the hand-picked list in src/lib/movies.ts as fallback.
