# 01. 当前实现行为

## 1. 机制目标

记录支线任务系统当前已经实现的行为事实，而不是理想设计。

截至 `2026-03-22`，当前运行时已经不再是“只有显性支线线索”的阶段。现在的真实形态是：

- 仍保留 `getAvailableSideStories(state)` 生成的 legacy 线索层。
- 新增首批 5 条正式支线任务的 v1 状态机与最小 UI。
- 正式支线与 legacy 线索共用 `#side-story-list`，没有独立任务页或任务日志。

当前最重要的现状基线如下：

- `story-data.js` 通过 `SIDE_QUESTS_V1` 配置 5 条正式支线原型：`旧药账`、`药童残影`、`厉飞雨的酒`、`灵矿幸存者`、`残图余波`。
- `game-core.js` 已存在最小正式任务状态机，支持 `locked / available / active / completed / failed / missed`。
- `game-core.js` 已新增 `sideQuests` 存档字段，并在 `mergeSave()` 中对旧存档做默认值回填与窗口同步。
- `game.js` 已把 `#side-story-list` 升级为“正式支线卡 + legacy 线索卡”共存渲染：
  - `available` 显示状态、分类、奖励概览和接取按钮。
  - `active` 在卡内直接显示支线 choices。
  - `completed / failed / missed` 在卡内显示结果摘要。
  - 非正式任务仍以静态线索卡形式存在。
- 当前仍没有独立任务日志、独立任务页、任务追踪器，也没有跨章节多段任务链。

## 2. 术语表

| 中文名 | 代码名 | 当前含义 |
| --- | --- | --- |
| legacy 显性支线线索 | `getAvailableSideStories(state)` | 根据 `storyProgress`、`flags`、`npcRelations` 等即时推导出来的旁支线索列表 |
| 正式支线定义 | `SIDE_QUESTS_V1` | 首批 5 条 v1 正式支线的配置化定义 |
| 正式支线运行时 | `state.sideQuests` | 每条正式支线的当前状态、窗口与最近一次结算结果 |
| 可见正式支线 | `getVisibleSideQuests(state)` | 过滤掉 `locked` 后提供给 UI 的正式任务卡数据 |
| 接取支线 | `acceptSideQuest(state, questId)` | 将 `available` 支线切换到 `active` |
| 结算支线 | `chooseSideQuestOption(state, questId, choiceId)` | 在 `active` 卡内选择一个 choice 并即时结算 |
| 同行回响区 | `#side-story-list` | 现在同时承接正式支线卡与 legacy 线索卡 |
| 结果摘要 | `lastResult` | `completed / failed / missed` 的轻量摘要，不是完整任务日志 |

## 3. 覆盖范围

当前机制覆盖：

- 首批 5 条正式支线的窗口、接取、单段式结算、错过与失败。
- `storyProgress`、`flags`、`npcRelations`、背包资源对正式支线可见性和 choice 的影响。
- 旧存档回填 `sideQuests` 字段，不 bump 主存档版本。
- 正式支线与 legacy 线索共用同行回响区显示，且正式支线优先于同标题 legacy 线索。
- 正式支线奖励的一次性结算，包括轻量 `lingshi`、已有物品、`npcRelations`、`routeScores` 和 `flags`。

当前机制不覆盖：

- 独立任务页、任务追踪器、任务日志历史。
- 跨章节多段式任务链。
- 真实时间 deadline 或倒计时。
- 同组 `exclusiveGroup` 的复杂冲突裁决。首批 5 条任务当前都未使用互斥组。
- 超过 1 条 `active` 正式支线并行。v1 固定只允许 1 条。

## 4. 状态字段

- `storyProgress`：正式支线窗口的主要阈值。
- `flags`：决定旧账、旧案、旧情是否进入正式任务池。
- `npcRelations`：部分人情类正式支线的补充触发条件。
- `inventory`：用于支付 choice 代价或承接奖励。
- `routeScores`：当前正式支线可轻量写入路线倾向。
- `sideQuests`：新增正式支线运行时存档字段，按任务 ID 建表。

当前 `sideQuests[questId]` 至少包含：

- `questId`
- `state`
- `availableAtProgress`
- `acceptedAtProgress`
- `deadlineProgress`
- `resolvedAtProgress`
- `selectedChoiceId`
- `lastResult`

当前明确仍不存在的字段：

- `activeSideQuestId`
- `sideQuestHistory`
- `sideQuestTrackerUi`
- `deadlineTimestamp`

## 5. 结算顺序

1. `mergeSave()` 或显式读取支线时，通过 `syncSideQuestAvailability(state)` 同步正式支线状态。
2. `game.js` 渲染剧情页时：
   - 先取 `getVisibleSideQuests(state)` 生成正式支线卡。
   - 再取 `getAvailableSideStories(state)` 生成 legacy 线索卡。
   - 用标题去重，避免同一条正式支线又以 legacy 线索重复出现。
3. 玩家点击 `available` 卡的接取按钮时，调用 `acceptSideQuest(...)`，任务进入 `active`。
4. 玩家在 `active` 卡内点击某个 choice 时，调用 `chooseSideQuestOption(...)`，任务即时进入 `completed` 并结算奖励。
5. 若任务从未接取就跨过窗口，进入 `missed`。
6. 若任务已接取但跨过窗口或命中显式失败条件，进入 `failed`。

当前不会发生：

- 不会弹出独立任务页。
- 不会写入完整任务历史日志。
- 不会让支线抢断主线播放游标。

## 6. UI 揭示

当前同行回响区已经会显示：

- 正式支线标题
- 正式支线分类
- 正式支线状态标签
- 奖励概览
- `available` 的接取按钮
- `active` 的卡内 choices
- `completed / failed / missed` 的结果摘要
- legacy 线索的静态标题和正文

当前仍不显示：

- 独立任务页签
- 任务追踪器
- 精确内部优先级打分
- 隐藏读取点或后续章节编号

## 7. 兼容策略

- 当前未 bump 存档版本。
- 旧存档缺少 `sideQuests` 时，由 `mergeSave()` 自动回填默认结构。
- 回填后会立即按当前 `storyProgress / flags / npcRelations` 同步正式支线窗口，不要求旧存档先经过某个迁移页面。
- legacy 线索仍保留，因此旧存档即便没有命中正式支线，也不会让同行回响区突然失空。

## 8. 边界与异常

- 边界条件：
  - v1 只允许 1 条正式支线处于 `active`，其他 `available` 卡保留但接取按钮禁用。
  - `completed / failed / missed` 正式支线当前仍会继续显示在同行回响区，作为轻量结果留痕。
  - legacy 线索与正式支线共用同一容器，因此列表密度仍受 375x667 视口约束。
- 失败路径：
  - 接取失败、资源不足、重复结算失败时，当前 UI 通过 `window.alert(...)` 提示，并伴随失败音效。
  - 没有命中任何 formal/legacy 条目时，回退到 `暂无显性支线` 占位卡。
- 当前代码与目标态的关键差距：
  - 已有正式任务生命周期，但还没有独立任务日志。
  - 已有卡内即时结算，但还没有多段式追踪。
  - 已有 smoke 覆盖，e2e 当前只覆盖最小接取/结算与错过展示，不代表完整任务系统已成熟。
