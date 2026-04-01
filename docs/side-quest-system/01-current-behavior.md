# 01. 当前实现行为

## 1. 机制目标

记录地点委托系统当前已经实现的行为事实，而不是理想设计。

截至 `2026-04-01`，当前运行时已经完成从旧 `sideQuests` 到 `commissions` 的切换。现在的真实形态是：

- 仍保留 `getAvailableSideStories(state)` 生成的 legacy 风闻层，但它不再承担剧情页委托面板的主展示职责。
- 正式地点委托统一由 `LOCATION_COMMISSIONS_V1` + `state.commissions` 驱动。
- 剧情页继续复用 `#side-story-list` 面板锚点，但玩家可见语义已统一为 `地点委托`。

当前最重要的现状基线如下：

- `story-data.js` 通过 `LOCATION_COMMISSIONS_V1` 配置 8 条固定地点委托：
  - 青牛镇 4 条：`山路送药`、`后山异响`、`走失耕牛`、`晨露换符水`
  - 太南山 4 条：`摊前假丹砂`、`洞府探风`、`夜路押货`、`代买灵材`
- `game-core.js` 当前委托状态机只支持 `hidden / available / active / completed / failed` 五态。
- 存档已升级到 `SAVE_VERSION = 8`，正式任务字段从 `sideQuests` 迁移为 `commissions`。
- 剧情页委托面板当前只渲染地点委托卡片，不再混排 legacy 线索卡。
- 当前仍没有独立任务日志、独立任务页、任务追踪器，也没有跨章节多段委托链。

## 2. 术语表

| 中文名 | 代码名 | 当前含义 |
| --- | --- | --- |
| legacy 风闻 | `getAvailableSideStories(state)` | 根据 `storyProgress`、`flags`、`npcRelations` 等即时推导出来的旁支风闻列表 |
| 地点委托定义 | `LOCATION_COMMISSIONS_V1` | 当前 8 条固定地点委托的配置化定义 |
| 委托榜元信息 | `LOCATION_COMMISSION_BOARD_META` | 各地点的面板标题、空态标题和空态说明 |
| 地点委托运行时 | `state.commissions` | 每条地点委托的当前状态、开放记录与最近一次结算结果 |
| 可见地点委托 | `getVisibleCommissions(state)` | 依据地点与境界过滤后提供给 UI 的委托卡数据 |
| 接取委托 | `acceptCommission(state, commissionId)` | 将 `available` 委托切换到 `active` |
| 结算委托 | `chooseCommissionOption(state, commissionId, choiceId)` | 在 `active` 卡内选择一个 choice 并即时结算 |
| 地点委托区 | `#side-story-list` | 当前承接地点委托卡和空态卡的剧情页面板 |
| 结果摘要 | `lastResult` | `completed / failed` 的轻量摘要，不是完整任务日志 |

## 3. 覆盖范围

当前机制覆盖：

- 8 条固定地点委托的地点门槛、境界门槛、接取、单段式结算与失败。
- `currentLocation`、`realmScore`、背包资源对正式委托可见性和 choice 的影响。
- v7 存档导入时丢弃退休的 `sideQuests` 并重建 `commissions` 字段。
- 剧情页地点委托卡的最小 UI、按钮文案与空态文案。
- 游历风声的 `commission -> clue -> resource` 顺序，其中会优先播报当前地点可接委托。
- 正式委托奖励的一次性结算，包括轻量 `lingshi`、已有物品、`routeScores`、`flags` 和少量物品。

当前机制不覆盖：

- 独立任务页、任务追踪器、任务日志历史。
- 跨章节多段式任务链。
- 真实时间 deadline 或倒计时。
- 可重复刷新的赏金循环。
- 超过 1 条 `active` 委托并行。v1 固定只允许 1 条。
- 用委托结果解锁或封锁主线章节。

## 4. 状态字段

