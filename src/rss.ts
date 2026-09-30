import { XMLParser } from "fast-xml-parser";

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const response = await fetch(feedURL, {
    headers: { "User-Agent": "gator" },
  });
  if (!response.ok) {
    throw new Error(`failed to fetch feed: ${response.status}`);
  }
  const xml = await response.text();
  const parser = new XMLParser({ processEntities: false });
  const parsed = parser.parse(xml) as { rss?: { channel?: unknown } };
  const channel = parsed.rss?.channel;
  if (!channel || typeof channel !== "object") {
    throw new Error("feed missing channel");
  }
  const raw = channel as Record<string, unknown>;
  const title = requireString(raw.title, "channel title");
  const link = requireString(raw.link, "channel link");
  const description = requireString(raw.description, "channel description");
  const items = normalizeItems(raw.item);
  return {
    channel: {
      title,
      link,
      description,
      item: items,
    },
  };
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`feed missing ${label}`);
  }
  return value;
}

function normalizeItems(raw: unknown): RSSItem[] {
  if (raw == null) {
    return [];
  }
  const list = Array.isArray(raw) ? raw : [raw];
  const items: RSSItem[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const item = entry as Record<string, unknown>;
    if (
      typeof item.title !== "string" ||
      typeof item.link !== "string" ||
      typeof item.description !== "string" ||
      typeof item.pubDate !== "string"
    ) {
      continue;
    }
    items.push({
      title: item.title,
      link: item.link,
      description: item.description,
      pubDate: item.pubDate,
    });
  }
  return items;
}
