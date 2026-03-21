# 01. 当前实现行为

## 1. 机制目标

记录炼丹、制作与丹药系统当前已经实现的行为事实，而不是理想设计。

## 2. 术语表

| 中文名 | 代码名 | 当前含义 |
| --- | --- | --- |
| 材料 | `ITEMS[itemId].type === 'material'` | 当前主要包括 `lingcao`、`lingshi`、`yaodan`、`zhujidanMaterial` 等，能被掉落、剧情或背包动作读取。 |
| 丹药 | `ITEMS[itemId].type === 'pill'` | 当前成品丹药包括 `juqidan`、`zhujidan`、`jiedusan`、`huashendan` 四类。 |
| 突破加成 | `state.breakthroughBonus` | 当前为单一临时数值，使用突破丹后累加，突破成功或失败后清零。 |
| 物品动作 | `ITEMS[itemId].actions` | 当前背包按钮来源，支持“使用”“炼化”“吸收”等单物品动作。 |
| 持有型被动 | `ITEMS[itemId].passiveEffects` | 当前由背包持有触发的攻击、防御、最大生命、突破加成。 |
| 库存 | `state.inventory` | 当前固定为 `itemId -> count` 的对象。 |
| 气血 | `state.playerStats.hp / maxHp` | 当前用于战斗与回血丹效果，战斗结算会被固定比例改写。 |
| 战斗状态 | `combatState` | 当前只存在于运行时，不写入存档。 |

## 3. 覆盖范围

当前机制覆盖：

- 物品静态定义、库存读写与持有型被动。
- 背包弹层中的单物品动作执行。
- `juqidan` 提供修为、`zhujidan` / `huashendan` 提供突破加成、`jiedusan` 提供回血。
- 游历怪物掉落材料与少量装备型被动道具。
- 突破实际成功率由基础突破率、临时突破加成和持有型被动共同决定。
- 独立丹炉页、配方列表与多材料炼制。
- 非战斗自然回血与 `state.recovery.lastCheckedAt`。
- 战斗中禁止切入丹炉页，背包物品动作也会阻断。

当前机制不覆盖：

- 战斗中嗑药或战斗内道具栏。
- 商店、交易行、炼丹小游戏。

## 4. 状态字段

- `state.inventory`：库存对象，缺省为 `{}`。
- `state.breakthroughBonus`：临时突破加成，缺省为 `0`。
- `state.playerStats.hp`：当前气血。
- `state.playerStats.maxHp`：当前气血上限。
- `state.currentLocation`：当前地点，影响游历描述与 NPC 展示。
- `state.offlineTraining`：当前只服务离线吐纳修为，不服务气血恢复。
- `state.ui.activeTab`：当前支持 `cultivation / alchemy / story / adventure`。
- `state.recovery.lastCheckedAt`：服务自然回血的独立时间戳，不与 `offlineTraining` 复用。

## 5. 结算顺序

### 5.1 当前背包直接使用

1. 读取 `ITEMS[itemId]` 与 `actions`。
2. 校验库存是否足够。
3. 校验是否满修为、满血量等前置条件。
4. 先扣除当前物品 1 个。
5. 执行 `applyEffects()`，结算修为、突破加成或回血。
6. 记录日志并回传 delta 给 UI。

### 5.2 当前战斗结算

1. 回合内直接扣 `state.playerStats.hp`。
2. 胜利时增加修为、发放掉落。
3. 胜利后保留真实剩余 `hp`，不再强行写回固定比例。
4. 失败时扣除 `18%` 当前修为。
5. 失败后把 `hp` 写回 `20% maxHp` 的保命血线。

## 6. UI 揭示

选前显示：

- 背包弹层中物品名称、描述、数量。
- 物品动作标签与简短效果说明。
- 当前突破率只在修炼页显示，不在背包或冒险页显示丹药准备度。

选后显示：

- 成功使用丹药后，背包会刷新数量。
- 主界面会显示浮字，例如修为增加、气血增加、突破率提高。
- 修行日志会写入物品动作文字。

当前已提供：

- 炼丹页入口与底部导航页签。
- 配方可见性、缺料提示与锁定原因。
- 自然回血规则说明。
- 冒险页中的丹药战备摘要。

## 7. 兼容策略

- 当前 `SAVE_VERSION = 6`。
- 当前 `isSupportedSaveData(rawState)` 允许 `version >= 5` 的存档继续加载，`v4` 及以下会被视为旧版并阻断加载。
- `mergeSave()` 会回填 `inventory`、`playerStats`、`offlineTraining`、`recovery`、`ui` 等字段，并把加载后的运行态版本提升到 `6`。
- `state.recovery` 已纳入显式兼容回填范围。

## 8. 边界与异常

- 当前丹药只能在战斗外、背包弹层中使用。
- 当前已有“已有药力时禁止继续吃突破丹”的前置保护，`breakthroughBonus` 不再允许继续叠加。
- 当前多材料配方统一走 `craftRecipe()`，不再强塞进 `performItemAction()` 的单物品模型。
- 当前战斗胜利保留真实残血，失败血线改为 `20% maxHp`，回血丹与自然回血重新承担续航职责。
- 当前材料掉落已可稳定转成成品丹药，资源闭环已从“半套”补成完整一圈。
