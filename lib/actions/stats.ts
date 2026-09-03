"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { getUserMembership } from "@/lib/kitchen";

export interface StoreSpendingItem {
  name: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface TopItemHighlight {
  name: string;
  count: number;
}

export interface PantryStockRatio {
  inStock: number;
  outOfStock: number;
  total: number;
  inStockPercentage: number;
}

export interface KitchenPulseStats {
  kitchenId: string;
  monthLabel: string;
  monthKey: string;
  currency: string;
  totalSpendCurrentMonth: number;
  totalSpendPreviousMonth: number;
  spendTrendPercentage: number | null;
  spendTrendDirection: "up" | "down" | "flat" | "new";
  categoryBreakdown: StoreSpendingItem[];
  userSpend: number;
  userSpendSharePercentage: number;
  userReceiptsCount: number;
  totalReceiptsCount: number;
  topItem: TopItemHighlight | null;
  allTopItems: TopItemHighlight[];
  pantryStockRatio: PantryStockRatio;
  hasData: boolean;
}

interface RawSqlStatsRow {
  current_month_spend: string | number;
  prev_month_spend: string | number;
  user_current_spend: string | number;
  user_receipts_count: number;
  total_receipts_count: number;
  currency: string | null;
  store_breakdown: Array<{ name: string; amount: number | string; count: number }> | null;
  top_items: Array<{ name: string; count: number }> | null;
  pantry_total: number;
  pantry_in_stock: number;
  pantry_out_of_stock: number;
}

/**
 * Calculates high-performance monthly metrics for the Kitchen Pulse dashboard.
 * Executes a single-roundtrip PostgreSQL aggregation (SUM, COUNT, DATE_TRUNC, GROUP BY)
 * with zero database bloat and strict read latency optimization.
 */
export async function getKitchenStats(kitchenId: string, userId?: string): Promise<KitchenPulseStats> {
  // Resolve effective user ID
  let targetUserId = userId;
  if (!targetUserId) {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("You must be logged in to view kitchen analytics.");
    }
    targetUserId = session.user.id;
  }

  // Security barrier: verify active kitchen membership
  const membership = await getUserMembership(kitchenId, targetUserId);
  if (!membership) {
    throw new Error("Unauthorized: You are not a member of this kitchen.");
  }

  const query = `
    WITH month_bounds AS (
      SELECT 
        DATE_TRUNC('month', CURRENT_TIMESTAMP) AS cur_start,
        DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month' AS cur_end,
        DATE_TRUNC('month', CURRENT_TIMESTAMP) - INTERVAL '1 month' AS prev_start
    ),
    monthly_checkouts AS (
      SELECT 
        c.id,
        c.user_id,
        c.total_claimed_amount,
        COALESCE(NULLIF(TRIM(c.store_name), ''), 'General / Uncategorized') AS store_name,
        c.currency,
        c.created_at
      FROM checkouts c, month_bounds mb
      WHERE c.kitchen_id = $1
        AND c.created_at >= mb.prev_start
        AND c.created_at < mb.cur_end
    ),
    spend_stats AS (
      SELECT
        COALESCE(SUM(total_claimed_amount) FILTER (WHERE created_at >= (SELECT cur_start FROM month_bounds)), 0)::numeric AS current_month_spend,
        COALESCE(SUM(total_claimed_amount) FILTER (WHERE created_at < (SELECT cur_start FROM month_bounds)), 0)::numeric AS prev_month_spend,
        COALESCE(SUM(total_claimed_amount) FILTER (WHERE created_at >= (SELECT cur_start FROM month_bounds) AND user_id = $2), 0)::numeric AS user_current_spend,
        COUNT(*) FILTER (WHERE created_at >= (SELECT cur_start FROM month_bounds) AND user_id = $2)::int AS user_receipts_count,
        COUNT(*) FILTER (WHERE created_at >= (SELECT cur_start FROM month_bounds))::int AS total_receipts_count,
        COALESCE(
          MODE() WITHIN GROUP (ORDER BY currency),
          (SELECT preferred_currency FROM users WHERE id = $2),
          'EUR'
        ) AS currency
      FROM monthly_checkouts
    ),
    store_breakdown AS (
      SELECT 
        COALESCE(json_agg(
          json_build_object(
            'name', store_name,
            'amount', store_spend,
            'count', store_count
          ) ORDER BY store_spend DESC
        ), '[]'::json) AS breakdown
      FROM (
        SELECT 
          store_name,
          SUM(total_claimed_amount)::numeric AS store_spend,
          COUNT(*)::int AS store_count
        FROM monthly_checkouts, month_bounds mb
        WHERE created_at >= mb.cur_start
        GROUP BY store_name
        ORDER BY store_spend DESC
        LIMIT 10
      ) s
    ),
    top_items AS (
      SELECT 
        COALESCE(json_agg(
          json_build_object(
            'name', item_name,
            'count', item_count
          ) ORDER BY item_count DESC, item_name ASC
        ), '[]'::json) AS items
      FROM (
        SELECT 
          TRIM(sli.name) AS item_name,
          COUNT(*)::int AS item_count
        FROM shopping_list_items sli
        LEFT JOIN checkouts c ON sli.checkout_id = c.id
        CROSS JOIN month_bounds mb
        WHERE sli.kitchen_id = $1
          AND (
            (c.id IS NOT NULL AND c.created_at >= mb.cur_start AND c.created_at < mb.cur_end)
            OR (c.id IS NULL AND sli.is_purchased = TRUE AND sli.created_at >= mb.cur_start AND sli.created_at < mb.cur_end)
          )
          AND TRIM(sli.name) != ''
        GROUP BY TRIM(sli.name)
        ORDER BY item_count DESC, TRIM(sli.name) ASC
        LIMIT 5
      ) t
    ),
    pantry_stats AS (
      SELECT 
        COUNT(*)::int AS total_items,
        COUNT(*) FILTER (WHERE is_out_of_stock = FALSE)::int AS in_stock_items,
        COUNT(*) FILTER (WHERE is_out_of_stock = TRUE)::int AS out_of_stock_items
      FROM pantry_items
      WHERE kitchen_id = $1
    )
    SELECT 
      s.current_month_spend,
      s.prev_month_spend,
      s.user_current_spend,
      s.user_receipts_count,
      s.total_receipts_count,
      s.currency,
      sb.breakdown AS store_breakdown,
      ti.items AS top_items,
      p.total_items AS pantry_total,
      p.in_stock_items AS pantry_in_stock,
      p.out_of_stock_items AS pantry_out_of_stock
    FROM spend_stats s
    CROSS JOIN store_breakdown sb
    CROSS JOIN top_items ti
    CROSS JOIN pantry_stats p;
  `;

