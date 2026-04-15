const cloudbase = require("@cloudbase/node-sdk");
const Parser = require("rss-parser");
const axios = require("axios");
const cheerio = require("cheerio");

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const _ = db.command;

// RSS解析器配置
const rssParser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  timeout: 30000,
});

// 文本相似度计算 (Levenshtein距离)
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

// 检查重复新闻
async function checkDuplicate(title, content, sourceName) {
  // 查询最近7天的新闻
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentNews = await db.collection("news")
    .where({
      status: "active",
      published_at: _.gte(sevenDaysAgo)
    })
    .limit(100)
    .get();
  
  for (const news of recentNews.data) {
    const titleSim = calculateSimilarity(title, news.title);
    
    // 标题相似度>85% 判定为重复
    if (titleSim >= 0.85) {
      return { isDuplicate: true, existingNews: news, similarity: titleSim };
    }
    
    // 标题相似度70-85% 检查内容相似度
    if (titleSim >= 0.70 && content && news.content) {
      const contentSim = calculateSimilarity(content, news.content);
      if (contentSim >= 0.80) {
        return { isDuplicate: true, existingNews: news, similarity: contentSim };
      }
    }
  }
  
  return { isDuplicate: false };
}

// 抓取网页内容
async function fetchWebContent(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      timeout: 30000,
      maxRedirects: 5,
    });
    
    const $ = cheerio.load(response.data);
    
    // 移除脚本和样式
    $('script, style, nav, footer, header, aside').remove();
    
    // 提取正文 (优先选择article或main区域)
    let content = $('article').text() || $('main').text() || $('.content').text() || $('body').text();
    
    // 清理空白字符
    content = content.replace(/\s+/g, ' ').trim();
    
    // 限制长度
    if (content.length > 10000) {
      content = content.substring(0, 10000) + '...';
    }
    
    return content;
  } catch (error) {
    console.error(`抓取内容失败: ${url}`, error.message);
    return null;
  }
}

// 从RSS获取新闻
async function fetchFromRSS(source) {
  const results = [];
  
  try {
    const feed = await rssParser.parseURL(source.url);
    
    for (const item of feed.items.slice(0, 20)) { // 只处理最新的20条
      try {
        // 检查是否已存在
        const existing = await db.collection("news")
          .where({ original_url: item.link })
          .get();
        
        if (existing.data.length > 0) {
          console.log(`已存在: ${item.title}`);
          continue;
        }
        
        // 检查重复
        const duplicateCheck = await checkDuplicate(item.title, item.contentSnippet, source.name);
        if (duplicateCheck.isDuplicate) {
          console.log(`重复新闻: ${item.title} (相似度: ${duplicateCheck.similarity.toFixed(2)})`);
          
          // 记录去重关系
          await db.collection("duplicate_records").add({
            news_id: duplicateCheck.existingNews.id,
            duplicate_news_id: item.link,
            similarity_score: duplicateCheck.similarity * 100,
          });
          continue;
        }
        
        // 抓取原文内容
        const content = await fetchWebContent(item.link);
        
        const newsItem = {
          title: item.title,
          original_url: item.link,
          source_name: source.name,
          source_url: source.url,
          published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
          content: content || item.contentSnippet || '',
          summary: item.contentSnippet ? item.contentSnippet.substring(0, 500) : '',
          category_id: null, // 由AI处理器分类
          tags: [],
          ai_insight: null,
          insight_status: 'pending',
          weight_score: 0,
          is_top: false,
          view_count: 0,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        };
        
        results.push(newsItem);
      } catch (error) {
        console.error(`处理RSS项失败:`, error.message);
      }
    }
  } catch (error) {
    console.error(`解析RSS失败: ${source.url}`, error.message);
    throw error;
  }
  
  return results;
}

// 权重计算
function calculateWeightScore(news) {
  const now = Date.now();
  const publishedTime = new Date(news.published_at).getTime();
  const hoursAgo = (now - publishedTime) / (1000 * 60 * 60);
  
  // 时间衰减因子
  const timeFactor = Math.max(0.1, Math.exp(-hoursAgo / 48));
  
  // 来源权威性权重
  const sourceWeights = {
    '机器之心': 1.0,
    '量子位': 1.0,
    'TechCrunch': 0.95,
    'MIT Technology Review': 0.95,
    'The Verge': 0.9,
  };
  const sourceFactor = sourceWeights[news.source_name] || 0.7;
  
  // 综合计算
  const score = timeFactor * 60 + sourceFactor * 40;
  
  return Math.min(100, Math.max(0, score));
}

// 主函数
exports.main = async (event, context) => {
  console.log("开始新闻采集任务...", new Date().toISOString());
  
  const startTime = Date.now();
  let totalFetched = 0;
  let totalSuccess = 0;
  let totalError = 0;
  
  try {
    // 获取所有活跃的新闻源
    const sources = await db.collection("news_sources")
      .where({ status: "active" })
      .get();
    
    console.log(`找到 ${sources.data.length} 个活跃新闻源`);
    
    for (const source of sources.data) {
      try {
        console.log(`正在采集: ${source.name} (${source.url})`);
        
        let newsItems = [];
        
        if (source.type === 'rss') {
          newsItems = await fetchFromRSS(source);
        }
        // TODO: 支持API类型等其他源
        
        console.log(`从 ${source.name} 获取 ${newsItems.length} 条新闻`);
        totalFetched += newsItems.length;
        
        // 批量入库
        for (const news of newsItems) {
          try {
            // 计算权重
            news.weight_score = calculateWeightScore(news);
            
            // 插入数据库
            const result = await db.collection("news").add(news);
            console.log(`入库成功: ${news.title} (ID: ${result.id})`);
            totalSuccess++;
            
            // 触发AI解读 (异步)
            try {
              await app.callFunction({
                name: "ai-processor",
                data: { newsId: result.id }
              });
            } catch (aiError) {
              console.error(`触发AI解读失败:`, aiError.message);
            }
          } catch (dbError) {
            console.error(`入库失败:`, dbError.message);
            totalError++;
          }
        }
        
        // 更新新闻源最后采集时间
        await db.collection("news_sources").doc(source.id).update({
          last_fetch_at: new Date(),
          error_count: 0,
        });
        
      } catch (sourceError) {
        console.error(`采集 ${source.name} 失败:`, sourceError.message);
        totalError++;
        
        // 更新错误计数
        await db.collection("news_sources").doc(source.id).update({
          error_count: _.inc(1),
          status: source.error_count >= 2 ? 'error' : 'active',
        });
      }
    }
    
    // 记录采集日志
    const duration = Date.now() - startTime;
    await db.collection("fetch_logs").add({
      fetch_time: new Date(),
      news_count: totalFetched,
      success_count: totalSuccess,
      error_count: totalError,
      duration_ms: duration,
    });
    
    console.log(`采集任务完成: 获取${totalFetched}条, 成功${totalSuccess}条, 失败${totalError}条, 耗时${duration}ms`);
    
    return {
      code: 0,
      message: "采集任务完成",
      data: {
        totalFetched,
        totalSuccess,
        totalError,
        duration,
      }
    };
    
  } catch (error) {
    console.error("采集任务失败:", error);
    
    return {
      code: -1,
      message: error.message,
      data: null,
    };
  }
};
