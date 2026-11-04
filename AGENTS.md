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

- The browser extension lives in `extension/` and is packaged into `public/ai-video-radar.zip`; keep its dependencies bundled so classification works offline.
- Creator classification is shared through a plain browser-safe script, with blocklist precedence and Kagi matches restricted to stable channel IDs or handles to avoid display-name collisions.
- Kagi list snapshots include source revision and retrieval date; refresh them only when rebuilding the extension, not at runtime.
- Official AI disclosure detection reads exact labels from YouTube disclosure/badge UI already present on the page, never arbitrary title text or background watch-page requests; disclosure matches take priority over creator lists.
- Text warnings use bounded local artifact matching on displayed title/description nodes and user-opened transcript segments; keep them separate from confirmed AI labels because wording is not proof of authorship.
- Keep text selectors shared in the browser-safe text-check script and regression-test description/transcript extraction so markup coverage changes do not silently disable warnings.
