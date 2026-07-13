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
- Events and a local Instagram-style slideshow
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

## Checks

```bash
npm run check
```

## Demo data and privacy

Uploaded demo images remain in that browser's local storage and are not sent anywhere. Clear them with **Nulstil eksempeldata** in the studio or by clearing the site's browser data. The demo includes `noindex, nofollow` metadata.
# decades_vintage_dk
