import { readConfig, setUser } from "./config.js";
import {
  createFeed,
  createFeedFollow,
  deleteFeedFollow,
  getFeedByUrl,
  getFeedFollowsForUser,
  getFeeds,
} from "./lib/db/queries/feeds.js";
import { getPostsForUser } from "./lib/db/queries/posts.js";
import { createUser, getUser, getUsers, resetUsers } from "./lib/db/queries/users.js";
import { parseDuration, scrapeFeeds } from "./scrape.js";
import type { User } from "./lib/db/schema.js";

export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export function middlewareLoggedIn(handler: UserCommandHandler): CommandHandler {
  return async (cmdName, ...args) => {
    const cfg = readConfig();
    if (!cfg.currentUserName) {
      throw new Error("no user logged in");
    }
    const user = await getUser(cfg.currentUserName);
    if (!user) {
      throw new Error(`User ${cfg.currentUserName} not found`);
    }
    await handler(cmdName, user, ...args);
  };
}

export type CommandsRegistry = Record<string, CommandHandler>;

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
): void {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];
  if (!handler) {
    throw new Error(`unknown command: ${cmdName}`);
  }
  await handler(cmdName, ...args);
}

export async function handlerLogin(cmdName: string, ...args: string[]): Promise<void> {
  if (args.length < 1) {
    throw new Error("a username is required");
  }
  const existing = await getUser(args[0]);
  if (!existing) {
    throw new Error("user does not exist");
  }
  setUser(args[0]);
  console.log(`user has been set to ${args[0]}`);
}

export async function handlerUsers(_cmdName: string, ..._args: string[]): Promise<void> {
  const cfg = readConfig();
  const all = await getUsers();
  for (const user of all) {
    if (user.name === cfg.currentUserName) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}

export async function handlerReset(_cmdName: string, ..._args: string[]): Promise<void> {
  await resetUsers();
  console.log("database reset");
}

export async function handlerAddFeed(
  _cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 2) {
    throw new Error("a name and a url are required");
  }
  const feed = await createFeed(args[0], args[1], user.id);
  const follow = await createFeedFollow(user.id, feed.id);
  console.log(follow.feedName);
  console.log(follow.userName);
}

export async function handlerFollow(
  _cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error("a url is required");
  }
  const feed = await getFeedByUrl(args[0]);
  if (!feed) {
    throw new Error("feed not found");
  }
  const follow = await createFeedFollow(user.id, feed.id);
  console.log(follow.feedName);
  console.log(follow.userName);
}

export async function handlerFollowing(_cmdName: string, user: User): Promise<void> {
  const rows = await getFeedFollowsForUser(user.id);
  for (const row of rows) {
    console.log(row.feedName);
  }
}

export async function handlerUnfollow(
  _cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error("a url is required");
  }
  await deleteFeedFollow(user.id, args[0]);
  console.log(`unfollowed ${args[0]}`);
}

export async function handlerFeeds(_cmdName: string, ..._args: string[]): Promise<void> {
  const rows = await getFeeds();
  for (const row of rows) {
    console.log(row.name);
    console.log(row.url);
    console.log(row.userName);
  }
}

export async function handlerAgg(_cmdName: string, ...args: string[]): Promise<void> {
  if (args.length < 1) {
    throw new Error("a duration is required");
  }
  const timeBetweenRequests = parseDuration(args[0]);
  console.log(`Collecting feeds every ${args[0]}`);
  const handleError = (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
  };
  await scrapeFeeds().catch(handleError);
  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);
  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

export async function handlerBrowse(
  _cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const limit = args.length > 0 ? Number(args[0]) : 2;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("limit must be a positive integer");
  }
  const rows = await getPostsForUser(user.id, limit);
  for (const row of rows) {
    console.log(row.feedName);
    console.log(row.title);
    console.log(row.url);
    if (row.publishedAt) {
      console.log(row.publishedAt.toISOString());
    }
  }
}

export async function handlerRegister(cmdName: string, ...args: string[]): Promise<void> {
  if (args.length < 1) {
    throw new Error("a name is required");
  }
  const user = await createUser(args[0]);
  setUser(user.name);
  console.log("user was created");
  console.log(user);
}
