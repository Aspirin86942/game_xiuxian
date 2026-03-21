# 03. 实现契约

## 1. 目的

本文件写给未来要按炼丹、制作与丹药系统改代码的人，用于定义哪些数据、流程、UI 与测试不能被静默改坏。

## 2. 代码入口

- 静态物品与参数入口：`story-data.js` 中的 `CONFIG`、`ITEMS` 与新增 `ALCHEMY_RECIPES`。
- 核心状态与结算入口：`game-core.js` 中的 `createInitialState()`、`mergeSave()`、`changeItem()`、`applyCosts()`、`performItemAction()`、新增 `craftRecipe()`、新增 `resolveNaturalRecovery()`、战斗结算 `settleCombat()`。
- 页面渲染与事件入口：`game.js` 中的页面切换、`renderAlchemyPage()`、导航点击、炼丹事件代理与自然回血定时器。
- 页面结构与锚点入口：`index.html` 中新增 `alchemy` 页面与底部导航按钮。
- 样式入口：`style.css` 中的 `.page`、`.bottom-nav` 与炼丹页样式。

## 3. 稳定数据契约

- `state.inventory` 必须继续保持 `itemId -> count` 的对象语义，不能无说明改成格子数组或多层对象。
- `state.breakthroughBonus` 在本轮仍保持单一临时数值语义，不升级为多药力栈对象。
- 新增 `state.recovery.lastCheckedAt` 时，必须由 `createInitialState()` 与 `mergeSave()` 提供默认值与兼容回填。
- `ALCHEMY_RECIPES[recipeId]` 至少必须包含：
  - `id`
  - `name`
  - `category`
  - `costs`
  - `outputs`
  - `summary`
  - `unlock`
- 配方系统只能读写已有 `itemId`，不得发放未在 `ITEMS` 中定义的隐形产物。
- 不修改 `xiuxian_save_v2` 的键名。

## 4. 稳定流程契约

未来所有配方与丹药流程，都必须收敛到同一套顺序语言：

1. 验证：确认当前不在战斗态、配方存在、库存足够、解锁条件满足。
2. 扣料：先执行材料扣减，不允许先发放产物再发现资源不足。
3. 产出 / 效果：发放成品丹药，或在背包动作中应用成品效果。
4. 重算：涉及气血上限、被动或突破率时统一走状态重算或等价集中入口。
5. 揭示：给出玩家可读反馈，包括成功提示、缺料提示、锁定原因。
6. 持久化：UI 渲染后写回存档。

必须额外保住的顺序约束：

- 炼丹与背包使用不能各发明一套不同的扣费语言。
- 自然回血只能在非战斗态结算，不能污染离线吐纳修为逻辑。
- 高阶突破丹的使用限制必须在结算前阻断，而不是允许叠加后再裁剪。

## 5. 稳定 UI 契约

- 丹炉页必须存在于主导航，不能把配方入口藏进背包或剧情深层交互里。
- 丹炉页至少显示：
  - 当前气血摘要
  - 非战斗保底回血规则文案
  - 配方列表
  - 每个配方的材料成本
  - 当前缺料或锁定原因
- 背包弹层继续负责成品丹药使用，不承担主配方列表。
- 战斗模态框开启时，不能切到丹炉页，也不能从背包中使用回血丹或突破丹。
- 新增第 6 个底部导航按钮后，`375x667` 下不得出现换行、遮挡或不可点击区域。

## 6. 禁止项

- 禁止把多材料炼丹强行塞进现有 `performItemAction()` 的单物品模型。
- 禁止复用 `offlineTraining` 作为自然回血时间戳。
- 禁止允许突破丹无限叠加后再靠 `0.95` 上限掩盖问题。
- 禁止在 UI 上隐藏当前配方所需材料或锁定原因。
- 禁止在战斗中允许切入丹炉页。
- 禁止新增只写文案、不进入 `ITEMS` 或 `ALCHEMY_RECIPES` 的“假丹药”。

## 7. 可改项

- 允许在不改基本模型的前提下，微调配方材料成本与掉落来源。
- 允许在规则书同步更新的前提下，微调基础丹药与高阶突破丹的数值。
- 允许后续把更多中后期丹药接入系统，但必须继续遵守“材料 -> 配方 -> 成品”的统一接口。

## 8. 最低测试契约

- 兼容测试：旧存档缺 `recovery` 字段时，`mergeSave()` 仍能回填并保持可读。
- UI 契约测试：底部导航新增 `alchemy` 后仍可切换，丹炉页关键锚点存在。
- 行为测试：
  - 配方成功时正确扣料并发放产物
  - 材料不足时阻断且库存不污染
  - 非战斗自然回血按间隔生效并在 `50% maxHp` 封顶
  - 高阶突破丹仅目标境界可用，已有药力时不可重复服用
  - 战斗结算不再沿用旧的 `65% / 45%` 固定回血
- 自动化命令：
  - `python "C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook.py" --root "D:\Program_python\game_xiuxian\docs\alchemy-and-crafting-system"`
  - `python "C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook_series.py" --root "D:\Program_python\game_xiuxian\docs" --series-dir "rulebook-series"`
  - `python "C:\Users\Aspir\.codex\skills\rulebook-implementer\scripts\audit_rulebook_contract.py" --root "D:\Program_python\game_xiuxian\docs\alchemy-and-crafting-system"`
  - `npm exec -- node -v`
  - `npm run test:smoke`
  - `npm run test:e2e`

## 9. 变更分级

- A 级：改 `inventory` 基本模型、改存档键、开放战斗内用药、改自然回血与离线吐纳的时间戳归属；必须先改规则书，再改代码，再补全兼容测试。
- B 级：改基础丹药或高阶突破丹数值、改自然回血阈值、改战斗结算保命血线；必须同步参数表、测试场景和受影响断言。
- C 级：在现有契约内新增一个配方、新增一个材料投放来源或新增一条丹炉页说明；必须补内容接口检查与最小测试。

## 10. 设计验收

- 玩家可解释性审计：玩家能否一眼说清材料、配方、成品丹药分别是干什么的。
- 设计一致性审计：炼丹、背包使用、自然回血、突破准备是否共享统一的流程语言。
- 资产接入质量审计：新增丹药是否有明确材料来源、明确配方、明确效果、明确锁定条件。
- 兼容性审计：旧存档缺新字段、玩家战斗中切页、突破丹重复使用、材料不足时是否都能安全降级。
