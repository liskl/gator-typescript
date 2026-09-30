# gator

A local RSS aggregator. It stores users, feeds, and posts in Postgres and prints the latest posts in the terminal.

## Setup

- Node.js 22.15.0 (`nvm use` in this directory)
- PostgreSQL, with a database named `gator`
- Install dependencies: `npm install`

Create `~/.gatorconfig.json`:

```json
{
  "db_url": "postgres://USER:PASSWORD@localhost:5432/gator?sslmode=disable"
}
```

Apply the schema:

```bash
npx drizzle-kit migrate
```

## Commands

```bash
npm run start register <name>
npm run start login <name>
npm run start users
npm run start reset
npm run start addfeed "<name>" "<feed url>"
npm run start feeds
npm run start follow "<feed url>"
npm run start following
npm run start unfollow "<feed url>"
npm run start agg <duration>
npm run start browse [limit]
```

`agg` takes a duration such as `30s`, `1m`, or `1h`. It fetches the least-recently-scraped feed on that interval and saves new posts. Stop it with Ctrl+C. `browse` prints the latest posts from feeds you follow. The default limit is 2.
