# Player Voice ― 設計書

選手と指導者の「見えている景色」をつなぐ

> このシステムは、どちらが正しいかを判定しない。
> 認識の違いを可視化し、「なぜそう感じたのか」を話し合うための材料をつくる。

---

## 1. 画面構成

| # | 画面 | パス | 利用者 | 目的 |
|---|------|------|--------|------|
| 1 | ログイン | `/` | 全員 | チームコード → 役割 → 名前 を選ぶだけ |
| 2 | 選手入力 | `/player` | 選手 | 練習/試合後の自己評価（1分以内） |
| 3 | 指導者入力 | `/coach` | 指導者 | 同じ練習への評価＋「選手はこう感じているはず」の推定 |
| 4 | チームダッシュボード | `/dashboard` | 指導者・管理者 | 今日の状態と認識差を一目で |
| 5 | 日別比較 | `/compare` | 指導者・管理者 | 指定日の選手平均 vs 指導者評価を項目別に |
| 6 | 個人推移 | `/players` | 指導者・管理者 | 選手ごとの推移と自由記述履歴 |
| 7 | データ出力 | `/export` | 指導者・管理者 | 研究用CSV（5種類） |

### 画面遷移

```
[ / ログイン ]
    ├─ role=player  →  [ /player 入力 ] → 完了画面（自分の入力のみ確認可）
    └─ role=coach / admin
                    →  [ /dashboard ] ─┬─→ [ /compare?date=YYYY-MM-DD ]
                                       ├─→ [ /players?id=xxx ]
                                       └─→ [ /export ]
```

### 権限（チームメイトに個人データを見せない）

| 画面 | player | coach | admin |
|------|:--:|:--:|:--:|
| /player 入力 | ○ | － | ○ |
| 自分の入力履歴 | ○(自分のみ) | － | ○ |
| /coach 入力 | × | ○ | ○ |
| /dashboard（チーム集計・自由記述は匿名表示） | × | ○ | ○ |
| /compare | × | ○ | ○ |
| /players（個人特定データ） | × | ○ | ○ |
| /export | × | ○ | ○ |

選手ログイン時は他人の行データを取得しない（クライアントでのフィルタ＋Supabase RLS の二重防御）。

---

## 2. データベース設計

```
teams 1─∞ users
teams 1─∞ sessions 1─∞ player_responses (player_id → users)
                   └─∞ coach_responses  (coach_id  → users)
```

### teams
| column | type | 備考 |
|---|---|---|
| id | uuid PK | |
| name | text | チーム名 |
| join_code | text UNIQUE | ログイン用チームコード（例: `SAKURA2026`） |
| created_at | timestamptz | |

### users
| column | type | 備考 |
|---|---|---|
| id | uuid PK | |
| team_id | uuid FK → teams | |
| name | text | 表示名 |
| role | text | `player` / `coach` / `admin` |
| position | text NULL | GK/DF/MF/FW（分析用・任意） |
| grade | int NULL | 学年（任意） |
| active | bool | 退部者を非表示に |

### sessions（練習/試合の単位）
| column | type | 備考 |
|---|---|---|
| id | uuid PK | |
| team_id | uuid FK | |
| date | date | |
| session_type | text | `practice` / `match` / `training_game` |
| formation | text NULL | `4-4-2` など |
| notes | text NULL | その日のテーマ |
UNIQUE (team_id, date, session_type) … 同じ日の同種セッションは1つに集約

### player_responses（1〜10で回答）
| column | type | 意味 |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK | |
| player_id | uuid FK → users | |
| condition | int 1-10 | 体調（高いほど良い） |
| fatigue | int 1-10 | 疲労度（高いほど疲れている） |
| intensity | int 1-10 | 練習強度の体感 |
| effort | int 1-10 | 自分は十分取り組めたか |
| purpose_understanding | int 1-10 | 練習目的を理解できたか |
| tactical_understanding | int 1-10 | 戦術の理解度 |
| team_mood | int 1-10 | チームの雰囲気 |
| formation_comfort | int 1-10 | 今日の布陣はやりやすかったか（選手のみ） |
| message | text NULL | コーチに伝えたいこと |
| comment | text NULL | 自由記述 |
| created_at | timestamptz | |
UNIQUE (session_id, player_id) … 1人1回（再送信は上書き）

