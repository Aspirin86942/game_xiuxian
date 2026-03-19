# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**《灵光修仙传》** - 2D 古风水墨风文字修仙 RPG 网页游戏，参考《凡人修仙传》剧情

## Tech Stack

- Vanilla JavaScript (ES6+)
- HTML5 + CSS3
- LocalStorage for save data
- Web Audio API for synthesized sound effects
- No build tools required (static files)

## Project Structure

```
game/
├── index.html      # Main game page
├── style.css       # Ink-wash style visuals
├── game.js         # Game logic
└── 凡人修仙传+(忘语).epub  # Reference novel
```

## Development Commands

```bash
# Run game (open in browser)
start index.html

# Or use a local server (recommended for localStorage)
npx http-server -p 8080
```

## Fixed Size Design

- Game container: 375x667px (mobile-friendly)
- Viewport: `width=375, initial-scale=1, user-scalable=no`
- No scrolling - all content fits within fixed bounds

## Core Systems

1. **Cultivation** - Click "吐纳聚气" to gain 1~5 cultivation points
2. **Breakthrough** - Auto-switch to "渡劫突破" when max cultivation reached
3. **Encounters** - 15% chance for random events (60% positive/40% negative)
4. **Idle System** - Auto-cultivate unlocks at 筑基 realm
5. **Inventory** - Items drop from encounters; pills can be consumed
6. **Adventure/Combat** - "游历" triggers turn-based auto-combat vs monsters
7. **Settings** - Audio/music toggles
8. **Story System** - Main storyline following 凡人修仙传 (10 chapters)
9. **Save System** - Auto-save to localStorage + export/import

## Story Chapters (凡人修仙传)

| ID | Chapter | Location | Min Realm |
|----|---------|----------|-----------|
| 0 | 初入仙途 | 七玄门 | 炼气 |
| 1 | 七玄门弟子 | 七玄门 | 炼气 |
| 2 | 墨大夫的注意 | 七玄门 | 炼气 |
| 3 | 长春功 | 七玄门 | 炼气 |
| 4 | 突破炼气 | 七玄门 | 筑基 |
| 5 | 黄枫谷 | 黄枫谷 | 筑基 |
| 6 | 血色禁地 | 黄枫谷 | 金丹 |
| 7 | 乱星海 | 乱星海 | 金丹 |
| 8 | 元婴老怪 | 乱星海 | 元婴 |
| 9 | 化神飞升 | 人界 | 化神 |

## Realms

炼气 → 筑基 → 金丹 → 元婴 → 化神 (each with 初期/中期/后期)

## Game Constants (CONFIG in game.js)

- `ENCOUNTER_CHANCE`: 0.15 (15% trigger rate)
- `BASE_BREAKTHROUGH_RATE`: 0.8 (80% base success)
- `CLICK_GAIN_MIN/MAX`: 1~5 cultivation per click
- `AUTO_GAIN_RATIO`: 0.6 (idle earns 60% of manual)
- `ITEM_DROP_CHANCE`: 0.2 (20% item drop on positive encounter)

## NPCs

- **墨大夫** (七玄门神医) - Mentor who teaches 长春功
- **韩立** (韩老魔) - Fellow cultivator
- **南宫婉** (掩月宗仙子) - Love interest
- **大长老** (黄枫谷长老) - Sect elder

## Save Data Structure

```json
{
  "realmIndex": 0,
  "stageIndex": 0,
  "cultivation": 0,
  "inventory": {},
  "storyProgress": 0,
  "currentLocation": "七玄门",
  "completedTasks": [],
  "npcRelations": {},
  "settings": { "audioEnabled": true, "musicEnabled": true }
}
```
