# Supabase 设置

这个站点现在分成两部分：

- 公开页面：任何人可读
- `admin.html`：只有你登录后可新增、修改、删除

## 1. 建表

在 Supabase SQL Editor 里执行：

```sql
create extension if not exists pgcrypto;

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  review text not null,
  melody_score int not null check (melody_score between 1 and 5),
  structure_score int not null check (structure_score between 1 and 5),
  timbre_score int not null check (timbre_score between 1 and 5),
  emotion_score int not null check (emotion_score between 1 and 5),
  relisten_score int not null check (relisten_score between 1 and 5),
  created_at timestamptz not null default now()
);
```

## 2. 开启 RLS

```sql
alter table public.songs enable row level security;
```

## 3. 公开只读

```sql
create policy "public can read songs"
on public.songs
for select
to anon, authenticated
using (true);
```

## 4. 只有登录用户可写

如果这个库只给你自己用，最简单就是只给已登录用户写权限：

```sql
create policy "authenticated users can insert songs"
on public.songs
for insert
to authenticated
with check (true);

create policy "authenticated users can update songs"
on public.songs
for update
to authenticated
using (true)
with check (true);

create policy "authenticated users can delete songs"
on public.songs
for delete
to authenticated
using (true);
```

更严格的做法是只允许你的某个 `user_id` 写。等你在 Supabase Auth 里创建完自己的账号后，把下面的 `YOUR_USER_ID` 换成真实值：

```sql
drop policy if exists "authenticated users can insert songs" on public.songs;
drop policy if exists "authenticated users can update songs" on public.songs;
drop policy if exists "authenticated users can delete songs" on public.songs;

create policy "only my user can insert songs"
on public.songs
for insert
to authenticated
with check (auth.uid() = 'YOUR_USER_ID');

create policy "only my user can update songs"
on public.songs
for update
to authenticated
using (auth.uid() = 'YOUR_USER_ID')
with check (auth.uid() = 'YOUR_USER_ID');

create policy "only my user can delete songs"
on public.songs
for delete
to authenticated
using (auth.uid() = 'YOUR_USER_ID');
```

## 5. 创建你的登录账号

在 Supabase 后台的 Authentication 里创建你的邮箱账号，然后把下面文件里的占位符改成真实值：

- `js/supabase.js`

```js
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

## 6. 页面说明

- `index.html`：纯白首页
- `list.html`：公开列表页
- `detail.html`：公开详情页，显示雷达图和评价
- `admin.html`：你的登录和管理页面