### coach_responses
| column | type | 意味 |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK | |
| coach_id | uuid FK → users | |
| condition_estimate | int 1-10 | 選手全体のコンディション（推定） |
| fatigue_estimate | int 1-10 | 選手の疲労度（推定） |
| intensity | int 1-10 | 練習強度（指導者の設計値） |
| effort_estimate | int 1-10 | 選手の取り組み姿勢 |
| purpose_understanding_estimate | int 1-10 | 目的が伝わったと思うか |
| tactical_understanding_estimate | int 1-10 | 戦術理解度（推定） |
| team_mood_estimate | int 1-10 | チームの雰囲気 |
| session_rating | int 1-10 | 今日の練習への評価（指導者のみ） |
| message | text NULL | 選手に伝えたいこと |
| comment | text NULL | 自由記述 |
UNIQUE (session_id, coach_id)

※ 元仕様に対する追加：`join_code` / `position` / `grade` / `formation_comfort` / `session_rating` / `message`。
　いずれも「必要機能」に書かれている入力項目を保存するために必要な最小限の追加。

---

## 3. ディレクトリ構成

```
選手と指導者のギャップ/
├ DESIGN.md                    この設計書
├ README.md                    起動手順・運用手順
├ supabase/schema.sql          テーブル・RLS・サンプル投入SQL
├ next.config.ts               静的書き出し(GitHub Pages)対応
├ src/
│  ├ app/
│  │   ├ layout.tsx            共通レイアウト（スマホ幅基準）
│  │   ├ globals.css           Tailwind v4
│  │   ├ page.tsx              ① ログイン
│  │   ├ player/page.tsx       ② 選手入力
│  │   ├ coach/page.tsx        ③ 指導者入力
│  │   ├ dashboard/page.tsx    ④ ダッシュボード
│  │   ├ compare/page.tsx      ⑤ 日別比較
│  │   ├ players/page.tsx      ⑥ 個人推移
│  │   └ export/page.tsx       ⑦ CSV出力
│  ├ components/
│  │   ├ AppShell.tsx          ヘッダ＋下部タブ（スマホ）
│  │   ├ ScaleInput.tsx        1〜10タップ入力（1項目=1タップ）
│  │   ├ StatCard.tsx          数値カード
│  │   ├ GapRow.tsx            認識差バー（中央0の左右振れ）
│  │   ├ GapCallout.tsx        「話し合いのヒント」カード
│  │   └ charts/               Recharts ラッパ
│  │       ├ TrendChart.tsx    推移折れ線
│  │       └ GapBarChart.tsx   認識差の横棒
│  └ lib/
│      ├ types.ts              DB型定義
│      ├ metrics.ts            比較6+1項目の定義と解釈文
│      ├ analysis.ts           平均・認識差・上位3項目・期間比較
│      ├ store.ts              データアクセス抽象（下2つを切替）
│      ├ store.supabase.ts     Supabase 実装
│      ├ store.local.ts        localStorage 実装＋デモデータ生成
│      ├ auth.ts               ログイン状態（localStorage）
│      ├ csv.ts                CSV生成（BOM付きUTF-8＝Excel対応）
│      └ date.ts               日付ユーティリティ
```

**データ層を1枚かませる理由**：`NEXT_PUBLIC_SUPABASE_URL` が未設定なら自動で
**デモモード（localStorage＋30日分のサンプルデータ）** で動く。
プレゼン当日にネットワークやDBが不調でも、その場で画面を見せられる。
環境変数を入れれば同じコードがそのまま Supabase 本番運用になる。

---

## 4. MVP の機能一覧

**入れるもの**
1. チームコード＋名前選択のかんたんログイン（役割で画面出し分け）
2. 選手入力フォーム（8項目タップ＋自由記述2つ／再送信は上書き）
3. 指導者入力フォーム（8項目タップ＋セッション情報：日付・種別・フォーメーション）
4. 認識差の自動計算（6比較項目＋コンディション）
5. ダッシュボード：回答人数／平均コンディション／平均疲労度／認識差 上位3項目／7日・30日推移グラフ／自由記述一覧
6. 日別比較画面：項目別の 選手平均 vs 指導者評価 横棒＋差分、選手間のばらつき（SD）、話し合いのヒント
7. 個人推移画面：選手別のコンディション/疲労/強度/戦術理解の折れ線＋自由記述履歴
8. CSV出力（5種類：日別サマリ／項目別ギャップ／個人別／自由記述／前後半期間比較）
9. スマホ最優先レスポンシブ

**入れないもの（MVP外）**
- メール/パスワード認証、招待メール
- 選手同士の相互閲覧、いいね等のSNS機能
- 通知・リマインド（当面は練習後に口頭アナウンス＋QRコード運用）
- 複数チーム横断の統計

