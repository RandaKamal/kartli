import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function getConnectionString(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Add uselibpqcompat=true when sslmode=require is present to satisfy pg-connection-string libpq compatibility
  if (url.includes("sslmode=require") && !url.includes("uselibpqcompat=true")) {
    return url.includes("?")
      ? `${url}&uselibpqcompat=true`
      : `${url}?uselibpqcompat=true`;
  }
  return url;
}

/**
 * PostgreSQL connection pool singleton for Next.js.
 * Preserves pool instances across hot-reloads during development.
 */
export const pool =
  global._pgPool ||
  new Pool({
    connectionString: getConnectionString(),
  });

if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}
