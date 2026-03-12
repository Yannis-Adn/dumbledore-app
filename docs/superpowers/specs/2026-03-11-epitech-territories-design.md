# Epitech Territories — Game Design Document

## 1. Vision & Pillars

**One-liner:** A persistent, async-first territory control game where Epitech students build bases, gather resources, and conquer a shared hex map — playable in short sessions between classes.

**Design Pillars:**

1. **Respect the player's time** — Meaningful progress in 2-5 minute sessions. No need to be online 24/7. Inspired by Travian/OGame's async production model.
2. **Easy to learn, hard to master** — Simple rock-paper-scissors combat with deep strategic layers (timing, scouting, resource management). Clash of Clans principle: 30 seconds to understand, months to optimize.
3. **Emergent social dynamics** — Even without alliances (v1), territorial proximity creates natural rivalries, truces, and politics. Tribal Wars proved this: geography IS diplomacy.
4. **Seasonal tension** — Monthly resets prevent stagnation and give new players a fair shot. Borrowed from Diablo seasons / Clash Royale leagues.

**Reference Games & What We Borrow:**

| Game | Pattern borrowed |
|------|-----------------|
| Travian | Async resource production, building queues, hex map, troop types |
| Clash of Clans | Shield system, short session loops, upgrade progression |
| OGame | Production formulas, espionage mechanics, fleet-based combat |
| Tribal Wars | Shared persistent map, territorial expansion, player density dynamics |
| Polytopia | Clean visual style, simple unit triangle, territory scoring |
| Civilization | Tech tree lite, fog of war, territorial control scoring |

---

## 2. Core Loop

The game follows the classic **4X micro-loop** (eXplore, eXpand, eXploit, eXterminate) compressed into mobile-friendly sessions:

```
┌─────────────────────────────────────────────────┐
│                  SESSION START                    │
│            (player opens the game)               │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │   1. COLLECT RESOURCES   │  ← Accumulated while offline
        │   (tap to harvest)       │     OGame/Travian pattern
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │   2. BUILD / UPGRADE     │  ← Queue buildings & units
        │   (spend resources)      │     CoC "builder" pattern
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │   3. SCOUT NEIGHBORS     │  ← Reveal enemy bases
        │   (gather intel)         │     OGame espionage
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │   4. ATTACK / EXPAND     │  ← Conquer adjacent tiles
        │   (use troops)           │     Travian raiding
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │   5. REVIEW BATTLE LOG   │  ← See who attacked you
        │   (plan retaliation)     │     Tribal Wars reports
        └──────────────────────────┘
```

**Session length target:** 2-5 minutes for maintenance, 10-15 minutes for strategic play.

---

## 3. The Map

### 3.1 Structure

- **Hex grid** using **axial coordinates (q, r)**, procedurally generated at season start
- Map size scales with player count: `radius = ceil(sqrt(playerCount * 3))`
- Each hex is a **tile** that can be: empty, neutral (with resources), or owned by a player
- **Distance formula** (axial): `distance(a, b) = (abs(a.q - b.q) + abs(a.q + a.r - b.q - b.r) + abs(a.r - b.r)) / 2`

### 3.2 Tile Types

| Tile | Color | Effect |
|------|-------|--------|
| **Plains** | Green | Standard tile, no bonus |
| **Data Mine** | Blue | +50% Code production when owned |
| **Power Node** | Yellow | +50% Energy production when owned |
| **Fortress Ruins** | Gray | +30% defense bonus (Firewall effectiveness ×1.3 on this tile) |

Tile distribution (per 100 tiles): 55 Plains, 20 Data Mine, 20 Power Node, 5 Fortress Ruins. Wasteland removed — 4 tile types is cleaner for v1.

### 3.3 Fog of War

- Players see only tiles within **2 hexes** of their territory (Civ-style fog)
- **Radar** building extends vision by +1 hex per level (max level 3 = 5 hex vision)
- Scouting reveals a tile and its garrison (see section 6.7)

### 3.4 Spawn Logic

At season start or when a new player joins:
1. Find the hex furthest from any existing player (Travian spawn logic)
2. Place the player's HQ on that hex
3. Grant a **24h newbie shield** (no attacks allowed against them)
4. Grant starter resources: 500 Code, 300 Energy

### 3.5 Neutral Tile Expansion

Expanding to adjacent neutral tiles is a core early-game action:

- **Requirement:** Tile must be adjacent (1 hex) to a tile you already own
- **Cost:** 100 Code + 50 Energy (flat cost, no troops needed)
- **Time:** 10 minutes (queued like a build action, one expansion at a time)
- **Result:** Tile becomes owned by you, empty (no building yet)
- Players can only expand to tiles within their fog of war vision

This creates a natural early-game rhythm: expand → build → expand → build.

### 3.6 Map Generation (Seed-based)

The `map_seed` in the seasons table controls a seeded PRNG that determines:
1. Map shape (hex radius based on player count)
2. Tile type assignment using the distribution ratios (section 3.2)
3. Tile types are placed with clustering: Data Mines tend to appear in groups of 2-3, Power Nodes likewise. This creates strategic "zones" worth fighting over (Travian resource valley pattern).

Algorithm: For each tile, roll a seeded random value. Apply clustering bias: +20% chance of matching an adjacent tile's type. Then normalize to distribution ratios.

---

## 4. Resources

### 4.1 Resource Types

