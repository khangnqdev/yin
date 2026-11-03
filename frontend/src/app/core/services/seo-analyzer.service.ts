import { Injectable } from '@angular/core';
import { SeoAnalysisResult } from '../models/article.model';

@Injectable({
  providedIn: 'root'
})
export class SeoAnalyzerService {
  /**
   * Phân tích điểm SEO realtime dựa trên nội dung, từ khóa và tiêu đề.
   * Áp dụng triệt để kỹ thuật Early Return.
   */
  public analyze(
    title: string,
    contentHtml: string,
    focusKeyword: string,
    description: string = ''
  ): SeoAnalysisResult {
    const defaultResult: SeoAnalysisResult = {
      score: 0,
      wordCount: 0,
      readingTimeMinutes: 1,
      keywordDensity: 0,
      hasTitleKeyword: false,
      hasHeadingKeyword: false,
      hasDescriptionKeyword: false,
      contentLengthCheck: false,
      recommendations: []
    };

    // 1. Early Return nếu nội dung trống
    if (!contentHtml || contentHtml.trim().length === 0) {
      defaultResult.recommendations.push('Hãy bắt đầu nhập nội dung cho bài viết.');
      return defaultResult;
    }

    // Tách văn bản thuần từ HTML để đếm từ chính xác
    const plainText = contentHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = plainText.length > 0 ? plainText.split(/\s+/).filter(w => w.length > 0) : [];
    const wordCount = words.length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const recommendations: string[] = [];
    let score = 0;

    // Kiểm tra độ dài nội dung
    const contentLengthCheck = wordCount >= 300;
    if (contentLengthCheck) {
      score += 25;
    } else {
      recommendations.push(`Nội dung hiện tại có ${wordCount} từ (khuyến nghị tối thiểu 300 từ để đạt chuẩn SEO).`);
    }

    // 2. Early Return nếu chưa có từ khóa chính
    const trimmedKeyword = (focusKeyword || '').trim().toLowerCase();
    if (!trimmedKeyword) {
      recommendations.push('Chưa nhập từ khóa trọng tâm (Focus Keyword) cho bài viết.');
      return {
        score,
        wordCount,
        readingTimeMinutes: readingTime,
        keywordDensity: 0,
        hasTitleKeyword: false,
        hasHeadingKeyword: false,
        hasDescriptionKeyword: false,
        contentLengthCheck,
        recommendations
      };
    }

    const keywordWords = trimmedKeyword.split(/\s+/).filter(w => w.length > 1);

    // Kiểm tra từ khóa trong Tiêu đề
    const titleLower = (title || '').toLowerCase();
    const hasTitleKeyword = titleLower.includes(trimmedKeyword) || 
      (keywordWords.length > 1 && keywordWords.every(w => titleLower.includes(w)));
    if (hasTitleKeyword) {
      score += 25;
    } else {
      recommendations.push(`Thêm từ khóa "${trimmedKeyword}" vào tiêu đề bài viết.`);
    }

    // Kiểm tra từ khóa trong Heading (H1, H2, H3)
    const headingMatches = contentHtml.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi) || [];
    const hasHeadingKeyword = headingMatches.some(h => {
      const hLower = h.toLowerCase();
      return hLower.includes(trimmedKeyword) || 
        (keywordWords.length > 1 && keywordWords.every(w => hLower.includes(w)));
    });
    if (hasHeadingKeyword) {
      score += 20;
    } else {
      recommendations.push(`Thêm từ khóa "${trimmedKeyword}" vào ít nhất một tiêu đề phụ (H2 hoặc H3).`);
    }

    // Kiểm tra từ khóa trong Mô tả ngắn (Meta Description)
    const descLower = (description || '').toLowerCase();
    const hasDescriptionKeyword = descLower.includes(trimmedKeyword) || 
      (keywordWords.length > 1 && keywordWords.every(w => descLower.includes(w)));
    if (hasDescriptionKeyword) {
      score += 15;
    } else {
      recommendations.push(`Đưa từ khóa "${trimmedKeyword}" vào phần mô tả ngắn (SEO Description).`);
    }

    // Tính mật độ từ khóa trong nội dung
    const keywordRegex = new RegExp(trimmedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let keywordMatches = plainText.match(keywordRegex) || [];
    let keywordCount = keywordMatches.length;
    if (keywordCount === 0 && keywordWords.length > 1) {
      const firstWordRegex = new RegExp(keywordWords[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      keywordMatches = plainText.match(firstWordRegex) || [];
      keywordCount = Math.max(1, Math.floor(keywordMatches.length / 2));
    }
    const keywordDensity = wordCount > 0 ? Number(((keywordCount / wordCount) * 100).toFixed(1)) : 0;

    if (keywordDensity >= 0.8 && keywordDensity <= 3.0) {
      score += 15;
    } else if (keywordDensity < 0.8) {
      recommendations.push(`Mật độ từ khóa hiện là ${keywordDensity}%. Khuyến nghị xuất hiện từ 0.8% - 2.5% trong nội dung.`);
    } else {
      recommendations.push(`Mật độ từ khóa quá cao (${keywordDensity}%). Hãy điều chỉnh tự nhiên để tránh spam từ khóa.`);
    }

    return {
      score: Math.min(100, score),
      wordCount,
      readingTimeMinutes: readingTime,
      keywordDensity,
      hasTitleKeyword,
      hasHeadingKeyword,
      hasDescriptionKeyword,
      contentLengthCheck,
      recommendations
    };
  }
}

