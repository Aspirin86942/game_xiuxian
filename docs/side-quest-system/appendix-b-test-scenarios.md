# 附录 B. 测试场景

## 1. 目的

本附录收纳支线任务系统的设计审计场景、当前自动化覆盖与未来补测入口。

## 2. 当前已存在的最小覆盖

- `tests/story-smoke.js`
- 已验证在特定 `storyProgress` 与旗标组合下，`getAvailableSideStories(state)` 能返回 `旧药账`、`灵矿幸存者`、`残图余波`、`飞升前夜` 等标题。
- 已验证旧存档缺少 `sideQuests` 时会自动回填。
- 已验证 `available -> active -> completed`、未接取跨窗 `missed`、进行中跨窗 `failed`、奖励不可重复结算。
- `tests/e2e/story.spec.js`
- 已验证同行回响区可见。
- 已验证正式支线可在卡内接取并完成。
- 已验证错过窗口的正式支线会显示 `missed` 结果态。

## 3. 文档阶段必跑校验

- `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook.py --root D:\Program_python\game_xiuxian\docs\side-quest-system`
- `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook_series.py --root D:\Program_python\game_xiuxian\docs --series-dir rulebook-series`

## 4. 后续仍应补齐的行为测试

1. 主线推进与支线命中同回合出现时，主线优先且支线不会丢失。
2. 同一 `exclusiveGroup` 的两个任务同时满足时，只允许一个进入 `available` 或 `active`。
3. `failed` 结果态也应补 e2e 可见性覆盖，不只停留在 smoke。
4. 进行中支线存在时，其他 `available` 任务的禁用接取态应补 UI 覆盖。
5. 更高主线阶段的正式支线卡密度与滚动体验应补回归场景。

## 5. 后续仍应补齐的 UI 契约测试

1. 任务区在 375x667 视口下不会破坏单屏体验。
2. 线索列表和正式任务列表不会同时无上限堆叠。
3. 玩家能看见任务状态、奖励概览和失败/错过原因。
4. 当前只有 legacy 线索层时，退化界面仍然可用。

## 6. 未来实现必须补齐的内容审计测试

1. 同类任务 choice 不会只换文案不换后果。
2. 原著改写后的任务不会直接出现露骨或不适配当前项目口径的桥段。
3. 每条正式任务至少有一个后续读取点。
4. 唯一奖励任务不会被内容作者误写成普通可重复任务。
