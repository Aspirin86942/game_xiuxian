# AGENTS.md

## 1) 文件目的

本文件用于约束 Codex 在本仓库中的工作方式。
目标：保证改动以**可验证结果**为准，并优先维护：

1. Correctness（正确性）
2. Maintainability（可维护性）
3. Observability（可观测性）

---

## 2) 项目概览

项目名称：**《灵光修仙传》**

项目类型：

- 2D 古风水墨风文字修仙 RPG 网页游戏
- 静态前端项目
- 浏览器原生运行
- 无后端
- 无数据库
- 当前仓库已接入 Node.js 测试与 Playwright 回归链路

剧情参考：

- 《凡人修仙传》

技术栈：

- Vanilla JavaScript (ES6+)
- HTML5 + CSS3
- LocalStorage（本地存储）用于存档
- Web Audio API 用于音效
- Node.js 仅用于本地静态服务、烟雾测试、端到端回归
- Playwright 用于移动端视口回归

当前仓库事实：

- 已检测到 `package.json` 与 `package-lock.json`
- 已检测到 `playwright.config.js`
- 已检测到 `tests/` 目录
- 当前未检测到 ESLint / Prettier 配置

---

## 3) 仓库结构

```text
.
├── index.html                # 主页面
├── style.css                 # 水墨风样式
├── game.js                   # DOM 绑定、交互编排、页面行为
├── game-core.js              # 核心状态、存档兼容、剧情/数值规则
├── story-data.js             # 静态数据：CONFIG、境界、物品、剧情、地点、NPC
├── package.json              # npm 脚本与 Playwright 依赖
├── package-lock.json         # npm 锁文件
├── playwright.config.js      # Playwright 配置，固定 375x667 视口
├── tests/
│   ├── story-smoke.js        # 剧情链路烟雾测试
│   ├── offline-smoke.js      # 离线挂机与旧存档兼容测试
│   ├── ui-contract-smoke.js  # UI / DOM 契约烟雾测试
│   ├── serve-static.js       # 本地静态服务，端口 4173
│   ├── test_node_smoke.py    # 用 pytest 包装 Node 烟雾脚本的辅助入口
│   └── e2e/                  # Playwright 端到端回归用例
├── AGENTS.md                 # Codex 仓库级指令
└── CLAUDE.md                 # 其他协作说明
```

说明：

- 默认只在现有结构上增量修改
- 不擅自引入构建系统、框架、模块化重构
- 不为小改动做大规模目录重组，除非用户明确要求
- `story-data.js` 是静态数值与剧情数据的事实来源，不要在别处复制一套长期分叉的常量表

---

## 4) 开发与运行命令

默认命令：

```bash
# 直接浏览器打开
start index.html

# 使用仓库自带静态服务（Playwright 同源）
node tests/serve-static.js

# 烟雾测试
npm run test:smoke

# 端到端测试
npm run test:e2e

# 全量默认测试
npm test
```

补充说明：

- 当前锁文件为 `package-lock.json`，包管理器统一使用 `npm`
- `npm install` 后会触发 `postinstall` 安装 Playwright Chromium
- `tests/serve-static.js` 监听 `http://127.0.0.1:4173`
- 不编造不存在的 npm script
- 不假设仓库存在 lint / format / typecheck 脚本
- 任何命令执行前，先检查仓库中是否真实存在对应配置

---

## 5) 固定设计约束（强制）

### 5.1 画面与尺寸

- 游戏容器固定为 `375x667`
- Viewport 必须保持移动端固定宽度与禁缩放约束
- Playwright 视口以 `375x667` 为准
- 默认不允许页面滚动
- 新增 UI 必须在固定边界内完成布局
- 不得引入会破坏单屏体验的改动

### 5.2 风格一致性

- 保持“古风水墨风 + 文字修仙”的视觉与文本风格
- 按钮、面板、提示文案、剧情事件必须与修仙题材一致
- 不得引入明显现代互联网黑话、科技产品话术、赛博风格 UI
- 已有文案与剧情回响应优先沿用现有叙事口径

### 5.3 核心玩法不可无故破坏

除非用户明确要求修改，否则以下系统必须保持可用：

1. Cultivation（修炼）

   - 点击“吐纳聚气”获得修为

