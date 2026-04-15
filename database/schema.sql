-- AI资讯汇聚网站 - 数据库结构
-- CloudBase MySQL

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(50) NOT NULL COMMENT '分类名称',
    slug VARCHAR(50) NOT NULL UNIQUE COMMENT 'URL标识',
    description TEXT COMMENT '分类描述',
    icon VARCHAR(100) COMMENT '图标类名',
    sort_order INT DEFAULT 0 COMMENT '排序',
    news_count INT DEFAULT 0 COMMENT '新闻数量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sort (sort_order),
    INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='新闻分类表';

-- 新闻源表
CREATE TABLE IF NOT EXISTS news_sources (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL COMMENT '来源名称',
    type ENUM('rss', 'api', 'webhook') DEFAULT 'rss' COMMENT '源类型',
    url VARCHAR(500) NOT NULL COMMENT '源地址',
    config JSON COMMENT '配置参数(JSON)',
    fetch_interval INT DEFAULT 60 COMMENT '采集间隔(分钟)',
    last_fetch_at TIMESTAMP NULL COMMENT '最后采集时间',
    status ENUM('active', 'paused', 'error') DEFAULT 'active' COMMENT '状态',
    error_count INT DEFAULT 0 COMMENT '连续错误次数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_last_fetch (last_fetch_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='新闻源配置表';

-- 新闻主表
CREATE TABLE IF NOT EXISTS news (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(500) NOT NULL COMMENT '标题',
    original_url VARCHAR(1000) NOT NULL COMMENT '原始链接',
    source_name VARCHAR(100) NOT NULL COMMENT '来源名称',
    source_url VARCHAR(500) COMMENT '来源站点URL',
    published_at TIMESTAMP NOT NULL COMMENT '发布时间',
    content LONGTEXT COMMENT '原文内容',
    summary TEXT COMMENT '摘要',
    category_id VARCHAR(36) COMMENT '分类ID',
    tags JSON COMMENT '标签数组',
    ai_insight LONGTEXT COMMENT 'AI解读',
    insight_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending' COMMENT '解读状态',
    weight_score DECIMAL(10,4) DEFAULT 0 COMMENT '权重分数',
    is_top BOOLEAN DEFAULT FALSE COMMENT '是否置顶',
    view_count INT DEFAULT 0 COMMENT '浏览数',
    status ENUM('active', 'archived', 'deleted') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category_id),
    INDEX idx_published (published_at),
    INDEX idx_weight (weight_score),
    INDEX idx_status_category (status, category_id),
    INDEX idx_insight_status (insight_status),
    FULLTEXT INDEX ft_title (title),
    FULLTEXT INDEX ft_content (content, summary, ai_insight),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='新闻主表';

-- 去重记录表
CREATE TABLE IF NOT EXISTS duplicate_records (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    news_id VARCHAR(36) NOT NULL COMMENT '主新闻ID',
    duplicate_news_id VARCHAR(36) NOT NULL COMMENT '重复新闻ID',
    similarity_score DECIMAL(5,2) COMMENT '相似度分数(0-100)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_duplicate (news_id, duplicate_news_id),
    INDEX idx_news_id (news_id),
    INDEX idx_duplicate_id (duplicate_news_id),
    FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
    FOREIGN KEY (duplicate_news_id) REFERENCES news(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='去重记录表';

-- 采集日志表
CREATE TABLE IF NOT EXISTS fetch_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    source_id VARCHAR(36) COMMENT '新闻源ID',
    fetch_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '采集时间',
    news_count INT DEFAULT 0 COMMENT '获取新闻数',
    success_count INT DEFAULT 0 COMMENT '成功入库数',
    error_count INT DEFAULT 0 COMMENT '错误数',
    duration_ms INT COMMENT '耗时(毫秒)',
    error_msg TEXT COMMENT '错误信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_source (source_id),
    INDEX idx_fetch_time (fetch_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采集日志表';

-- 初始化分类数据
INSERT INTO categories (id, name, slug, description, icon, sort_order) VALUES
(UUID(), '大模型/LLM', 'llm', 'GPT、Claude、文心一言等大语言模型相关资讯', 'icon-brain', 1),
(UUID(), '计算机视觉', 'cv', '图像识别、生成、视频处理等视觉AI技术', 'icon-eye', 2),
(UUID(), '自然语言处理', 'nlp', '文本理解、生成、翻译等NLP技术', 'icon-message', 3),
(UUID(), '机器人/具身智能', 'robotics', '人形机器人、自动驾驶、具身智能', 'icon-robot', 4),
(UUID(), 'AI芯片/硬件', 'hardware', 'GPU、TPU、AI芯片、边缘计算设备', 'icon-cpu', 5),
(UUID(), 'AI应用/产品', 'applications', 'AI应用落地、产品发布、行业解决方案', 'icon-app', 6),
(UUID(), 'AI政策/伦理', 'policy', 'AI监管政策、伦理讨论、安全研究', 'icon-shield', 7),
(UUID(), '投融资动态', 'investment', 'AI领域融资、并购、IPO等资本动态', 'icon-chart', 8),
(UUID(), '研究论文', 'research', '顶会论文、开源项目、技术突破', 'icon-paper', 9)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 初始化新闻源（示例）
INSERT INTO news_sources (id, name, type, url, config, fetch_interval) VALUES
(UUID(), '机器之心', 'rss', 'https://www.jiqizhixin.com/rss', '{"encoding": "utf-8"}', 60),
(UUID(), '量子位', 'rss', 'https://www.qbitai.com/rss', '{"encoding": "utf-8"}', 60)
ON DUPLICATE KEY UPDATE name = VALUES(name);
