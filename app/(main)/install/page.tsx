import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...buildMetadata({
    title: '安装浏览器插件',
    path: '/install',
    description: '在 Chrome 或 Edge 安装沉浸式投递插件，启用一键填报与求职跟踪能力。',
    keywords: ['浏览器插件', 'Chrome 扩展', 'Edge 扩展', '一键填报'],
  }),
}

export default function InstallPage() {
  return (
    <div className="container py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">安装浏览器插件</h1>
        <p className="text-muted-foreground mb-8">
          当前采用私有分发方式，不依赖 Chrome Web Store。站内暂时不提供下载按钮，安装时请直接在本地构建目录中手动加载扩展。
        </p>

        <div className="grid gap-4 mb-12">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">最佳实践</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>普通网站不能直接帮用户安装未上架的 Chrome 扩展，所以首页按钮最适合引导到安装说明页，而不是伪装成“一键安装”。</p>
              <p>当前更合适的分发方式是：先给安装说明，再让用户在 `chrome://extensions` 或 `edge://extensions` 中手动加载本地构建目录。</p>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              如果后面要补下载分发，再把构建好的 zip 放到站点静态目录，并把首页 CTA 从“说明书弹窗”升级成“下载扩展包”流程即可。
            </p>
          </Card>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center">1</span>
              加载已解压扩展
            </h2>
            <Card className="p-6">
              <ol className="text-sm text-muted-foreground space-y-3 list-decimal pl-5">
                <li>打开 Chrome 访问 `chrome://extensions`，或 Edge 访问 `edge://extensions`。</li>
                <li>打开右上角的“开发者模式”。</li>
                <li>点击“加载已解压的扩展程序”。</li>
                <li>选择扩展构建目录：开发调试用 `../extension1/.output/chrome-mv3-dev`，生产构建用 `../extension1/.output/chrome-mv3`。</li>
              </ol>
              <p className="text-sm text-muted-foreground mt-4">
                如果你是自己本地开发，这也是最稳定的安装方式，不依赖商店审核，也不会被 Chrome 商店上架状态卡住。
              </p>
            </Card>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center">2</span>
              启用插件能力
            </h2>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                安装完成后，点击浏览器工具栏中的插件图标，打开 Popup 面板。
              </p>
              <div className="bg-muted rounded-sm p-4 text-center">
                <p className="text-xs text-muted-foreground">插件 Popup 截图占位</p>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                开启「沉浸式模式」后，页面右下角会出现精灵球按钮，随后你就可以在招聘网站里使用一键填报和跟踪能力。
              </p>
            </Card>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center">3</span>
              一键填报与求职跟踪
            </h2>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                在任意招聘网站的表单页面，点击精灵球打开侧边面板，或直接点击 Popup 中的「一键填报」按钮。岗位详情页还可以使用「求职跟踪」tab 自动沉淀记录。
              </p>
              <div className="flex gap-4 mt-4">
                <Link href="/tracking">
                  <Button variant="outline" size="sm">
                    查看求职跟踪
                  </Button>
                </Link>
                <Link href="/job-sites">
                  <Button size="sm">
                    查看支持网站
                  </Button>
                </Link>
              </div>
            </Card>
          </section>
        </div>

        <div className="mt-12 p-6 border border-border rounded-sm">
          <h3 className="font-medium text-foreground mb-2">遇到问题？</h3>
          <p className="text-sm text-muted-foreground mb-4">
            如果插件无法正常工作，请检查：
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="i-lucide-check w-4 h-4 text-primary mt-0.5" />
              是否已开启浏览器的开发者模式并重新加载扩展
            </li>
            <li className="flex items-start gap-2">
              <span className="i-lucide-check w-4 h-4 text-primary mt-0.5" />
              确保已登录网站账号
            </li>
            <li className="flex items-start gap-2">
              <span className="i-lucide-check w-4 h-4 text-primary mt-0.5" />
              确保已创建至少一个数据源
            </li>
            <li className="flex items-start gap-2">
              <span className="i-lucide-check w-4 h-4 text-primary mt-0.5" />
              刷新页面后重试
            </li>
          </ul>
          <Link href="/faq" className="text-sm text-primary hover:underline mt-4 inline-block">
            查看更多常见问题
          </Link>
        </div>
      </div>
    </div>
  )
}
