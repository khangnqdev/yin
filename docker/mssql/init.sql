-- LEGACY REFERENCE ONLY. Stack hiện tại dùng backend/src/main/resources/schema.sql.
-- SQL Server Docker image không tự chạy script trong /docker-entrypoint-initdb.d.
-- ==============================================================================
-- YIN TECHNOLOGY PLATFORM - SQL SERVER INITIALIZATION SCRIPT
-- ==============================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'yin_tech_db')
BEGIN
    CREATE DATABASE yin_tech_db COLLATE Latin1_General_100_CI_AS_SC_UTF8;
END
GO

USE yin_tech_db;
GO

-- 1. BẢNG USERS (Quản trị viên)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(100) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        full_name NVARCHAR(200) NOT NULL,
        email NVARCHAR(255) NOT NULL UNIQUE,
        role NVARCHAR(50) NOT NULL DEFAULT 'ADMIN',
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 2. BẢNG CONTACTS (Thông tin người đã liên hệ)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'contacts')
BEGIN
    CREATE TABLE contacts (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        full_name NVARCHAR(200) NOT NULL,
        email NVARCHAR(255) NOT NULL,
        phone NVARCHAR(50) NULL,
        company_name NVARCHAR(255) NULL,
        project_type NVARCHAR(100) NULL,
        budget_range NVARCHAR(100) NULL,
        message NVARCHAR(MAX) NOT NULL,
        status NVARCHAR(50) NOT NULL DEFAULT 'NEW', -- NEW, CONTACTED, IN_PROGRESS, CLOSED
        admin_notes NVARCHAR(MAX) NULL,
        ip_address NVARCHAR(50) NULL,
        user_agent NVARCHAR(500) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE NONCLUSTERED INDEX IX_contacts_status_date ON contacts(status, created_at DESC);
END
GO

-- 3. BẢNG PAGES (Các trang Landing động)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pages')
BEGIN
    CREATE TABLE pages (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        page_key NVARCHAR(100) NOT NULL UNIQUE, -- home, about, projects, blog, contact
        title NVARCHAR(300) NOT NULL,
        meta_description NVARCHAR(500) NULL,
        content_json NVARCHAR(MAX) NOT NULL, -- JSON Array of dynamic blocks
        is_published BIT NOT NULL DEFAULT 1,
        version INT NOT NULL DEFAULT 1,
        updated_by BIGINT NULL,
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 4. BẢNG ARTICLES (Quản lý bài viết)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'articles')
BEGIN
    CREATE TABLE articles (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        title NVARCHAR(400) NOT NULL,
        slug NVARCHAR(400) NOT NULL UNIQUE,
        summary NVARCHAR(1000) NULL,
        thumbnail_url NVARCHAR(1000) NULL,
        category NVARCHAR(100) NOT NULL DEFAULT 'Cong-Nghe',
        content_json NVARCHAR(MAX) NOT NULL, -- Tiptap Block-based JSON
        content_html NVARCHAR(MAX) NULL,    -- Sanitized pre-rendered HTML for SEO
        status NVARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, ARCHIVED
        focus_keyword NVARCHAR(200) NULL,
        seo_title NVARCHAR(300) NULL,
        seo_description NVARCHAR(500) NULL,
        reading_time_minutes INT NOT NULL DEFAULT 1,
        view_count BIGINT NOT NULL DEFAULT 0,
        author_id BIGINT NULL,
        published_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_articles_content_json CHECK (ISJSON(content_json) = 1)
    );

    CREATE NONCLUSTERED INDEX IX_articles_status_published ON articles(status, published_at DESC);
    CREATE NONCLUSTERED INDEX IX_articles_category ON articles(category, status);
END
GO

-- 5. BẢNG READING_SESSIONS (Theo dõi hành vi đọc & điểm rời bỏ)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'reading_sessions')
BEGIN
    CREATE TABLE reading_sessions (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        session_id NVARCHAR(100) NOT NULL,
        target_type NVARCHAR(50) NOT NULL, -- ARTICLE, LANDING_PAGE
        target_id BIGINT NOT NULL,
        max_scroll_depth INT NOT NULL DEFAULT 0, -- 0, 25, 50, 75, 100
        last_block_id NVARCHAR(150) NULL,        -- Block cuối cùng người dùng đọc trước khi thoát
        time_spent_seconds INT NOT NULL DEFAULT 0,
        referrer NVARCHAR(500) NULL,
        user_agent NVARCHAR(500) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE NONCLUSTERED INDEX IX_reading_sessions_target ON reading_sessions(target_type, target_id, max_scroll_depth);
    CREATE NONCLUSTERED INDEX IX_reading_sessions_created ON reading_sessions(created_at DESC);
END
GO

-- 6. BẢNG PAGE_VIEWS (Tần suất người vào website)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'page_views')
BEGIN
    CREATE TABLE page_views (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        session_id NVARCHAR(100) NOT NULL,
        path NVARCHAR(500) NOT NULL,
        referrer NVARCHAR(500) NULL,
        user_agent NVARCHAR(500) NULL,
        viewed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE NONCLUSTERED INDEX IX_page_views_date_path ON page_views(viewed_at, path);
END
GO

