/**
 * 隐私政策页 —— 复刻原 privacy.html(纯中文硬编码,未走 i18n,与原项目一致)。
 * 增强:艺术字体标题 + 卡片化段落 + 装饰元素 + 装饰条。
 */
import { Link } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { Button } from '@/components/ui/Button'
import { asset } from '@/lib/utils'
// 装饰已精简 — 保持内容清晰

export default function Privacy() {
  const { t } = useI18n()
  useDocumentMeta({ page: 'privacy' })

  return (
    <div className="container">
      <header className="hero" style={{ position: 'relative', overflow: 'visible' }}>
        <div className="mirror-disc" style={{ position: 'relative', zIndex: 1 }} />
        <h1 className="art-title" style={{ position: 'relative', zIndex: 1 }}>隐私政策</h1>
        <p className="subtitle" style={{ position: 'relative', zIndex: 1 }}>Privacy Policy</p>
        <div className="hero-divider"><span /></div>
        <p className="disclaimer">最后更新：2026 年 7 月</p>
      </header>

      <main>

        <section className="about-section">
          <div className="about-section-icon-wrap">
            <span className="art-seal" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', borderRadius: '50%', background: 'var(--paper-faint)', color: 'var(--accent)', fontSize: '20px' }}>壹</span>
            <h2 className="about-section-title art-title">我们收集哪些数据</h2>
          </div>
          <div>
            <p>心镜（MindMirror）是一款以答题方式照见自我的工具。我们只在为你生成「镜像报告」与维持服务运转所必需的最小范围内收集数据：</p>
            <ul className="privacy-list">
              <li><strong>测评作答结果：</strong>你在名人镜、价值镜、意识镜中提交的作答，以及据此计算出的维度得分、匹配结果与画像标签。这是生成报告的核心数据。</li>
              <li><strong>注册账号邮箱：</strong>当你注册或登录账号时提供的邮箱地址，用于账号识别、登录与必要的服务通知。</li>
              <li><strong>匿名使用行为数据：</strong>为改进体验，我们会记录匿名的使用事件（如进入哪面镜子、完成测评、分享等），并与一个仅存于你浏览器的匿名标识关联，<strong>不包含你的姓名或可定位身份的信息</strong>。</li>
              <li><strong>浏览器本地数据：</strong>见下方「Cookie 与浏览器本地存储」一节。</li>
            </ul>
            <p className="privacy-note">我们<strong>不会</strong>收集你的真实姓名、身份证号、精确地理位置、通讯录或相册等敏感个人信息；意识形态匹配结果仅供参考，不构成任何政治立场的认定。</p>
          </div>
        </section>

        <section className="about-section">
          <div className="about-section-icon-wrap">
            <span className="art-seal" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', borderRadius: '50%', background: 'var(--paper-faint)', color: 'var(--accent)', fontSize: '20px' }}>贰</span>
            <h2 className="about-section-title art-title">我们为何收集这些数据</h2>
          </div>
          <div>
            <ul className="privacy-list">
              <li>生成并保存你的镜像报告、匹配结果与历史记录；</li>
              <li>维持你的登录状态、账号安全与服务连续性；</li>
              <li>通过匿名聚合统计了解产品使用情况，持续优化题目、算法与体验；</li>
              <li>在必要时向你发送与账号或测评相关的服务通知。</li>
            </ul>
            <p>我们不会将你的作答结果或邮箱用于与你无关的商业化广告投放，也不会向第三方出售你的个人数据。</p>
          </div>
        </section>

        <section className="about-section">
          <div className="about-section-icon-wrap">
            <span className="art-seal" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', borderRadius: '50%', background: 'var(--paper-faint)', color: 'var(--accent)', fontSize: '20px' }}>叁</span>
            <h2 className="about-section-title art-title">数据留存期限</h2>
          </div>
          <div>
            <ul className="privacy-list">
              <li><strong>测评作答与结果：</strong>在你的账号存续期间保存，以便你随时回看历史报告。</li>
              <li><strong>账号与邮箱：</strong>在账号有效期内保留；账号注销后随之删除。</li>
              <li><strong>匿名使用行为数据：</strong>仅用于短期聚合分析，保留期限短于可识别个人的数据。</li>
            </ul>
            <p className="privacy-note">当你注销账号或要求我们删除数据时，我们会在合理期限内（通常为收到请求后 30 天内）删除你的作答结果、画像与邮箱等个人数据；法律另有留存要求的除外。</p>
          </div>
        </section>

        <section className="about-section">
          <div className="about-section-icon-wrap">
            <span className="art-seal" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', borderRadius: '50%', background: 'var(--paper-faint)', color: 'var(--accent)', fontSize: '20px' }}>肆</span>
            <h2 className="about-section-title art-title">你的数据权利与操作方式</h2>
          </div>
          <div>
            <p>心镜是<strong>纯前端应用</strong>：你的作答与结果<strong>只保存在你自己的浏览器本地（localStorage）</strong>，我们没有服务器数据库，不收集、不存储、也无法看到你的任何作答数据。因此：</p>
            <ul className="privacy-list">
              <li>通过报告页的「分享 / 导出」可将你的镜像结果导出为图片或自包含链接；</li>
              <li>清除浏览器的本地存储（或使用无痕模式），即等同于<strong>彻底删除</strong>你在心镜的全部数据；</li>
              <li>结果分享链接由你自己生成与传播，是否分享、分享给谁，完全由你掌控。</li>
            </ul>
          </div>
        </section>

        <section className="about-section">
          <div className="about-section-icon-wrap">
            <span className="art-seal" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', borderRadius: '50%', background: 'var(--paper-faint)', color: 'var(--accent)', fontSize: '20px' }}>伍</span>
            <h2 className="about-section-title art-title">Cookie 与浏览器本地存储</h2>
          </div>
          <div>
            <p>心镜主要使用浏览器的<strong>本地存储（localStorage）</strong>而非传统 Cookie 来维持你的体验。具体保存的内容包括：</p>
            <ul className="privacy-list">
              <li><strong>登录态令牌：</strong>用于保持你的登录状态，仅在本机保存；</li>
              <li><strong>语言偏好：</strong>你选择的中文 / English / 日本語；</li>
              <li><strong>静音设置：</strong>你对音效的开关偏好；</li>
              <li><strong>匿名分析标识：</strong>一个随机生成的本机标识，用于匿名使用统计（见上文「匿名使用行为数据」）；</li>
              <li><strong>训练营目标等偏好：</strong>你在训练营中设定的个性化目标。</li>
            </ul>
            <p>这些本地数据<strong>不会随网页请求自动发送给第三方</strong>；唯一对外发送的是与匿名分析标识关联的、不含个人身份的使用事件。我们不使用跨站跟踪 Cookie 来描绘你的画像。</p>
            <p className="privacy-note">说明：页面所用字体由第三方 CDN（字体服务）提供，加载时你的浏览器会按该服务商的隐私政策与其建立连接。你可在浏览器设置中清除本地存储；清除后部分偏好（如登录态、语言）会重置，但不影响你已保存的账号数据。</p>
          </div>
        </section>

        <section className="about-section" id="contact">
          <div className="about-section-icon-wrap">
            <span className="art-seal" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', borderRadius: '50%', background: 'var(--paper-faint)', color: 'var(--accent)', fontSize: '20px' }}>陆</span>
            <h2 className="about-section-title art-title">联系方式</h2>
          </div>
          <div>
            <p>如果你对本隐私政策、你的数据权利，或任何与隐私相关的问题有疑问，欢迎联系我们：</p>
            <ul className="privacy-list">
              <li>隐私事务邮箱：<a href="mailto:privacy@mindmirror.app" className="privacy-inline">privacy@mindmirror.app</a></li>
              <li>也可通过应用内的反馈入口与我们取得联系。</li>
            </ul>
            <p className="privacy-note">本政策以中文为准；如与翻译版本存在歧义，以中文版本为准。我们可能不时更新本政策，重大变更会在产品中予以提示。</p>
          </div>
        </section>

        <div className="actions" style={{ marginTop: '32px' }}>
          <Button to="/">{t('common.back_home')}</Button>
          <Button variant="secondary" to="/about">{t('common.about_brand')}</Button>
        </div>
      </main>
    </div>
  )
}
