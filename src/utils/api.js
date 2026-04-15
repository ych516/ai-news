import axios from 'axios'

// API基础URL - 部署后需要更新为实际地址
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-env-id.api.tcloudbasegateway.com/v1/functions/news-api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const { data } = response
    if (data.code !== 0) {
      throw new Error(data.message || '请求失败')
    }
    return data
  },
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

// 新闻相关API
export const newsApi = {
  // 获取新闻列表
  getNews: (params) => api.get('/api/news', { params }),
  
  // 获取新闻详情
  getNewsDetail: (id) => api.get(`/api/news/${id}`),
  
  // 获取首页推荐
  getFeatured: () => api.get('/api/news/featured'),
  
  // 获取分类新闻
  getCategoryNews: (slug, params) => api.get(`/api/news/category/${slug}`, { params }),
  
  // 搜索新闻
  searchNews: (params) => api.get('/api/news/search', { params }),
}

// 分类相关API
export const categoryApi = {
  // 获取所有分类
  getCategories: () => api.get('/api/categories'),
}

export default api
