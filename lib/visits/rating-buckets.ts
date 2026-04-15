import type { Visit } from "@/types/feca";

export const RATING_BUCKET_KEYS = [1, 2, 3, 4, 5] as const;

export type RatingBucketKey = (typeof RATING_BUCKET_KEYS)[number];

export type RatingBuckets = Record<RatingBucketKey, number>;

export function buildRatingBuckets(visits: Pick<Visit, "rating">[]): {
  buckets: RatingBuckets;
  max: number;
  totalRated: number;
} {
  const buckets: RatingBuckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const v of visits) {
    const r = Math.round(Number(v.rating));
    const k = (r < 1 ? 1 : r > 5 ? 5 : r) as RatingBucketKey;
    buckets[k]++;
  }
  const max = Math.max(1, ...Object.values(buckets));
  const totalRated = Object.values(buckets).reduce((a, b) => a + b, 0);
  return { buckets, max, totalRated };
}
