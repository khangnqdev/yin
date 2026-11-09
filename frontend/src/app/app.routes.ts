import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { adminRoleGuard } from './core/guards/admin-role.guard';
import { clientGuard, clientGuestGuard } from './core/guards/client.guard';

export const routes: Routes = [
  // 1. PUBLIC LANDING PAGES
  {
    path: '',
    title: 'Yin | Thi Công Phần Mềm & Giải Pháp Công Nghệ Cao Cấp',
    data: {
      title: 'Yin | Thi Công Phần Mềm & Giải Pháp Công Nghệ Cao Cấp',
      description:
        'Yin - Đơn vị chuyên thi công phần mềm, làm phần mềm theo yêu cầu và phát triển kiến trúc công nghệ cao cấp. Chịu tải lớn, vững chắc, bảo mật tuyệt đối.',
      keywords:
        'Yin, yin.vn, thi công phần mềm, làm phần mềm, xây dựng phần mềm, lập trình phần mềm, thiết kế phần mềm, gia công phần mềm, kiến trúc phần mềm, phát triển web app',
    },
    loadComponent: () =>
      import('./features/public/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'about',
    title: 'Về Yin',
    data: {
      title: 'Về Yin',
      description:
        'Tìm hiểu về Yin - Đội ngũ kỹ sư và kiến trúc sư thi công phần mềm chuyên nghiệp, kiến tạo nền tảng công nghệ bền vững cho doanh nghiệp.',
      keywords:
        'về Yin, đội ngũ Yin, công ty phần mềm Yin, thi công phần mềm, làm phần mềm doanh nghiệp',
    },
    loadComponent: () =>
      import('./features/public/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'projects',
    title: 'Giải Pháp & Dự Án',
    data: {
      title: 'Giải Pháp & Dự Án',
      description:
        'Khám phá các dự án thi công phần mềm tiêu biểu, hệ thống microservices chịu tải cao và giải pháp công nghệ cao cấp do Yin thực hiện.',
      keywords:
        'dự án phần mềm, giải pháp công nghệ Yin, thi công phần mềm, làm phần mềm quản lý, kiến trúc hệ thống',
    },
    loadComponent: () =>
      import('./features/public/projects/projects.component').then((m) => m.ProjectsComponent),
  },
  {
    path: 'blog',
    title: 'Tri Thức & Báo Chí',
    data: {
      title: 'Tri Thức & Báo Chí',
      description:
        'Kho kiến thức chuyên sâu về kiến trúc phần mềm, kinh nghiệm thi công hệ thống chịu tải lớn và xu hướng công nghệ mới từ Yin.',
      keywords:
        'blog công nghệ, kiến trúc phần mềm, kinh nghiệm thi công phần mềm, làm phần mềm, tri thức lập trình Yin',
    },
    loadComponent: () =>
      import('./features/public/blog/blog-list/blog-list.component').then(
        (m) => m.BlogListComponent,
      ),
  },
  {
    path: 'blog/:slug',
    title: 'Chi Tiết Bài Viết',
    data: {
      title: 'Chi Tiết Bài Viết',
      description: 'Đọc bài viết phân tích kỹ thuật và kiến trúc giải pháp phần mềm tại Yin.',
    },
    loadComponent: () =>
      import('./features/public/blog/blog-detail/blog-detail.component').then(
        (m) => m.BlogDetailComponent,
      ),
  },
  {
    path: 'contact',
    title: 'Liên Hệ & Khảo Sát',
    data: {
      title: 'Liên Hệ & Khảo Sát',
      description:
        'Liên hệ Yin để được tư vấn kiến trúc phần mềm, khảo sát yêu cầu kỹ thuật và nhận báo giá thi công dự án chính xác, tối ưu.',
      keywords:
        'liên hệ Yin, tư vấn thi công phần mềm, khảo sát dự án phần mềm, làm phần mềm theo yêu cầu, báo giá phần mềm',
    },
    loadComponent: () =>
      import('./features/public/contact/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: 'privacy',
    title: 'Chính Sách Bảo Mật & Quản Trị Dữ Liệu',
    data: {
      title: 'Chính Sách Bảo Mật & Quản Trị Dữ Liệu Cá Nhân | Yin',
      description:
        'Chính sách bảo mật thông tin và mô hình quản trị dữ liệu end-to-end theo tiêu chuẩn quốc tế và Nghị định 13/2023/NĐ-CP tại Yin.',
      keywords:
        'chính sách bảo mật, quản trị dữ liệu, bảo vệ dữ liệu cá nhân, Nghị định 13, end-to-end data governance, Yin',
    },
    loadComponent: () =>
      import('./features/public/privacy/privacy.component').then((m) => m.PrivacyComponent),
  },
  {
    path: 'terms',
    redirectTo: 'privacy',
  },
  {
    path: 'chinh-sach-bao-mat',
    redirectTo: 'privacy',
  },

  // 2. CLIENT AUTHENTICATION & PORTAL
  {
    path: 'register',
    title: 'Đăng Ký Tài Khoản',
    data: {
      title: 'Đăng Ký Tài Khoản',
      description:
        'Tạo tài khoản khách hàng Yin để theo dõi tiến độ thi công phần mềm, tài liệu kỹ thuật và hỗ trợ bảo hành.',
    },
    canActivate: [clientGuestGuard],
    loadComponent: () =>
      import('./features/client/register/client-register.component').then(
        (m) => m.ClientRegisterComponent,
      ),
  },
  {
    path: 'login',
    title: 'Đăng Nhập Khách Hàng',
    data: {
      title: 'Đăng Nhập Khách Hàng',
      description:
        'Đăng nhập cổng thông tin khách hàng Yin để quản lý dự án và trao đổi trực tiếp với đội ngũ kỹ thuật.',
    },
    canActivate: [clientGuestGuard],
    loadComponent: () =>
      import('./features/client/login/client-login.component').then((m) => m.ClientLoginComponent),
  },
  {
    path: 'account',
    title: 'Hồ Sơ Tài Khoản',
    data: {
      title: 'Hồ Sơ Tài Khoản',
      description:
        'Trung tâm quản lý thông tin khách hàng, danh sách hợp đồng và các dự án phần mềm đang triển khai tại Yin.',
    },
    canActivate: [clientGuard],
    loadComponent: () =>
      import('./features/client/account/client-account.component').then(
        (m) => m.ClientAccountComponent,
      ),
  },
  {
    path: 'account/support',
    title: 'Trung Tâm Hỗ Trợ',
    data: {
      title: 'Trung Tâm Hỗ Trợ',
      description:
        'Gửi yêu cầu hỗ trợ kỹ thuật, báo cáo sự cố hoặc đề xuất nâng cấp hệ thống phần mềm tại Yin.',
    },
    canActivate: [clientGuard],
    loadComponent: () =>
      import('./features/client/support/client-support.component').then(
        (m) => m.ClientSupportComponent,
      ),
  },

  // 3. ADMIN PORTAL (CMS, SUPPORT, CLIENTS & ACCOUNTS)
  {
    path: 'admin/login',
    title: 'Đăng Nhập Quản Trị',
    data: {
      title: 'Đăng Nhập Quản Trị',
      description: 'Đăng nhập hệ thống quản trị nội bộ Yin Platform.',
    },
    loadComponent: () =>
      import('./features/admin/login/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    children: [
      {
        path: '',
        title: 'Dashboard',
        data: {
          permission: 'dashboard:READ',
          title: 'Dashboard',
          description:
            'Bảng điều khiển quản trị Yin Platform: tổng quan khách hàng, liên hệ, bài viết và chỉ số hệ thống.',
        },
        canActivate: [adminRoleGuard],
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'contacts',
        title: 'Quản Lý Liên Hệ',
        data: {
          permission: 'contacts:READ',
          title: 'Quản Lý Liên Hệ',
          description:
            'Theo dõi và xử lý các yêu cầu khảo sát, báo giá thi công phần mềm từ khách hàng.',
        },
        canActivate: [adminRoleGuard],
        loadComponent: () =>
          import('./features/admin/contacts/admin-contacts.component').then(
            (m) => m.AdminContactsComponent,
          ),
      },
      {
        path: 'clients',
        title: 'Quản Lý Khách Hàng',
        data: {
          permission: 'clients:READ',
          title: 'Quản Lý Khách Hàng',
          description:
            'Danh sách và thông tin chi tiết các đối tác, khách hàng sử dụng dịch vụ thi công phần mềm Yin.',
        },
        canActivate: [adminRoleGuard],
        loadComponent: () =>
          import('./features/admin/clients/admin-clients.component').then(
            (m) => m.AdminClientsComponent,
          ),
      },
      {
        path: 'support-requests',
        title: 'Yêu Cầu Hỗ Trợ',
        data: {
          permission: 'support:READ',
          title: 'Yêu Cầu Hỗ Trợ',
          description:
            'Hàng đợi và tình trạng xử lý các ticket kỹ thuật, bảo trì hệ thống phần mềm.',
        },
        canActivate: [adminRoleGuard],
        loadComponent: () =>
          import('./features/admin/support-requests/admin-support.component').then(
            (m) => m.AdminSupportComponent,
          ),
      },
      {
        path: 'articles',
        title: 'Quản Lý Bài Viết',
        data: {
          permission: 'articles:READ',
          title: 'Quản Lý Bài Viết',
          description:
            'Quản lý danh sách bài viết kiến trúc phần mềm, xuất bản và phân loại nội dung.',
        },
        canActivate: [adminRoleGuard],
        loadComponent: () =>
          import('./features/admin/articles/article-list/admin-articles.component').then(
            (m) => m.AdminArticlesComponent,
          ),
      },
      {
        path: 'articles/create',
        title: 'Soạn Bài Viết Mới',
        data: {
          permission: 'articles:WRITE',
          title: 'Soạn Bài Viết Mới',
          description: 'Soạn thảo bài viết công nghệ mới kèm công cụ kiểm tra điểm SEO realtime.',
        },
        canActivate: [adminRoleGuard],
        loadComponent: () =>
          import('./features/admin/articles/article-editor/admin-article-edit.component').then(
            (m) => m.AdminArticleEditComponent,
          ),
      },
      {
        path: 'articles/edit/:id',
        title: 'Chỉnh Sửa Bài Viết',
        data: {
          permission: 'articles:WRITE',
          title: 'Chỉnh Sửa Bài Viết',
          description: 'Chỉnh sửa nội dung bài viết, cấu hình từ khóa và tiêu đề chuẩn SEO.',
        },
        canActivate: [adminRoleGuard],
        loadComponent: () =>
          import('./features/admin/articles/article-editor/admin-article-edit.component').then(
            (m) => m.AdminArticleEditComponent,
          ),
      },
      {
        path: 'pages',
        title: 'Quản Lý Trang Động',
        data: {
          permission: 'pages:WRITE',
          title: 'Quản Lý Trang Động',
          description: 'Tùy biến các khối giao diện, nội dung trang chủ và landing page.',
        },
        canActivate: [adminRoleGuard],
        loadComponent: () =>
          import('./features/admin/pages-editor/admin-pages-edit.component').then(
            (m) => m.AdminPagesEditComponent,
          ),
      },
      {
        path: 'roles',
        title: 'Vai Trò & Phân Quyền',
        data: {
          permission: 'roles:READ',
          title: 'Vai Trò & Phân Quyền',
          description: 'Quản lý vai trò và quyền truy cập theo tính năng.',
        },
        canActivate: [adminRoleGuard],
        loadComponent: () =>
          import('./features/admin/roles/admin-roles.component').then(m => m.AdminRolesComponent),
      },
      {
        path: 'accounts',
        title: 'Quản Trị Tài Khoản',
        data: {
          permission: 'accounts:READ',
          title: 'Quản Trị Tài Khoản',
          description: 'Quản lý tài khoản nội bộ và phân quyền quản trị Yin Platform.',
        },
        canActivate: [adminRoleGuard],
        loadComponent: () =>
          import('./features/admin/accounts/admin-accounts.component').then(
            (m) => m.AdminAccountsComponent,
          ),
      },
      {
        path: 'settings',
        title: 'Cài Đặt Hệ Thống',
        data: {
          permission: 'profile:WRITE',
          title: 'Cài Đặt Hệ Thống',
          description: 'Cấu hình hồ sơ tác giả và quy chuẩn soạn thảo bài viết.',
        },
        canActivate: [adminRoleGuard],
        loadComponent: () =>
          import('./features/admin/settings/admin-settings.component').then(
            (m) => m.AdminSettingsComponent,
          ),
      },
      {
        path: 'analytics',
        title: 'Báo Cáo Phân Tích',
        data: {
          permission: 'analytics:READ',
          title: 'Báo Cáo Phân Tích',
          description:
            'Thống kê lượng người dùng truy cập, chỉ số chuyển đổi và luồng tương tác thực tế.',
        },
        canActivate: [adminRoleGuard],
        loadComponent: () =>
          import('./features/admin/analytics-report/admin-analytics.component').then(
            (m) => m.AdminAnalyticsComponent,
          ),
      },
    ],
  },

  // 4. ERROR PAGES (403, 404, 510) & FALLBACK
  {
    path: '403',
    title: '403 - Truy Cập Bị Từ Chối | Yin',
    data: {
      statusCode: 403,
      title: '403 - Truy Cập Bị Từ Chối | Yin',
      description: 'Bạn không có quyền truy cập vào tài nguyên hoặc khu vực này.',
      robots: 'noindex, nofollow',
    },
    loadComponent: () =>
      import('./features/public/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
  {
    path: '404',
    title: '404 - Không Tìm Thấy Trang | Yin',
    data: {
      statusCode: 404,
      title: '404 - Không Tìm Thấy Trang | Yin',
      description: 'Trang bạn đang truy cập không tồn tại hoặc đã được thay đổi đường dẫn.',
      robots: 'noindex, nofollow',
    },
    loadComponent: () =>
      import('./features/public/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
  {
    path: '410',
    title: '410 - Liên Kết Đã Bị Xóa Vĩnh Viễn | Yin',
    data: {
      statusCode: 410,
      title: '410 - Liên Kết Đã Bị Xóa Vĩnh Viễn | Yin',
      description: 'Liên kết rút gọn cũ đã bị xóa vĩnh viễn do tên miền đã thay đổi chủ sở hữu.',
      robots: 'noindex, nofollow',
    },
    loadComponent: () =>
      import('./features/public/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
  {
    path: '510',
    title: '510 - Yêu Cầu Không Được Hỗ Trợ | Yin',
    data: {
      statusCode: 510,
      title: '510 - Yêu Cầu Không Được Hỗ Trợ | Yin',
      description: 'Chính sách mở rộng hoặc cấu hình tài nguyên yêu cầu chưa được hỗ trợ.',
      robots: 'noindex, nofollow',
    },
    loadComponent: () =>
      import('./features/public/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
  {
    path: '**',
    title: '404 - Không Tìm Thấy Trang | Yin',
    data: {
      statusCode: 404,
      title: '404 - Không Tìm Thấy Trang | Yin',
      description: 'Trang bạn đang truy cập không tồn tại hoặc đã được thay đổi đường dẫn.',
      robots: 'noindex, nofollow',
    },
    loadComponent: () =>
      import('./features/public/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