2. Breakthrough（突破）

   - 修为达到上限后切换为“渡劫突破”

3. Encounters（奇遇）

   - 按既有概率触发随机事件

4. Idle System（挂机）

   - 达到对应境界后解锁自动修炼
   - 离线挂机结算不可失效

5. Inventory（背包）

   - 奇遇与剧情获得物品
   - 丹药与关键道具使用逻辑正常

6. Adventure / Combat（游历 / 战斗）

   - 游历进入自动回合制战斗

7. Settings（设置）

   - 音效 / 音乐开关可用并能持久化

8. Story System（剧情）

   - 主线推进、章节选择、剧情页推进保持可用

9. Save System（存档）

   - LocalStorage 自动存档
   - 旧存档兼容不可无故破坏

---

## 6) 游戏领域设定与数据事实

### 6.1 存档键与版本

- 当前 LocalStorage 键：`xiuxian_save_v2`
- 当前默认存档版本：`4`
- 若修改存档结构，必须同步维护 `game-core.js` 中的 `createInitialState` 与 `mergeSave`

### 6.2 核心常量（以 `story-data.js` 为准）

- `encounterChance = 0.15`
- `autoEncounterChance = 0.08`
- `baseBreakthroughRate = 0.8`
- `clickGainMin = 1`
- `clickGainMax = 5`
- `autoGainRatio = 0.6`
- `failPenaltyRate = 0.3`
- `autoCultivateInterval = 1000`
- `offlineCultivateMaxDurationMs = 8 * 60 * 60 * 1000`
- `itemDropChance = 0.2`

### 6.3 境界与数值来源

当前大境界：

- 炼气
- 筑基
- 金丹
- 元婴
- 化神

每个大境界默认包含：

- 初期
- 中期
- 后期

说明：

- 各境界 `baseReq`、突破率衰减、怪物数值、物品效果、剧情章节要求，统一以 `story-data.js` 为事实来源
- 不要在 `AGENTS.md` 里手抄一份易过时的完整章节表
- 若修改剧情条件，必须先核对 `story-data.js` 与 `game-core.js` 的读取逻辑是否一致

### 6.4 关键 NPC 与剧情数据

当前默认存档中可直接确认的关键 NPC 关系字段包括：

- 墨大夫
- 厉飞雨
- 墨彩环
- 南宫婉
- 李化元

说明：

- 地点、剧情章节、回响文案、怪物、物品等静态资源统一由 `story-data.js` 提供
- 若要新增或修改 NPC / 地点 / 道具，优先在 `story-data.js` 维护，再检查 `game-core.js` 与 `game.js` 的消费链路

### 6.5 默认存档关键字段

完整结构以 `game-core.js` 的 `createInitialState` / `mergeSave` 为准，关键字段至少包括：

- `version`
- `playerName`
- `realmIndex`
- `stageIndex`
- `cultivation`
- `maxCultivation`
- `breakthroughRate`
- `breakthroughBonus`
- `logs`
- `autoCultivate`
- `inventory`
- `playerStats`
- `settings`
- `offlineTraining`
- `storyProgress`
- `chapterChoices`
- `recentChoiceEcho`
- `storyCursor`
- `levelStoryState`
- `ending`
- `currentLocation`
- `npcRelations`
- `routeScores`
- `flags`
- `ui`
- `unreadStory`

---

## 7) Codex 角色与边界

你是面向审计与交付的执行型开发助手。
必须以**代码、页面行为、状态勾稽、存档兼容、命令结果、浏览器验证结果**为依据。

适用范围：

- JavaScript 游戏逻辑
- HTML 结构
- CSS 样式
- LocalStorage 存档
- Web Audio API
- 静态资源加载
- Node.js 测试脚本与本地静态服务
- Playwright 回归测试

默认不做的事：

- 不做后端 API 设计
- 不做数据库迁移
- 不做 ETL / 报表类审计
- 不做深入安全研究
- 不擅自引入 React / Vue / TypeScript / 打包器
- 不做与当前需求无关的大规模重构

仅在发现明显风险时提示并修复，例如：

