const express = require('express');
const cloudbase = require("@cloudbase/node-sdk");

const app = express();
app.use(express.json());

// CORS配置
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 初始化CloudBase
const cloudApp = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
});

const db = cloudApp.database();
const _ = db.command;
const $ = db.command.aggregate;

// 统一响应格式
function response(code, message, data, pagination) {
  const result = { code, message, data };
  if (pagination) {
    result.pagination = pagination;
  }
  return result;
}

// 获取新闻列表
app.get('/api/news', async (req, res) => {
  try {
    const { 
      category, 
      page = 1, 
      pageSize = 20, 
      sort = 'weight',
      status = 'active'
    } = req.query;
    
    const pageNum = parseInt(page);
    const size = parseInt(pageSize);
    const skip = (pageNum - 1) * size;
    
    // 构建查询条件
    let where = { status };
    if (category) {
      where.category_id = category;
    }
    
    // 排序规则
    let orderBy = {};
    if (sort === 'weight') {
      orderBy = { weight_score: 'desc', published_at: 'desc' };
    } else if (sort === 'time') {
      orderBy = { published_at: 'desc' };
    }
    
    // 查询新闻
    const newsQuery = db.collection("news")
      .where(where)
      .orderBy(orderBy)
      .skip(skip)
      .limit(size);
    
    const newsResult = await newsQuery.get();
    
    // 获取总数
    const countResult = await db.collection("news").where(where).count();
    
    // 获取分类信息
    const categoryIds = [...new Set(newsResult.data.map(n => n.category_id).filter(Boolean))];
    let categories = [];
    if (categoryIds.length > 0) {
      categories = await db.collection("categories")
        .where({ id: _.in(categoryIds) })
        .get();
    }
    
    const categoryMap = {};
    categories.data?.forEach(c => {
      categoryMap[c.id] = c;
    });
    
    // 格式化数据
    const formattedNews = newsResult.data.map(news => ({
      id: news.id,
      title: news.title,
      summary: news.summary,
      originalUrl: news.original_url,
      sourceName: news.source_name,
      publishedAt: news.published_at,
      category: categoryMap[news.category_id] || null,
      tags: news.tags || [],
      weightScore: news.weight_score,
      isTop: news.is_top,
      viewCount: news.view_count,
    }));
    
    const pagination = {
      page: pageNum,
      pageSize: size,
      total: countResult.total,
      totalPages: Math.ceil(countResult.total / size),
    };
    
    res.json(response(0, '获取成功', formattedNews, pagination));
  } catch (error) {
    console.error('获取新闻列表失败:', error);
    res.status(500).json(response(-1, error.message, null));
  }
});

// 获取新闻详情
app.get('/api/news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const news = await db.collection("news").doc(id).get();
    
    if (!news.data) {
      return res.status(404).json(response(-1, '新闻不存在', null));
    }
    
    // 获取分类信息
    let category = null;
    if (news.data.category_id) {
      const catResult = await db.collection("categories").doc(news.data.category_id).get();
      category = catResult.data;
    }
    
    // 获取相关新闻
    let relatedNews = [];
    if (news.data.category_id) {
      const related = await db.collection("news")
        .where({
          category_id: news.data.category_id,
          status: 'active',
          id: _.neq(id),
        })
        .orderBy({ weight_score: 'desc' })
        .limit(5)
        .get();
      
      relatedNews = related.data.map(n => ({
        id: n.id,
        title: n.title,
        sourceName: n.source_name,
        publishedAt: n.published_at,
      }));
    }
    
    // 增加浏览数
    await db.collection("news").doc(id).update({
      view_count: _.inc(1),
    });
    
    const detail = {
      id: news.data.id,
      title: news.data.title,
      summary: news.data.summary,
      content: news.data.content,
      originalUrl: news.data.original_url,
      sourceName: news.data.source_name,
      sourceUrl: news.data.source_url,
      publishedAt: news.data.published_at,
      category: category ? {
        id: category.id,
        name: category.name,
        slug: category.slug,
      } : null,
      tags: news.data.tags || [],
      aiInsight: {
        status: news.data.insight_status,
        content: news.data.ai_insight,
      },
      weightScore: news.data.weight_score,
      isTop: news.data.is_top,
      viewCount: (news.data.view_count || 0) + 1,
      relatedNews,
    };
    
    res.json(response(0, '获取成功', detail));
  } catch (error) {
    console.error('获取新闻详情失败:', error);
    res.status(500).json(response(-1, error.message, null));
  }
});

