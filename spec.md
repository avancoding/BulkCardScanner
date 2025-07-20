1. Product Overview

A lightweight desktop-oriented (but online-only) tool that lets a user manually scan current TCGplayer pricing (using the official API when possible) for Pokémon cards (Sword & Shield era onward) and produce:

    Top % Gainers – cards whose baseline price (previous promoted snapshot) was ≥ $0.60 and current price shows the highest percentage increase (baseline ≥ $0.60 filter removes tiny-price distortions).

    Cards Over $1 (Crossers) – a separate optional scan/output listing cards whose current price is ≥ $1 and whose baseline price was < $1 (baseline may be < $0.60 or between $0.60–$0.99). These help identify bulk that has become “worth selling.”

    Fallen Below $1 – cards that were ≥ $1 in baseline and have dropped below $1 now (optional section).

    Cards newly entering scope (e.g., newly released) are added only to baseline (no gain % computed) and skipped from lists for one week (effectively until next manual promotion after at least ~7 days or chosen interval).

No continuous history is maintained—only a two‑snapshot ring (baseline.json, current.json) plus a manual “Promote” action. This keeps storage and cost minimal.
2. Core User Flows
2.1 Initial Setup

    User launches app.

    If baseline.json absent → prompt user to perform first scan; after scan, user presses Promote to establish baseline.

2.2 Manual Scan

    User clicks “Scan Now”.

    App fetches current prices for all in-scope cards (subject to rarity inclusion toggles).

    Results stored to current.json.

    App computes comparisons vs baseline.json:

        Build Top % Gainers list (up to 50 rows) after filtering rules.

        Build Crossers (≥ $1) list.

        Build Fallen Below $1 list.

    Display results.

    User may press “Promote to Baseline” if satisfied—copies current.json → baseline.json (overwriting). If not, baseline remains unchanged, allowing repeated rescans same day (interval length then differs from strictly “weekly”).

2.3 Promotion

    Manual only. After promotion, gain percentages reset (future scans compare against new baseline).

3. Card Scope & Identification
3.1 Scope

    Sets: All Pokémon Sword & Shield era forward (SWSH + Scarlet & Violet) including promos.

    Printings: Normal, Reverse Holo, Holo, Promo distinct.

    Optional inclusion (via toggle): Special rarities (Full Art, Illustration Rare, Special Illustration Rare, Secret Rare, etc.). When toggle off, they are excluded from scanning requests (smaller data volume).

    Rarity Filter UI: Inclusion-only toggles (no separate exclude control).

3.2 Identity (per variant)

Fields forming unique key:

    setCode

    cardNumber (full form e.g., "045/198" or promo code)

    name

    rarity

    finish ("Normal" | "Reverse" | "Holo" | "Promo" or keep "Normal" + "Reverse" and treat promos by promo numbering + setCode)

    promoId (nullable; for Black Star promos etc.)

    [Assumption] Reverse holo is a separate record (not a column inside a base record).

3.3 Excluded vs Stored

    Special rarities stored when included toggle is ON; otherwise not fetched for performance (not even as “hidden”).

    We still can store special rarities once fetched; they remain in baseline even if later toggle off (optionally filtered out of gainers). To simplify MVP: if a rarity is excluded at scan time, it is not updated (its baseline value persists until next inclusion scan). Document this in code comments.

4. Data Storage
4.1 File Structure

    baseline.json – last promoted snapshot.

    current.json – last scan snapshot.

    config.json (optional) – user settings (rarity inclusion toggles, thresholds).

    newly_tracked.json or a field inside baseline records to record first-seen timestamp (for volatility gating).

4.2 Snapshot JSON Schema (array of card objects)

{
  "name": "Pikachu",
  "setCode": "SVI",
  "cardNumber": "045/198",
  "rarity": "Uncommon",
  "finish": "Reverse",
  "promoId": null,
  "price": 0.72,
  "tcgplayerUrl": "https://www.tcgplayer.com/product/…",
  "firstSeen": "2025-07-19T11:00:00Z"   // ISO8601; present if card newly tracked in baseline establishment
}

Not stored: internal productId (you requested to omit).
Optional future fields: imageUrl, regulationMark, setReleaseDate. (Leave for extensibility.)
5. Pricing & Fetching
5.1 Data Source

    Prefer TCGplayer Partner API (pricing endpoint returning marketPrice & related). Use marketPrice as proxy for “price.” (User originally said “last sold,” but to minimize effort and because last sold not directly given, we settle on marketPrice.)