| Resource | Symbol | Generated by | Used for |
|----------|--------|-------------|----------|
| **Code** | `</>` | Data Center | Buildings, basic units, tile expansion |
| **Energy** | `⚡` | Power Grid | Advanced buildings, advanced units, tile expansion |
| **Influence** | `★` | PvP victories only | Prestige upgrades, cosmetics, season rewards |

### 4.2 Production Formulas

Production uses a lookup table (canonical source of truth). The curve is sub-linear to prevent snowballing:

**Code production (per Data Center):**

| Building Level | Code/hr | Cumulative upgrade cost (Code/Energy) |
|---------------|---------|--------------------------------------|
| 1 | 60 | 200 / 100 |
| 2 | 130 | 600 / 300 |
| 3 | 210 | 1,200 / 600 |
| 4 | 300 | 2,000 / 1,000 |
| 5 (max) | 400 | 3,000 / 1,500 |

**Energy production (per Power Grid):**

| Building Level | Energy/hr | Cumulative upgrade cost (Code/Energy) |
|---------------|-----------|--------------------------------------|
| 1 | 40 | 100 / 200 |
| 2 | 85 | 300 / 600 |
| 3 | 140 | 600 / 1,200 |
| 4 | 200 | 1,000 / 2,000 |
| 5 (max) | 270 | 1,500 / 3,000 |

**Tile bonus:** If the building is on a Data Mine (+50% Code) or Power Node (+50% Energy), multiply the output accordingly. Example: Data Center Lv.3 on a Data Mine = 210 × 1.5 = 315 Code/hr.

**Influence gain:** +5 Influence per successful attack, +10 for capturing a tile with a building, +2 for successful defense.

### 4.3 Storage Cap

Resources accumulate while offline but are capped:

```
max_storage = 1500 + (1500 × vault_level)
```

| Vault Level | Max Storage | Time to fill (Lv.3 Data Center) |
|-------------|-------------|--------------------------------|
| 0 (no vault) | 1,500 | ~7h |
| 1 | 3,000 | ~14h |
| 2 | 4,500 | ~21h |
| 3 (max) | 6,000 | ~28h |

This means without a vault, you should log in ~2-3 times per day. With max vault, once a day is fine. Incentivizes regular short sessions without punishing sleep.

### 4.4 Raiding & Protection

When attacked and defeated:
- Attacker steals **30%** of unprotected resources
- **Vault** protects a flat amount: `500 × vault_level` resources are unlootable
- Resources above `max_storage` are 100% lootable (incentivizes spending, Clash of Clans loot economy)

Example: Player has 2,000 Code, Vault Lv.1 (protects 500). Attacker wins. Lootable = 2,000 - 500 = 1,500. Attacker takes 30% of 1,500 = 450 Code.

---

## 5. Buildings

### 5.1 Building List

Each tile you own can have **one building**. Your HQ tile starts with the HQ pre-built.

| Building | Max Level | Build Time | Effect |
|----------|-----------|------------|--------|
| **HQ** | 5 | 10m, 30m, 1h, 2h, 4h | Unlocks other buildings. Level gates tech tree. (Rebuild after capture: 5m, see 6.8) |
| **Data Center** | 5 | 5m, 10m, 20m, 40m, 1h20m | Produces Code (see 4.2) |
| **Power Grid** | 5 | 5m, 10m, 20m, 40m, 1h20m | Produces Energy (see 4.2) |
| **Barracks** | 3 | 15m, 45m, 1h30m | Unlocks unit tiers. Lv1→Script Kiddies, Lv2→Bots, Lv3→Hackers |
| **Firewall** | 5 | 10m, 20m, 40m, 1h20m, 2h40m | Passive defense (see 6.2) |
| **Radar** | 3 | 20m, 1h, 2h | Extends fog of war vision by +1 hex per level |
| **Vault** | 3 | 20m, 1h, 2h | Protects 500 × level resources from raids |

**Upgrade costs:** See section 4.2 for production buildings. Other buildings:

| Building | Lv.1 | Lv.2 | Lv.3 | Lv.4 | Lv.5 |
|----------|-------|-------|-------|-------|-------|
| HQ | — | 500/300 | 1,200/800 | 2,500/1,500 | 5,000/3,000 |
| Barracks | 400/300 | 1,000/800 | 2,000/1,500 | — | — |
| Firewall | 300/200 | 700/450 | 1,200/800 | 2,000/1,300 | 3,500/2,200 |
| Radar | 500/400 | 1,200/1,000 | 2,500/2,000 | — | — |
| Vault | 600/500 | 1,500/1,200 | 3,000/2,500 | — | — |

### 5.2 Build Queue

- **One building at a time** per tile (Travian pattern)
- But multiple tiles can build simultaneously
- Build times are real wall-clock time (async). Player gets a push notification when done.

### 5.3 Tech Gate (HQ Level)

| HQ Level | Unlocks |
|-----------|---------|
| 1 | Data Center, Power Grid |
| 2 | Barracks (Lv.1), Firewall |
| 3 | Radar, Vault, Barracks (Lv.2) |
| 4 | All buildings to max, Barracks (Lv.3) |
| 5 | Prestige upgrades (cosmetic + minor bonuses) |

This is the Clash of Clans Town Hall pattern: HQ level gates everything, creating clear progression milestones.

### 5.4 Captured Tiles with Buildings

