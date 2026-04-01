# 03. 实现契约

## 1. 目的

本文件写给未来要按地点委托规则书改代码的人。

重点是保护以下语义：

- 地点开放条件
- 委托状态
- 委托与主线的边界
- 委托奖励与结果留痕
- 存档迁移与 UI 词面

## 2. 代码入口

- `D:\Program_python\game_xiuxian\game-core.js`
- `D:\Program_python\game_xiuxian\story-data.js`
- `D:\Program_python\game_xiuxian\src\core\state.js`
- `D:\Program_python\game_xiuxian\src\core\world.js`
- `D:\Program_python\game_xiuxian\src\ui\renderers.js`
- `D:\Program_python\game_xiuxian\src\ui\actions.js`
- `D:\Program_python\game_xiuxian\tests\story-smoke.js`
- `D:\Program_python\game_xiuxian\tests\ui-contract-smoke.js`
- `D:\Program_python\game_xiuxian\tests\e2e\story.spec.js`

## 3. 稳定数据契约

未来地点委托系统至少需要能稳定表达以下语义；字段名可以调整，但语义不能静默消失：

- `id`
- `title`
- `boardLabel`
- `category`
- `location`
- `visibleLocations`
- `minRealmScore`
- `maxRealmScore`
- `detail`
- `rewardPreview`
- `choices`

### 3.1 当前状态枚举

运行时状态枚举当前固定为：

- `hidden`
- `available`
- `active`
- `completed`
- `failed`

`hidden` 表示定义存在，但当前地点或境界不满足。

## 3.2 地点委托稳定字段

每条地点委托至少包含：

- `id`
- `title`
- `boardLabel`
- `category`
- `location`
- `visibleLocations`
- `minRealmScore`
- `maxRealmScore`
- `detail`
- `rewardPreview`
- `choices`

运行时 `state.commissions[commissionId]` 至少包含：

- `commissionId`
- `state`
- `selectedChoiceId`
- `lastResult`

### 3.2.1 旧存档兼容

- v7 存档中的 `sideQuests` 视为已退休字段。
- 导入 v7 存档时，不尝试把旧 `sideQuests` 逐条迁移成新委托结果。
- `normalizeCommissionRecords()` 必须按当前 `LOCATION_COMMISSIONS_V1` 自动补齐新增委托记录，旧存档缺少黄枫谷或乱星海条目时也不能漏建。
- `mergeSave()` 应直接按 `LOCATION_COMMISSIONS_V1` 重建默认 `commissions`，再按当前 `currentLocation + realmScore` 同步可见性。

## 4. 稳定流程契约

### 4.1 正常生命周期

1. 先按 `visibleLocations -> COMMISSION_BOARD_LOCATION_ALIASES -> location` 的地点族回退，再叠加 `realmScore` 推导哪些委托进入 `available`。
2. 玩家接取后，委托进入 `active`。
3. 玩家在卡内选择一个 choice 后，委托进入 `completed` 或 `failed`。
4. 结算后写入 `selectedChoiceId / lastResult / resolvedAtRealmScore`。
5. 已结算委托只在对应地点、对应境界区间内继续作为结果留痕显示。

### 4.2 游历风声顺序

`resolveExpedition()` 的正式顺序当前固定为：

1. 先尝试播报当前地点可见委托。
2. 若无可播报委托，再尝试返回 legacy 风闻。
3. 若连 legacy 风闻也没有，再回退到资源收益。

### 4.3 单活跃限制

当前 v1 固定遵守：

1. 任意时刻只允许 1 条委托处于 `active`。
2. 其他 `available` 卡可以继续显示，但接取按钮必须禁用。
3. 完成或失败后，才能再接下一笔委托。

## 5. 稳定 UI 契约

- 当前最小 UI 继续复用 `#side-story-list`，但玩家语义必须统一为地点委托。
- 当前剧情页委托区只渲染正式地点委托或地点空态，不再混排 legacy 风闻卡。
- 黄枫谷与乱星海等地点族切换到别名地点时，仍必须继续显示同组委托榜与空态文案。
- `side quest / task / available / active` 等内部术语可以保留在代码、规则书与测试变量中，但玩家界面必须统一映射为世界观词面。
- 玩家可见层默认使用以下映射：
  - 系统总称 -> `地点委托`
  - `available` -> `可接委托`
  - `active` -> `已接手`
  - `completed` -> `已办妥`
  - `failed` -> `已失手`
  - 接取动作 -> `接下这笔委托`
  - 因其他任务阻断 -> `另有委托在身`
- 若当前没有可接条目，空态文案必须来自 `LOCATION_COMMISSION_BOARD_META`，不直接写“暂无可接支线”。

## 6. 禁止项

1. 不能让地点委托结果决定主线章节是否能收束完整。
2. 不能把旧 `sideQuests` 的逐条进度迁移成新 `commissions` 结果。
3. 不能让委托在切换地点后继续跨地点污染显示。
4. 不能让唯一奖励在兼容映射或重复读档时重复发放。
5. 不能直接把不适配当前项目口径的原著桥段搬进委托正文。
6. 不能把“支线任务 / 任务状态 / 可接任务”这类内部说明词直接作为玩家界面主文案。
7. 不能把固定地点委托改造成无限重复刷取而不更新规则书与测试。

## 7. 可改项

- 委托分类命名
- 奖励档位和数值
- 地点委托的数量和地点扩展顺序
- `boardLabel` 与空态措辞的具体文案
- 境界开放区间的具体数值
- 黄枫谷、乱星海等地点族内的别名集合

但以下项目本轮已锁定：

- `commissions` 作为正式委托存档字段
- `hidden / available / active / completed / failed` 五态
- `visibleLocations / COMMISSION_BOARD_LOCATION_ALIASES / location` 的地点族回退，加上 `realmScore` 作为可见性基础
- 同一时间只允许 1 条 `active` 委托

## 8. 最低测试契约

### 8.1 文档校验

- `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook.py --root D:\Program_python\game_xiuxian\docs\side-quest-system`
- `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook_series.py --root D:\Program_python\game_xiuxian\docs --series-dir rulebook-series`

### 8.2 代码接入后必须补齐的断言

- v7 导入后应重建 `commissions`，并移除旧 `sideQuests`。
- 旧存档缺少新增委托记录时，`normalizeCommissionRecords()` 会自动补齐黄枫谷与乱星海的新条目。
- 青牛镇、太南山、黄枫谷与乱星海应按地点族 + `realmScore` 正确显示可见委托。
- 任意时刻只能存在 1 条 `active` 委托。
- 游历风声应优先播报当前地点可接委托。
- 剧情页委托区词面应统一为 `地点委托 / 可接委托 / 已接手 / 已办妥 / 已失手`。

### 8.3 自动化命令

- `npm run test:smoke`
- `npm run test:e2e`
- `npm test`

## 9. 变更分级

### 9.1 A 级

- 调整状态枚举语义
- 调整 `currentLocation + realmScore` 可见性逻辑
- 调整委托与主线的边界

### 9.2 B 级

- 调整委托分类
- 调整奖励档位
- 调整地点空态与委托榜文案
- 新增地点委托地点组

### 9.3 C 级

- 新增单条委托原型
- 调整单条委托 choices
- 调整单条委托的奖励预览或结果摘要

## 10. 设计验收

- 玩家能否解释这笔委托为什么会出现在这个地点、这个境界段。
- 委托是否真的补了地点横截面，而不是额外制造主线拖尾。
- 玩家做完后，是否能清楚分辨“这笔委托留下了什么轻量痕迹”。
