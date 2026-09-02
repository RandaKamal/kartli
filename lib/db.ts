import dns from "node:dns";
import { Pool } from "pg";

// Prefer IPv4 over IPv6 to prevent ENETUNREACH errors on hosts without IPv6 routing
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function getConnectionString(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Ensure Neon pooled endpoint (-pooler) is used for serverless connection pooling
  if (url.includes(".neon.tech") && !url.includes("-pooler")) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes(".neon.tech") && !parsed.hostname.includes("-pooler")) {
        const parts = parsed.hostname.split(".");
        parts[0] = `${parts[0]}-pooler`;
        parsed.hostname = parts.join(".");
        url = parsed.toString();
      }
    } catch {
      url = url.replace(/(ep-[a-zA-Z0-9-]+)(\.[a-zA-Z0-9.-]*neon\.tech)/, "$1-pooler$2");
    }
  }

  // Add uselibpqcompat=true when sslmode=require is present to satisfy pg-connection-string libpq compatibility
  if (url.includes("sslmode=require") && !url.includes("uselibpqcompat=true")) {
    return url.includes("?")
      ? `${url}&uselibpqcompat=true`
      : `${url}?uselibpqcompat=true`;
  }
  return url;
}

function createPool(): Pool {
  const poolInstance = new Pool({
    connectionString: getConnectionString(),
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

  // Attach error handler to idle clients to prevent crashing the Node process with uncaught exceptions
  poolInstance.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err);
  });

  return poolInstance;
}

/**
 * PostgreSQL connection pool singleton for Next.js.
 * Preserves pool instances across hot-reloads during development.
 */
export const pool = global._pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}
