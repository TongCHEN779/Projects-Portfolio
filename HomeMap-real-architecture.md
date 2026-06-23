# HomeMap — how to build the *real* tool

The prototype fakes the data. A production version is mostly a **data-engineering** problem, not a frontend one. Here's a concrete, honest design.

## 0. The one decision that shapes everything: where does data come from?

Full-market coverage in Denmark means combining many sources. Ranked by how clean/legal they are:

1. **Official / open feeds (do these first).**
   - **DAWA (Danmarks Adresser API)** — free, official address + geocoding. Use it to turn any address into lat/lng and a canonical address ID. This is the backbone for dedup.
   - **BBR / OIS** (building & dwelling register) — official data on size, rooms, year built. Great for validating/enriching listings.
   - **Boliga** exposes JSON endpoints used by its own site; some people use them, but it's a grey area — check terms.
2. **Partner / affiliate feeds.** Several agents and portals offer affiliate or data partnerships. This is the *clean* path to real listings and the one a real product would pursue. An email to a few agencies costs nothing.
3. **Scraping (last resort, with care).** Many sites' ToS forbid it; robots.txt and rate limits matter; personal data (addresses) brings GDPR duties. If you scrape, do it politely (cache, backoff, identify yourself), only public data, and document that you respect ToS. For a portfolio, **don't claim live full-market scraping** — it's a legal/maintenance trap.

> Honest MVP: official feeds (DAWA + BBR) for the geocoding/enrichment spine + 1–2 partner or permitted sources for actual listings. Synthetic fill only to demo breadth, clearly labelled.

## 1. Architecture (static-frontend friendly)

```
 sources ──► ingestion workers ──► canonical store ──► enrichment ──► published dataset ──► frontend
 (adapters)   (normalize+geocode)   (Postgres/         (dedup,         (static JSON or       (Leaflet map,
                                      PostGIS)           fair-price)     read API)             filters)
```

Key point: **separate the slow pipeline from the fast UI.** A scheduled job rebuilds a clean dataset; the frontend just reads it. That keeps the site cheap (even static-hostable) and resilient.

## 2. The pieces that actually demonstrate skill

**(a) Source adapters → one canonical schema.** Each source gets a small adapter mapping its fields to:
`{source, source_id, url, address, postal_code, lat, lng, size_m2, rooms, type, price_dkk, listed_date, raw}`.
Show the schema + adapters in the repo — this is the "I can integrate messy systems" signal.

**(b) Geocoding & address normalization (DAWA).** Resolve every listing to a DAWA address ID. This single step makes dedup tractable and is genuinely real Danish infrastructure.

**(c) Deduplication / entity resolution — the headline feature.** The same flat on Boligsiden + the agent's site = duplicates. Pipeline:
- **Blocking:** group candidates by postal code + rounded size (cheap).
- **Matching:** within a block, score pairs on address-ID match, distance < ~25 m, size equality, price within a few %. Threshold → merge, or train a tiny logistic-regression classifier on a few hand-labelled pairs (a nice ML touch).
- **Merge:** one canonical home, with `sources[]` and the lowest/most-recent price. This is exactly the user pain ("complete info without visiting each platform").

**(d) Enrichment / "fair price" model.** Fit `price ~ size + rooms + postal_code` (start with median kr/m² per area, graduate to gradient-boosted regression). Flag each home under/over-priced. Add **days-on-market** and **price-drop** tracking by diffing snapshots over time — features the portals don't surface.

**(e) Commute layer (real, not a proxy).** Replace straight-line distance with actual travel time via an isochrone/routing API (OpenRouteService — free tier, or Google Directions). Precompute travel time from each listing to a saved work address; colour/filter by it. Very relevant to a relocating job-seeker.

## 3. Stack suggestion

- **Ingestion/enrichment:** Python (httpx, pydantic for schema, pandas/duckdb), scheduled via GitHub Actions cron or a small worker (Render/Railway/Fly).
- **Store:** Postgres + PostGIS (spatial queries, dedup by distance). DuckDB if you want zero-server.
- **Publish:** the pipeline writes a compact `listings.json` (or tiles) to object storage / the repo. Frontend reads it directly → no backend needed for reads.
- **Frontend:** Leaflet + OSM (what the prototype already uses), or MapLibre for vector tiles + clustering.
- **Hosting:** GitHub Pages / Cloudflare Pages for the static UI; the only server is the periodic job.

## 4. Build order (each step ships something usable)

1. DAWA geocoding + canonical schema on a small real sample → map renders real points.
2. Dedup pipeline → "merged N duplicates" becomes true, not faked.
3. Fair-price model + badges → the differentiator vs Boligsiden.
4. Snapshot diffing → days-on-market + price-drop alerts.
5. Real commute isochrones.
6. (Optional) accounts + saved searches + email alerts → now it's a product.

## 5. Legal / GDPR checklist (also a maturity signal in the writeup)

- Respect each source's ToS and robots.txt; prefer feeds/partnerships over scraping.
- Addresses are personal data → have a lawful basis, minimise storage, allow takedown.
- Don't re-publish proprietary photos/descriptions wholesale; link back to the source.
- Put a short "data & ethics" note in the README. Employers read that as good judgement.

---

**Bottom line:** the impressive, real version isn't "I scraped everything." It's a clean ingestion → dedup → enrich pipeline on legitimate sources, with the UI as a thin reader. That story — integration, entity resolution, a pricing model, lawful data handling — is exactly what an ML-engineer / data-scientist hiring team wants to see.