5.2 API Strategy

    Build a catalog map (during first scan or cached) from product search endpoints for all relevant sets & rarities.

    Paginate & batch fetch pricing (respect rate limits).

    Provide concurrency with modest cap (e.g., 5–10 simultaneous requests) and a polite inter-batch delay (~100–150 ms) if needed.

5.3 Missing or Invalid Prices

    If marketPrice is null, 0, or negative → treat as unavailable. Do not include card in gain calculations and do not update baseline entry for that card. Optionally store price: null.

6. Comparison & List Logic
6.1 Filters & Thresholds
Top % Gainers

    Include only cards where:

        Baseline price ≥ $0.60.

        Current price ≥ $0.60. [Assumption] (You specified “Gainers scan will exclude cards of baseline of less than 60 cents” and “all cards shown should be above 60 cents.” Interpreted to mean current should also be ≥ $0.60. Adjust if you wanted current unrestricted.)

        Card exists in both baseline & current snapshots.

        Card not flagged as “newly tracked” (firstSeen == baseline promotion time; suppressed until after next promotion).

    Percent Gain Calculation:
    percentGain = ((currentPrice - baselinePrice) / baselinePrice) * 100 (if baselinePrice > 0).

        Display: whole number (integer) – round half up.

        If baselinePrice = 0 or missing → skip.

    Ranking: Sort by percentGain descending.

        Tie-breaking: Just display both without forced tie-break order (practically JSON sort stable; implement fallback by index order).

    Cap list length to 50 entries (after sorting). If more than 50, truncate.

    Mark (visual flag) for items also appearing in Crossers (but within Top Gainers list this is just a visual indicator; not counted separately).

Crossers (≥ $1)

    Criteria:

        Baseline price < $1.00 (no baseline lower bound; a $0.05 → $1.05 jump can appear here even though it was under the $0.60 gainers baseline cutoff).

        Current price ≥ $1.00.

        Card not “newly tracked.”

    Display order: Percent gain descending (same calculation; baseline can be < $0.60 here).

    No limit specified (practically could limit to 50; if you want unlimited leave blank). [Assumption] Limit to 50 for UI consistency—call out if you prefer no cap.

Fallen Below $1

    Criteria:

        Baseline price ≥ $1.00.

        Current price < $1.00.

        Not newly tracked.

    Sort by absolute dollar drop descending (or percent loss descending if desired—[Assumption] use percent loss for symmetry).

Newly Tracked

    Any card present in current.json but absent in baseline.json (or lacking baseline price) is:

        Added to current.json.

        When promoted, gets firstSeen timestamp; suppressed from gainers until at least one promotion cycle passes.

        Not shown in lists until after it has both baseline & subsequent current scan.

6.2 Sections & Headings

    Top % Gainers

    New $1+ Crossers

    Fallen Below $1 (if non-empty)
    (“Newly Tracked” hidden or optionally shown for transparency.)

6.3 Columns (for all lists)
Column	Description	Notes
Name	Card name	Text
Set	Set code (hover tooltip full set name)	
Number	Card number (or promo id)	
Rarity	e.g., Uncommon, Rare Holo	
Finish	Normal / Reverse / Holo / Promo	
Baseline Price	Two decimals	
Current Price	Two decimals	
% Gain	Integer (negative for Fallen list)	Green if >0, Red if <0
Link	“View” button opening external browser	

    For Crossers, you can optionally highlight rows with a subtle icon (e.g., “↑”) or color border.

7. UI / UX
7.1 Main Layout

    Left / top toolbar:

        Scan Now button

        Promote to Baseline button (disabled if no current scan or if current already identical to baseline)

        Rarity inclusion multiselect (checkboxes)

        Toggle to show/hide special rarities

        Button “Show Crossers” to switch to Crossers section or tabbed layout (Tabs: Gain / Crossers / Fallen).

7.2 Feedback

    Progress: Simple progress bar showing % of price batches fetched (e.g., “Fetching 1200 / 30000…”).

    After scan: Timestamp “Last scan: 2025-07-19 07:15 ET” and “Baseline: 2025-07-12 07:00 ET (7 days old)” (calculate elapsed days).

    No intrusive dialogs—errors appear as subtle inline messages.

