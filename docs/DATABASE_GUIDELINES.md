# 🛡️ データベース変更 & アプリアップデート ガイドライン

本アプリ（SWISH LOG）は、ユーザーの端末（iOS / Android / Web）内に **Capacitor SQLite** を用いてローカルデータベースを保持しています。
アプリをApp Store / Google Playでバージョンアップ（アップデート）する際、**すでにアプリを利用しているユーザーの試合データ、チーム情報、詳細スタッツが絶対に消失・破損しないよう**、以下のルールを必ず遵守してください。

---

## 📌 基本方針
1. **アプリをアップデートしても、ユーザーのDBファイルは削除・再生成されません。**
2. 起動時に `src/db/migrations.ts` が自動実行され、**未適用の差分マイグレーション（カラム追加等）のみが順次適用**されます。
3. 一度アプリを起動してSQLiteへ移行されたデータは、二重移行フラグによりサンプルデータ等で上書きされることは永久にありません。

---

## 🚫 やってはいけないこと（厳禁事項）

| 操作 | 理由・影響 | 代替策 |
| :--- | :--- | :--- |
| **`DROP TABLE`** | ユーザーが蓄積したデータが全消失します。 | テーブルを残し、UI側で参照しないようにする。 |
| **`DROP COLUMN`** | SQLiteの旧バージョンで互換性エラーを起こす原因となります。 | カラムを残し、非推奨（deprecated）として扱う。 |
| **カラムの型変更** | 既存データの型不一致でクラッシュする可能性があります。 | 新しい型用の別名カラムを追加する。 |
| **`NOT NULL`（DEFAULT値なし）のカラム追加** | 既存のレコードに値が存在しないため、マイグレーションが失敗してアプリが起動不能になります。 | **必ず `DEFAULT` 値を設定するか、`NULL` 許容とする。** |
| **過去のマイグレーションコードの修正・削除** | すでにユーザー端末で実行済みのマイグレーションを変更しても適用されず、新規インストール端末とスキーマ不一致を起こします。 | **修正ではなく、新しいバージョン（v+1）を追加して上書き修正する。** |

---

## ✅ データベースを変更する具体的手順（Step-by-Step）

例: 選手テーブル（`players`）に「身長（`height`）」と「メモ（`memo`）」のカラムを追加したい場合

### ステップ 1: TypeScript型定義の更新
[`src/types/index.ts`](../src/types/index.ts) の `Player` インターフェースに新プロパティを追加します（既存データとの互換性のためオプショナル `?` にします）。
```typescript
export interface Player {
  id: string;
  teamId: string;
  number: number;
  name: string;
  position?: string;
  grade?: string;
  height?: number; // ← 追加（任意）
  memo?: string;   // ← 追加（任意）
  createdAt: number;
}
```

### ステップ 2: スキーマバージョンのインクリメント
[`src/db/schema.ts`](../src/db/schema.ts) の `CURRENT_SCHEMA_VERSION` をインクリメントします。
```typescript
// 例: バージョン 1 から 2 へ引き上げ
export const CURRENT_SCHEMA_VERSION = 2;
```
新規インストールのユーザー用に、`CREATE_TABLES_SQL` にも新カラムを追加しておきます。
```sql
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  ...
  height REAL DEFAULT NULL,
  memo TEXT DEFAULT NULL,
  ...
);
```

### ステップ 3: マイグレーションスクリプトの追加
[`src/db/migrations.ts`](../src/db/migrations.ts) の `MIGRATIONS` 配列に新しいバージョンの処理を追加します。
```typescript
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema_v1',
    up: async (_service) => {},
  },
  // ↓ 新バージョンを追加
  {
    version: 2,
    name: 'add_player_height_and_memo',
    up: async (service) => {
      // 既存レコードに影響を与えずにカラムを追加
      await service.run('ALTER TABLE players ADD COLUMN height REAL DEFAULT NULL');
      await service.run('ALTER TABLE players ADD COLUMN memo TEXT DEFAULT NULL');
    },
  },
];
```

### ステップ 4: リポジトリ層（クエリ・保存）の更新
[`src/db/repositories/playerRepository.ts`](../src/db/repositories/playerRepository.ts) を更新し、新カラムの SELECT / INSERT を反映します。
```typescript
// SELECT 時（既存データで null の場合のデフォルト値を考慮）
height: r.height != null ? Number(r.height) : undefined,
memo: r.memo || undefined,

// INSERT / REPLACE 時
p.height || null,
p.memo || null,
```

### ステップ 5: アップデート検証の実施
リリース前に必ず以下の検証を行ってください：
1. **旧バージョンのデータが入った状態**から、新バージョンのコードでアプリを起動する。
2. コンソールに `✅ Applied migration v2: add_player_height_and_memo` と出力されることを確認。
3. 既存の登録チーム・選手・過去の試合データが1件も欠けることなく表示されることを確認。
4. 新しい項目を入力・保存して、正常に永続化されることを確認。

---

## 🔍 トラブルシューティング

- **Q: マイグレーションが途中で失敗したらどうなる？**
  - エラーが発生した場合、そのバージョンの `schema_migrations` への登録は行われません。エラー内容を修正して次回アプリ起動時に再度実行されます。
- **Q: ユーザーが古いバージョン（例: v1）から一気に数バージョン先（例: v4）へアップデートした場合は？**
  - `runMigrations()` は未適用のバージョンを検出し、`v2 → v3 → v4` の順に1つずつ安全に連続適用するため問題ありません。
