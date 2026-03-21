# 01. 当前实现行为

## 1. 机制目标

记录《灵光修仙传》储物、灵石消费与物品作用系统当前已经实现的行为事实，而不是理想设计。

当前代码已经实现的最小闭环是：

- 通过剧情与战斗获得物品。
- 把物品写入 `state.inventory`。
- 在背包弹窗中展示持有物。
- 对 `usable: true` 的物品提供“使用”按钮。
- 在剧情 choice 中用 `costs` 与 `requirements.items` 控制资源门槛。
- 对 `飞剑`、`护身法器`、`曲魂` 这三类物品按“持有即生效”方式改写战斗数值。

## 2. 术语表

| 中文名 | 代码名 | 当前含义 |
| --- | --- | --- |
| 背包 / 储物袋 | `state.inventory` | 以 `itemId -> count` 保存数量的对象，没有容量上限与格子概念。 |
| 物品定义表 | `ITEMS` | 统一写在 `story-data.js` 的静态配置，当前字段以 `name/type/description/usable/effect` 为主。 |
| 可直接使用物品 | `usable: true` | 当前只要物品定义标记为 `usable: true`，背包 UI 就会显示“使用”按钮。 |
| 剧情资源代价 | `choice.costs` | 章节选项消耗的库存资源，当前已用于灵石扣费。 |
| 剧情资源门槛 | `requirements.items` | 章节或选项要求的持有条件，不满足时流程会阻断。 |
| 物品效果 | `item.effect` / `choice.effects` | 当前可改修为、突破加成、生命回复、库存、关系、路线分与旗标。 |
| 持有型被动 | `recalculateState` 中的库存判定 | 当前没有独立字段，靠检测 `feijian/hujian/quhun` 是否持有来附加属性。 |
| 灵石 | `lingshi` | 当前 `type` 仍是 `material`，已能用于剧情 choice 扣费，但尚不能主动吸收。 |

## 3. 覆盖范围

当前机制覆盖：

- `inventory` 的创建、读档合并与数量读取。
- 剧情和战斗掉落写入 `inventory`。
- 直接使用丹药类物品。
- 剧情资源门槛、剧情扣费与扣费失败阻断。
- 少量硬编码持有型被动加成。
- 背包弹窗的展示与点击使用。

当前机制不覆盖：

- 独立商店、摆摊、交易或购买 UI。
- 灵石主动吸收、转化率或吸收按钮。
- 装备位、法宝位、容量上限、自动整理。
- 一般化的被动效果框架；当前只有三件特殊物品写死在状态重算里。
- 炼丹、制作、合成、拆分、批量使用。

## 4. 状态字段

- `state.inventory`：库存主字段，默认值为 `{}`，数量通过 `itemId -> count` 记录。
- `ITEMS[itemId].type`：当前已有 `material / treasure / quest / pill / weapon / armor / companion` 等分类。
- `ITEMS[itemId].usable`：直接决定背包 UI 是否展示“使用”按钮。
- `ITEMS[itemId].effect`：当前仅在 `usable: true` 的物品上被 `useItem` 读取。
- `choice.costs`：章节选项的资源代价，当前已确认用于 `lingshi`。
- `requirements.items`：章节或选项的库存门槛。
- `choice.effects.items`：剧情选择带来的物品增减。
- `state.playerStats`：会被持有型被动与可用物品间接改写的派生数值。

## 5. 结算顺序

当前实现存在三条已成型流程：

### A. 直接使用物品

1. 玩家点击导航栏 `储物` 打开背包弹窗。
2. `renderInventory()` 根据 `state.inventory` 渲染物品卡片。
3. 仅当 `item.usable` 为真时，卡片显示“使用”按钮。
4. 点击后 `game.js` 调用 `GameCore.useItem(state, itemId)`。
5. `useItem()` 先检查物品存在且 `usable: true`，再检查库存是否大于 0。
6. 校验通过后，先把库存 `-1`，再调用 `applyEffects(item.effect)`。
7. `applyEffects()` 会处理修为、突破加成、治疗、库存、关系、路线分、旗标与地点变更，并在末尾触发 `recalculateState()`。
8. `useItem()` 追加一条“使用 xxx”的日志，随后由 `game.js` 负责 `render()` 与 `saveGame()`。