7.3 Promotion Confirmation

    Upon clicking Promote: confirm dialog “Replace baseline with current snapshot? This resets gain calculations.” (Yes/Cancel).

7.4 Color Coding

    Percent gain positive (green text).

    Percent negative (red text).

    Crossers inside Top Gainers flagged with badge “$1+” (optional small green tag).

    Fallen list uses red for % Gain (negative).

8. Scanning Engine
8.1 Steps

    Load config & baseline.

    Build list of product IDs (if not cached) for selected rarities.

    Batch fetch pricing (concurrent workers).

    Normalize responses into canonical card objects.

    Write current.json atomically: write to temp file then rename.

    Compute comparisons & produce UI lists.

8.2 Concurrency & Rate Limits

    Configurable MAX_CONCURRENCY (default 8).

    Inter-batch delay (e.g., 100 ms) to stay polite.

    Retry failed batch up to 2 times; if still fails, skip those cards silently (per your “ignore” directive, but log to console/log file).

8.3 Error Handling
Scenario	Handling
Auth failure (401)	Show inline banner: “API auth failed—check keys.” Cancel scan.
Rate limit (429)	Backoff (exponential: 1s, 2s, 4s) then retry batch.
Partial failures	Skip; continue. No user interruption.
Network outage mid-scan	Provide “Retry remaining” button (optional enhancement).
JSON write error	Log & notify user “Could not save current snapshot.”
9. Promotion Logic

    On Promote:

        Replace baseline.json with deep copy of current.json.

        For each card, if it had no prior firstSeen, set firstSeen = promotionTimestamp.

        Remove any cards not present in current (optional; [Assumption] keep them out of new baseline—baseline only reflects promoted set).

    After promotion, recompute lists (will all show 0% until next scan).

10. Configuration & Thresholds
Setting	Value	Changeable in UI?
Min Baseline for Gainers	$0.60	Hard-coded (MVP)
Min Current for Gainers	$0.60 ([Assumption])	Hard-coded
Crossers Threshold	$1.00	Hard-coded
Max Top Gainers Rows	50	Hard-coded
Price Precision	2 decimals	Hard-coded
Percent Display	Integer	Hard-coded
Suppress Newly Tracked	Yes (1 cycle)	Hard-coded
11. Pseudocode (Key Parts)

def scan():
    baseline = load_json('baseline.json')  # dict keyed by composite key
    product_ids = build_product_list(selected_rarities)
    current_records = fetch_prices(product_ids)  # returns list of { keyFields..., price }

    current_map = { make_key(r): r for r in current_records }

    save_json_atomic('current.json', current_records)

    gainers = []
    crossers = []
    fallen = []

    for key, curr in current_map.items():
        if key not in baseline:
            # newly tracked; will be assigned firstSeen on next promote
            continue

        base = baseline[key]
        base_price = base.get('price')
        curr_price = curr.get('price')

        if not valid_price(base_price) or not valid_price(curr_price):
            continue

        # Crossers
        if base_price < 1.00 and curr_price >= 1.00:
            crossers.append(build_row(base, curr))

        # Fallen
        if base_price >= 1.00 and curr_price < 1.00:
            fallen.append(build_row(base, curr, loss=True))

        # Gainers
        if base_price >= 0.60 and curr_price >= 0.60 and base_price > 0:
            pct_gain = ((curr_price - base_price) / base_price) * 100
            gainers.append(build_row(base, curr, pct_gain=pct_gain))

    gainers.sort(key=lambda r: r['percentGain'], reverse=True)
    gainers = gainers[:50]

    # Mark which gainers are crossers
    cross_keys = { row['key'] for row in crossers }
    for r in gainers:
        r['isCrosser'] = r['key'] in cross_keys

    fallen.sort(key=lambda r: r['percentGain'])  # negative largest drop first
    crossers.sort(key=lambda r: r['percentGain'], reverse=True)

    return gainers, crossers, fallen

Promotion:

def promote():
    current = load_json('current.json')
    timestamp = now_iso()
    for card in current:
        if 'firstSeen' not in card:
            card['firstSeen'] = timestamp
    save_json_atomic('baseline.json', current)

