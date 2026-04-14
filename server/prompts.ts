/**
 * AI 提示词模板
 */

/**
 * 第一阶段：DOM 解析提示词
 * 用于识别表单字段和结构
 */
export const DOM_PARSE_PROMPT = `
你现在是一个网页表单结构解析器。我会给你一个已经简化过的 DOM 结构，你需要识别所有“用户可主动填写或选择”的控件，并返回严格 JSON。

任务要求：
1. 只输出用户可主动填写或选择的控件，排除标题、说明文本、纯展示内容、容器。
2. 必须识别 section；没有明确板块标题时，section 返回空字符串 ""。
3. 同一字段标题下如果有多个 input / textarea / select，必须拆成多个独立子项。
4. radio / checkbox 必须按“可点击叶子项”逐项输出，不允许把整个分组只输出成一项。
5. radio / checkbox 的 controlId 必须是实际可点击控件，不允许把分组容器、字段标题或父容器当成 controlId。
6. labelId 表示字段主标题的 id；如果没有明确主标题，返回空字符串 ""。
7. optionLabelId 只用于 radio / checkbox，表示当前选项文本的 id；其他控件返回空字符串 ""。
8. 时间字段统一输出 type: "select"。
9. 所有 id 都必须来自输入 snapshot 中已有节点的 id，不允许编造。
10. 输出顺序尽量与页面 DOM 顺序保持一致。

输出结构：
返回 JSON 数组，每一项必须包含以下字段：
- section: string
- index: number
- label: string
- type: "input" | "textarea" | "radio" | "checkbox" | "select" | "file"
- controlId: string
- labelId: string
- optionLabelId: string

额外要求：
1. index 表示重复板块内的序号，从 0 开始；非重复板块也返回 0。
2. label 必须稳定、清晰；radio / checkbox 使用“字段标题-选项名”的形式。
3. 如果没有可用 controlId，该项不要输出。
4. 只返回 JSON，不要返回 Markdown，不要解释，不要代码块。
`;

/**
 * 第二阶段：数据匹配提示词
 * 用于匹配简历数据和生成填充计划
 */
export const RESUME_MATCH_PROMPT = `
你是 DOM 表单解析与简历数据匹配助手。你会收到一个 JSON 对象，包含：
- resume: 简历数据
- snapshot: 简化后的 DOM 结构

你的任务是输出严格 JSON 数组，用于自动填写表单。

强规则：
1. 只输出用户可主动填写或选择的控件，排除标题、说明文本、纯展示内容、容器。
2. 必须识别 section；没有明确板块标题时，section 返回空字符串 ""。
3. 重复板块必须有 index，从 0 开始；非重复板块也返回 0。
4. 同一字段标题下多个 input / textarea / select 必须拆分成多个独立子项。
5. radio / checkbox 必须按“可点击叶子项”逐项输出，不允许把整个分组只输出成一项。
6. radio / checkbox 的 controlId 必须是实际可点击控件，不允许把分组容器、字段标题或父容器当成 controlId。
7. radio / checkbox 的 value 只能是 true 或 false。
8. 同一个 radio 分组中，只允许一个选项为 true，其余必须为 false。
9. labelId 表示字段主标题的 id；如果没有明确主标题，返回空字符串 ""。
10. optionLabelId 只用于 radio / checkbox，表示当前选项文本的 id；其他控件返回空字符串 ""。
11. controlId、labelId、optionLabelId 都必须来自 snapshot 中已有节点的 id，不允许编造。
12. 时间字段统一输出 type: "select"。
13. type 只能是 "input"、"textarea"、"radio"、"checkbox"、"select"、"file"。
14. 对于非 radio / checkbox，value 必须是字符串；没有匹配值时返回空字符串 ""。
15. 输出顺序尽量与页面 DOM 顺序保持一致。
16. 只返回 JSON，不要返回 Markdown，不要解释，不要代码块。

输出数组中每一项都必须包含以下字段：
- section: string
- index: number
- label: string
- type: "input" | "textarea" | "radio" | "checkbox" | "select" | "file"
- controlId: string
- labelId: string
- optionLabelId: string
- value: string | boolean

字段语义：
1. controlId 对应真正执行填写或点击的控件。
2. labelId 对应字段主标题，供后续页面定位和标红使用。
3. optionLabelId 对应 radio / checkbox 的选项文本，供后续页面定位和标红使用。
4. label 必须稳定、清晰；radio / checkbox 使用“字段标题-选项名”的形式。
`;

/**
 * 第三阶段：下拉框语义匹配
 * 用于识别表单字段和结构
 */
const SELECT_MATCH_PROMPT = `
你是下拉框选项匹配器。我会给你一个 JSON，包含字段语境、候选 option 列表和 source 值。
任务：从 option 数组中选出一个与 source 在当前字段语境下最等价、最精确的选项。
要求：
1. 优先选择语义完全等价或业务含义完全一致的选项。
2. 如果不存在可接受的等价项，返回 NO_MATCH。
3. 只返回选项原文或 NO_MATCH，不要返回解释。
`;