- `currentLocation`：地点委托可见性的第一阈值。
- `realmScore`：地点委托可见性的第二阈值。
- `flags`：决定部分委托结算后写入的轻量痕迹。
- `inventory`：用于支付 choice 代价或承接奖励。
- `routeScores`：当前地点委托可轻量写入路线倾向。
- `commissions`：正式地点委托运行时存档字段，按任务 ID 建表。

当前 `commissions[commissionId]` 至少包含：

- `commissionId`
- `state`
- `availableAtRealmScore`
- `acceptedAtRealmScore`
- `resolvedAtRealmScore`
- `selectedChoiceId`
- `lastResult`

当前明确仍不存在的字段：

- `activeCommissionId`
- `commissionHistory`
- `commissionTrackerUi`
- `deadlineTimestamp`

## 2.2 当前运行时事实（v8）

- 正式任务字段已从 `sideQuests` 迁移为 `commissions`。
- 当前只实现两组地点委托：`青牛镇` 与 `太南山`。
- 委托可见性由 `currentLocation + realmScore` 决定，不再由 `storyProgress` 窗口直接控制。
- 运行时只保留 `hidden / available / active / completed / failed` 五态。
- 同一时间只允许 1 条 `active` 委托。

## 5. 结算顺序

1. `mergeSave()` 或显式读取委托时，通过 `syncCommissionAvailability(state)` 同步正式委托状态。
2. `game.js` 渲染剧情页时：
   - 先取 `getVisibleCommissions(state)` 生成地点委托卡。
   - 若当前地点无可见委托，则取 `getCommissionBoardMeta(state)` 生成地点空态。
3. 玩家点击 `available` 卡的接取按钮时，调用 `acceptCommission(...)`，委托进入 `active`。
4. 玩家在 `active` 卡内点击某个 choice 时，调用 `chooseCommissionOption(...)`，委托即时进入 `completed` 或 `failed` 并结算奖励。
5. 玩家游历时，`resolveExpedition(...)` 会优先播报当前地点 `available` 委托；若无委托，再回退到 legacy 风闻或资源收益。

当前不会发生：

- 不会弹出独立任务页。
- 不会写入完整任务历史日志。
- 不会让委托抢断主线播放游标。
- 不会因为委托完成而推进主线章节。

## 6. UI 揭示

当前地点委托区已经会显示：

- 委托标题
- 委托榜标签
- 委托分类
- 委托状态标签
- 奖励概览
- `available` 的接取按钮
- `active` 的卡内 choices
- `completed / failed` 的结果摘要
- 当前地点的空态标题和空态正文

当前仍不显示：

- 独立任务页签
- 任务追踪器
- 精确内部优先级打分
- 隐藏旗标或内部结果写入细节

## 7. 兼容策略

- 当前已 bump 到 `SAVE_VERSION = 8`。
- `MIN_SUPPORTED_SAVE_VERSION = 7`，v7 存档仍可导入。
- v7 存档中的 `sideQuests` 视为退休字段，导入时直接丢弃，不逐条迁移结果。
- 导入后会按 `LOCATION_COMMISSIONS_V1` 重建默认 `commissions`，再按当前 `currentLocation + realmScore` 同步正式委托可见性。
- legacy 风闻仍保留在游历逻辑中，因此地点无委托时，游历反馈不会直接坠空。

## 8. 边界与异常

- 边界条件：
  - v1 只允许 1 条正式委托处于 `active`，其他 `available` 卡保留但接取按钮禁用。
  - `completed / failed` 地点委托只在对应地点、对应境界区间内继续显示，避免跨地点污染。
  - 委托区继续复用 `#side-story-list`，因此列表密度仍受 375x667 视口约束。
- 失败路径：
  - 接取失败、资源不足、重复结算失败时，当前 UI 通过 `window.alert(...)` 提示，并伴随失败音效。
  - 当前地点没有可见委托时，回退到地点专属空态卡。
- 当前代码与目标态的关键差距：
  - 已有正式委托生命周期，但还没有独立任务日志。
  - 已有卡内即时结算，但还没有多段式追踪。
  - 目前只接入两组地点委托，黄枫谷与乱星海仍停留在规则书边界阶段。
