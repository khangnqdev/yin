/**
 * Biến định danh và cấu hình gốc toàn hệ thống Yin.
 * TẤT CẢ các component, service, template, page builder PHẢI tham chiếu từ file này
 * để đảm bảo tính nhất quán (Single Source of Truth), tuyệt đối không tự ý hardcode tên riêng ở các file khác.
 */

export interface SystemAuthor {
  name: string;
  role: string;
  avatar: string;
}

export const APP_VARIABLES = {
  // Định danh thương hiệu & hệ sinh thái
  brand: {
    name: 'Yin',
    legalName: 'Công ty Công nghệ Yin',
    englishLegalName: 'Yin Technology',
    domain: 'yin.vn',
    baseUrl: 'https://yin.vn',
    tagline: 'Engineering Studio Cao Cấp',
    slogan: 'Thi công kiến trúc phần mềm chuẩn mực & bền vững',
    desc: 'Công ty Yin — Đơn vị thi công xây dựng phần mềm công nghệ doanh nghiệp. Chúng tôi kiến tạo những nền tảng số chuẩn mực, bảo mật cao và vận hành ổn định cho tổ chức dẫn đầu.',
    descEn: 'Yin builds advanced software ecosystems that turn complex business challenges into streamlined, secure, high-performance digital platforms.',
  },

  // Người sáng lập / Đại diện kỹ thuật hệ thống
  founder: {
    name: 'Yin',
    roleVi: 'Người sáng lập & Kỹ sư trưởng',
    roleEn: 'Founder & Lead Engineer',
    titleVi: 'Nhà Sáng Lập & Kỹ Sư Trưởng Yin',
    titleEn: 'Founder & Chief Architect',
    avatar: '/assets/logo/icon-512.png',
  },

  // Tác giả mặc định cho bài viết / ấn phẩm
  author: {
    defaultName: 'Yin',
    defaultRole: 'Nhà Sáng Lập & Kỹ Sư Trưởng',
    defaultAvatar: '/assets/logo/icon-512.png',
    placeholder: 'vd: Yin',
    exampleLabel: 'Ví dụ: Yin (Founder & Chief Architect)',
  },

  // Danh sách tác giả chuẩn dùng cho hệ thống xuất bản
  activeAuthors: [
    {
      name: 'Yin',
      role: 'Nhà Sáng Lập & Kỹ Sư Trưởng',
      avatar: '/assets/logo/icon-512.png',
    },
    {
      name: 'Ban Biên Tập Yin',
      role: 'Đội Ngũ Kỹ Thuật Yin',
      avatar: '/assets/logo/yin.svg',
    },
  ] as readonly SystemAuthor[],

  // Kênh liên hệ & hỗ trợ kỹ thuật
  contact: {
    email: 'contact@yin.vn',
    privacyEmail: 'privacy@yin.vn',
    hotline: '+84 900 123 456',
    hotlineLabel: 'Hotline Kỹ Thuật (Yin)',
    address: 'Khu Công Nghệ Cao, TP. Thủ Đức, TP. HCM',
    addressFull: 'Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh',
    mapLink: 'https://www.google.com/maps/dir/?api=1&destination=Khu+C%C3%B4ng+Ngh%E1%BB%87+Cao+TP+Th%E1%BB%A7+%C4%90%E1%BB%A9c+TP+H%E1%BB%93+Ch%C3%AD+Minh',
    slaCommitment: 'Trong vòng 24 giờ làm việc',
  },

  // Bản quyền & chứng nhận
  copyright: {
    vi: 'Công ty Công nghệ Yin. Toàn quyền bảo lưu.',
    en: 'Yin Technology. All rights reserved.',
    securityBadge: 'Bảo mật chuẩn Enterprise • Thiết kế theo cảm hứng Workday',
  },

  // Tài sản Logo & Icon
  assets: {
    logo: '/assets/logo/yin.svg',
    logoDark: '/assets/logo/yin-w.svg',
    icon: '/assets/logo/y.svg',
    iconDark: '/assets/logo/y-w.svg',
    avatar: '/assets/logo/icon-512.png',
  },
} as const;

export type AppVariables = typeof APP_VARIABLES;

// Shorthand tiện dụng cho các module
export const DEFAULT_AUTHOR_NAME = APP_VARIABLES.author.defaultName;
export const DEFAULT_AUTHOR_ROLE = APP_VARIABLES.author.defaultRole;
export const DEFAULT_AUTHOR_AVATAR = APP_VARIABLES.author.defaultAvatar;
export const DEFAULT_ACTIVE_AUTHORS = APP_VARIABLES.activeAuthors;
