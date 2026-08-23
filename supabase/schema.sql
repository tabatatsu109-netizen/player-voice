-- =====================================================================
--  Player Voice / スキーマ定義
--  Supabase の SQL Editor に貼り付けて実行してください。
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- teams
create table if not exists teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  join_code  text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- users
create table if not exists users (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references teams(id) on delete cascade,
  name      text not null,
  role      text not null check (role in ('player', 'coach', 'admin')),
  position  text,
  grade     int,
  active    boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists users_team_idx on users(team_id);

-- ------------------------------------------------------------- sessions
create table if not exists sessions (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references teams(id) on delete cascade,
  date         date not null,
  session_type text not null default 'practice'
               check (session_type in ('practice', 'match', 'training_game')),
  formation    text,
  notes        text,
  created_at   timestamptz not null default now(),
  unique (team_id, date, session_type)
);
create index if not exists sessions_team_date_idx on sessions(team_id, date);

-- ------------------------------------------------------ player_responses
create table if not exists player_responses (
  id        uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  player_id  uuid not null references users(id) on delete cascade,
  condition              int not null check (condition between 1 and 10),
  fatigue                int not null check (fatigue between 1 and 10),
  intensity              int not null check (intensity between 1 and 10),
  effort                 int not null check (effort between 1 and 10),
  purpose_understanding  int not null check (purpose_understanding between 1 and 10),
  tactical_understanding int not null check (tactical_understanding between 1 and 10),
  team_mood              int not null check (team_mood between 1 and 10),
  formation_comfort      int not null check (formation_comfort between 1 and 10),
  message   text,
  comment   text,
  created_at timestamptz not null default now(),
  unique (session_id, player_id)   -- 1人1回。再送信は upsert で上書き
);
create index if not exists player_responses_session_idx on player_responses(session_id);

-- ------------------------------------------------------- coach_responses
create table if not exists coach_responses (
  id        uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  coach_id   uuid not null references users(id) on delete cascade,
  condition_estimate              int not null check (condition_estimate between 1 and 10),
  fatigue_estimate                int not null check (fatigue_estimate between 1 and 10),
  intensity                       int not null check (intensity between 1 and 10),
  effort_estimate                 int not null check (effort_estimate between 1 and 10),
  purpose_understanding_estimate  int not null check (purpose_understanding_estimate between 1 and 10),
  tactical_understanding_estimate int not null check (tactical_understanding_estimate between 1 and 10),
  team_mood_estimate              int not null check (team_mood_estimate between 1 and 10),
  session_rating                  int not null check (session_rating between 1 and 10),
  message   text,
  comment   text,
  created_at timestamptz not null default now(),
  unique (session_id, coach_id)
);
create index if not exists coach_responses_session_idx on coach_responses(session_id);

-- =====================================================================
--  RLS（Row Level Security）
--  MVP では匿名キーでの読み書きを許可する運用前提。
--  チームコードを知っている人だけがアプリを開ける、という運用でカバーする。
--  ※ 実運用で厳格にする場合は Supabase Auth を導入し、
--    auth.uid() と users.id を紐づけて下記ポリシーを書き換えてください。
-- =====================================================================
alter table teams            enable row level security;
alter table users            enable row level security;
alter table sessions         enable row level security;
alter table player_responses enable row level security;
alter table coach_responses  enable row level security;

drop policy if exists anon_all on teams;
create policy anon_all on teams            for all using (true) with check (true);
drop policy if exists anon_all on users;
create policy anon_all on users            for all using (true) with check (true);
drop policy if exists anon_all on sessions;
create policy anon_all on sessions         for all using (true) with check (true);
drop policy if exists anon_all on player_responses;
create policy anon_all on player_responses for all using (true) with check (true);
drop policy if exists anon_all on coach_responses;
create policy anon_all on coach_responses  for all using (true) with check (true);

-- =====================================================================
--  初期データ（チームと名簿）
--  チーム名・コード・名前は実際のチームに合わせて書き換えてください。
-- =====================================================================
insert into teams (name, join_code)
values ('青空高校サッカー部', 'AOZORA')
on conflict (join_code) do nothing;

insert into users (team_id, name, role, position, grade)
select t.id, v.name, v.role, v.position, v.grade
from teams t,
  (values
    ('監督 佐々木',        'coach',  null, null),
    ('コーチ 大村',        'coach',  null, null),
    ('管理者（研究担当）', 'admin',  null, null),
    ('選手A',              'player', 'GK', 3),
    ('選手B',              'player', 'DF', 3),
    ('選手C',              'player', 'MF', 2),
    ('選手D',              'player', 'FW', 1)
  ) as v(name, role, position, grade)
where t.join_code = 'AOZORA'
  and not exists (
    select 1 from users u where u.team_id = t.id and u.name = v.name
  );
