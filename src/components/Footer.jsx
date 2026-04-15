import { Github, Twitter, Mail } from './icons'

export default function Footer() {
  return (
    <footer className="bg-primary-card border-t border-border mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-accent to-emerald-400 rounded-lg flex items-center justify-center">
                <span className="text-primary-bg font-bold text-lg">AI</span>
              </div>
              <span className="text-xl font-display font-semibold text-gradient">
                Insights Hub
              </span>
            </div>
            <p className="text-text-secondary text-sm">
              AI资讯汇聚平台，每小时自动采集国内外主流AI新闻，AI深度解读，智能分类。
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-text-primary font-medium mb-4">分类导航</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/category/llm" className="text-text-secondary hover:text-primary-accent">大模型/LLM</a></li>
              <li><a href="/category/cv" className="text-text-secondary hover:text-primary-accent">计算机视觉</a></li>
              <li><a href="/category/robotics" className="text-text-secondary hover:text-primary-accent">机器人/具身智能</a></li>
              <li><a href="/category/hardware" className="text-text-secondary hover:text-primary-accent">AI芯片/硬件</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-text-primary font-medium mb-4">联系我们</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-text-secondary hover:text-primary-accent transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-text-secondary hover:text-primary-accent transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-text-secondary hover:text-primary-accent transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-text-secondary text-sm">
          <p>&copy; 2024 AI Insights Hub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
