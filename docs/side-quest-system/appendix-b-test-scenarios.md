# 附录 B. 测试场景

## 1. 目的

本附录收纳支线任务系统的设计审计场景、当前自动化覆盖与未来补测入口。

## 2. 当前已存在的最小覆盖

- `tests/story-smoke.js`
- 已验证在特定 `storyProgress` 与旗标组合下，`getAvailableSideStories(state)` 能返回 `旧药账`、`灵矿幸存者`、`残图余波`、`飞升前夜` 等标题。
- 已验证 `sideQuests` 作为退休字段不会再被回填；旧 v8 存档若缺少新增 `commissions` 记录，会在导入 / 规范化流程中由 `normalizeCommissionRecords()` 自动补齐。
- 已验证 16 条地点委托定义完整接入，且黄枫谷 / 乱星海的 `visibleLocations` 复用各自地点族别名。
- 已验证 `available -> active -> completed/failed`、单活跃限制、奖励不可重复结算。
- `tests/e2e/story.spec.js`
- 已验证同行回响区可见。
- 已验证正式地点委托可在卡内接取并完成。
- 已验证黄枫谷与乱星海场景可显示对应委托与结果留痕。

## 3. 文档阶段必跑校验

- `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook.py --root D:\Program_python\game_xiuxian\docs\side-quest-system`
- `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook_series.py --root D:\Program_python\game_xiuxian\docs --series-dir rulebook-series`

## 4. 后续仍应补齐的行为测试

1. 主线推进与委托风声命中同回合出现时，主线优先且委托不会丢失。
2. 黄枫谷与乱星海的别名地点切换后，委托榜仍应命中同一地点族。
3. `failed` 结果态也应补 e2e 可见性覆盖，不只停留在 smoke。
4. 进行中委托存在时，其他 `available` 任务的禁用接取态应补 UI 覆盖。
5. 更高地点阶段的正式委托卡密度与滚动体验应补回归场景。

## 5. 后续仍应补齐的 UI 契约测试

1. 任务区在 375x667 视口下不会破坏单屏体验。
2. 正式地点委托与 legacy 旧事线索不会被渲染成同层混排列表。
3. 玩家能看见委托状态、奖励概览和失败原因。
4. 当前只有 legacy 旧事 fallback 时，退化界面仍然可用。

## 6. 未来实现必须补齐的内容审计测试

1. 同类任务 choice 不会只换文案不换后果。
2. 原著改写后的任务不会直接出现露骨或不适配当前项目口径的桥段。
3. 每条正式任务至少有一个后续读取点。
4. 唯一奖励任务不会被内容作者误写成普通可重复任务。
