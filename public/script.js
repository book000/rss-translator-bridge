class RSSTranslator {
  constructor() {
    this.form = document.querySelector('#translateForm')
    this.translateBtn = document.querySelector('#translateBtn')
    this.loadingSection = document.querySelector('#loading')
    this.errorSection = document.querySelector('#errorSection')
    this.performanceSection = document.querySelector('#performanceSection')
    this.resultsSection = document.querySelector('#resultsSection')

    this.init()
  }

  init() {
    this.form.addEventListener('submit', this.handleSubmit.bind(this))
  }

  async handleSubmit(event) {
    event.preventDefault()

    const formData = new FormData(this.form)
    const url = formData.get('url')
    const sourceLang = formData.get('sourceLang')
    const targetLang = formData.get('targetLang')

    if (!url) {
      this.showError('RSS URLを入力してください')
      return
    }

    this.startTranslation()

    try {
      const startTime = performance.now()
      const startDateTime = new Date()

      // 元のRSSフィードを取得
      const originalRssPromise = this.fetchOriginalRSS(url)

      // 翻訳APIを呼び出し
      const translatedRssPromise = this.translateRSS(
        url,
        sourceLang,
        targetLang
      )

      // 並行で実行
      const [originalRss, translatedRss] = await Promise.all([
        originalRssPromise,
        translatedRssPromise,
      ])

      const endTime = performance.now()
      const responseTime = endTime - startTime

      this.showResults(originalRss, translatedRss, responseTime, startDateTime)
    } catch (error) {
      console.error('Translation error:', error)
      this.showError(error.message || '翻訳処理中にエラーが発生しました')
    } finally {
      this.endTranslation()
    }
  }

  async fetchOriginalRSS(url) {
    try {
      // CORS制限を回避するため、サーバー経由で取得
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`
      const response = await fetch(proxyUrl)

      if (!response.ok) {
        // プロキシが利用できない場合は、直接取得を試行
        const directResponse = await fetch(url, { mode: 'cors' })
        if (!directResponse.ok) {
          throw new Error('元のRSSフィードの取得に失敗しました')
        }
        return await directResponse.text()
      }

      return await response.text()
    } catch (error) {
      // フォールバック: サンプルXMLを返す
      console.warn('Original RSS fetch failed, using fallback:', error)
      return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>元のRSSフィード (取得失敗)</title>
    <description>CORS制限により元のRSSフィードを取得できませんでした</description>
    <item>
      <title>サンプル記事</title>
      <description>元のRSSフィードの内容を表示できません</description>
    </item>
  </channel>
</rss>`
    }
  }

  async translateRSS(url, sourceLang, targetLang) {
    const parameters = new URLSearchParams({
      url,
      sourceLang: sourceLang || 'auto',
      targetLang: targetLang || 'ja',
    })

    const response = await fetch(`/api?${parameters}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      )
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json()
      throw new Error(errorData.error || '翻訳処理でエラーが発生しました')
    }

    return await response.text()
  }

  startTranslation() {
    this.translateBtn.disabled = true
    this.translateBtn.textContent = '翻訳中...'
    this.loadingSection.style.display = 'block'
    this.errorSection.style.display = 'none'
    this.performanceSection.style.display = 'none'
    this.resultsSection.style.display = 'none'
  }

  endTranslation() {
    this.translateBtn.disabled = false
    this.translateBtn.textContent = '翻訳開始'
    this.loadingSection.style.display = 'none'
  }

  showResults(originalXml, translatedXml, responseTime, startTime) {
    // パフォーマンス情報を表示
    document.querySelector('#responseTime').textContent =
      `${responseTime.toFixed(2)}ms`
    document.querySelector('#status').textContent = '成功'
    document.querySelector('#startTime').textContent =
      startTime.toLocaleString()

    // XML内容を表示（シンタックスハイライト付き）
    document.querySelector('#originalXml').querySelector('code').innerHTML =
      this.highlightXML(originalXml)
    document.querySelector('#translatedXml').querySelector('code').innerHTML =
      this.highlightXML(translatedXml)

    this.performanceSection.style.display = 'block'
    this.resultsSection.style.display = 'block'
  }

  showError(message) {
    document.querySelector('#errorMessage').textContent = message
    this.errorSection.style.display = 'block'
    this.performanceSection.style.display = 'none'
    this.resultsSection.style.display = 'none'

    // パフォーマンス情報にエラー状態を表示
    document.querySelector('#status').textContent = 'エラー'
    this.performanceSection.style.display = 'block'
  }

  highlightXML(xmlString) {
    // 簡単なXMLシンタックスハイライト
    return xmlString
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll(
        /&lt;(\/?[\w:]+)([^&]*)&gt;/g,
        (match, tagName, attributes) => {
          // タグ名をハイライト
          let highlighted = `&lt;<span class="xml-tag">${tagName}</span>`

          // 属性をハイライト
          if (attributes.trim()) {
            highlighted += attributes.replaceAll(
              /([\w:-]+)=(["'])(.*?)\2/g,
              '<span class="xml-attr-name">$1</span>=<span class="xml-attr-value">"$3"</span>'
            )
          }

          highlighted += '&gt;'
          return highlighted
        }
      )
      .replaceAll(
        /&lt;!--([^]*?)--&gt;/g,
        '<span class="xml-comment">&lt;!--$1--&gt;</span>'
      )
  }

  // XMLのフォーマット（美化）
  formatXML(xmlString) {
    const formatted = xmlString.replaceAll(/(>)(<)(\/*)/g, '$1\n$2$3')
    const lines = formatted.split('\n')
    let indent = 0
    let result = ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      if (trimmed.startsWith('</')) {
        indent--
      }

      result += '  '.repeat(Math.max(0, indent)) + trimmed + '\n'

      if (
        trimmed.startsWith('<') &&
        !trimmed.startsWith('</') &&
        !trimmed.endsWith('/>')
      ) {
        indent++
      }
    }

    return result.trim()
  }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
  const translator = new RSSTranslator()
  return translator
})

// パフォーマンス計測の詳細表示
window.addEventListener('load', () => {
  const perfEntries = performance.getEntriesByType('navigation')
  if (perfEntries.length > 0) {
    const perfData = perfEntries[0]
    console.log('Page Load Performance:', {
      'DNS Lookup': `${(perfData.domainLookupEnd - perfData.domainLookupStart).toFixed(2)}ms`,
      'TCP Connection': `${(perfData.connectEnd - perfData.connectStart).toFixed(2)}ms`,
      'TLS Setup': `${(perfData.secureConnectionStart > 0 ? perfData.connectEnd - perfData.secureConnectionStart : 0).toFixed(2)}ms`,
      Request: `${(perfData.responseStart - perfData.requestStart).toFixed(2)}ms`,
      Response: `${(perfData.responseEnd - perfData.responseStart).toFixed(2)}ms`,
      'DOM Processing': `${(perfData.domContentLoadedEventEnd - perfData.responseEnd).toFixed(2)}ms`,
      Total: `${(perfData.loadEventEnd - perfData.navigationStart).toFixed(2)}ms`,
    })
  }
})
