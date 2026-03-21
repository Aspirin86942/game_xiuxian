# 附录 B：测试与设计验收场景

## 1. 当前自动化已覆盖场景

### 场景 1：空背包不会出现负库存

- Given：剧情推进与资源检查会多次读写 `inventory`
- When：`tests/story-smoke.js` 跑完整主线与若干分支
- Then：`assertNoNegativeInventory(state)` 始终成立

### 场景 2：灵石不足时剧情 choice 被阻断

- Given：第 9 章 `buy_back_trust` 需要 `lingshi`
- When：玩家库存中没有足够灵石
- Then：choice 被标记为 `disabled`，执行时返回错误，库存仍保持非负

### 场景 3：丹药可直接使用并同步主界面与存档

- Given：背包内已有 `juqidan`
- When：在 `tests/e2e/inventory.spec.js` 中点击“使用”
- Then：修为文本刷新、主按钮切换、存档中的 `juqidan` 数量减少

### 场景 4：旧存档兼容回填

- Given：只包含少量旧字段的历史存档
- When：`tests/offline-smoke.js` 调用 `mergeSave()`
- Then：`inventory`、`offlineTraining`、`storyConsequences` 等较新字段都能安全补齐

## 2. 文档要求的当前验收场景

### 场景 5：非 `usable` 物品不出现直接使用按钮

- Given：背包里有 `lingshi`、`lingcao`、`shengxianling`
- When：打开背包弹窗
- Then：物品可见，但不会出现“使用”按钮
- 备注：当前应以 UI 合同审阅或新增断言补强

### 场景 6：持有型被动随库存存在而生效

- Given：同一份存档分别持有与不持有 `feijian / hujian / quhun`
- When：调用 `recalculateState()`
- Then：攻击、防御、最大生命按规则增减
- 备注：当前 `tests/story-smoke.js` 已间接覆盖，后续可补更直观断言

### 场景 7：剧情扣费后再结算效果

- Given：某个 choice 同时存在 `costs` 与 `effects`
- When：玩家点击该 choice
- Then：必须先通过 `applyCosts()`，再执行 `applyEffects()`，资源不足时后续效果不落账

### 场景 8：日志与失败提示不丢失

- Given：玩家尝试使用不可直接使用物品，或尝试支付资源不足的 choice
- When：操作失败
- Then：返回明确错误文本，不得静默失败

## 3. 目标态补测场景（当前未实现）

### 场景 9：灵石主动吸收

- Given：背包中有灵石且系统已实现吸收入口
- When：玩家选择“吸收灵石”
- Then：灵石减少、成长收益到账、状态重算、日志可见、存档同步
- 当前状态：未实现，只能保留为未来测试入口

### 场景 10：灵石消费与吸收存在显式 tradeoff

- Given：玩家同时面临剧情支付与成长吸收两种灵石用途
- When：在同一阶段选择其中一种
- Then：系统要能解释放弃了什么、换来了什么、未来哪条路受影响
- 当前状态：未实现，只能在规则书中预留验收语言

### 场景 11：未来独立交易面板不破坏现有背包入口

- Given：系统将来新增商店/交易面板
- When：打开背包与商店
- Then：两者职责清晰，库存结算顺序一致，旧背包入口仍可用
- 当前状态：未实现，不应提前暴露按钮

## 4. 设计审计清单

- 玩家能否一眼看出某个物品是剧情物、可直接使用物、还是持有型被动。
- 灵石是否至少始终保留一条明确消费路径。
- 任何新加的“特殊奇遇物品”是否都有稳定系统读取点，而不是只有文案名词。
- 新规则是否继续保证旧存档可读、库存不为负、失败路径可见。