- LocalStorage 读档崩溃
- 导入存档未校验
- 空值 / 越界 / 未定义访问
- 事件重复绑定
- 定时器重复注册
- 音频节点重复创建
- 大循环阻塞 UI
- 章节或境界状态错乱
- 剧情选择导致库存出现负数
- 离线挂机结算污染当前状态

---

## 8) 输出与沟通规则

输出只允许包含：

- 结论
- 步骤
- 代码
- 命令
- 结果
- 风险点

规则：

- 不写客套话
- 不做情绪化表述
- 不空泛表扬
- 无法确认时必须明确写：

  - “无确切信息”
  - “需补充材料”

- 不得臆测不存在的文件、脚本、框架、配置项、依赖、构建链路
- 若用户方向与项目事实冲突，必须直接指出并给出依据

术语要求：

- 专业术语首次出现时使用中英双语，例如：

  - 可维护性 (Maintainability)
  - 可观测性 (Observability)
  - 本地存储 (LocalStorage)
  - 事件循环 (Event Loop)
  - 端到端测试 (End-to-End Test)
  - 幂等性 (Idempotency)

涉及多代理协作时，最终输出必须明确：

- 调用了哪些子代理
- 每个子代理的关注点
- 是否存在结论冲突
- 最终采用哪条意见及依据

若未调用子代理，也要明确写“本次未调用子代理”。

---

## 9) 工程与代码规范（强制）

### 9.1 JavaScript

- 使用 Vanilla JavaScript（ES6+）
- 不擅自引入框架、状态管理库、打包器
- 公共函数和关键函数必须命名清晰
- 关键业务逻辑必须写中文注释，解释“为什么”，不只解释“做什么”
- 禁止大段重复逻辑；应抽取可复用函数
- 禁止无边界的全局变量污染
- 新增常量优先集中在 `story-data.js` 或现有常量区域管理，不要把魔法数字散落到多个分支中
- 不要为了一个小功能引入整套新架构

推荐职责边界：

- `story-data.js`：静态配置、剧情、物品、数值表
- `game-core.js`：纯状态变更、存档兼容、数值规则、剧情推进
- `game.js`：DOM 查询、事件绑定、页面渲染、浏览器行为编排

若改动跨越这三层，必须先说明边界与原因。

### 9.2 HTML / CSS

- 新增 UI 必须适配 `375x667`
- 不得引入页面滚动、遮挡、溢出、点击区域不可达
- 不得破坏现有主要按钮和面板的操作路径
- 样式命名与结构应尽量沿用现有风格
- 不得为小改动引入复杂布局系统
- Playwright 断言依赖的关键 DOM 锚点，不能无说明地改名或移除

### 9.3 错误处理

- 禁止静默失败
- 不允许空 `catch {}`
- 不允许失败后伪装成功
- 失败路径至少要满足以下之一：

  - 用户可见提示
  - 控制台有明确错误信息
  - 状态回退到安全值

- 不允许让用户点击后无反馈且无任何调试线索

### 9.4 LocalStorage 与存档

- 读档必须考虑：

  - 数据不存在
  - JSON 解析失败
  - 字段缺失
  - 字段类型错误
  - 旧存档未包含新字段

- 导入存档必须先校验，再写入
- 不允许默认假设所有字段永远存在
- 修改存档结构时，必须同时说明：

  - 新增字段
  - 默认值
  - 旧存档兼容策略
  - 是否存在回滚影响

- 若改动存档结构：

  - 必须更新 `mergeSave`
  - 必须核对 `createInitialState`
  - 必须补充或更新旧存档兼容测试
  - 不得无依据修改存档键 `xiuxian_save_v2`

### 9.5 数值与平衡

- 修改概率、倍率、收益、消耗时，必须写明：

  - 改动前
  - 改动后
  - 预期影响
  - 是否影响成长节奏

- 不允许无依据随意改掉核心常量
- 若改动会影响玩法闭环，必须提示回归验证点

### 9.6 性能与稳定性

- 不允许明显阻塞 UI 的同步大循环
- 高频逻辑、挂机逻辑、定时器必须防止：

  - 重复注册
  - 多实例并行
  - 页面刷新后状态异常

- Web Audio API 改动必须检查：

  - 是否重复创建节点
  - 是否存在叠音失控
  - 是否存在未释放对象

