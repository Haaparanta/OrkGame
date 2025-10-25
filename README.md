# ORK ORK ORK – A Tiny Roguelike Where EVERYBODY Is An Ork

WAAAGH! This is a fast, silly, and surprisingly tactical **word-combo battler** where
**both sides are orks**. Each turn you bark 1–3 ork-words (e.g., `SHOOT`, `CHARGE`, `BOOM`);
the interpreter resolves your combo into actions. The enemy ork does the same. Survive
waves, take juicy buffs, and stack dakka for a bigger WAAAGH.

---

## ⚔️ Core Loop

1. **Start View**
   - Pick one of **5 ork archetypes** (different base stats & traits).
   - Get a **random starting word pool** (8–10 words).
   - Set optional **seed** for reproducible runs.

2. **Battle View**
   - Choose **1–3 words** from your pool (can increase with buffs).
   - **Both** you and the enemy ork **say** your words (printed to the log).
   - The interpreter turns those words into actions (damage, cover, burn, smash…).
   - End of turn → damage applied → next round or victory screen.

3. **Victory → Buff**
   - Pick **one**:
     - **+% Damage Mod**
     - **+Max HP**
     - **+1 Word Choice / turn** (cap-limited)
     - **Add Your Own Word** (validated and added to your pool)

4. **Next Wave**
   - A **meaner ork** spawns (more HP, more damage, nastier combos).
   - Keep going until you’re scrap.

5. **Scoring**
   - **Score = total damage dealt** across the run (+ small wave bonus).

---

## 🧠 Design Pillars

- **All green**: player, enemies, bosses — all orks, all loud.
- **Meaningful minimalism**: small hand of words, deep emergent combos.
- **Server-authoritative**: no client damage lies; interpreter decides.
- **Fast runs**: snackable sessions with leaderboards.

---

## 🧪 Archetypes (pick one)

- **Warboss** – Big HP, steady damage, starts with `WAAGH`.
- **Rokkit Boy** – Low HP, big burst (`SHOOT`, `BOOM`).
- **Slugga Boy** – Balanced brawler (`CHARGE`, `COVER`).
- **Burna Boy** – Persistent DoT (`BURN`, zone denial).
- **Sneaky Gobbo** – Evasion/utility (`SNEAK`, `FIXIT`).

> All enemies are also drawn from ork clans with their own word weights and quirks.

---

## 🔤 Words & Combos

- Play up to **3 words**/turn (e.g., `SHOOT + BOOM`, `WAAGH + SMASH`).
- Roles: `ranged`, `melee`, `explosive`, `defense`, `utility`, `fire`, `ultimate`.
- Examples:
  - **`SHOOT + BOOM`** → rokkit, cover shred, burst.
  - **`WAAGH + SMASH`** → rage amp + armor break.
  - **`COVER + FIXIT`** → patch up while hiding.
  - **`BURN + CHARGE`** → zone denial into melee chaos.

**Custom words** (reward): e.g., `DAKKA`, `KRUMP`, `ZOOM` — validated then mapped to a role.
