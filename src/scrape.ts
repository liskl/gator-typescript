import { markFeedFetched, getNextFeedToFetch } from "./lib/db/queries/feeds.js";
import { createPost } from "./lib/db/queries/posts.js";
import { fetchFeed } from "./rss.js";

export function parseDuration(durationStr: string): number {
  const match = durationStr.match(/^(\d+)(ms|s|m|h)$/);
  if (!match) {
    throw new Error(`invalid duration: ${durationStr}`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === "ms" ? 1 : unit === "s" ? 1000 : unit === "m" ? 60_000 : 3_600_000;
  return amount * multiplier;
}

export async function scrapeFeeds(): Promise<void> {
  const feed = await getNextFeedToFetch();
  if (!feed) {
    console.log("no feeds to fetch");
    return;
  }
  console.log(`fetching ${feed.name}`);
  const rss = await fetchFeed(feed.url);
  await markFeedFetched(feed.id);
  for (const item of rss.channel.item) {
    const published = new Date(item.pubDate);
    await createPost({
      title: item.title,
      url: item.link,
      description: item.description,
      publishedAt: Number.isNaN(published.getTime()) ? null : published,
      feedId: feed.id,
    });
    console.log(item.title);
  }
}