// 获取首页推荐
app.get('/api/news/featured', async (req, res) => {
  try {
    // 获取所有分类
    const categories = await db.collection("categories")
      .orderBy({ sort_order: 'asc' })
      .get();
    
    const result = [];
    
    for (const category of categories.data) {
      // 获取每个分类的TOP新闻
      const news = await db.collection("news")
        .where({
          category_id: category.id,
          status: 'active',
        })
        .orderBy({ weight_score: 'desc' })
        .limit(5)
        .get();
      
      if (news.data.length > 0) {
        result.push({
          category: {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
          },
          news: news.data.map(n => ({
            id: n.id,
            title: n.title,
            summary: n.summary,
            originalUrl: n.original_url,
            sourceName: n.source_name,
            publishedAt: n.published_at,
            tags: n.tags || [],
            weightScore: n.weight_score,
            isTop: n.is_top,
          })),
        });
      }
    }
    
    res.json(response(0, '获取成功', result));
  } catch (error) {
    console.error('获取推荐新闻失败:', error);
    res.status(500).json(response(-1, error.message, null));
  }
});

// 获取分类新闻
app.get('/api/news/category/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    
    const pageNum = parseInt(page);
    const size = parseInt(pageSize);
    
    // 获取分类
    const category = await db.collection("categories")
      .where({ slug })
      .limit(1)
      .get();
    
    if (category.data.length === 0) {
      return res.status(404).json(response(-1, '分类不存在', null));
    }
    
    const cat = category.data[0];
    
    // 获取TOP3置顶
    const topNews = await db.collection("news")
      .where({
        category_id: cat.id,
        status: 'active',
      })
      .orderBy({ weight_score: 'desc' })
      .limit(3)
      .get();
    
    // 获取其他新闻（分页）
    const skip = 3 + (pageNum - 1) * size;
    const otherNews = await db.collection("news")
      .where({
        category_id: cat.id,
        status: 'active',
      })
      .orderBy({ published_at: 'desc' })
      .skip(skip)
      .limit(size)
      .get();
    
    // 获取总数
    const countResult = await db.collection("news")
      .where({
        category_id: cat.id,
        status: 'active',
      })
      .count();
    
    const result = {
      category: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
      },
      topNews: topNews.data.map(n => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
        originalUrl: n.original_url,
        sourceName: n.source_name,
        publishedAt: n.published_at,
        tags: n.tags || [],
        weightScore: n.weight_score,
      })),
      news: otherNews.data.map(n => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
        originalUrl: n.original_url,
        sourceName: n.source_name,
        publishedAt: n.published_at,
        tags: n.tags || [],
      })),
    };
    
    const pagination = {
      page: pageNum,
      pageSize: size,
      total: Math.max(0, countResult.total - 3),
      totalPages: Math.ceil(Math.max(0, countResult.total - 3) / size),
    };
    
    res.json(response(0, '获取成功', result, pagination));
  } catch (error) {
    console.error('获取分类新闻失败:', error);
    res.status(500).json(response(-1, error.message, null));
  }
});

// 搜索新闻
app.get('/api/news/search', async (req, res) => {
  try {
    const { q, category, page = 1, pageSize = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json(response(-1, '缺少搜索关键词', null));
    }
    
    const pageNum = parseInt(page);
    const size = parseInt(pageSize);
    const skip = (pageNum - 1) * size;
    
    // 构建查询条件
    let where = {
      status: 'active',
      title: db.RegExp({
        regexp: q,
        options: 'i',
      }),
    };
    
    if (category) {
      where.category_id = category;
    }
    
    // 执行搜索
    const newsResult = await db.collection("news")
      .where(where)
      .orderBy({ weight_score: 'desc' })
      .skip(skip)
      .limit(size)
      .get();
    
    // 获取总数
    const countResult = await db.collection("news").where(where).count();
    
    // 格式化
    const formattedNews = newsResult.data.map(news => ({
      id: news.id,
      title: news.title,
      summary: news.summary,
      originalUrl: news.original_url,
      sourceName: news.source_name,
      publishedAt: news.published_at,
      tags: news.tags || [],
      weightScore: news.weight_score,
    }));
    
    const pagination = {
      page: pageNum,
      pageSize: size,
      total: countResult.total,
      totalPages: Math.ceil(countResult.total / size),
    };
    
    res.json(response(0, '搜索成功', formattedNews, pagination));
  } catch (error) {
    console.error('搜索新闻失败:', error);
    res.status(500).json(response(-1, error.message, null));
  }
});

// 获取所有分类
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.collection("categories")
      .orderBy({ sort_order: 'asc' })
      .get();
    
    const formatted = categories.data.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      newsCount: c.news_count,
    }));
    
    res.json(response(0, '获取成功', formatted));
  } catch (error) {
    console.error('获取分类失败:', error);
    res.status(500).json(response(-1, error.message, null));
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(9000, () => {
  console.log('News API server running on port 9000');
});
