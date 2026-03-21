# 03. 实现契约

## 1. 目的

本文件写给未来要按修炼与游历主循环系统改代码的人，用于定义哪些状态、流程、UI 与测试不能被静默改坏。

## 2. 代码入口

- 静态配置入口：`story-data.js` 中的 `CONFIG`、`ITEMS`、`MONSTERS`、`LOCATIONS`。
- 主循环状态入口：`game-core.js` 中的 `createInitialState()`、`mergeSave()`、`recalculateState()`。
- 修炼入口：`game-core.js` 中的 `trainWithLingshi()`、`attemptBreakthrough()`。
- 游历入口：`game-core.js` 中的 `resolveExpedition()`、`beginCombat()`、`resolveCombatRound()`。
- 页面交互入口：`game.js` 中的 `renderCultivationPage()`、`renderAdventurePage()`、`handleCultivate()`、`startAdventure()`、`exportSave()`、`importSave()`。
- DOM 结构入口：`index.html` 中的修炼页、游历页、设置页与战斗弹层。

## 3. 稳定数据契约

- `state.cultivation` 继续代表当前小境界修为进度，不得无说明改成其他经验语义。
- `state.maxCultivation` 继续代表当前阶段突破上限，且必须与 `realmIndex / stageIndex` 同步重算。
- `state.inventory.lingshi` 是当前唯一可重复修炼资源，不得静默改成顶层 `currency` 字段或新的资源键。
- `state.realmIndex` / `state.stageIndex` 仍是突破与剧情推进的稳定入口，不得在本次重构中改名。
- `state.storyProgress` / `state.storyCursor` 继续作为剧情推进与剧情视图的稳定字段。
- `state.version` 必须显式升级到 `6`，并与导入/读档阻断逻辑保持一致。

## 4. 稳定流程契约

### 4.1 修炼

1. 先校验当前是否可突破；可突破时直接走 `attemptBreakthrough()`。
2. 不可突破时才进入 `trainWithLingshi()`。
3. 闭关必须先扣灵石，再增长修为，不允许先给修为再发现资源不足。
4. 任何批量闭关都不得让修为超过 `maxCultivation`，也不得多扣灵石。

### 4.2 游历

1. 先通过 `resolveExpedition()` 决定事件类型。
2. 非战斗事件直接结算资源、气血、日志与 UI 提示。
3. 战斗事件才允许进入 `beginCombat()` / `resolveCombatRound()`。
4. 战斗结束后只允许回写灵石、掉落、气血和日志，不允许直接回写修为。

### 4.3 导出 / 导入

1. 设置页仍保留完整导出 / 导入。
2. 导入时必须先做版本校验，再替换当前状态。
3. 旧档失败时必须显式提示，不得污染当前新档。

## 5. 稳定 UI 契约

- 修炼页必须继续保留一个主按钮，但其语义变为“闭关修炼 / 渡劫突破”二选一。
- 顶栏必须展示当前灵石数量，不能让玩家在主循环里看不到主要资源。
- 修炼页必须展示批量闭关控件与当前批次成本说明。
- 游历页必须展示最近一次游历摘要，不能只保留“点击即战斗”的旧提示。
- 设置页必须展示“纯单机自由，完整导出/导入，不保证平衡”的提示。
- 自动吐纳、离线收益摘要与离线收益弹层不得继续保留在 UI 中。

## 6. 禁止项

- 禁止恢复点击修炼或离线挂机作为可重复修为入口。
- 禁止让灵石继续在背包中通过“吸收”直接转修为。
- 禁止战斗胜负继续直接增减修为。
- 禁止让导入旧档时仍尝试走新版本运行时逻辑。
- 禁止把“纯单机自由”文案写成“可信平衡”或“官方验证”。

## 7. 可改项

- 允许在不破坏主循环语言的前提下微调闭关倍率和游历权重。
- 允许扩充游历事件文案、增加新的资源或线索事件，但必须复用同一事件池入口。
- 允许在后续版本里新增更多修炼批次，但必须补 UI 与测试契约。

## 8. 最低测试契约

- 兼容测试：
  - `version = 5` 的旧档加载与导入都必须被阻断。
  - `version = 6` 的完整导出 / 导入必须保持主状态一致。
- UI 契约测试：
  - 顶栏灵石摘要存在。
  - 修炼页存在批量闭关控件。
  - 设置页存在单机自由存档提示。
  - 自动吐纳与离线收益锚点已删除。
- 行为测试：
  - 灵石足够时闭关成功。
  - 灵石不足时闭关失败且状态不变。
  - 修为已满时主按钮只触发突破。
  - 游历资源事件只加灵石不加修为。
  - 游历战斗胜利只给灵石 / 掉落。
  - 游历战斗失败不扣修为，灵石不为负。
- 自动化命令：
  - `npm run test:smoke`
  - `npm run test:e2e`
  - `npm test`
  - `python "C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook.py" --root "D:\Program_python\game_xiuxian\docs\cultivation-and-expedition-system"`
  - `python "C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook_series.py" --root "D:\Program_python\game_xiuxian\docs" --series-dir "rulebook-series"`

## 9. 变更分级

- A 级：重定义灵石角色、恢复第二条可重复修为入口、改变完整导出 / 导入边界、修改 `cultivation` 或 `realmIndex / stageIndex` 语义。
- B 级：调整闭关倍率、事件权重、战斗胜负资源代价、设置页提示文案。
- C 级：新增一个游历事件、增加一个闭关批次、补一条游历日志文案或局部 UI 提示。

## 10. 设计验收

- 玩家可解释性审计：玩家是否能自然说出“去游历赚灵石，再闭关涨修为”。
- 设计一致性审计：战斗、资源事件、损耗事件是否都服务于同一主循环，而不是各自为政。
- 资产接入质量审计：新增事件是否有稳定入口、稳定结算和稳定提示，而不是只写成一句日志。
