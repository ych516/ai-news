import cloudbase from '@cloudbase/js-sdk'

// 初始化 CloudBase
const app = cloudbase.init({
  env: 'for-test-5gk8154m08000a15'
})

/**
 * 确保匿名登录已完成（单例 Promise，所有调用共享同一次 signIn 结果）
 * 修复：新设备首次访问时，auth 未就绪导致 "Cannot read properties of null (reading 'scope')" 错误
 */
let authPromise = null

function ensureAuth() {
  if (!authPromise) {
    authPromise = app.auth()
      .anonymousAuthProvider()
      .signIn()
      .then(() => console.log('[auth] 匿名登录成功'))
      .catch((err) => {
        authPromise = null // 失败后重置，下次可重试
        console.error('[auth] 匿名登录失败:', err)
        throw err
      })
  }
  return authPromise
}

// 调用云函数（自动等待 auth 就绪）
async function callFunction(name, data = {}) {
  try {
    // 先确保匿名登录完成
    await ensureAuth()
    const result = await app.callFunction({
      name,
      data
    })
    return result.result
  } catch (error) {
    console.error(`调用云函数 ${name} 失败:`, error)
    throw error
  }
}

// 新闻相关API
export const newsApi = {
  // 获取首页数据（TOP3 + 时间流列表）
  getHomeData: async (params = {}) => {
    const { page = 1, pageSize = 20 } = params
    return callFunction('news-api', {
      action: 'getHomeData',
      page,
      pageSize
    })
  },

  // 获取新闻列表
  getNews: async (params = {}) => {
    const { category, page = 1, pageSize = 20, sort = 'weight' } = params
    return callFunction('news-api', {
      action: 'getNews',
      category,
      page,
      pageSize,
      sort
    })
  },
  
  // 获取新闻详情
  getNewsDetail: async (id) => {
    return callFunction('news-api', {
      action: 'getNewsDetail',
      id
    })
  },
  
  // 获取首页推荐
  getFeatured: async () => {
    return callFunction('news-api', {
      action: 'getFeatured'
    })
  },
  
  // 获取分类新闻
  getCategoryNews: async (slug, params = {}) => {
    const { page = 1, pageSize = 20 } = params
    return callFunction('news-api', {
      action: 'getCategoryNews',
      slug,
      page,
      pageSize
    })
  },
  
  // 搜索新闻
  searchNews: async (params = {}) => {
    const { q, category, page = 1, pageSize = 20 } = params
    return callFunction('news-api', {
      action: 'searchNews',
      q,
      category,
      page,
      pageSize
    })
  },
}

// 分类相关API
export const categoryApi = {
  // 获取所有分类
  getCategories: async () => {
    return callFunction('news-api', {
      action: 'getCategories'
    })
  },
}

export default app
