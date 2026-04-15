import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search as SearchIcon, X } from '../components/icons'
import NewsCard from '../components/NewsCard'
import { newsApi } from '../utils/api'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  
  const [searchQuery, setSearchQuery] = useState(query)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [pagination, setPagination] = useState(null)

  const performSearch = useCallback(async (q, pageNum = 1, append = false) => {
    if (!q.trim()) {
      setResults([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await newsApi.searchNews({
        q: q.trim(),
        page: pageNum,
        pageSize: 20,
      })

      if (append) {
        setResults(prev => [...prev, ...(response.data || [])])
      } else {
        setResults(response.data || [])
      }

      setPagination(response.pagination)
      setHasMore(response.pagination?.page < response.pagination?.totalPages)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setSearchQuery(query)
    setPage(1)
    performSearch(query, 1, false)
  }, [query, performSearch])

  // 无限滚动
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return
      
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight
      
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        const nextPage = page + 1
        setPage(nextPage)
        performSearch(query, nextPage, true)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [page, loading, hasMore, query, performSearch])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() })
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchParams({})
    setResults([])
  }

  return (
    <div className="animate-fade-in">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-text-primary mb-6">
          搜索资讯
        </h1>
        
        <form onSubmit={handleSubmit} className="max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入关键词搜索AI资讯..."
              className="w-full bg-primary-card border border-border rounded-xl px-5 py-4 pl-12 pr-12 text-text-primary focus:outline-none focus:border-primary-accent transition-colors"
            />
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Search Results */}
      {query && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg text-text-primary">
              "{query}" 的搜索结果
              {pagination && (
                <span className="text-text-secondary text-sm ml-2">
                  共 {pagination.total} 条
                </span>
              )}
            </h2>
          </div>

          {loading && results.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-accent"></div>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-400 mb-4">搜索失败: {error}</p>
              <button onClick={() => performSearch(query, 1, false)} className="btn-primary">
                重试
              </button>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              {results.map((news) => (
                <NewsCard key={news.id} news={news} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-text-secondary">未找到相关资讯</p>
              <p className="text-text-secondary text-sm mt-2">
                请尝试其他关键词
              </p>
            </div>
          )}

          {/* Loading More */}
          {loading && results.length > 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-accent"></div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!query && (
        <div className="text-center py-16">
          <SearchIcon className="w-16 h-16 text-text-secondary mx-auto mb-4" />
          <p className="text-text-secondary">输入关键词开始搜索</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="text-text-secondary text-sm">热门搜索:</span>
            {['GPT-4', 'OpenAI', '多模态', '自动驾驶', 'AI芯片'].map((term) => (
              <button
                key={term}
                onClick={() => {
                  setSearchQuery(term)
                  setSearchParams({ q: term })
                }}
                className="text-sm text-primary-accent hover:text-primary-accent/80"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
