import { marked } from 'marked';

export interface ParsedArticleMarkdown {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  coverImagePrompt?: string;
  contentHtml: string;
  rawMarkdown: string;
}

export const ARTICLE_FORMAT_MARKDOWN_TEMPLATE = `---
title: "Tiêu Đề Bài Viết Hấp Dẫn Và Chuẩn SEO"
slug: "tieu-de-bai-viet-chuan-seo"
excerpt: "Đoạn mô tả ngắn tóm tắt giá trị bài viết từ 120-160 ký tự, giúp tối ưu thẻ Meta Description và tăng tỷ lệ click (CTR)."
category: "Công Nghệ"
tags: ["SEO", "Công Nghệ", "Hướng Dẫn"]
cover_image_prompt: "Minimalist modern 3D illustration of digital technology and cloud data network, elegant lighting, clean background, 8k resolution"
---

Mở bài đi thẳng vào chủ đề trong 100 từ đầu tiên. Nêu rõ vấn đề người đọc đang gặp phải và giải pháp bài viết sẽ mang lại. Tránh các câu chào hỏi rườm rà hay sáo ngữ quảng cáo phóng đại.

## 1. Luận điểm trọng tâm đầu tiên

Trình bày nội dung chính một cách mạch lạc, súc tích. Mỗi đoạn văn chỉ nên tập trung vào một thông điệp rõ ràng và cung cấp thông tin mới.

- **Đặc điểm 1**: Trình bày ngắn gọn, tập trung vào lợi ích người dùng.
- **Đặc điểm 2**: Dẫn chứng bằng ví dụ hoặc số liệu cụ thể đã được kiểm chứng.
- **Đặc điểm 3**: Động từ chủ động, văn phong gần gũi và chuyên nghiệp.

![Mô tả hình ảnh minh họa](placeholder: "Gợi ý mô tả chi tiết nội dung ảnh cần chèn vào vị trí này để minh họa cho luận điểm trên")

## 2. Quy trình thực hiện từng bước

1. **Bước chuẩn bị**: Liệt kê đầy đủ các yêu cầu hoặc tài liệu cần thiết.
2. **Bước thực thi**: Hướng dẫn chi tiết thao tác từng bước.
3. **Bước đánh giá**: Cách kiểm tra kết quả sau khi hoàn thành.

| Tiêu chí | Cách truyền thống | Giải pháp hiện đại |
| :--- | :--- | :--- |
| Tốc độ xử lý | Chậm, tốn thời gian | Nhanh chóng, tự động hóa |
| Độ chính xác | Dễ nhầm lẫn thủ công | Độ chính xác cao, chuẩn hóa |

## 3. Tổng kết

Tóm tắt ngắn gọn giá trị cốt lõi và định hướng hành động tiếp theo cho người đọc. Không lặp lại nguyên văn phần mở bài.
`;

export const ARTICLE_AI_SYSTEM_PROMPT = `Bạn là biên tập viên công nghệ và chuyên gia SEO chuyên nghiệp.
Nhiệm vụ của bạn là soạn thảo một bài viết chất lượng cao dựa trên brief của người dùng và xuất ra DUY NHẤT một file Markdown (.md) theo cấu trúc chuẩn dưới đây:

### 1. QUY ĐỊNH PHẦN METADATA (FRONTMATTER BẮT BUỘC Ở ĐẦU FILE):
---
title: "Tiêu đề bài viết dưới 65 ký tự, cuốn hút, nêu rõ lợi ích, không giật tít vô căn cứ"
slug: "duong-dan-tinh-khong-dau-ngan-gon-chuan-seo"
excerpt: "Tóm tắt ngắn gọn nội dung bài viết từ 120-160 ký tự"
category: "Tên chuyên mục (vd: Công Nghệ, Bảo Mật, Kinh Doanh, Đời Sống...)"
tags: ["Từ khóa 1", "Từ khóa 2", "Từ khóa 3"]
cover_image_prompt: "Gợi ý prompt tiếng Anh hoặc tiếng Việt để tạo ảnh bìa chất lượng cao bằng Midjourney/DALL-E/Canva"
---

### 2. QUY CHUẨN NỘI DUNG (SEO & CORE-EEAT):
- KHÔNG dùng thẻ H1 (#) trong nội dung vì tiêu đề đã được quản lý ở phần Frontmatter.
- Dùng thẻ H2 (##) cho các luận điểm lớn, H3 (###) cho các nhánh con. Tuyệt đối KHÔNG lặp lại nguyên văn tiêu đề bài viết trong H2 hoặc H3.
- Mở bài đi thẳng vào vấn đề trong 100 từ đầu tiên.
- Mỗi đoạn văn phải mang thông tin mới, chống trùng lặp câu chữ và ý tứ giữa các đoạn.
- Khi cần chèn ảnh minh họa, hãy để dạng placeholder:
  ![Mô tả ảnh](placeholder: "Gợi ý mô tả hình ảnh cần chèn")
- Dùng danh sách gạch đầu dòng (-) hoặc đánh số (1., 2.) và bảng biểu Markdown (|) khi so sánh số liệu để bài viết dễ đọc.
- Giữ giọng văn chuyên nghiệp, rõ ràng, câu ngắn gọn, không dùng emoji tùy tiện trong bài viết kỹ thuật.
`;

export function parseArticleMarkdown(raw: string): ParsedArticleMarkdown {
  let frontmatterText = '';
  let bodyMarkdown = raw;

  const trimmed = raw.trim();
  if (trimmed.startsWith('---')) {
    const endIdx = trimmed.indexOf('---', 3);
    if (endIdx !== -1) {
      frontmatterText = trimmed.substring(3, endIdx).trim();
      bodyMarkdown = trimmed.substring(endIdx + 3).trim();
    }
  }

  const meta: Record<string, any> = {};
  const lines = frontmatterText.split('\n');
  for (const line of lines) {
    const match = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      if (val.startsWith('[') && val.endsWith(']')) {
        try {
          meta[key] = JSON.parse(val);
        } catch {
          meta[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
        }
      } else {
        meta[key] = val;
      }
    }
  }

  const title = meta['title'] || '';
  const slug = meta['slug'] || '';
  const excerpt = meta['excerpt'] || '';
  const category = meta['category'] || 'Công Nghệ';
  let tags: string[] = [];
  if (Array.isArray(meta['tags'])) {
    tags = meta['tags'];
  } else if (typeof meta['tags'] === 'string' && meta['tags']) {
    tags = meta['tags'].split(',').map(s => s.trim()).filter(Boolean);
  }
  const coverImagePrompt = meta['cover_image_prompt'] || meta['cover_image'] || '';

  // Render markdown to clean HTML using marked
  const contentHtml = marked.parse(bodyMarkdown, { async: false }) as string;

  return {
    title,
    slug,
    excerpt,
    category,
    tags,
    coverImagePrompt,
    contentHtml,
    rawMarkdown: raw
  };
}

