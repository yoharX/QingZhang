import type { AiConfig } from './types';

export interface AiPreset {
  label: string;
  baseUrl: string;
  model: string;
  note?: string;
}

/** 常见 OpenAI 兼容服务，点一下填好地址和模型，key 自己填 */
export const AI_PRESETS: AiPreset[] = [
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { label: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { label: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  {
    label: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    note: '部分网络环境不允许浏览器直连',
  },
];

export const DEFAULT_AI: AiConfig = {
  mode: 'local',
  baseUrl: AI_PRESETS[0].baseUrl,
  apiKey: '',
  model: AI_PRESETS[0].model,
};

export function normalizeAi(cfg?: Partial<AiConfig> | null): AiConfig {
  if (!cfg) return { ...DEFAULT_AI };
  return {
    mode: cfg.mode === 'remote' ? 'remote' : 'local',
    baseUrl: (cfg.baseUrl || DEFAULT_AI.baseUrl).trim(),
    apiKey: cfg.apiKey || '',
    model: (cfg.model || DEFAULT_AI.model).trim(),
  };
}

export function aiReady(cfg: AiConfig): boolean {
  return cfg.mode === 'remote' && !!cfg.baseUrl && !!cfg.apiKey && !!cfg.model;
}

/* ---------------- 请求 ---------------- */

export interface RemoteInput {
  month: string;
  expense: number;
  income: number;
  prevExpense: number;
  budget: number;
  recordedDays: number;
  totalDays: number;
  categories: { label: string; value: number; share: number; count: number }[];
  monthly: { label: string; expense: number; income: number }[];
}

export interface RemoteInsight {
  tag: string;
  tone: 'warn' | 'good' | 'info';
  title: string;
  body: string;
}

export interface RemoteResult {
  headline: string;
  narrative: string;
  insights: RemoteInsight[];
  model: string;
  at: number;
}

const SYSTEM_PROMPT = `你是一个个人消费分析师，看中国人的记账数据。
说话直接、具体，像朋友帮忙看账，不客套，不说"建议您"。
金额用 ¥ 符号，保留到元即可。不要提自己是 AI，不要解释你的方法。`;

function buildUserPrompt(input: RemoteInput): string {
  const payload = {
    月份: input.month,
    本月支出: Math.round(input.expense),
    本月收入: Math.round(input.income),
    上月支出: Math.round(input.prevExpense),
    月预算: input.budget || null,
    记账天数: `${input.recordedDays}/${input.totalDays}`,
    分类: input.categories.slice(0, 8).map((c) => ({
      名称: c.label,
      金额: Math.round(c.value),
      占比: `${(c.share * 100).toFixed(0)}%`,
      笔数: c.count,
    })),
    近六个月: input.monthly.map((m) => ({
      月: m.label,
      支出: Math.round(m.expense),
      收入: Math.round(m.income),
    })),
  };

  return `数据如下：
${JSON.stringify(payload, null, 1)}

请输出一段分析，严格按这个 JSON 结构返回，不要加 markdown 代码块，不要多余文字：
{
  "headline": "一句话总结本月花销，30 字以内，带具体金额",
  "narrative": "80-140 字的整体解读，说清钱去哪了、和上月比怎么样",
  "insights": [
    {
      "tag": "2-4 个字的小标签，如 环比 / 预算 / 习惯 / 结构",
      "tone": "warn 或 good 或 info",
      "title": "一句判断，25 字以内",
      "body": "2 句话解释，要带数字"
    }
  ]
}
insights 给 3 到 5 条，按重要程度排序。tone 里 warn 表示要留意的，good 表示做得好的，info 表示中性观察。`;
}

function endpoint(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
}

/** 把模型可能包在 ```json 里的内容剥出来 */
function stripFence(text: string): string {
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

function coerceTone(v: unknown): RemoteInsight['tone'] {
  return v === 'warn' || v === 'good' ? v : 'info';
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

async function callChat(cfg: AiConfig, messages: unknown[], maxTokens: number): Promise<string> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch(endpoint(cfg.baseUrl), {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.6,
        max_tokens: maxTokens,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as ChatResponse;
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      if (res.status === 401) throw new Error('API Key 无效或已过期');
      if (res.status === 404) throw new Error('接口地址不对，检查是否填到 /v1');
      if (res.status === 429) throw new Error('请求太频繁或额度用完了');
      throw new Error(msg);
    }
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('模型没有返回内容');
    return content;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('请求超时，模型 45 秒没响应');
    }
    if (err instanceof TypeError) {
      throw new Error('连不上接口，可能是地址写错或该服务不允许浏览器直连（CORS）');
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

/** 走远程模型分析。解析失败时退化成纯文本展示，不丢结果 */
export async function analyzeRemote(input: RemoteInput, cfg: AiConfig): Promise<RemoteResult> {
  const raw = await callChat(
    cfg,
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(input) },
    ],
    1400
  );

  const cleaned = stripFence(raw);
  try {
    const parsed = JSON.parse(cleaned) as Partial<RemoteResult>;
    const insights = Array.isArray(parsed.insights)
      ? parsed.insights
          .filter((i) => i && typeof i.title === 'string')
          .slice(0, 6)
          .map((i) => ({
            tag: String(i.tag || '观察').slice(0, 6),
            tone: coerceTone(i.tone),
            title: String(i.title),
            body: String(i.body || ''),
          }))
      : [];

    if (!parsed.headline && !parsed.narrative && insights.length === 0) {
      throw new Error('empty');
    }

    return {
      headline: String(parsed.headline || '模型给出了一段解读'),
      narrative: String(parsed.narrative || ''),
      insights,
      model: cfg.model,
      at: Date.now(),
    };
  } catch {
    // 模型没按 JSON 回，就把原文当解读，至少不丢信息
    return {
      headline: '模型返回的内容不是标准格式',
      narrative: raw.trim().slice(0, 1200),
      insights: [],
      model: cfg.model,
      at: Date.now(),
    };
  }
}

/** 测试连通性，返回空串表示通了 */
export async function testAiConnection(cfg: AiConfig): Promise<string> {
  if (!cfg.baseUrl) return '接口地址没填';
  if (!cfg.apiKey) return 'API Key 没填';
  if (!cfg.model) return '模型名没填';
  try {
    const reply = await callChat(
      cfg,
      [{ role: 'user', content: '回一个词：可以' }],
      16
    );
    return reply ? '' : '模型没有返回内容';
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}
