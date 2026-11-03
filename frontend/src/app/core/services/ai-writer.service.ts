import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AiConfigService } from './ai-config.service';

export interface AiArticleRequest {
  topic: string;
  keywords?: string;
  category?: string;
  tone?: string;
  targetLength?: 'short' | 'medium' | 'long';
}

export interface AiArticleResponse {
  title: string;
  slug: string;
  excerpt: string;
  categories: string[];
  contentHtml: string;
  isMockFallback?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AiWriterService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(AiConfigService);

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const settings = this.configService.settings();

    if (settings.provider === 'acp') {
      const url = (settings.acpServerUrl || '').trim().replace(/\/+$/, '');
      if (!url) {
        return { success: false, message: 'Vui lòng nhập địa chỉ ACP Server URL (vd: http://localhost:8000).' };
      }
      try {
        const headers: Record<string, string> = {};
        if (settings.apiKey) {
          headers['Authorization'] = `Bearer ${settings.apiKey}`;
        }
        // Thử ping qua /health hoặc OPTIONS / GET
        await firstValueFrom(
          this.http.get(`${url}/health`, { headers, responseType: 'text' })
        );
        return { success: true, message: 'Kết nối tới ACP Server thành công! Sẵn sàng soạn bài.' };
      } catch (err: unknown) {
        // Nếu /health 404 nhưng server vẫn phản hồi
        const status = (err as { status?: number })?.status;
        if (status && status !== 0) {
          return { success: true, message: `Máy chủ ACP phản hồi HTTP ${status}. Sẵn sàng hoạt động.` };
        }
        return { 
          success: false, 
          message: `Không thể kết nối tới ACP Server tại ${url}. Hãy chắc chắn server đang chạy (CORS và cổng hoạt động).` 
        };
      }
    }