---

## 5. 実装順序

| 段階 | 内容 | 完了条件 |
|---|---|---|
| 0 | 雛形・Tailwind・型定義・metrics定義 | ビルドが通る |
| 1 | データ層（store 抽象＋local実装＋デモデータ生成） | デモデータが読める |
| 2 | ログイン画面 | 役割ごとに正しい画面へ飛ぶ |
| 3 | 選手入力／指導者入力 | 入力→保存→再訪で復元 |
| 4 | 分析ロジック（analysis.ts） | 平均・ギャップが手計算と一致 |
| 5 | 日別比較画面 | ケース1〜4が画面上で読み取れる |
| 6 | ダッシュボード（グラフ込み） | 7日/30日切替が動く |
| 7 | 個人推移画面 | 選手切替で推移が出る |
| 8 | CSV出力 | Excelで文字化けせず開ける |
| 9 | Supabase実装差し替え＋schema.sql | 環境変数を入れると本番DBで同じ動作 |
| 10 | 実運用（2週間）→ 前後半比較でプレゼン | 期間比較CSVが出る |

---

## 6. 認識差の計算ロジック

### 基本式

```
選手平均  P = Σ(選手の回答) / 回答人数
指導者値  C = Σ(指導者の回答) / 指導者人数   ※通常1人
認識差    G = P − C
認識差の大きさ = |G|
```

### 比較する項目の対応

| 項目 | 選手側カラム | 指導者側カラム |
|---|---|---|
| 体調・コンディション | condition | condition_estimate |
| 疲労度 | fatigue | fatigue_estimate |
| 練習強度 | intensity | intensity |
| 取り組み | effort | effort_estimate |
| 練習目的の理解 | purpose_understanding | purpose_understanding_estimate |
| 戦術理解 | tactical_understanding | tactical_understanding_estimate |
| チームの雰囲気 | team_mood | team_mood_estimate |

### 符号の意味（ここが本システムの肝）

同じ「差3.0」でも、意味は項目ごとに違う。数値だけ出さず、必ず日本語の解釈を添える。

| 項目 | G が正（選手 > 指導者） | G が負（選手 < 指導者） |
|---|---|---|
| 疲労度 | 選手は限界に近い。指導者は気づいていない **← ケース2** | 指導者が心配しすぎ |
| 練習強度 | 選手にはきつい。指導者は「軽め」のつもり | 指導者の狙いより物足りない |
| 取り組み | 選手はやっているつもり。指導者にはそう見えていない **← ケース4** | 指導者の期待より控えめな自己評価 |
| 練習目的の理解 | 選手は理解している | 指導者は「伝わった」つもり、実際は届いていない **← ケース1** |
| 戦術理解 | 選手のほうが分かっている | 指導者が過大評価。説明の再設計が必要 **← ケース3** |
| チームの雰囲気 | 指導者が思うより空気は良い | 指導者が思うより空気が重い |
| コンディション | 指導者が思うより状態は良い | 指導者が状態を良く見積もりすぎ |

### 判定ライン

| \|G\| | ラベル | 画面での扱い |
|---|---|---|
| 0.0 – 0.9 | ほぼ一致 | グレー |
| 1.0 – 1.9 | 少しズレ | 黄 |
| 2.0 – 2.9 | ズレが大きい | オレンジ＋話し合いのヒント表示 |
| 3.0 以上 | 要対話 | 赤＋最優先表示 |

### 補助指標

- **選手間のばらつき（標準偏差 SD）**
  `SD = √( Σ(xi − P)² / n )`
  SD が大きい＝「チームの平均」で語れない日。個人差の確認が必要。
- **認識差 上位3項目** … |G| の降順。ダッシュボードのトップに出す。
- **期間比較（前半 vs 後半）**
  運用期間を2等分し、各項目の平均 |G| を比較。
  `改善量 = |G|前半 − |G|後半`（正なら認識差が縮まった＝介入の効果）
- **有効回答の扱い** … 回答者0人の日は集計対象外。指導者未入力の日は「差」を算出せず「未比較」と表示する（0埋めしない）。

### 表示の思想

- 順位や優劣を出さない。「差」は赤くするが、**選手/指導者どちらかを悪者にする文言は出さない**。
- 差が大きい項目には必ず **「話し合いのヒント」**（例：「疲労の感じ方に3.2の差があります。どの練習で一番きつさを感じたか、選手に聞いてみましょう」）を添える。
- 選手には「あなたの入力はチームの平均として使われ、個人名で指導者以外に共有されません」と明示する。
