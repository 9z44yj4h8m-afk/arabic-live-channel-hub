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
- Persist dynamic sections alongside channels in the revision-checked catalog transaction; preserve section slugs and channel source IDs, and move all channels to a chosen destination before soft-deleting a section, so section management cannot orphan content or break old links.
- Parse uploaded CSV/M3U locally using established parsers in channel-import; stage validated, source-deduplicated entries in the protected catalog editor before the existing explicit atomic save, so imports never bypass authorization or overwrite existing channels.
- Keep design settings in site-design modules with strict schemas and separate draft/published rows; writes require the existing password admin session and revision-checked RPC, while public readers can select only published settings, preventing draft leaks and lost concurrent edits.
- Apply published design through a shared provider and scoped CSS variables to PortalPage, Movies and bottom navigation; editor previews use same-origin parent-to-iframe messages without draft URLs or public draft endpoints, preserving real page behavior and original assets.
- Keep AI channel search server-side and validate returned IDs against the supplied catalog so generated channels can never enter the player.
- Keep the AI chat streaming through the /api/chat server route with history stored only in the visitor's browser, so no login or database is needed.
- Resolve each YouTube channel's current live video server-side (resolveYoutubeLive, using youtubeChannelId) and embed by video ID, because YouTube's embed/live_stream?channel= URL shows "video unavailable".
- Keep player behaviour (volume, quality, auto-reconnect with backoff, settings in localStorage) in src/components/live-player.tsx so every page shares one player.
- Ship the site as an installable web app via public/manifest.webmanifest starting on the homepage with no service worker, so installs preserve content choices and never serve stale cached files.
- Keep the shared application PIN in a server secret with a separate encrypted session; guard subscription reads and relay requests server-side, because a hidden view is not access control.
- Keep Xtream metadata separate from the existing channel catalog; administrator-only functions encrypt credentials and synchronize revision-checked provider IDs, while playback relays same-origin upstream media through opaque encrypted links to avoid credential leakage.
- Normalize channel names through the shared display-name module using official IPTV-org alternative names, preserving source IDs and quality suffixes; keep catalog reads paginated so worldwide imports are never truncated.
- Relay streams whose CDN demands a specific Referer through /api/public/hls (host allow-list, playlists rewritten), because browsers cannot set Referer.
- Build the featured-movies list server-side from official YouTube channel searches (getFeaturedMovies, 1h cache, full-length filter) with the hand-picked list in src/lib/movies.ts as fallback.
- Store section display names in category_labels (public read, writes only via the password admin session server function) keyed by fixed section keys, merged over design labels in SiteDesignProvider, so renaming never changes channel categories, slugs or links.
