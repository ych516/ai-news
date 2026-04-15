import { Link } from 'react-router-dom'
import { Clock, ExternalLink, Eye } from './icons'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

export default function NewsCard({ news, featured = false }) {
  const { id, title, summary, sourceName, publishedAt, tags, viewCount, isTop } = news

  if (featured) {
    return (
      <Link to={`/news/${id}`} className="group block">
        <div className="card h-full hover:bg-primary-card/80">
          {isTop && (
            <span className="inline-block bg-primary-accent/20 text-primary-accent text-xs px-2 py-1 rounded mb-3">
              置顶
            </span>
          )}
          <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary-accent transition-colors line-clamp-2 mb-2">
            {title}
          </h3>
          <p className="text-text-secondary text-sm line-clamp-3 mb-4">
            {summary}
          </p>
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{dayjs(publishedAt).format('MM-DD HH:mm')}</span>
              </span>
              <span>{sourceName}</span>
            </div>
            <span className="flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>{viewCount || 0}</span>
            </span>
          </div>
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs bg-primary-bg px-2 py-1 rounded text-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/news/${id}`} className="group block">
      <div className="card hover:bg-primary-card/80">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-base font-medium text-text-primary group-hover:text-primary-accent transition-colors line-clamp-2 mb-2">
              {title}
            </h3>
            <p className="text-text-secondary text-sm line-clamp-2 mb-3">
              {summary}
            </p>
            <div className="flex items-center space-x-4 text-xs text-text-secondary">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{dayjs(publishedAt).format('MM-DD HH:mm')}</span>
              </span>
              <span>{sourceName}</span>
              <span className="flex items-center space-x-1">
                <Eye className="w-3 h-3" />
                <span>{viewCount || 0}</span>
              </span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity ml-4 flex-shrink-0" />
        </div>
      </div>
    </Link>
  )
}
