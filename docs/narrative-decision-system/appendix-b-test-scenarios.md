# Appendix B. 测试场景与设计审计

## 1. 目的

本附录集中存放固定路线样本、设计审计入口和调参实验协议，避免把正文文件塞成测试清单。

## 2. 固定路线样本

### 2.1 低风险主线样本

- 目标：验证保守推进是否仍能稳定通关或接近终局。
- 重点观测：
  - `battleWill` 是否过早封顶
  - `tribulation` 是否仍在可控区间
  - 回响是否能解释“稳”的长期代价

### 2.2 高风险压线样本

- 目标：验证高风险线是否仍可被熟练玩家管理，而不是随机暴毙。
- 重点观测：
  - `tribulation` 是否存在可管理的压线空间
  - 高风险收益是否足够被玩家体感到
  - 死亡是否可解释

### 2.3 小境界事件穿插样本

- 目标：验证主线与小境界是否仍共用同一 choice 闭环。
- 重点观测：
  - 小境界 choice 是否写入 `recentChoiceOutcome`
  - 小境界完成后 `storyCursor` 是否正确返回主线

## 3. 玩家可解释性审计

每次重要改动后，至少检查：

1. 玩家能否理解刚才的选择为何得到该结果。
2. 玩家能否理解自己为何偏向某条路线。
3. 玩家若死于走火入魔，能否从余波、日志、面板理解原因。

## 4. 设计一致性审计

每次重要改动后，至少检查：

1. 选前隐藏、选后揭示是否仍成立。
2. 风险收益是否仍以长期积累为主，而非随机暴毙。
3. 主线与小境界是否仍共用同一 choice 结算闭环。
4. 数值余波是否仍先于叙事回响展示。

## 5. 资产接入质量审计

每次新增章节或事件后，至少检查：

1. 是否真正写入系统状态。
2. 是否真正被后续读取。
3. 是否不是伪分支。
4. 是否不会破坏 late branch 承接。

## 6. 调参实验协议

- 每次只改一个主参数组，其他保持不动。
- 先跑规则书校验，再做固定路线人工验证。
- 高风险线至少测两条：保守压线和激进堆收益。
- 若参数改动影响回响排序或死亡语义，必须追加设计一致性审计。

## 7. 自动化与文档校验入口

- 文档校验：
  - `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook.py --root D:\Program_python\game_xiuxian\docs\narrative-decision-system`
  - `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook_series.py --root D:\Program_python\game_xiuxian\docs --series-dir rulebook-series`
- 代码变更后的最低自动化入口：
  - `npm run test:smoke`
  - `npm run test:e2e`
  - `npm test`