When you capture a tile that has an enemy building:
- The building is **destroyed** (removed). You get the empty tile.
- If a building was mid-upgrade, the upgrade is cancelled and lost.
- Rationale: This makes defense meaningful and prevents "farming" buildings off weaker players. Borrowed from Travian's "catapult" mechanic (simplified).

---

## 6. Units & Combat

### 6.1 Unit Triangle (Rock-Paper-Scissors)

```
    Script Kiddies
       ╱     ╲
      ▼       │
   Bots ────▶ Hackers
```

| Unit | Strong vs | Weak vs | Cost (Code/Energy) | Train Time | HP | ATK | DEF |
|------|-----------|---------|-------------------|------------|-----|-----|-----|
| **Script Kiddie** | Bots | Hackers | 30/10 | 1m | 20 | 8 | 4 |
| **Bot** | Hackers | Script Kiddies | 80/50 | 5m | 35 | 12 | 8 |
| **Hacker** | Script Kiddies | Bots | 200/150 | 12m | 50 | 18 | 6 |

**Balance rationale:** Script Kiddies are cheap and fast to train — the "zerg" option. You can field 8-9 Script Kiddies for the cost of one Hacker. Their strength is volume, not individual power. Bots are the balanced workhorse. Hackers are expensive glass cannons (high ATK, low DEF) that dominate Script Kiddies but crumble against Bots.

**Stat efficiency (ATK×HP / total cost):**
- Script Kiddie: 8×20/40 = 4.0
- Bot: 12×35/130 = 3.23
- Hacker: 18×50/350 = 2.57

Script Kiddies are the most cost-efficient in raw stats, but Hackers counter them. This creates meaningful composition choices at every level.

### 6.2 Combat Resolution — Full Algorithm

Combat is **auto-resolved** server-side (async-first). Here is the exact algorithm:

**Step 0 — Firewall Phase (defender only)**

Before combat rounds begin, the defender's Firewall deals pre-emptive damage:
```
firewall_damage = firewall_level × 20
```
This damage is applied to the attacking army, distributed evenly across all attacking units (damage per unit = firewall_damage / attacker_count, reducing HP). Units reduced to 0 HP are destroyed before round 1.

**Fortress Ruins bonus:** If the defending tile is Fortress Ruins, firewall_damage × 1.3.

**Step 1 — Round-based combat**

Each round uses **snapshot-then-apply**: all damage is calculated based on start-of-round unit counts, then all damage is applied simultaneously at the end of the round.

```
1. SNAPSHOT: Record each group's unit count at the start of this round.

2. CALCULATE (using snapshot counts, NOT mid-round changes):
   For each unit group on each side:
     a. Identify priority target: the enemy unit type this group counters
     b. If no countered enemy exists, target the unit type with most remaining HP pool
     c. Calculate damage:
        base_damage = ATK × snapshot_unit_count
        if target is countered: damage × 1.5
        if target counters us: damage × 0.75
        final_damage = max(1, base_damage - target_DEF × target_snapshot_count × 0.5)

3. APPLY (all at once, after all groups have calculated):
   For each target group that took damage:
     a. Subtract total incoming damage from the group's HP pool
     b. Destroyed units = floor(total_damage_to_group / per_unit_max_HP)
     c. Remaining HP pool carries over to next round (units have fractional health)
     d. Surviving unit count = previous count - destroyed units
```

**HP pool tracking:** Each unit group maintains a total HP pool across rounds. Surviving units carry damage. Effective HP per surviving unit = `remaining_pool / surviving_count`. This means a group of 7 Script Kiddies with a pool of 115 HP has ~16.4 HP each — they're wounded but alive.

**Step 2 — Round end**

- Remove destroyed units from both sides (based on the apply step above)
- If one side has 0 units remaining: combat ends
- If both sides still have units: next round
- **Max 10 rounds** — if both sides survive, defender wins (home advantage)

**Step 3 — Resolution**

- **Attacker wins:** Capture tile, surviving troops garrison it. Loot resources (section 4.4).
- **Defender wins:** Attacker loses all sent troops. Defender keeps tile with surviving garrison.

### 6.3 Combat Worked Example

**Scenario:** Player A attacks Player B's Data Mine tile.

Attacker sends: 15 Script Kiddies, 8 Bots
Defender has: 10 Hackers, Firewall Lv.2

**Firewall Phase:**
- firewall_damage = 2 × 20 = 40
- Distributed across 23 attacking units = 1.7 damage per unit
- Script Kiddies (20 HP each): 20 - 1.7 = 18.3 HP → all survive
- Bots (35 HP each): 35 - 1.7 = 33.3 HP → all survive
- No units destroyed by Firewall this time.

**Round 1 — SNAPSHOT:** Attacker: 15 SK (pool 274.5 HP), 8 Bots (pool 266.4 HP). Defender: 10 Hackers (pool 500 HP).

**Round 1 — CALCULATE (all using snapshot counts):**

- SK (15) → Hackers (no Bots to counter, Hackers counter SK so ×0.75):
  - base = 8 × 15 = 120, ×0.75 = 90
  - final = max(1, 90 - 6 × **10** × 0.5) = 60 damage to Hacker pool

- Bots (8) → Hackers (Bots counter Hackers, ×1.5):
  - base = 12 × 8 = 96, ×1.5 = 144
  - final = max(1, 144 - 6 × **10** × 0.5) = 114 damage to Hacker pool