  const { rows } = await pool.query<RawSqlStatsRow>(query, [kitchenId, targetUserId]);
  const row = rows[0];

  const currentSpend = parseFloat(String(row?.current_month_spend ?? "0"));
  const prevSpend = parseFloat(String(row?.prev_month_spend ?? "0"));
  const userSpend = parseFloat(String(row?.user_current_spend ?? "0"));

  // Calculate month-over-month trend
  let spendTrendPercentage: number | null = null;
  let spendTrendDirection: "up" | "down" | "flat" | "new" = "flat";

  if (prevSpend > 0) {
    const diff = currentSpend - prevSpend;
    spendTrendPercentage = Math.round((diff / prevSpend) * 100);
    if (spendTrendPercentage > 0) {
      spendTrendDirection = "up";
    } else if (spendTrendPercentage < 0) {
      spendTrendDirection = "down";
      spendTrendPercentage = Math.abs(spendTrendPercentage);
    } else {
      spendTrendDirection = "flat";
      spendTrendPercentage = 0;
    }
  } else if (prevSpend === 0 && currentSpend > 0) {
    spendTrendPercentage = 100;
    spendTrendDirection = "new";
  } else {
    spendTrendPercentage = 0;
    spendTrendDirection = "flat";
  }

  // Calculate Category / Store Breakdown with percentages
  const rawBreakdown = Array.isArray(row?.store_breakdown) ? row.store_breakdown : [];
  const categoryBreakdown: StoreSpendingItem[] = rawBreakdown.map((item) => {
    const amountNum = parseFloat(String(item.amount ?? "0"));
    const pct = currentSpend > 0 ? Math.round((amountNum / currentSpend) * 100) : 0;
    return {
      name: item.name,
      amount: amountNum,
      count: Number(item.count) || 0,
      percentage: pct,
    };
  });

  // Calculate Personal Impact
  const userSpendSharePercentage =
    currentSpend > 0 ? Math.min(100, Math.round((userSpend / currentSpend) * 100)) : 0;

  // Activity Highlights
  const rawTopItems = Array.isArray(row?.top_items) ? row.top_items : [];
  const allTopItems: TopItemHighlight[] = rawTopItems.map((item) => ({
    name: item.name,
    count: Number(item.count) || 0,
  }));
  const topItem: TopItemHighlight | null = allTopItems.length > 0 ? allTopItems[0] : null;

  // Pantry Health Ratio
  const pantryTotal = Number(row?.pantry_total ?? 0);
  const pantryInStock = Number(row?.pantry_in_stock ?? 0);
  const pantryOutOfStock = Number(row?.pantry_out_of_stock ?? 0);
  const inStockPercentage =
    pantryTotal > 0 ? Math.round((pantryInStock / pantryTotal) * 100) : 100;

  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(now);
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const hasData =
    currentSpend > 0 ||
    row?.total_receipts_count > 0 ||
    allTopItems.length > 0;

  return {
    kitchenId,
    monthLabel,
    monthKey,
    currency: row?.currency || "EUR",
    totalSpendCurrentMonth: currentSpend,
    totalSpendPreviousMonth: prevSpend,
    spendTrendPercentage,
    spendTrendDirection,
    categoryBreakdown,
    userSpend,
    userSpendSharePercentage,
    userReceiptsCount: Number(row?.user_receipts_count ?? 0),
    totalReceiptsCount: Number(row?.total_receipts_count ?? 0),
    topItem,
    allTopItems,
    pantryStockRatio: {
      inStock: pantryInStock,
      outOfStock: pantryOutOfStock,
      total: pantryTotal,
      inStockPercentage,
    },
    hasData,
  };
}
