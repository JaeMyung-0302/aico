import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { Keyword, Post } from "./types/index.js";

let db: Database.Database | null = null;

export const getDb = (): Database.Database => {
  if (db) return db;

  const dbDir = path.resolve(process.env.DB_DIR ?? process.cwd());
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, "contentbot.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('naver', 'google', 'news')),
      score REAL NOT NULL DEFAULT 0,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+9 hours'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      meta_description TEXT NOT NULL DEFAULT '',
      url TEXT,
      status TEXT NOT NULL DEFAULT 'generated' CHECK(status IN ('generated', 'published', 'failed')),
      token_cost REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+9 hours')),
      FOREIGN KEY (keyword_id) REFERENCES keywords(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_keywords_keyword_source ON keywords(keyword, source);
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
  `);

  // 기존 DB가 'news' source를 지원하지 않으면 테이블 재생성 (데이터 보존)
  let needsMigration = false;
  try {
    db.exec(`SAVEPOINT migration_check`);
    db.exec(`INSERT INTO keywords (keyword, source, score, used) VALUES ('__migration_test__', 'news', 0, 0)`);
    db.exec(`ROLLBACK TO migration_check`);
    db.exec(`RELEASE migration_check`);
  } catch {
    needsMigration = true;
    try { db.exec(`ROLLBACK TO migration_check`); db.exec(`RELEASE migration_check`); } catch { /* savepoint already released */ }
  }

  if (needsMigration) {
    const currentDb = db;
    const migrate = currentDb.transaction(() => {
      currentDb.exec(`ALTER TABLE keywords RENAME TO keywords_old`);
      currentDb.exec(`
        CREATE TABLE keywords (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          keyword TEXT NOT NULL,
          source TEXT NOT NULL CHECK(source IN ('naver', 'google', 'news')),
          score REAL NOT NULL DEFAULT 0,
          used INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now', '+9 hours'))
        )
      `);
      currentDb.exec(`INSERT INTO keywords SELECT * FROM keywords_old`);
      currentDb.exec(`DROP TABLE keywords_old`);
      currentDb.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_keywords_keyword_source ON keywords(keyword, source)`);
    });
    migrate();
    console.log("[DB] keywords 테이블 마이그레이션 완료: 'news' source 추가");
  }

  return db;
};

export const insertKeyword = (db: Database.Database, keyword: Omit<Keyword, "id" | "createdAt">): number => {
  const stmt = db.prepare(
    "INSERT INTO keywords (keyword, source, score, used) VALUES (?, ?, ?, ?)"
  );
  const result = stmt.run(keyword.keyword, keyword.source, keyword.score, keyword.used ? 1 : 0);
  return Number(result.lastInsertRowid);
};

export const insertPost = (db: Database.Database, post: Omit<Post, "id" | "createdAt">): number => {
  const stmt = db.prepare(
    "INSERT INTO posts (keyword_id, title, content, meta_description, url, status, token_cost) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const result = stmt.run(
    post.keywordId,
    post.title,
    post.content,
    post.metaDescription,
    post.url,
    post.status,
    post.tokenCost
  );
  return Number(result.lastInsertRowid);
};

export const isKeywordExists = (db: Database.Database, keyword: string): boolean => {
  const row = db.prepare("SELECT id FROM keywords WHERE keyword = ?").get(keyword) as { id: number } | undefined;
  return row !== undefined;
};

export const markKeywordUsed = (db: Database.Database, keywordId: number): void => {
  db.prepare("UPDATE keywords SET used = 1 WHERE id = ?").run(keywordId);
};

export const updatePostStatus = (db: Database.Database, postId: number, status: Post["status"], url?: string): void => {
  if (url) {
    db.prepare("UPDATE posts SET status = ?, url = ? WHERE id = ?").run(status, url, postId);
  } else {
    db.prepare("UPDATE posts SET status = ? WHERE id = ?").run(status, postId);
  }
};

export const getTodayPostCount = (db: Database.Database): number => {
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM posts WHERE date(created_at) = date('now', '+9 hours')"
  ).get() as { count: number };
  return row.count;
};

export const getTodayTokenCost = (db: Database.Database): number => {
  const row = db.prepare(
    "SELECT COALESCE(SUM(token_cost), 0) as total FROM posts WHERE date(created_at) = date('now', '+9 hours')"
  ).get() as { total: number };
  return row.total;
};

export const getDailyStats = (db: Database.Database): { postCount: number; successCount: number; failCount: number; totalTokenCost: number } => {
  const row = db.prepare(`
    SELECT
      COUNT(*) as post_count,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as success_count,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as fail_count,
      COALESCE(SUM(token_cost), 0) as total_token_cost
    FROM posts
    WHERE date(created_at) = date('now', '+9 hours')
  `).get() as { post_count: number; success_count: number; fail_count: number; total_token_cost: number };

  return {
    postCount: row.post_count,
    successCount: row.success_count,
    failCount: row.fail_count,
    totalTokenCost: row.total_token_cost,
  };
};

export const closeDb = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};