- Hackers (**10**, snapshot count) → SK (Hackers counter SK, ×1.5):
  - base = 18 × **10** = 180, ×1.5 = 270
  - final = max(1, 270 - 4 × **15** × 0.5) = 240 damage to SK pool

**Round 1 — APPLY (all at once):**

- Hacker pool: 500 - 60 - 114 = 326. Destroyed: floor(174/50) = 3. **7 Hackers remain** (pool 326).
- SK pool: 274.5 - 240 = 34.5. Destroyed: floor(240/18.3) = 13. **2 SK remain** (pool 34.5, ~17.25 HP each).
- Bot pool: 266.4 (untouched). **8 Bots remain.**

**Round 2 — SNAPSHOT:** Attacker: 2 SK (pool 34.5), 8 Bots (pool 266.4). Defender: 7 Hackers (pool 326).

**Round 2 — CALCULATE:**
- SK (2) → Hackers (×0.75): base = 16, ×0.75 = 12, final = max(1, 12 - 6×7×0.5) = max(1, -9) = 1
- Bots (8) → Hackers (×1.5): base = 96, ×1.5 = 144, final = max(1, 144 - 6×7×0.5) = 123
- Hackers (7) → SK (×1.5): base = 126, ×1.5 = 189, final = max(1, 189 - 4×2×0.5) = 185

**Round 2 — APPLY:**
- Hacker pool: 326 - 1 - 123 = 202. Destroyed: floor(124/50) = 2. **5 Hackers remain.**
- SK pool: 34.5 - 185 = -150.5. **All SK eliminated.**
- Bot pool: 266.4 (untouched). **8 Bots remain.**

**Round 3+:** 8 Bots (counter Hackers) vs 5 Hackers. Bots dominate from here. **Attacker wins.**

### 6.4 Army Limits

- **Global army cap** = `highest_barracks_level × 50` units total across all tiles
  - Barracks Lv.1: 50 units, Lv.2: 100, Lv.3: 150
  - Multiple barracks don't stack the cap — only the highest counts
  - Multiple barracks DO allow parallel training
- Max simultaneous attacks = `HQ level` (1 at HQ1, up to 5 at HQ5)
- **Daily attack limit: 10** — prevents spam, forces strategic choices

### 6.5 Attack Travel Time

Attacks are not instant — troops march across the map:

- **Travel time:** `distance_in_hexes × 5 minutes`
- Example: attacking a tile 3 hexes away = 15 minutes travel
- Distance uses the axial hex formula (section 3.1)
- The defender is notified when troops depart, giving them time to react (reinforce, train, or brace)
- Minimum travel time: 5 minutes (adjacent tile)
- During transit, the attacking army is "locked" — those units can't be used elsewhere

### 6.6 Unit Training

Training happens at Barracks buildings:

- **Queue:** Each Barracks has a training queue of up to **5 batches**
- **Batch:** A batch is N units of one type (e.g., "10 Script Kiddies")
- **Parallel training:** Multiple Barracks train independently (one queue each)
- **Trained units appear** on the Barracks' tile as garrison
- **Training is paid upfront** — resources deducted when the batch is queued
- **Cancellation:** Queued-but-not-started batches can be cancelled for 50% resource refund. In-progress batches cannot be cancelled.

**Database:**

```sql
CREATE TABLE training_queue (
  id INTEGER PRIMARY KEY,
  barracks_building_id INTEGER NOT NULL REFERENCES buildings(id),
  player_id INTEGER NOT NULL REFERENCES players(id),
  unit_type TEXT NOT NULL, -- script_kiddie, bot, hacker
  count INTEGER NOT NULL,
  started_at TEXT,         -- NULL if queued but not started yet
  completes_at TEXT,       -- NULL if queued but not started yet
  status TEXT NOT NULL DEFAULT 'queued' -- queued, training, completed
);
```

When a batch completes, units are added to the `armies` row for that tile. The next queued batch starts automatically.

### 6.7 Scouting

Scouting lets you see what a player has on a tile before committing an attack (travel time same as attacks, section 6.5):

- **Cost:** 20 Code, 10 Energy (cheap, encourages intel-gathering)
- **Travel time:** Same as attacks: `distance_in_hexes × 5 minutes`
- **Result:** Reveals the target tile's building (type + level), garrison (unit types + approximate counts: "few" 1-10, "some" 11-30, "many" 31+), and Firewall level
- **Duration:** Intel stays visible for 1 hour, then tile returns to fog
- **Detection:** Defender gets a notification: "A scout was spotted near your Data Mine [3,7]" (but does NOT reveal who sent it)
- **Database:** Scouts are stored as a row in a `scouts` table with fields: `id, player_id, target_tile_id, departed_at, arrives_at, expires_at, result_json`

### 6.8 HQ Capture & Respawn

When a player's HQ tile is captured:

1. **HQ is destroyed** (like any captured building)
2. Player receives a **16h shield** on all remaining tiles
3. Player keeps all non-HQ tiles and their buildings
4. Player must **rebuild HQ** on one of their remaining tiles:
   - Costs 200 Code, 100 Energy (discounted from normal)
   - Build time: 5 minutes (fast recovery)
   - The existing building on that tile is replaced by the new HQ at Lv.1