12. Testing Plan
12.1 Unit Tests
Area	Test Cases
Key construction	Normal vs promo vs reverse holo produce unique keys.
Price filtering	Baseline < 0.60 excluded from gainers; baseline 0.60 included.
Percent gain calc	Correct rounding (e.g., 1.23 → 123%).
Crosser detection	0.95 → 1.05 flagged; 1.05 → 1.10 not in crossers.
Fallen detection	1.10 → 0.95 appears in Fallen.
Newly tracked suppression	Card absent in baseline → not listed until after promote.
Missing price	Null or 0 baseline or current skipped.
Limit enforcement	>50 gainers trimmed to 50.
Promotion	baseline replaced; firstSeen added.
12.2 Integration / End-to-End

    Initial Scan: With no baseline, scan -> no gainers (since no comparison). Promote.

    Second Scan: Modify mock prices to create:

        A crosser baseline 0.80 → 1.25

        A big gainer baseline 0.70 → 1.05

        A non-gainer baseline 0.55 → 0.70 (excluded due to baseline <0.60)

        A fallen baseline 1.20 → 0.95
        Validate each lands in correct section (or excluded).

    Toggle Special Rarities: Include a Full Art card; verify it disappears when toggle off (not updated).

    Error Handling: Simulate API 429; ensure backoff & eventual continuation or skip.

    Partial Fail: Some prices missing → ensure unaffected cards still processed.

12.3 Performance

    Time to process 30k cards under concurrency cap (log elapsed).

    Memory footprint (JSON size; ensure feasible).

12.4 Regression

    After promotion, ensure previous percent gains reset (all zero after immediate re-scan).

13. Logging & Diagnostics
Log Type	Contents
scan.log	Timestamp, #cards attempted, #success, #failed, duration.
errors.log	Detailed stack traces (only on unhandled exceptions).
In-App (optional)	Last scan summary (#gainers, #crossers, #fallen).
14. Security & Privacy

    API keys stored in local config file (user’s machine) – not embedded in source for open distribution (if user self-supplies keys).

    No user account system; no PII stored.

    Optionally obfuscate keys in UI.

15. Extensibility Considerations

Future enhancements (not in MVP, but design leaves room):

    Add small rolling history (7 daily snapshots) for real weekly windows (would just extend storage to directory of dated JSON).

    Add chart sparkline (7 or 14 points) using incremental minimal history.

    Add watchlist (manually selected cards always highlighted).

    Multi-market support (Magic, Yu-Gi-Oh) by adding game field and separate baseline sets.

16. Open / Assumed Points (Review)
Item	Assumption	Adjust if Needed
Current price threshold for Gainers	Must also be ≥ $0.60	If you want only baseline filter, remove current >= 0.60.
Crossers list cap	50 rows	Set unlimited if desired.
Fallen list sort	By percent loss descending (largest negative first)	Could switch to absolute drop.
Suppression duration for newly tracked	Until one promotion cycle passes	If you want time-based (>=7 days) we’d need date difference check.
Special rarities baseline behavior	Not updated when toggle off	Could alternatively always update unseen rarities silently.
17. Implementation Stack (Suggested)

    Language: JavaScript/TypeScript with Node for API fetch + a lightweight HTML/JS desktop shell (Electron) OR pure Node CLI + simple HTML report. (Electron only if GUI desired.)

    UI Framework: React (optional) or minimal vanilla + table library.

    Packaging: Electron Builder (later) or just run via npm start initially.

    State Management: Simple in-memory objects; no heavy store needed.

    Testing: Jest for unit tests; mock API layer.

18. Minimal Development Milestones
Milestone	Deliverables
M1 – Catalog & Scan	Fetch product list, initial scan producing current.json.
M2 – Baseline Promotion	Promote mechanism + baseline comparison logic.
M3 – Lists Generation	Gainers, Crossers, Fallen JSON arrays printed/console or simple HTML.
M4 – GUI Table	Interactive sortable tables with filters & link buttons.
M5 – Rarity Toggles & Newly Tracked Handling	Inclusion toggle logic working correctly.
M6 – Polishing & Testing	Unit + integration tests, logging, error resilience.
19. Developer Handoff Notes

    Start with a mock API service to simulate pricing to validate logic without hitting the real API.

    Encapsulate pricing fetch behind interface PriceProvider.fetchPrices(productIds).

    Keep transformation of raw API → canonical card object isolated (e.g., normalizeCard(raw)).

    Treat all monetary values as floats rounded to 2 decimals only at display; keep raw numbers for computation to reduce rounding artifacts.