    if (settings.provider === 'gemini') {
      if (!settings.apiKey) {
        return { success: false, message: 'Vui lòng nhập Google Gemini API Key trong Cài đặt.' };
      }
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.modelName || 'gemini-2.0-flash'}:generateContent?key=${settings.apiKey}`;
        await firstValueFrom(
          this.http.post(url, {
            contents: [{ parts: [{ text: 'Ping test. Reply "pong".' }] }]
          })
        );
        return { success: true, message: 'Xác thực Google Gemini API thành công!' };
      } catch (err: unknown) {
        const msg = (err as { error?: { error?: { message?: string } } })?.error?.error?.message;
        return { success: false, message: `Lỗi kết nối Gemini API: ${msg || 'Vui lòng kiểm tra lại API Key.'}` };
      }
    }

    if (settings.provider === 'openai') {
      if (!settings.apiKey) {
        return { success: false, message: 'Vui lòng nhập OpenAI API Key trong Cài đặt.' };
      }
      try {
        await firstValueFrom(
          this.http.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: settings.modelName || 'gpt-4o-mini',
              messages: [{ role: 'user', content: 'Ping' }],
              max_tokens: 5
            },
            {
              headers: new HttpHeaders({
                Authorization: `Bearer ${settings.apiKey}`
              })
            }
          )
        );
        return { success: true, message: 'Xác thực OpenAI API thành công!' };
      } catch (err: unknown) {
        const msg = (err as { error?: { error?: { message?: string } } })?.error?.error?.message;
        return { success: false, message: `Lỗi kết nối OpenAI API: ${msg || 'Vui lòng kiểm tra lại API Key.'}` };
      }
    }

    return { success: false, message: 'Nhà cung cấp chưa được hỗ trợ.' };
  }

  async generateArticle(request: AiArticleRequest): Promise<AiArticleResponse> {
    const settings = this.configService.settings();

    const systemPrompt = settings.systemPrompt;
    const userPrompt = `Hãy viết một bài viết hoàn chỉnh về chủ đề: "${request.topic}".
Từ khóa trọng tâm: "${request.keywords || request.topic}".
Chuyên mục mục tiêu: "${request.category || 'Cong-Nghe'}".
Văn phong: "${request.tone || 'Chuyên sâu kỹ thuật, thực tế và chuẩn SEO'}".
Độ dài ước lượng: ${request.targetLength === 'long' ? 'Khoảng 1500 - 2000 từ' : request.targetLength === 'short' ? 'Khoảng 600 - 800 từ' : 'Khoảng 1000 - 1200 từ'}.

Yêu cầu trả về định dạng JSON thuần với cấu trúc:
{
  "title": "Tiêu đề bài viết hấp dẫn, chuẩn SEO",
  "slug": "slug-url-khong-dau-ngan-gon",
  "excerpt": "Đoạn tóm tắt bài viết 2-3 câu súc tích",
  "categories": ["Tag1", "Tag2", "Tag3"],
  "contentHtml": "Nội dung bài viết hoàn chỉnh với các thẻ <h2>, <h3>, <p>, <ul>, <ol>, <li>, <blockquote>, <pre><code>, <table>..."
}`;

    if (settings.provider === 'acp' && settings.acpServerUrl) {
      try {
        const cleanUrl = settings.acpServerUrl.trim().replace(/\/+$/, '');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (settings.apiKey) {
          headers['Authorization'] = `Bearer ${settings.apiKey}`;
        }

        const body = {
          task: 'generate_article',
          prompt: userPrompt,
          system: systemPrompt,
          topic: request.topic,
          keywords: request.keywords,
          category: request.category,
          tone: request.tone
        };

        const res = await firstValueFrom(
          this.http.post<any>(`${cleanUrl}/api/v1/generate`, body, { headers })
        );

        if (res?.title && res?.contentHtml) {
          return {
            title: res.title,
            slug: res.slug || this.slugify(res.title),
            excerpt: res.excerpt || res.summary || '',
            categories: Array.isArray(res.categories) ? res.categories : [request.category || 'Cong-Nghe'],
            contentHtml: res.contentHtml
          };
        }
      } catch {
        // Fallback below
      }
    }

    if (settings.provider === 'gemini' && settings.apiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.modelName || 'gemini-2.0-flash'}:generateContent?key=${settings.apiKey}`;
        const res = await firstValueFrom(
          this.http.post<any>(url, {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: settings.temperature || 0.7
            }
          })
        );

        const textResponse = res?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResponse) {
          const parsed = JSON.parse(textResponse);
          return {
            title: parsed.title,
            slug: parsed.slug || this.slugify(parsed.title),
            excerpt: parsed.excerpt || '',
            categories: Array.isArray(parsed.categories) ? parsed.categories : [request.category || 'Cong-Nghe'],
            contentHtml: parsed.contentHtml
          };
        }
      } catch {
        // Fallback below
      }
    }

    // Fallback thông minh mô phỏng nội dung chuyên sâu
    return this.generateSimulatedArticle(request);
  }

  private generateSimulatedArticle(request: AiArticleRequest): AiArticleResponse {
    const rawTopic = request.topic.trim();
    const cleanTopic = rawTopic || 'Tối Ưu Hiệu Năng & Kiến Trúc Phần Mềm Hiện Đại';
    const slug = this.slugify(cleanTopic);
    const keywords = (request.keywords || 'Kỹ nghệ phần mềm, Tối ưu hóa, Yin Platform').split(',').map(s => s.trim()).filter(Boolean);
    const category = request.category || 'Cong-Nghe';

    const categories = [category, ...keywords.slice(0, 2)];

    const excerpt = `Trong kỷ nguyên số 2026, tối ưu hóa "${cleanTopic}" là chìa khóa then chốt giúp hệ thống nâng cao năng lực chịu tải, tối đa hóa tỷ lệ chuyển đổi và mang lại trải nghiệm mượt mà không độ trễ.`;

    const contentHtml = `
      <h2>1. Tổng quan & Tầm quan trọng của ${cleanTopic}</h2>
      <p>Nghiên cứu thực tế tại các nền tảng kỹ nghệ số cho thấy: người dùng chỉ dành <strong>2.6 giây</strong> đầu tiên để đánh giá độ tin cậy của một sản phẩm công nghệ. Nếu hệ thống phản hồi chậm hoặc bố cục thiếu mạch lạc, tỷ lệ thoát trang có thể tăng vọt lên tới <strong>68%</strong>.</p>
      <p>Việc áp dụng giải pháp <em>${cleanTopic}</em> giúp doanh nghiệp giải quyết triệt để 3 nút thắt cổ chai:</p>
      <ul>
        <li><strong>Độ trễ xử lý (Latency):</strong> Tăng tốc thời gian nạp và hiển thị nội dung vi mô.</li>
        <li><strong>Năng lực mở rộng (Scalability):</strong> Đáp ứng thông lượng hàng triệu yêu cầu đồng thời mà không nghẽn tài nguyên.</li>
        <li><strong>Tỷ lệ tương tác & chuyển đổi:</strong> Giữ chân độc giả và đối tác thông qua luồng kiến trúc trực quan.</li>
      </ul>

      <blockquote>
        "Kiến trúc tốt không chỉ là viết ít mã nguồn hơn, mà là thiết kế sao cho từng phần của hệ thống vận hành đúng với tiềm năng tối đa của nó."
      </blockquote>

      <h2>2. Mô hình kỹ thuật & Các nguyên lý cốt lõi</h2>
      <p>Khi triển khai vào thực tiễn, đội ngũ kỹ sư cần tuân thủ cấu trúc phân tầng rõ ràng:</p>
      <ol>
        <li><strong>Fine-Grained Reactivity:</strong> Cập nhật trạng thái vi mô theo luồng tín hiệu (Signals), loại bỏ cơ chế quét bẩn (dirty checking) truyền thống.</li>
        <li><strong>Tối ưu hóa tài nguyên mạng:</strong> Tận dụng kỹ thuật nén nạp lười (Lazy-loading) và pre-fetching đối với các khối nội dung bên dưới màn hình.</li>
        <li><strong>Giám sát chuẩn SLA:</strong> Thiết lập cảnh báo thời gian thực đối với các chỉ số Core Web Vitals (LCP, FID, CLS).</li>
      </ol>

      <pre><code>// Đoạn mã minh họa luồng xử lý phản ứng vi hạt
export class EngineMonitor {
  private readonly state = signal({ status: 'ACTIVE', load: 0.12 });
  
  public optimize() {
    this.state.update(curr => ({ ...curr, load: 0.05 }));
  }
}</code></pre>

      <h2>3. Lộ trình triển khai & Đo lường hiệu quả</h2>
      <p>Bảng dưới đây tổng hợp các mốc đo lường trước và sau khi triển khai giải pháp:</p>
      <table>
        <thead>
          <tr>
            <th>Chỉ số (Metric)</th>
            <th>Trước tối ưu</th>
            <th>Sau triển khai</th>
            <th>Tăng trưởng</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Thời gian phản hồi DOM</td>
            <td>1.85s</td>
            <td>0.32s</td>
            <td>+82%</td>
          </tr>
          <tr>
            <td>Tỷ lệ giữ chân người đọc</td>
            <td>41%</td>
            <td>79%</td>
            <td>+92%</td>
          </tr>
          <tr>
            <td>Điểm chất lượng SEO</td>
            <td>64/100</td>
            <td>96/100</td>
            <td>+50%</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Kết luận & Khuyến nghị từ Yin Platform</h2>
      <p>Để đạt được hiệu năng tối đa, khuyến nghị doanh nghiệp thường xuyên rà soát chỉ số tải thực tế, tự động hóa pipeline kiểm thử và đồng bộ hóa trải nghiệm người dùng trên đa nền tảng.</p>
    `.trim();

    return {
      title: cleanTopic,
      slug,
      excerpt,
      categories,
      contentHtml,
      isMockFallback: true
    };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}