5. If player has **zero tiles** (HQ was their only tile):
   - Player is "eliminated" for this season
   - They can **respawn** after a 1h cooldown: new HQ placed on the furthest empty tile from all players (same as initial spawn), 24h shield, starter resources (500 Code, 300 Energy)
   - Respawning resets the player's season stats but not their badges

This ensures losing your HQ is punishing but not game-ending. The 16h shield gives time to regroup.

---

## 7. Anti-Snowball & Fairness Mechanics

This is where most territory games fail. Here's how we prevent it:

### 7.1 Shield System (Clash of Clans)

| Trigger | Shield Duration | Cooldown |
|---------|----------------|----------|
| Defeated in defense | 8 hours | 24h before next defensive shield |
| Lost HQ tile | 16 hours | 48h before next HQ shield |
| New player | 24 hours | One-time |
| Returning player (7+ days offline) | 12 hours | One-time per return |

While shielded: can't be attacked, but also **can't attack** (prevents shield abuse). **Production reduced to 50% during shield** — prevents the exploit of deliberately losing to farm resources safely.

The cooldown prevents cyclic shield abuse. A player can only get one defensive shield per 24h and one HQ shield per 48h.

### 7.2 Diminishing Returns on Territory

Borrowed from Civilization's happiness mechanic:

```
effective_production = base_production × territory_penalty
territory_penalty = 1.0 / (1 + 0.08 × max(0, tiles_owned - 6))
```

| Tiles owned | Production efficiency | Effective tile-equivalents |
|-------------|---------------------|-----------------------------|
| 1-6 | 100% | 1-6.0 |
| 8 | 86% | 6.9 |
| 10 | 74% | 7.4 |
| 12 | 66% | 7.9 |
| 15 | 56% | 8.4 |
| 20 | 47% | 9.4 |

With a steeper penalty (0.08 vs 0.05) and lower threshold (6 vs 8), expanding past ~12 tiles gives almost no net benefit. A player with 20 tiles only produces ~9.4 tile-equivalents — barely more than someone with 10 tiles (7.4). This is a real anti-snowball mechanic.

### 7.3 Underdog Bonus

Players below the server median in **total resources produced this season** (not tile count — prevents gaming) get a production boost:

```
underdog_boost = 1 + min(0.3, 0.05 × max(0, median_rank - player_rank))
```