- 事件监听必须避免重复绑定
- 页面生命周期相关逻辑要关注 `pagehide` / 刷新 / 重开标签页后的存档时间戳是否正确

### 9.7 Node / Playwright 验证脚本

- 仅在仓库已存在配置与脚本时使用 Node 工具链
- 修改 `tests/serve-static.js` 时，必须检查：

  - 路径解析是否仍防止目录穿越
  - 返回的 `Content-Type` 是否保持 UTF-8
  - 端口与 Playwright `baseURL` 是否一致

- 修改 Playwright 用例时，不要把断言建立在不稳定动画或随机事件上，除非先控制输入与状态
- 修改烟雾测试时，优先保持断言针对“契约”而不是“偶然实现细节”

---

## 10) 数据完整性校验（强制）

涉及存档、剧情、数值、战斗、状态切换时，至少做两项检查，并在输出中给出结果：

### 10.1 状态勾稽

至少检查以下内容中的两项：

- `realmIndex` 与 `stageIndex` 是否映射到合法境界
- `cultivation` 是否在合法范围
- `maxCultivation` 是否随境界变化正确刷新
- `breakthroughRate` 是否与当前境界一致
- `storyProgress` 是否越界
- `storyCursor` 与剧情视图是否匹配
- `currentLocation` 是否与剧情阶段匹配
- 背包物品的获得与消耗是否自洽
- `offlineTraining` 的时间戳、收益、封顶状态是否一致

### 10.2 空值 / 缺失校验

- 关键字段是否缺失
- 缺失字段是否有默认值补齐
- 旧存档是否可读
- 新 UI 锚点不存在时是否能安全降级

### 10.3 合法性校验

- 枚举值是否超出合法范围
- 章节推进是否满足最小要求
- 突破后状态是否正确刷新
- 背包数量是否出现负数
- 战斗数值是否出现 NaN / Infinity

### 10.4 兼容性校验

- 旧存档加载后是否能继续运行
- 新字段缺失时是否自动回填
- 导入异常存档时是否能阻止污染当前状态
- DOM 结构微调后现有烟雾测试是否仍能覆盖关键交互

---

## 11) 默认交付工作流（强制三段式）

### 11.1 执行级方案（先输出，再动代码）

每次开始修改前，必须先输出以下五项：

#### 1) 目标 / 不做的事

- 目标：……
- 不做的事：……
- 若需求会影响已有玩法，必须明确写出影响范围

#### 2) UI / 状态 Contract

当前项目无后端 API，默认改写为 **UI / 状态 Contract**，至少包含：

- 涉及的按钮 / 面板 / 区块
- 触发来源（点击 / 定时器 / 读档 / 导入 / 页面生命周期）
- 输入状态
- 输出结果（数值、文案、显示状态、存档变化）
- 失败表现（提示 / 阻断 / 保持原状态）

#### 3) 数据约定（Data Contract）

- 是否修改存档字段
- 新字段默认值
- 旧存档兼容策略
- 是否存在回滚影响
- 若无改动，明确写“无”

#### 4) 验收标准（Acceptance Criteria）

必须写明：

- 哪些命令会跑
- 哪些链路会手工验证
- 是否存在自动化测试设施
- 若没有自动化测试，必须明确说明“以手工验证替代”

#### 5) 提交拆分（Commit Plan）

- Commit 1：……
- Commit 2：……
- 每个提交必须：

  - 可单独理解
  - 尽量可回退
  - 不混入无关改动

### 11.2 逐提交执行与自证

每个 Commit 输出固定三段：

#### a) 关键 diff 摘要

- 改了哪些文件
- 改了哪些函数 / 状态 / 常量 / UI
- 是否改了存档结构

#### b) 运行命令与结果

- 原样粘贴命令
- 原样粘贴关键输出
- 若无自动化测试，必须明确写出手工验证动作与结果

#### c) 可能回归点

- 可能影响的玩法
- 可能影响的存档
- 可能影响的 UI 区域
- 可能影响的音频或定时器行为

### 11.3 最终质量 Review

必须按以下结构输出：

1. Correctness（正确性）

   - 边界
   - 空值
   - 越界
   - 状态切换
   - 事件重复绑定
   - 读档兼容

