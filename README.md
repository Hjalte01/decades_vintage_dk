# Decades Vintage concept demo

A zero-cost, private-first concept for Decades Vintage. It is an installable responsive web app with a customer experience and a simulated staff studio. Nothing on the site is a real offer for sale yet.

## Run locally

The reproducible Nix shell includes Node 22 and `cloudflared`:

```bash
nix develop
npm install
npm run dev
```

Open <http://localhost:5173>. The staff demo is at <http://localhost:5173/studio>.

After the first install, use `npm ci` for an exact dependency restore from `package-lock.json`.

To show the app on a phone or send a temporary private preview link:

```bash
nix develop -c npm run demo
```

The command prints a random `trycloudflare.com` URL. Keep the terminal open while the demo is in use. The URL changes each time and is intended only for evaluation—not public hosting.

## What works in this milestone

- Danish-first customer experience with English switch
- Product browsing, categories, detail pages and store availability
- Three shops plus the event-only Rødovre warehouse
- Events and a versioned local Instagram snapshot
- Editorial three-post Instagram spotlight with dated likes, plus “most watched” ranking prepared for verified insights
- Responsive mobile navigation and production service worker
- Staff inventory dashboard with status changes
- New product form with local image upload, autosaved draft, and publish/draft actions
- Browser persistence and one-click reset
- Versioned JSON export containing clothing metadata and locally stored demo images
- Typed seams for future D1/R2 storage and optional commerce

The generated hero photograph and all product illustrations are original demo assets. Store hours, event details, copy, product data and prices are clearly sample content and must be owner-approved.

## Deliberately disabled

- Payments and checkout
- Real customer orders or reservations
- Public staff sign-up and authentication
- Cloud database and media storage
- Automatic Instagram synchronization
- Custom domain and production analytics

This keeps the first decision genuinely free. If the concept is approved, the next stage can replace browser storage with Cloudflare D1/R2 and add owner-created staff accounts without rebuilding the customer interface. Commerce stays behind an `off | inquiry | checkout` feature mode and should only be enabled after the store decides it helps.

## Prepared Instagram synchronization

The customer app reads `src/data/instagram-feed.json` at build time and keeps all Instagram covers local. The checked-in file is a manually dated fallback: it contains six newly curated posts plus two retained posts, a dated like snapshot for the three-post spotlight, no invented view totals, and no viral ranking. Those likes are not live and are shown only when all three counts and the capture date are present.

`npm run sync:instagram` prepares a new manifest and covers through Meta's official Instagram API. It requires an owner-authorized Professional Business or Creator account with `instagram_business_basic` and `instagram_business_manage_insights`. Keep `INSTAGRAM_ACCESS_TOKEN` server-side; it must never use a `VITE_` prefix or be exposed to the browser.

The import selects the latest eight parent posts and the three eligible posts with the highest lifetime organic view totals in the preceding 90-day window. Meta insights can lag, so posts younger than 48 hours remain in the latest feed but are not ranked yet. The script publishes the new manifest only after all required data and covers succeed.

No database is required for this read-only showcase: the generated JSON manifest and local image files are the deployable state. Fixture runs are test-only, require explicit non-production output paths, and cannot be loaded as verified insights by the customer app.

See the credential-free fixture and output options with:

```bash
npm run sync:instagram -- --help
```

There is deliberately no timer in this milestone. Once the shop grants account access, the intended activation is a declarative `systemd` timer on `mobile-dev`, followed by a deployment from the generated manifest and covers through the existing GitHub Pages workflow.

## Checks

```bash
npm run check
```

## Demo data and privacy

Uploaded demo images remain in that browser's local storage and are not sent anywhere. Clear them with **Nulstil eksempeldata** in the studio or by clearing the site's browser data. The demo includes `noindex, nofollow` metadata.