- Capped at **+30%** max (prevents extreme exploitation)
- Based on economy ranking, not tile count (can't dump tiles to game it)
- Recalculated hourly

### 7.4 Daily Attack Limit

- Base: **10 attacks per day** for all players
- Resets at midnight UTC
- Last 48h of season: doubled to 20/day (climactic finish)

### 7.5 Monthly Seasons

- Season lasts **30 days**
- At season end: final rankings calculated, rewards distributed
- Full map reset — everyone starts fresh
- **Season rewards** (persistent across resets):
  - Top 10: Unique profile badge + title
  - Top 25%: Cosmetic building skin
  - Participation (10+ attacks): Season participation badge

---

## 8. Progression & Engagement Loops

### 8.1 Short-term Loop (per session, 2-5 min)
```
Collect → Build/Train → Scout → Attack → Review reports
```

### 8.2 Medium-term Loop (per week)
```
Expand territory → Upgrade HQ → Unlock new units → Climb leaderboard
```

### 8.3 Long-term Loop (per season, 30 days)
```
Compete for ranking → Earn season rewards → New season fresh start → Apply learnings
```

### 8.4 Notification Hooks

Push notifications (via existing ntfy infrastructure) at key moments:
- "Your Data Center is complete!" (build finished)
- "You're under attack! [PlayerName] is sending troops to your Data Mine" (incoming attack with ETA)
- "Battle Report: You defended against [PlayerName]!" (combat result)
- "Season ends in 24h — you're currently #7!" (season urgency)
- Daily reminder (opt-in): "Your storage is almost full — log in to spend resources"

Max 5 notifications/day to avoid spam.

---

## 9. Leaderboards

### 9.1 Live Leaderboards

| Leaderboard | Metric | Update Frequency |
|-------------|--------|-----------------|
| **Territory** | Tiles owned | Real-time |
| **Military** | Win ratio (wins / total battles, min 5 battles) | After each battle |
| **Economy** | Total resources produced this season | Hourly |
| **Combined** | Weighted score: territory×3 + military×2 + economy×1 (all normalized 0-100) | Hourly |

Military uses a simple win ratio (not ELO) for v1. Minimum 5 battles to appear on the military leaderboard prevents gaming.

### 9.2 Historical Leaderboards

- Past season winners (deferred to v2)
- All-time badges collected (deferred to v2)

### 9.3 Social Features (v1 — no alliances)

- **Player profiles** — Stats, badges, current territory, battle history
- **Global chat** — One shared chat room via socket.io with rate limiting (1 msg/3s, max 200 chars)

Taunt system deferred to v2.

---

## 10. Visual Design — SVG Flat Vector Style

### 10.1 Art Direction

**Style reference:** Polytopia meets Monument Valley — clean geometric shapes, bold colors, subtle gradients, no textures.

**Color Palette:**

| Element | Light | Dark |
|---------|-------|------|
| Plains hex | `#4ade80` | `#166534` |
| Data Mine hex | `#60a5fa` | `#1e40af` |
| Power Node hex | `#facc15` | `#a16207` |
| Fortress Ruins hex | `#94a3b8` | `#475569` |
| Player territory border | `#8b5cf6` | `#7c3aed` |
| Enemy territory border | `#ef4444` | `#dc2626` |
| Fog of war | `#1e293b` at 60% opacity | `#0f172a` at 70% opacity |

### 10.2 SVG Asset List

All assets are SVG, generated as React components:

**Buildings (isometric-ish flat):**
- HQ — Hexagonal tower with antenna
- Data Center — Server rack with blinking LEDs (CSS animation)
- Power Grid — Solar panel array with energy arcs
- Barracks — Bunker with unit silhouettes
- Firewall — Shield with circuit pattern
- Radar — Rotating dish (CSS rotation animation)
- Vault — Reinforced safe with lock

**Units (simple geometric figures):**
- Script Kiddie — Small hooded figure, green accent
- Bot — Mechanical spider, blue accent
- Hacker — Tall cloaked figure, purple accent

**Map Elements:**
- Hex tiles with subtle border glow for ownership
- Animated resource floating particles (CSS keyframes)
- Attack path animation (dashed line moving along hex edges)
- Explosion effect for combat (SVG + CSS)

### 10.3 UI Layout

```
┌─────────────────────────────────────────────────────┐
│  ⚡ 1,240/2,000   </>  3,450/4,000   ★ 85          │  ← Resource bar
├─────────────────────────────────────────────────────┤
│                                                     │
│                                                     │
│              HEX MAP (pannable, zoomable)            │
│              - pinch/scroll to zoom                 │
│              - drag to pan                          │
│              - tap hex for actions                  │
│                                                     │
│                                                     │
├──────────┬──────────┬──────────┬───────────────────┤
│  Base    │  Army    │  Rank    │  Reports          │  ← Bottom nav
└──────────┴──────────┴──────────┴───────────────────┘
```

**Hex selection panel (slide up from bottom):**
```
┌─────────────────────────────────────────┐
│  Data Mine [3,7] — Owned by you         │
│  Building: Data Center Lv.3             │
│  Producing: 218 Code/hr                 │
│                                         │
│  [Upgrade Lv.4]  [Train Units]  [Info]  │
└─────────────────────────────────────────┘
```

### 10.4 Hex Map Technical Approach

- **Rendering:** SVG-based (not Canvas) — better for React integration, accessibility, and CSS animations
- **Coordinate system:** Axial (q, r) stored in DB, converted to pixel position for rendering:
  ```
  x = hex_size * (sqrt(3) * q + sqrt(3)/2 * r)
  y = hex_size * (3/2 * r)
  ```
- **Viewport:** Pan/zoom via CSS transform on a container `<g>` element. Track `{x, y, scale}` in React state.
- **Culling:** Only render hexes within the viewport bounds (check if hex pixel position is within `viewport ± hex_size`). For a map of 200 tiles, this is likely unnecessary (SVG handles it fine), but the pattern is ready for larger maps.
- **Library consideration:** Use raw SVG math (not a hex library) — the math is simple and avoids a dependency. Reference: Red Blob Games hex grid guide (the canonical resource).

---

## 11. Technical Architecture

### 11.1 Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + TailwindCSS v4 (existing stack) |
| Real-time | socket.io (new) |
| API | Express REST (existing) + socket.io events |
| Database | SQLite via better-sqlite3 (MVP) — migrate to PostgreSQL if >100 concurrent players |
| Cache/Pub-Sub | Redis (existing) — real-time events, session cache |
| Push Notifications | ntfy (existing infrastructure) |

### 11.2 Integration with Dumbledore

The game server runs **inside the existing Express process** (not a separate service):

1. **Socket.io** attaches to the existing HTTP server instance. **Migration required:** The current `server/src/index.ts` uses `app.listen(PORT)` which internally creates an HTTP server but doesn't expose it. This must be changed to:
   ```ts
   // in server/src/index.ts — REPLACE app.listen() with:
   import { createServer } from 'http';
   import { Server } from 'socket.io';

   const server = createServer(app);
   const io = new Server(server, {
     path: '/game/socket.io',
     cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }
     // ^^^ Must mirror the Express CORS config (same env var)
   });
   server.listen(PORT, () => { ... });
   ```
2. **Game routes** live under `/game/*` namespace (REST endpoints for initial load, history)
3. **Socket.io namespace** uses `/game` to isolate game events from potential future socket uses
4. **Auth:** Game reuses Moodle user identity. On `game:join`, client sends their MoodleSession cookie. Server validates it via the existing proxy mechanism (call a Moodle endpoint to verify the session), extracts `userid`, and maps to a game player record.
5. **SQLite DB file** stored at `server/data/game.sqlite` (gitignored, persisted via Docker volume)
6. **Migration tool:** Use `better-sqlite3` with a simple migration runner (numbered SQL files in `server/src/game/migrations/`)

### 11.3 Database Schema (SQLite)

```sql
-- Seasons
CREATE TABLE seasons (
  id INTEGER PRIMARY KEY,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, ended
  map_seed INTEGER NOT NULL
);

-- Players (persistent across seasons)
CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  moodle_user_id INTEGER NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Player season state
CREATE TABLE player_seasons (
  player_id INTEGER NOT NULL REFERENCES players(id),
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  code_stored REAL NOT NULL DEFAULT 500,
  energy_stored REAL NOT NULL DEFAULT 300,
  influence INTEGER NOT NULL DEFAULT 0,
  total_code_produced REAL NOT NULL DEFAULT 0,
  total_energy_produced REAL NOT NULL DEFAULT 0,
  attacks_today INTEGER NOT NULL DEFAULT 0,
  shield_until TEXT,
  shield_cooldown_until TEXT, -- prevents cyclic shield abuse
  last_login TEXT NOT NULL,
  last_resource_calc TEXT NOT NULL, -- for lazy offline production calculation
  eliminated INTEGER NOT NULL DEFAULT 0,
  respawn_available_at TEXT,
  PRIMARY KEY (player_id, season_id)
);

-- Map tiles
CREATE TABLE tiles (
  id INTEGER PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  q INTEGER NOT NULL,
  r INTEGER NOT NULL,
  tile_type TEXT NOT NULL, -- plains, data_mine, power_node, fortress_ruins
  owner_player_id INTEGER REFERENCES players(id),
  UNIQUE(season_id, q, r)
);

-- Buildings (one per tile)
CREATE TABLE buildings (
  id INTEGER PRIMARY KEY,
  tile_id INTEGER NOT NULL UNIQUE REFERENCES tiles(id),
  building_type TEXT NOT NULL, -- hq, data_center, power_grid, barracks, firewall, radar, vault
  level INTEGER NOT NULL DEFAULT 1,
  upgrade_started_at TEXT, -- NULL if not upgrading
  upgrade_ends_at TEXT     -- NULL if not upgrading
);

-- Armies (one per tile per player)
CREATE TABLE armies (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id),
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  tile_id INTEGER NOT NULL REFERENCES tiles(id),
  script_kiddies INTEGER NOT NULL DEFAULT 0,
  bots INTEGER NOT NULL DEFAULT 0,
  hackers INTEGER NOT NULL DEFAULT 0,
  UNIQUE(player_id, tile_id)
);

-- Attacks in transit or resolved
CREATE TABLE attacks (
  id INTEGER PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  attacker_id INTEGER NOT NULL REFERENCES players(id),
  defender_id INTEGER REFERENCES players(id), -- NULL for neutral tile expansion
  target_tile_id INTEGER NOT NULL REFERENCES tiles(id),
  attacker_army_json TEXT NOT NULL, -- {"script_kiddies": N, "bots": N, "hackers": N}
  defender_army_json TEXT,          -- snapshot at resolution time
  status TEXT NOT NULL DEFAULT 'in_transit', -- in_transit, resolved
  result TEXT, -- attacker_wins, defender_wins
  loot_code REAL,
  loot_energy REAL,
  departed_at TEXT NOT NULL,
  arrives_at TEXT NOT NULL,
  resolved_at TEXT,
  report_json TEXT -- full battle report for display
);

-- Scouts
CREATE TABLE scouts (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id),
  target_tile_id INTEGER NOT NULL REFERENCES tiles(id),
  departed_at TEXT NOT NULL,
  arrives_at TEXT NOT NULL,
  expires_at TEXT, -- intel visible until this time (arrives_at + 1h)
  result_json TEXT -- {"building": "data_center", "level": 3, "garrison": "some", "firewall": 2}
);

-- Badges (persistent across seasons)
CREATE TABLE badges (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id),
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  badge_type TEXT NOT NULL, -- top10, top25pct, participation
  earned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tile expansions (queued)
CREATE TABLE expansions (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id),
  target_tile_id INTEGER NOT NULL REFERENCES tiles(id),
  started_at TEXT NOT NULL,
  completes_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' -- in_progress, completed, cancelled
);
```

### 11.4 Socket.io Events

**Client → Server:**

| Event | Payload | Description |
|-------|---------|-------------|
| `game:join` | `{ moodleSession: string }` | Auth + receive initial state |
| `tile:select` | `{ tileId: number }` | Request tile details |
| `tile:expand` | `{ targetTileId: number }` | Expand to adjacent neutral tile |
| `building:build` | `{ tileId: number, buildingType: string }` | Build on empty owned tile |
| `building:upgrade` | `{ buildingId: number }` | Upgrade existing building |
| `army:train` | `{ tileId: number, unitType: string, count: number }` | Queue unit training |
| `attack:launch` | `{ targetTileId: number, army: { script_kiddies: number, bots: number, hackers: number } }` | Send army |
| `scout:send` | `{ targetTileId: number }` | Send scout |
| `chat:message` | `{ text: string }` | Global chat (max 200 chars) |

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `game:state` | `{ player, tiles: Tile[], buildings: Building[], armies: Army[], attacks: Attack[] }` | Full visible state on join (only tiles within fog of war) |
| `tile:updated` | `{ tile: Tile, building?: Building }` | Tile ownership or building changed |
| `resources:tick` | `{ code: number, energy: number, influence: number, maxStorage: number }` | Resource update (every 60s for online players) |
| `attack:incoming` | `{ attackId: number, attackerName: string, targetTileId: number, eta: string }` | Incoming attack alert |
| `attack:resolved` | `{ report: BattleReport }` | Battle result |
| `building:complete` | `{ buildingId: number, buildingType: string, level: number }` | Build/upgrade finished |
| `expansion:complete` | `{ tileId: number }` | Neutral tile captured |
| `scout:result` | `{ tileId: number, intel: ScoutIntel }` | Scout report |
| `chat:message` | `{ playerName: string, text: string, timestamp: string }` | Chat message |
| `leaderboard:update` | `{ rankings: LeaderboardEntry[] }` | Top 20 ranking changes |
| `season:ending` | `{ hoursRemaining: number }` | 24h/1h warnings |

### 11.5 Server-side Scheduling

Instead of a 60s cron for everything, use targeted scheduling. All game intervals are initialized in a `startGameLoop(io: Server)` function called from `server/src/index.ts` after `server.listen()`, alongside the existing `startCronJobs()` call.

1. **Resource ticks (online players):** `setInterval` every 60s, broadcast `resources:tick` to connected sockets only. Offline players use lazy calculation on reconnect (`last_resource_calc` timestamp in `player_seasons`).
2. **Attack resolution:** Use a Redis sorted set (`game:pending_attacks`) with arrival timestamps as scores. A `setInterval` every 10 seconds checks for attacks whose `arrives_at <= now` and resolves them. This gives ≤10s resolution granularity.
3. **Build completion:** Same pattern — Redis sorted set `game:pending_builds` checked every 10 seconds.
4. **Scout arrival:** Same pattern — Redis sorted set `game:pending_scouts`.
5. **Training completion:** Same pattern — Redis sorted set `game:pending_training`.
6. **Expansion completion:** Same pattern — Redis sorted set `game:pending_expansions`.
7. **Leaderboard refresh:** Every 5 minutes, recalculate from DB.
8. **Daily attack reset:** Single cron at midnight UTC via `node-cron`: `UPDATE player_seasons SET attacks_today = 0 WHERE season_id = ?`. The `attacks_reset_at` column in the schema is removed — global midnight reset is simpler and sufficient.

### 11.6 Tile Ownership Definition

A tile is "owned" by a player if `tiles.owner_player_id = player.id`. This includes:
- The HQ tile
- Tiles captured via expansion (section 3.5)
- Tiles captured via combat
- Tiles with or without buildings
- Tiles with buildings mid-upgrade

`tiles_owned` for leaderboard/penalties = `COUNT(*) FROM tiles WHERE owner_player_id = ? AND season_id = ?`

---

## 12. Season Lifecycle

```
Day 0:  Season starts
        - New map generated from seed
        - All players spawn with HQ Lv.1 + starter resources (500 Code, 300 Energy)
        - 24h newbie shield for all

Day 1-7: Early game
        - Players build economy, expand to adjacent neutral tiles
        - First skirmishes begin as territories overlap
        - Most players reach HQ Lv.2-3

Day 8-21: Mid game
        - Territory borders solidify
        - Strategic attacks for key tiles (Data Mines, Power Nodes)
        - Leaderboard starts to differentiate
        - Underdog mechanic keeps smaller players competitive

Day 22-28: Late game
        - Top players have HQ Lv.5, full tech
        - Intense fighting for top leaderboard spots
        - "Season ends in 7 days" notification

Day 29-30: Endgame
        - "Season ends in 24h" — final push
        - Attack limit doubled (20/day) for the last 48h — climactic finish
        - Final rankings locked at season end

Day 30: Season end
        - Rankings finalized
        - Rewards distributed (badges, cosmetics)
        - 6h downtime for map regeneration
        - New season begins
```

---

## 13. Monetization — None

This is a student project. No microtransactions, no pay-to-win. All cosmetics earned through gameplay. This is a feature, not a limitation — it ensures pure competitive integrity.

---

## 14. MVP Scope (v1)

For the first playable version, cut to essentials:

### In v1:
- Hex map with fog of war (SVG rendering, axial coordinates)
- 3 resource types + production with lookup tables
- All 7 buildings with upgrade system and tech gates
- 3 unit types with RPS combat (full snapshot-then-apply algorithm)
- Unit training with queue system
- Auto-resolved async combat with battle reports
- Attack travel time mechanic
- Neutral tile expansion
- Scouting
- Leaderboard (territory + military + economy + combined)
- Push notifications for attacks and build completion
- Global chat (rate-limited: 1 msg/3s, 200 char max)
- Season system (30 days)
- Shield system with cooldowns
- Anti-snowball mechanics (territory penalty, underdog bonus)
- SVG assets for all buildings and units
- Dark mode support
- Player profiles with stats
- HQ capture & respawn mechanic

### Deferred to v2+:
- Taunt system
- Prestige upgrades (HQ Lv.5 cosmetics)
- Historical leaderboards / all-time stats
- Sound effects
- Mobile-optimized touch controls (v1 = desktop-first, responsive)
- Alliances/clans
- AI barbarian camps (for low player count)

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low player count at launch | Empty map, no PvP | Smaller map auto-scales to player count. v2: add AI barbarian camps |
| Dominant player bullying newcomers | Player churn | Shield system + underdog bonus + daily attack limit + territory penalty |
| Server cost (SQLite + Redis + socket.io) | Budget | SQLite = zero cost. Single process handles 50-100 concurrent. Migrate to PG only if needed |
| Balancing issues | Unfun meta | Monthly seasons = monthly balance patches. Track win rates per unit type |
| Cheating/exploits | Unfair gameplay | All game logic server-side. Client is display-only. Rate limit all socket events |
| Asset quality | Looks amateur | Consistent SVG style with CSS animations adds polish. Constraints breed creativity |
| Hex map rendering performance | Laggy map interaction | SVG with viewport culling. Max ~300 tiles for 100 players — well within SVG perf limits |
| Shield/underdog exploitation | Unfair advantage | Shield production reduced 50%, underdog based on economy not tiles, both capped |
