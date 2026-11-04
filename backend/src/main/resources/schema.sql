CREATE TABLE IF NOT EXISTS users (
    id varchar(64) PRIMARY KEY,
    username varchar(100) NOT NULL UNIQUE,
    password_hash varchar(255) NOT NULL,
    role varchar(30) NOT NULL CHECK (role IN ('CLIENT', 'MANAGER', 'ADMIN', 'FIXER')),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    email varchar(255),
    phone varchar(50),
    date_of_birth date,
    receive_updates boolean NOT NULL DEFAULT false,
    token_version integer NOT NULL DEFAULT 0
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS author_name varchar(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS author_role varchar(200);
CREATE UNIQUE INDEX IF NOT EXISTS ix_yin_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_yin_users_role_created ON users(role, created_at DESC, id DESC)
    INCLUDE (username, email, phone, receive_updates);

CREATE TABLE IF NOT EXISTS articles (
    id varchar(64) PRIMARY KEY,
    title varchar(400) NOT NULL,
    slug varchar(400) NOT NULL UNIQUE,
    summary text NOT NULL DEFAULT '',
    category varchar(500) NOT NULL,
    thumbnail_url text NOT NULL DEFAULT '',
    content_json text NOT NULL CHECK (content_json::jsonb IS NOT NULL),
    content_html text NOT NULL DEFAULT '',
    status varchar(30) NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    focus_keyword varchar(200) NOT NULL DEFAULT '',
    seo_title varchar(300),
    seo_description varchar(500),
    reading_time_minutes integer NOT NULL DEFAULT 1,
    word_count integer NOT NULL DEFAULT 0,
    view_count bigint NOT NULL DEFAULT 0,
    author_name varchar(200) NOT NULL,
    published_at timestamp,
    created_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    updated_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    sort_at timestamp GENERATED ALWAYS AS (coalesce(published_at, created_at)) STORED,
    deleted_at timestamp
);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS author_role varchar(200) NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS ix_yin_articles_status_published ON articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS ix_yin_articles_sort ON articles(sort_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS ix_yin_articles_status_sort ON articles(status, sort_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS pages (
    page_key varchar(100) PRIMARY KEY,
    title varchar(300) NOT NULL,
    meta_description varchar(500) NOT NULL DEFAULT '',
    content_json text NOT NULL CHECK (content_json::jsonb IS NOT NULL),
    updated_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

CREATE TABLE IF NOT EXISTS contacts (
    id varchar(64) PRIMARY KEY,
    full_name varchar(200) NOT NULL,
    email varchar(255) NOT NULL,
    phone varchar(50) NOT NULL,
    company_name varchar(255),
    project_type varchar(100) NOT NULL,
    budget_range varchar(100) NOT NULL,
    message text NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'NEW'
        CHECK (status IN ('NEW', 'CONTACTED', 'IN_PROGRESS', 'CLOSED')),
    admin_notes text,
    created_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    updated_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);
CREATE INDEX IF NOT EXISTS ix_yin_contacts_status_date ON contacts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_yin_contacts_created ON contacts(created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS support_requests (
    id varchar(64) PRIMARY KEY,
    user_id varchar(64) NOT NULL REFERENCES users(id),
    subject varchar(200) NOT NULL,
    message text NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    created_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    updated_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);
CREATE INDEX IF NOT EXISTS ix_yin_support_user_date ON support_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_yin_support_status_date ON support_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_yin_support_user_created_id ON support_requests(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS ix_yin_support_status_created_id ON support_requests(status, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS page_views (
    id varchar(64) PRIMARY KEY,
    session_id varchar(100) NOT NULL,
    path varchar(500) NOT NULL,
    referrer varchar(500) NOT NULL DEFAULT '',
    viewed_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);
CREATE INDEX IF NOT EXISTS ix_yin_page_views_date ON page_views(viewed_at DESC);

CREATE TABLE IF NOT EXISTS reading_sessions (
    id varchar(64) PRIMARY KEY,
    session_id varchar(100) NOT NULL,
    target_id varchar(100) NOT NULL,
    target_title varchar(400) NOT NULL,
    max_scroll_depth integer NOT NULL CHECK (max_scroll_depth IN (0, 25, 50, 75, 100)),
    last_block_id varchar(150) NOT NULL DEFAULT '',
    last_block_label varchar(300) NOT NULL DEFAULT '',
    time_spent_seconds integer NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    updated_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    CONSTRAINT uq_yin_reading_session UNIQUE(session_id, target_id)
);
CREATE INDEX IF NOT EXISTS ix_yin_reading_sessions_target ON reading_sessions(target_id, max_scroll_depth);
CREATE INDEX IF NOT EXISTS ix_yin_reading_sessions_created ON reading_sessions(created_at DESC, id DESC);
