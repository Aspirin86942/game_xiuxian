# 03. 实现契约

## 1. 目的

本文件写给未来要按储物、灵石消费与物品作用系统改代码的人，用于定义哪些数据、流程、UI 与测试不能被静默改坏。

## 2. 代码入口

- 静态物品定义入口：`story-data.js` 中的 `ITEMS`。
- 库存与效果结算入口：`game-core.js` 中的 `createInitialState()`、`mergeSave()`、`getInventoryCount()`、`changeItem()`、`applyCosts()`、`applyEffects()`、`useItem()`、`recalculateState()`。
- 背包 UI 与点击入口：`game.js` 中的 `renderInventory()` 与 `inventoryList` 事件代理。
- 背包弹窗结构入口：`index.html` 中的 `data-action="inventory"`、`#inventory-modal`、`#inventory-list`。

## 3. 稳定数据契约

- `state.inventory` 必须继续保持 `itemId -> count` 的对象语义，不能无说明改成数组、格子对象或多层嵌套结构。
- `createInitialState()` 与 `mergeSave()` 必须继续为 `inventory` 提供可回填默认值，不能让旧存档因缺字段而崩溃。
- `ITEMS[itemId].usable` 仍是直接使用按钮的稳定开关；若未来扩展到 `absorb` 或其他行为，必须新增明确定义，不得重载 `usable` 语义。
- `choice.costs`、`requirements.items`、`choice.effects.items` 仍是剧情与物品系统的稳定挂钩点，不能改名后只在聊天里口头通知。
- `xiuxian_save_v2` 与当前 `inventory` 基本模型默认保持兼容；如需破坏式变更，必须先升级规则书、兼容方案与测试。
- 炼丹与配方本体已迁到 `alchemy-and-crafting-system`；本册只继续约束这些产物如何进入 `inventory` 并被通用物品接口消费。

## 4. 稳定流程契约

未来所有涉及物品的代码路径，都必须尽量收敛到同一套流程语言：

1. 验证：确认物品存在、动作合法、库存足够、条件满足。
2. 结算：执行库存增减或资源支出，不允许先给效果再发现资源不够。
3. 效果：应用修为、突破、生命、旗标、关系或地点变更。
4. 重算：统一走 `recalculateState()` 或等价的集中重算入口。
5. 揭示：给出玩家可读反馈，并同步日志或错误提示。
6. 持久化：在 UI 渲染后把状态写回存档。

必须额外保住的顺序约束：

- 剧情扣费、手动使用、未来灵石吸收、持有型被动，不能各自发明一套不一致的结算顺序。
- 资源不足时必须在结算前失败，不能先改状态后回滚。
- 持有型被动若继续采用“持有即生效”，必须在任何库存变更后都能被状态重算捕捉到。

## 5. 稳定 UI 契约

- 背包入口必须继续可从主导航到达，不能把库存能力藏到剧情页深层交互里。
- 背包卡片至少要显示名称、数量、描述，避免玩家拿到物品却不知道它是什么。
- 只有当前允许的动作才能暴露为按钮：`direct-use` 显示“使用”，未来若接入 `absorb`，必须只对允许吸收的资源显示对应操作。
- 本册不再承载炼丹页；若成品丹药由 `alchemy-and-crafting-system` 发放，本册仍只保证它们能在背包中被一致显示和消费。
- 在未实现独立商店/交易系统前，不得在 UI 上先暴露“购买”“出售”“装备位”等入口。
- 资源不足、不可使用、未实现的动作，必须有明确提示，不能点击后无反馈。

## 6. 禁止项

- 禁止静默改变 `inventory` 存档结构而不补 `mergeSave()`。
- 禁止让库存出现负数，或让 `changeItem()` 失败后继续执行后续效果。
- 禁止在未更新规则书的情况下，把当前默认的“持有即生效”改成“必须装备后生效”。
- 禁止把炼丹、配方或自然回血逻辑重新塞回本册对应的实现契约，造成与 `alchemy-and-crafting-system` 双头主责。
- 禁止把灵石既当货币又当吸收资源，却不说明优先级、提示文案与失败边界。
- 禁止新增只改文案不改系统读取点的“假物品”。
- 禁止把多个不同入口写成不同的扣费语言，例如剧情用 `costs`、背包用另一套隐藏字段、吸收再用第三套临时逻辑。

## 7. 可改项

- 允许在不改基本模型的前提下，扩充 item taxonomy 的说明层。
- 允许微调已存在的丹药效果、剧情灵石代价、返还量与持有型被动强度，但必须同步更新参数表与测试场景。
- 允许在未来新增灵石吸收行为，但必须先补完规则书参数位、UI 契约、失败路径与自动化测试。
- 允许从 `alchemy-and-crafting-system` 新增新的成品丹药，只要它们继续遵守本册的库存模型、背包渲染与直接使用接口。

## 8. 最低测试契约

- 兼容测试：旧存档缺 `inventory` 相关字段时，`mergeSave()` 仍能回填为可用状态。
- UI 契约测试：背包入口、弹窗、列表渲染与可直接使用按钮保持可用。
- 行为测试：丹药使用成功、资源不足阻断、剧情扣费不出负数、持有型被动稳定生效。
- 自动化命令：
  - `npm run test:smoke`
  - `npm run test:e2e`
  - `python "C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook.py" --root "D:\Program_python\game_xiuxian\docs\inventory-and-item-system"`
  - `python "C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook_series.py" --root "D:\Program_python\game_xiuxian\docs" --series-dir "rulebook-series"`

## 9. 变更分级

- A 级：重定义灵石角色、持有型被动模型、`inventory` 存档结构、统一结算顺序或 UI 主入口；必须先改规则书，再改代码，再补全回归。
- B 级：调整丹药效果、剧情代价、返还量、被动数值、描述与揭示方式；必须同步更新参数表、测试场景与受影响断言。
- C 级：在现有契约内新增一个物品、新增一个剧情扣费点或新增一个掉落来源；必须补内容接口检查与最小测试。

## 10. 设计验收

- 玩家可解释性审计：玩家是否能说清这个物品是可直接使用、剧情支付、持有被动，还是尚未开放操作。
- 设计一致性审计：剧情扣费、背包使用、未来灵石吸收是否共享同一种流程语言。
- 资产接入质量审计：新增物品是否有明确字段、明确来源、明确效果、明确失败路径。
- 兼容性审计：旧存档读档、库存为 0、物品不足、未来新增字段缺失时是否都能安全降级。
