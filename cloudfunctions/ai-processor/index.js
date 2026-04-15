const cloudbase = require("@cloudbase/node-sdk");

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const ai = app.ai();

// AI解读Prompt
const INSIGHT_PROMPT = `你是一位资深的AI行业分析师。请基于以下新闻原文，提供深度专业解读。

新闻原文：
---
{content}
---

请按以下JSON格式输出解读结果：
{
  "keyPoints": ["核心观点1", "核心观点2", "核心观点3"],
  "impact": {
    "technical": "技术分析：涉及的技术创新、突破或改进",
    "business": "商业影响：对相关公司、行业、市场的影响"
  },
  "related": ["相关技术/公司/人物1", "相关技术/公司/人物2"],
  "category": "分类建议：llm/cv/nlp/robotics/hardware/applications/policy/investment/research",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"]
}

分类说明：
- llm: 大语言模型(GPT、Claude、文心一言等)
- cv: 计算机视觉(图像识别、生成、视频处理)
- nlp: 自然语言处理(文本理解、生成、翻译)
- robotics: 机器人/具身智能(人形机器人、自动驾驶)
- hardware: AI芯片/硬件(GPU、TPU、边缘计算)
- applications: AI应用/产品(应用落地、行业解决方案)
- policy: AI政策/伦理(监管政策、伦理讨论)
- investment: 投融资动态(融资、并购、IPO)
- research: 研究论文(顶会论文、开源项目)

要求：
1. 核心观点提炼要精准，避免泛泛而谈
2. 技术分析要具体，提及具体技术名词
3. 商业影响要有数据支撑或合理推测
4. 分类和标签要准确，便于后续归类
5. 如果是英文原文，请用中文输出解读`;

// 分类slug映射
const CATEGORY_MAP = {
  'llm': 'llm',
  '大模型': 'llm',
  '大语言模型': 'llm',
  'cv': 'cv',
  '计算机视觉': 'cv',
  '视觉': 'cv',
  'nlp': 'nlp',
  '自然语言处理': 'nlp',
  'robotics': 'robotics',
  '机器人': 'robotics',
  '具身智能': 'robotics',
  'hardware': 'hardware',
  '芯片': 'hardware',
  '硬件': 'hardware',
  'applications': 'applications',
  '应用': 'applications',
  '产品': 'applications',
  'policy': 'policy',
  '政策': 'policy',
  '伦理': 'policy',
  'investment': 'investment',
  '投资': 'investment',
  '融资': 'investment',
  'research': 'research',
  '研究': 'research',
  '论文': 'research',
};

// 调用AI模型进行解读
async function generateInsight(content) {
  try {
    const prompt = INSIGHT_PROMPT.replace('{content}', content);
    
    const result = await ai.generateText({
      model: 'hunyuan-2.0-instruct-20251111',
      messages: [
        { role: 'system', content: '你是一位专业的AI行业分析师，擅长从技术、商业、行业影响等多维度分析AI相关新闻。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    const responseText = result.text || result.choices?.[0]?.message?.content || '';
    
    // 解析JSON
    try {
      // 提取JSON部分
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const insight = JSON.parse(jsonMatch[0]);
        return insight;
      }
    } catch (parseError) {
      console.error('解析AI响应JSON失败:', parseError.message);
    }
    
    // 如果JSON解析失败，返回原始文本
    return {
      keyPoints: [responseText.substring(0, 200)],
      impact: { technical: '', business: '' },
      related: [],
      category: 'research',
      tags: ['AI'],
    };
    
  } catch (error) {
    console.error('AI解读失败:', error.message);
    throw error;
  }
}

// 获取分类ID
async function getCategoryId(categorySlug) {
  try {
    const normalizedSlug = CATEGORY_MAP[categorySlug.toLowerCase()] || categorySlug;
    
    const category = await db.collection("categories")
      .where({ slug: normalizedSlug })
      .limit(1)
      .get();
    
    if (category.data.length > 0) {
      return category.data[0].id;
    }
    
    // 默认返回research分类
    const defaultCat = await db.collection("categories")
      .where({ slug: 'research' })
      .limit(1)
      .get();
    
    return defaultCat.data[0]?.id || null;
  } catch (error) {
    console.error('获取分类ID失败:', error.message);
    return null;
  }
}

// 主函数
exports.main = async (event, context) => {
  const { newsId } = event;
  
  if (!newsId) {
    return {
      code: -1,
      message: '缺少newsId参数',
      data: null,
    };
  }
  
  console.log(`开始AI解读: ${newsId}`);
  
  try {
    // 更新状态为处理中
    await db.collection("news").doc(newsId).update({
      insight_status: 'processing',
      updated_at: new Date(),
    });
    
    // 获取新闻内容
    const news = await db.collection("news").doc(newsId).get();
    
    if (!news.data) {
      throw new Error('新闻不存在');
    }
    
    const content = news.data.content || news.data.summary || '';
    
    if (!content) {
      throw new Error('新闻内容为空');
    }
    
    // 调用AI解读
    const insight = await generateInsight(content);
    
    // 获取分类ID
    const categoryId = await getCategoryId(insight.category);
    
    // 格式化AI解读内容
    const insightContent = `
## 核心观点
${insight.keyPoints?.map((p, i) => `${i + 1}. ${p}`).join('\n') || '暂无'}

## 技术影响
${insight.impact?.technical || '暂无'}

## 商业影响
${insight.impact?.business || '暂无'}

## 相关关联
${insight.related?.join('、') || '暂无'}
`.trim();
    
    // 更新新闻记录
    await db.collection("news").doc(newsId).update({
      ai_insight: insightContent,
      insight_status: 'completed',
      category_id: categoryId,
      tags: insight.tags || [],
      updated_at: new Date(),
    });
    
    // 更新分类新闻计数
    if (categoryId) {
      await db.collection("categories").doc(categoryId).update({
        news_count: db.command.inc(1),
      });
    }
    
    console.log(`AI解读完成: ${newsId}`);
    
    return {
      code: 0,
      message: 'AI解读完成',
      data: {
        newsId,
        category: insight.category,
        tags: insight.tags,
      }
    };
    
  } catch (error) {
    console.error(`AI解读失败: ${newsId}`, error.message);
    
    // 更新状态为失败
    await db.collection("news").doc(newsId).update({
      insight_status: 'failed',
      updated_at: new Date(),
    });
    
    return {
      code: -1,
      message: error.message,
      data: null,
    };
  }
};
