import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, TrendingUp } from '../components/icons'
import NewsCard from '../components/NewsCard'
import { newsApi } from '../utils/api'

export default function Home() {
  const [featuredData, setFeaturedData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchFeatured()
  }, [])

  const fetchFeatured = async () => {
    try {
      setLoading(true)
      const response = await newsApi.getFeatured()
      setFeaturedData(response.data || [])
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
          <button onClick={fetchFeatured} className="btn-primary">
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="mb-12">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-card to-primary-bg border border-border p-8 md:p-12">
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary-accent" />
              <span className="text-primary-accent text-sm font-medium">实时更新</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-text-primary mb-4">
              AI Insights Hub
            </h1>
            <p className="text-text-secondary text-lg max-w-2xl">
              汇聚全球AI领域最新资讯，AI深度解读，智能分类。每小时自动更新，让您第一时间掌握AI行业动态。
            </p>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        </div>
      </section>

      {/* Featured Categories */}
      <div className="space-y-12">
        {featuredData.map((section) => (
          <section key={section.category.slug}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-display font-semibold text-text-primary">
                  {section.category.name}
                </h2>
                <p className="text-text-secondary text-sm mt-1">
                  {section.category.description}
                </p>
              </div>
              <Link
                to={`/category/${section.category.slug}`}
                className="flex items-center space-x-1 text-primary-accent hover:text-primary-accent/80 transition-colors"
              >
                <span className="text-sm">更多</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.news.slice(0, 6).map((news) => (
                <NewsCard key={news.id} news={news} featured />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Empty State */}
      {featuredData.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-secondary">暂无数据，请稍后刷新</p>
        </div>
      )}
    </div>
  )
}
