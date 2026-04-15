import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, ExternalLink, Clock, Eye, Tag } from '../components/icons'
import dayjs from 'dayjs'
import { newsApi } from '../utils/api'
import NewsCard from '../components/NewsCard'

export default function NewsDetail() {
  const { id } = useParams()
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchNewsDetail()
  }, [id])

  const fetchNewsDetail = async () => {
    try {
      setLoading(true)
      const response = await newsApi.getNewsDetail(id)
      setNews(response.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-accent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 mb-4">加载失败: {error}</p>
          <button onClick={fetchNewsDetail} className="btn-primary">
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!news) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">新闻不存在</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <Link to="/" className="inline-flex items-center space-x-1 text-text-secondary hover:text-text-primary mb-6">
        <ChevronLeft className="w-4 h-4" />
        <span>返回首页</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Header */}
          <div className="mb-8">
            {news.category && (
              <Link
                to={`/category/${news.category.slug}`}
                className="inline-block bg-primary-accent/20 text-primary-accent text-sm px-3 py-1 rounded-full mb-4"
              >
                {news.category.name}
              </Link>
            )}
            <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary mb-4">
              {news.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
              <span>{news.sourceName}</span>
              <span className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{dayjs(news.publishedAt).format('YYYY-MM-DD HH:mm')}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{news.viewCount} 阅读</span>
              </span>
            </div>
          </div>

          {/* Original Link */}
          <div className="mb-8">
            <a
              href={news.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-primary-accent hover:text-primary-accent/80 transition-colors"
            >
              <span>查看原文</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* AI Insight */}
          <div className="card mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-accent to-emerald-400 rounded-lg flex items-center justify-center">
                <span className="text-primary-bg font-bold text-sm">AI</span>
              </div>
              <h2 className="text-xl font-semibold text-text-primary">AI深度解读</h2>
            </div>
            
            {news.aiInsight?.status === 'completed' ? (
              <div className="prose prose-invert max-w-none">
                <div className="text-text-secondary whitespace-pre-line">
                  {news.aiInsight.content}
                </div>
              </div>
            ) : news.aiInsight?.status === 'processing' ? (
              <div className="flex items-center space-x-2 text-text-secondary">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-accent"></div>
                <span>AI正在解读中...</span>
              </div>
            ) : (
              <p className="text-text-secondary">AI解读暂时不可用</p>
            )}
          </div>

          {/* Tags */}
          {news.tags && news.tags.length > 0 && (
            <div className="flex items-center space-x-2 mb-8">
              <Tag className="w-4 h-4 text-text-secondary" />
              <div className="flex flex-wrap gap-2">
                {news.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="text-sm bg-primary-card px-3 py-1 rounded-full text-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Related News */}
          {news.relatedNews && news.relatedNews.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">相关推荐</h3>
              <div className="space-y-4">
                {news.relatedNews.map((related) => (
                  <Link
                    key={related.id}
                    to={`/news/${related.id}`}
                    className="block group"
                  >
                    <h4 className="text-sm text-text-primary group-hover:text-primary-accent transition-colors line-clamp-2 mb-1">
                      {related.title}
                    </h4>
                    <div className="flex items-center space-x-2 text-xs text-text-secondary">
                      <span>{related.sourceName}</span>
                      <span>{dayjs(related.publishedAt).format('MM-DD')}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
