-- ============================================================
-- MindMirror 核心数据库 Schema
-- 领域、测评、题库、用户、社交、插件、AI
-- ============================================================

-- 0. 扩展
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. 领域 / 板块
-- ============================================================
create table domains (
  id          text primary key,                          -- 'self' | 'entertainment' | 'relation'
  name        text not null,
  name_en     text,
  name_ja     text,
  tagline     text,
  tagline_en  text,
  tagline_ja  text,
  description text,
  icon        text,
  icon_svg    text,
  accent      text,                                      -- 主题色
  theme       text default 'default',                    -- 'ink' | 'neon' | 'warm' | ...
  sort_order  int default 0,
  available   boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- 2. 测评
-- ============================================================
create table assessments (
  id                uuid primary key default gen_random_uuid(),
  domain_id         text not null references domains(id),
  slug              text unique not null,
  title             text not null,
  title_en          text,
  title_ja          text,
  subtitle          text,
  description       text,
  icon              text,
  accent            text,
  theme             text default 'ink',                  -- 主题风格
  question_count    int default 0,
  estimated_minutes int default 0,
  version           text default '1.0',
  is_published      boolean default false,
  sort_order        int default 0,
  meta              jsonb default '{}',                  -- 额外元数据
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ============================================================
-- 3. 题型枚举
-- ============================================================
create type question_type as enum (
  'scale', 'dilemma', 'allocation', 'sort', 'iat',
  'slider', 'forced_choice', 'matrix', 'auction', 'choice'
);

-- ============================================================
-- 4. 题目
-- ============================================================
create table questions (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  sort_order    int not null,
  type          question_type not null,
  prompt        text not null,
  prompt_en     text,
  prompt_ja     text,
  context       text,                                    -- 情境描述
  tier          int default 1,                           -- 1=fast 2=standard 3=deep
  dimension     text,                                    -- 维度标签
  data          jsonb not null default '{}',             -- 选项/分数映射/权重等
  created_at    timestamptz default now()
);

create index idx_questions_assessment on questions(assessment_id, sort_order);

-- ============================================================
-- 5. 用户系统
-- ============================================================
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  nickname      text,
  avatar_url    text,
  bio           text,
  preferences   jsonb default '{}',
  level         int default 1,                           -- 用户等级
  experience    int default 0,                            -- 经验值
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 创建用户时自动创建 profile
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 6. 测评结果
-- ============================================================
create table results (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid not null references assessments(id),
  answers       jsonb not null,
  scores        jsonb not null,
  matches       jsonb,
  conflicts     jsonb,
  insights      jsonb,
  summary       jsonb,
  profile       jsonb,
  share_token   text unique default encode(gen_random_bytes(12), 'hex'),
  is_public     boolean default false,
  duration_sec  int,
  created_at    timestamptz default now()
);

create index idx_results_user on results(user_id, created_at desc);
create index idx_results_assessment on results(assessment_id);
create index idx_results_share on results(share_token);

-- ============================================================
-- 7. 社交: 好友关系
-- ============================================================
create type friendship_status as enum ('pending', 'accepted', 'blocked');

create table friendships (
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status       friendship_status default 'pending',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  primary key (requester_id, addressee_id)
);

-- ============================================================
-- 8. 社交: 结果对比
-- ============================================================
create table result_comparisons (
  id          uuid primary key default gen_random_uuid(),
  result_a_id uuid not null references results(id) on delete cascade,
  result_b_id uuid not null references results(id) on delete cascade,
  similarity  jsonb,
  created_at  timestamptz default now()
);

-- ============================================================
-- 9. 动态内容: 每日名言
-- ============================================================
create table daily_quotes (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  text_en     text,
  text_ja     text,
  author      text,
  author_en   text,
  source      text,
  date_key    date,                                      -- 指定日期, null 则随机
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- 10. 动态内容: 历史上的今天
-- ============================================================
create table daily_events (
  id          uuid primary key default gen_random_uuid(),
  month_day   text not null,                             -- 'MM-DD'
  year        int,
  text        text not null,
  text_en     text,
  text_ja     text,
  tag         text,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create index idx_daily_events_md on daily_events(month_day);

-- ============================================================
-- 11. 名人库
-- ============================================================
create table figures (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  name_en     text,
  name_ja     text,
  era         text,
  field       text,
  bio         text,
  bio_en      text,
  bio_ja      text,
  quotes      jsonb default '[]',                        -- [{text, source}]
  anecdotes   jsonb default '[]',                        -- [{title, text}]
  scores      jsonb not null default '{}',               -- 7维分数
  image_url   text,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- 12. 插件系统
-- ============================================================
create table plugins (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  description   text,
  author_id     uuid references auth.users(id),
  author_name   text,
  version       text default '1.0.0',
  manifest      jsonb not null,                          -- 完整插件清单
  icon_url      text,
  is_verified   boolean default false,
  install_count int default 0,
  is_active     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 用户已安装的插件
create table user_plugins (
  user_id     uuid not null references auth.users(id) on delete cascade,
  plugin_id   uuid not null references plugins(id) on delete cascade,
  config      jsonb default '{}',
  installed_at timestamptz default now(),
  primary key (user_id, plugin_id)
);

-- ============================================================
-- 13. AI 个性化
-- ============================================================
create table user_profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  profile     jsonb not null default '{}',               -- AI 聚合画像
  updated_at  timestamptz default now()
);

-- 推荐记录
create table recommendations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,                             -- 'assessment' | 'figure' | 'content'
  target_id   text,
  reason      text,
  reason_en   text,
  reason_ja   text,
  score       float,
  clicked     boolean default false,
  created_at  timestamptz default now()
);

create index idx_recommendations_user on recommendations(user_id, created_at desc);

-- ============================================================
-- 14. 行级安全策略 (RLS)
-- ============================================================

-- Profiles: 用户只能看/编辑自己的,公开的 everyone 可看
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Results: 自己的全部可见,公开的 everyone 可见
alter table results enable row level security;

create policy "Users can view own results"
  on results for select using (auth.uid() = user_id);

create policy "Users can insert own results"
  on results for insert with check (auth.uid() = user_id);

create policy "Public results are viewable"
  on results for select using (is_public = true);

-- 其余表均为公开可读
alter table domains enable row level security;
create policy "Domains are public" on domains for select using (true);

alter table assessments enable row level security;
create policy "Assessments are public" on assessments for select using (true);

alter table questions enable row level security;
create policy "Questions are public" on questions for select using (true);

alter table daily_quotes enable row level security;
create policy "Daily quotes are public" on daily_quotes for select using (true);

alter table daily_events enable row level security;
create policy "Daily events are public" on daily_events for select using (true);

alter table figures enable row level security;
create policy "Figures are public" on figures for select using (true);

-- ============================================================
-- 15. 初始种子数据
-- ============================================================

insert into domains (id, name, name_en, name_ja, tagline, icon, accent, theme, sort_order) values
  ('self', '自我探索', 'Self-Discovery', '自己発見', '三面镜子,看见真实的自己', 'self', '#8b2e1f', 'ink', 1),
  ('entertainment', '娱乐趣味', 'Entertainment', 'エンタメ', '玩心所向,资历自见', 'entertainment', '#b8408b', 'neon', 2),
  ('relation', '关系镜像', 'Relations', '人間関係', '照见你与世界的连接', 'relation', '#e8916a', 'warm', 3);