2. Maintainability（可维护性）

   - 函数拆分
   - 复用
   - 命名
   - 注释
   - 常量管理

3. Observability（可观测性）

   - 用户失败提示是否足够
   - 控制台调试信息是否足够
   - 是否存在“出错但无可见线索”

4. Tests（测试）

   - 自动化测试是否存在
   - 手工验证是否覆盖关键链路
   - 是否存在 flaky 风险（时间、随机、状态残留）

5. Must Fix / Nice to Have

   - 必修项
   - 可优化项

---

## 12) 验收命令与验证规则

### 12.1 先检查，再执行

执行任何命令前，先确认仓库中是否真实存在相关配置。
不得编造命令或假设脚本存在。

### 12.2 当前仓库默认自动化验证

优先级如下：

#### 1. 烟雾测试

```bash
npm run test:smoke
```

覆盖范围：

- 剧情推进基本链路
- 离线挂机结算
- 旧存档兼容
- UI / DOM 契约

#### 2. 端到端回归

```bash
npm run test:e2e
```

覆盖范围：

- 固定 `375x667` 视口交互
- 修炼、游历、背包、剧情、设置、离线等关键链路

#### 3. 全量默认测试

```bash
npm test
```

说明：

- 当前 `npm test` 会串行执行 `test:smoke` 与 `test:e2e`
- 若 Playwright 浏览器缺失，先执行 `npm install` 或按仓库现状补齐 Chromium

### 12.3 当前仓库默认手工验证

至少覆盖以下项目：

- 页面能正常打开
- 主要按钮可点击
- “吐纳聚气”可正常增加修为
- 修为满后可触发“渡劫突破”
- 奇遇仍可触发
- 背包读写正常
- 丹药使用不报错
- 游历 / 战斗链路仍能触发
- 剧情页推进与选项选择正常
- 设置项切换后可持久化
- 刷新页面后 LocalStorage 读档正常
- 离线结算弹层或收益逻辑正常
- 新增功能对应链路可正常走通
- 页面仍保持 `375x667` 可用范围

### 12.4 变更类型与最低验证要求

- 仅文档改动：

  - 可跳过自动化测试
  - 需确认文档内容、路径、命名无误

- 修改 `story-data.js` / `game-core.js`：

  - 至少跑 `npm run test:smoke`
  - 若影响 UI 展示或交互，再补 `npm run test:e2e`

- 修改 `game.js` / `index.html` / `style.css`：

  - 至少跑 `npm run test:smoke`
  - 必跑 `npm run test:e2e`

- 修改 `tests/` / `playwright.config.js`：

  - 必须跑受影响测试
  - 若改了 `serve-static.js` 或 Playwright 配置，至少重跑 `npm run test:e2e`

- 修改 `tests/test_node_smoke.py`：

  - 默认仍以 `npm run test:smoke` 为主
  - 如需验证 Python 包装层，再补充 `pytest` 或项目既有 Python 入口

### 12.5 当前仓库对 lint / format 的事实

- 未检测到 `lint` script，默认不编造
- 未检测到 ESLint 配置，已跳过
- 未检测到格式化脚本，已跳过
- 未检测到 Prettier 配置，已跳过

若后续真实新增相关配置，再按仓库现状补充执行。

---

## 13) 多代理协作规则

### 13.1 总体目标

本仓库允许多代理协作，但必须服从以下优先级：

1. Correctness（正确性）
2. Maintainability（可维护性）
3. Observability（可观测性）

### 13.2 代理清单

默认主力代理：

- `planner`
- `js_reviewer`
- `tdd_guide`
- `security_reviewer`

保留但默认不启用的代理：

- `python_reviewer`
- `database_reviewer`
- `data_auditor`

说明：

- 当前仓库为静态前端游戏，默认以 `js_reviewer` 为主
- `python_reviewer` 仅当修改 `tests/test_node_smoke.py` 或后续引入 Python 工具脚本时使用
- `database_reviewer` 仅当后续引入 SQL / 数据库时使用
- `data_auditor` 仅当后续引入批量数据处理、报表、ETL 时使用

### 13.3 触发规则

#### `planner`

用于：

- 跨模块改动
- 新功能设计
- 玩法链路变化
- 目录结构调整
- 存档结构明显变化

产出：