### B. 剧情 choice 扣费

1. 剧情进入 `choices` 模式后，选项列表由 `story.choices` 提供。
2. 若选项已被判定为 `disabled`，`chooseStoryOption()` 会直接返回错误。
3. 未禁用时，先调用 `applyCosts(choice.costs)`。
4. `applyCosts()` 先用 `canAffordCosts()` 检查是否负担得起，再逐项调用 `changeItem(-amount)` 扣减库存并写日志。
5. 扣费成功后，才调用 `applyEffects(choice.effects)`、记录剧情抉择日志、追加决策历史与后续回响。
6. 若扣费失败，流程立即返回“资源不足，无法支付代价”，后续效果不会继续结算。

### C. 持有型被动生效

1. 任意会进入 `recalculateState()` 的流程结束时，系统都会重算基础属性。
2. 当前只检测三个物品：`feijian` 持有则攻击 `+6`，`hujian` 持有则防御 `+4`，`quhun` 持有则最大生命 `+12`。
3. 只要库存数量大于 0 即视为生效，重复持有不会继续叠加。
4. 当前没有专门的“装备/卸下”过程，也没有对应的 UI 文案揭示入口。

## 6. UI 揭示与操作入口

选前显示：

- 导航栏存在固定入口：`<button class="nav-btn" data-action="inventory">储物</button>`。
- 背包弹窗固定使用 `#inventory-modal`、`#inventory-list`、`#close-inventory`。
- 物品卡片始终显示 `name`、数量和 `description`。
- `usable: true` 的物品会显示“使用”按钮；非 `usable` 物品当前无其他操作按钮。

选后显示：

- 直接使用成功后，主界面修为等状态会在重新渲染后刷新。
- 剧情扣费与剧情获得物品会写入日志区。
- 资源不足时会通过 `window.alert` 给出错误文本。
- 当前没有“灵石吸收成功”“被动效果已启用”这类专门提示。

## 7. 兼容策略

- `createInitialState()` 默认把 `inventory` 初始化为 `{}`，因此新存档天然可读。
- `mergeSave()` 会先用完整默认状态起盘，再把旧存档中的 `inventory` 浅合并到新状态。
- `offline-smoke.js` 已验证旧存档缺少较新字段时可以被回填，不会因缺 `inventory` 相关新字段而崩溃。
- 当前没有独立的 item schema 版本号；兼容策略主要依赖 `mergeSave()` 的默认值回填。

## 8. 边界与异常

- `getInventoryCount()` 会把不存在或非法读取结果按 `0` 处理，不让负数继续向外传播。
- `changeItem()` 在物品不存在、`delta === 0`、或扣减后会小于 0 时返回 `false`。
- `useItem()` 对“物品不存在 / 不可直接使用 / 物品不足”三类情况都会返回明确错误。
- `tests/story-smoke.js` 会持续断言库存不得出现负数，并校验灵石不足时剧情 choice 被禁用。
- 当前 `applyEffects().items` 若传入未定义物品或无法扣减的数量，会静默跳过该条目；这是现状事实，不是目标态推荐做法。

## 9. 已确认差距（非当前行为）

- 当前没有独立商店/交易面板，因此“买东西”还停留在剧情选择级别，不构成可复用系统。
- 当前灵石只能在剧情 `costs` 中花掉，尚不能作为主动吸收资源。
- 当前没有统一的 `passive` 分类字段；持有型被动只存在于 `recalculateState()` 的硬编码判断中。
- 当前背包 UI 只有“展示 + 使用”两态，尚无“吸收”“购买”“剧情锁定中”的专门揭示。
