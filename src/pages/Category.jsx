import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, ChevronLeft } from '../components/icons'
import NewsCard from '../components/NewsCard'
import { newsApi } from '../utils/api'

export default function Category() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchCategoryData = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const response = await newsApi.getCategoryNews(slug, { page: pageNum, pageSize: 20 })
      
      if (append) {
        setData(prev => ({
          ...response.data,
          news: [...(prev?.news || []), ...response.data.news],
        }))
      } else {
        setData(response.data)
      }

      setHasMore(response.pagination?.page < response.pagination?.totalPages)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [slug])

  useEffect(() => {
    setPage(1)
    fetchCategoryData(1, false)
  }, [slug, fetchCategoryData])

  // 无限滚动
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return
      
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight
      
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        const nextPage = page + 1
        setPage(nextPage)
        fetchCategoryData(nextPage, true)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [page, loadingMore, hasMore, fetchCategoryData])

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
          <button onClick={() => fetchCategoryData(1, false)} className="btn-primary">
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">分类不存在</p>
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

      {/* Category Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
          {data.category.name}
        </h1>
        <p className="text-text-secondary">{data.category.description}</p>
      </div>

      {/* TOP 3 Featured */}
      {data.topNews && data.topNews.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center space-x-2 mb-6">
            <Clock className="w-5 h-5 text-primary-accent" />
            <h2 className="text-xl font-semibold text-text-primary">热门资讯</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.topNews.map((news) => (
              <NewsCard key={news.id} news={news} featured />
            ))}
          </div>
        </section>
      )}

      {/* News List */}
      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-6">最新资讯</h2>
        <div className="space-y-4">
          {data.news.map((news) => (
            <NewsCard key={news.id} news={news} />
          ))}
        </div>
      </section>

      {/* Load More */}
      {loadingMore && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-accent"></div>
        </div>
      )}

      {!hasMore && data.news.length > 0 && (
        <div className="text-center py-8 text-text-secondary">
          已加载全部内容
        </div>
      )}

      {data.news.length === 0 && !data.topNews?.length && (
        <div className="text-center py-16">
          <p className="text-text-secondary">该分类暂无内容</p>
        </div>
      )}
    </div>
  )
}