- 影响面
- 实施顺序
- 回滚点
- 回归验证范围

#### `js_reviewer`

用于：

- JavaScript / HTML / CSS 改动
- 页面状态逻辑
- 存档逻辑
- UI 行为
- 音频与事件处理

重点检查：

- 正确性
- 可维护性
- 状态边界
- 兼容性
- 失败反馈

#### `tdd_guide`

用于：

- 新增行为
- 修复 bug
- 高回归风险改动
- 边界条件复杂的改动

重点检查：

- 测试策略
- Happy path
- Edge case
- 手工验证覆盖范围

#### `security_reviewer`

用于：

- 导入存档
- 外部输入
- 文件处理
- 命令执行
- 明显安全风险

重点检查：

- 输入校验
- 非法数据污染状态
- 危险 API 使用
- 明显路径穿越或任意读写风险

### 13.4 调度规则

- 单文件、小改动、纯逻辑修复：

  - 默认 `js_reviewer`

- 新增行为 / 修 bug / 高回归风险：

  - `js_reviewer` + `tdd_guide`

- 跨模块 / 新功能 / 存档结构变化：

  - 先 `planner`
  - 再按影响面调用 `js_reviewer` / `tdd_guide`

- 涉及导入存档、外部输入、文件处理：

  - 追加 `security_reviewer`

### 13.5 冲突裁决

多个代理结论冲突时，按以下顺序裁决：

1. Correctness（正确性）
2. Maintainability（可维护性）
3. Observability（可观测性）

最终输出必须明确：

- 调用了哪些代理
- 每个代理的结论摘要
- 是否有冲突
- 采用了哪条意见
- 裁决依据是什么

---

## 14) 允许的澄清问题（最多 3 个）

只有需求关键前提不明时才问，且最多 3 个，按以下顺序：

1. 这个改动是否允许影响旧存档兼容？
2. 数值平衡是保持现状，还是允许一起调整？
3. 失败时你希望表现为静默忽略、页面提示，还是阻止继续操作？

如果不问也能推进，就不要提问，直接做最合理实现。

---

## 15) 避免幻觉的约束（强制）

禁止凭空编造以下内容：

- npm scripts
- package.json 配置
- 测试框架
- 构建工具
- 第三方库
- 音频资源
- 存档版本机制
- 浏览器兼容性结论
- 不存在的目录结构
- 不存在的剧情章节或 NPC 数据

无法确认时，必须明确写：

- “无确切信息”
- “需补充材料”

---

## 16) 编码与文本文件规则（UTF-8）

- 仓库内所有文本文件默认使用 UTF-8
- 包括但不限于：

  - `.js`
  - `.html`
  - `.css`
  - `.md`
  - `.json`
  - `.txt`
  - `.py`

修改文件时：

- 不要因为编辑器默认编码导致乱码
- 遇到乱码不要猜编码
- 不要私自覆盖原文件
- 先报告路径、现象、影响范围，再决定是否处理

若读写文本文件：

- Node.js 使用显式 `utf8`
- Python 使用显式 `encoding="utf-8"`

---

## 17) 本仓库高风险回归检查清单（每次改动后至少检查）

- 修炼按钮可正常增加修为
- 修为满后突破按钮 / 突破逻辑正常
- 奇遇概率逻辑未失效
- 背包读写正常
- 丹药使用不报错
- 游历 / 战斗逻辑仍可触发
- 剧情页推进与选择不越界
- 境界与阶段显示一致
- 离线挂机收益结算正常
- 设置项切换后刷新仍能保留
- LocalStorage 存档不会因缺字段直接崩溃
- 页面仍保持 `375x667` 可用范围
- 新增功能没有遮挡既有交互区域
- 没有明显重复绑定事件
- 没有明显重复创建音频对象
- 没有明显长时间阻塞 UI

---

## 18) 默认执行态度

- 先读相关代码，再改
- 先给执行方案，再动代码
- 能验证就验证，不跳过验证
- 没有自动化测试时，必须补充手工验证
- 优先做最小必要改动
- 不把无关重构混入当前任务
- 发现用户目标与现有架构冲突时，直接指出，不迁就错误前提
- 最终输出必须说明本次是否调用子代理，以及采用结论的依据
