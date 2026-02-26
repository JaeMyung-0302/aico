import type Database from "better-sqlite3";
import { generateContent } from "../apis/claude.js";
import { searchCoupangProducts } from "../apis/coupang.js";
import {
  insertPost,
  markKeywordUsed,
  getTodayPostCount,
  getTodayTokenCost,
} from "../db.js";
import type { Keyword, Post, ContentBotConfig } from "../types/index.js";

export const generatePost = async (
  config: ContentBotConfig,
  db: Database.Database,
  keyword: Keyword
): Promise<Post | null> => {
  // 일일 예산 체크
  const todayCost = getTodayTokenCost(db);
  if (todayCost >= config.pipeline.dailyBudgetKrw) {
    console.log(
      `[Generator] 일일 예산 초과: ${todayCost}/${config.pipeline.dailyBudgetKrw}원`
    );
    return null;
  }

  // 일일 발행 수 체크
  const todayCount = getTodayPostCount(db);
  if (todayCount >= config.pipeline.maxPostsPerDay) {
    console.log(
      `[Generator] 일일 최대 발행 수 도달: ${todayCount}/${config.pipeline.maxPostsPerDay}개`
    );
    return null;
  }

  console.log(`[Generator] 글 생성 시작: "${keyword.keyword}"`);

  // 쿠팡 상품 검색
  const products = await searchCoupangProducts(config, keyword.keyword);
  console.log(`[Generator] 쿠팡 상품 ${products.length}개 검색됨`);

  // Claude로 글 생성
  const generated = await generateContent(config, keyword.keyword, products);
  console.log(
    `[Generator] 글 생성 완료: "${generated.title}" (비용: ${generated.tokenCost}원)`
  );

  // 예산 초과 시 저장하지 않음 (이미 소비된 API 비용은 회수 불가하지만 추가 저장 차단)
  const newTotalCost = todayCost + generated.tokenCost;
  if (newTotalCost > config.pipeline.dailyBudgetKrw) {
    console.log(
      `[Generator] 예산 초과로 저장 생략: 누적 ${newTotalCost}원 (한도: ${config.pipeline.dailyBudgetKrw}원)`
    );
    return null;
  }

  if (!keyword.id) {
    console.error("[Generator] 키워드 ID 없음");
    return null;
  }

  const postId = insertPost(db, {
    keywordId: keyword.id,
    title: generated.title,
    content: generated.content,
    metaDescription: generated.metaDescription,
    url: null,
    status: "generated",
    tokenCost: generated.tokenCost,
  });

  markKeywordUsed(db, keyword.id);

  return {
    id: postId,
    keywordId: keyword.id,
    title: generated.title,
    content: generated.content,
    metaDescription: generated.metaDescription,
    url: null,
    status: "generated",
    tokenCost: generated.tokenCost,
    createdAt: new Date().toISOString(),
  };
};

export const generatePosts = async (
  config: ContentBotConfig,
  db: Database.Database,
  keywords: Keyword[]
): Promise<Post[]> => {
  console.log(`[Generator] ${keywords.length}개 키워드에 대해 글 생성 시작`);

  let posts: Post[] = [];
  const maxPerRun = config.pipeline.maxPostsPerRun;

  for (const keyword of keywords) {
    if (posts.length >= maxPerRun) {
      console.log(
        `[Generator] 실행당 최대 발행 수 도달: ${posts.length}/${maxPerRun}개`
      );
      break;
    }

    try {
      const post = await generatePost(config, db, keyword);
      if (!post) break; // 예산/발행 수 한도 도달
      posts = [...posts, post];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[Generator] 글 생성 실패: "${keyword.keyword}" - ${message}`
      );
    }
  }

  console.log(`[Generator] 총 ${posts.length}개 글 생성 완료`);
  return posts;
};
