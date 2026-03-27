Original prompt: 按“先拆逻辑层，保留三大入口”的结构重构计划执行一期改造，保持 `story-data.js`、`game-core.js`、`game.js` 作为稳定 façade，不改玩法闭环、存档结构、DOM 锚点、测试入口与加载模型。

## 当前状态

- 一期结构重构已落地：
  - `game-core.js` 已收敛为 façade + 组装层
  - `game.js` 已收敛为运行时入口
  - 新增 `src/shared`、`src/core`、`src/ui`
  - `index.html` 已补内部脚本装载顺序
  - `tests/ui-contract-smoke.js` 已切到 façade / 运行时契约断言
- 当前边界保持不变：
  - `window.StoryData`
  - `window.GameCore`
  - Node `require('./game-core.js')`
  - 存档键 `xiuxian_save_v2`

## 已处理回归

- 恢复 `normalizeRecentChoiceOutcome` 旧夹紧语义
- 恢复 `normalizeRealmState` 旧 safe score 处理顺序
- 恢复离线收益平均值与时长格式旧口径
- 修复字符串 key 的 `chapterChoices` 章节查找
- 恢复 legacy 分支回响回填与第 24 章旧标题 override

## 本轮计划

- 补齐一期交付记录
- 重跑 `npm run test:smoke`
- 重跑 `npm run test:e2e`
- 重跑 `npm test`
- 整理可继续事项，但不自动进入二期 `story-data.js` 内容层拆分

## 本轮结果

- `npm run test:smoke` 通过
- `npm run test:e2e` 通过，42/42
- `npm test` 通过

## TODO / Next

- 若用户确认继续二期，再单独拆 `story-data.js` 内容层，并继续保留 façade
- 若用户要发版或提 PR，再按提交计划整理 commit

## Issue #22 执行记录（本轮）
- 已按“借气质不借原句”口径重写 story-data.js 的核心旁白、章节摘要、getChapterEchoes()、选择代价提示与终局文案。
- 已把玩家可见 UI/运行时标签从“分支影响/支线”改到“因果回响/旧事”口径，并同步到 src/core/story.js、src/core/world.js、src/ui/renderers.js、index.html。
- 已更新 	ests/story-smoke.js 与 	ests/e2e/story.spec.js 的文案断言，并新增禁词烟雾检查。
- 待办：先跑 
pm run test:smoke，再根据失败项补漏；随后跑 
pm run test:e2e 与 
pm test。
- 验证结果：
pm run test:smoke 通过；
pm run test:e2e 通过（50/50）；
pm test 通过。
- 说明：本轮仅调整玩家可见文本与测试断言，未改动存档结构、章节推进与 DOM 锚点。
