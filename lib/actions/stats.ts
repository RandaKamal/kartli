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

export interface DeadStockItem {
  name: string;
  idleDays: number;
}

export interface UserCategoryFootprint {
  categoryName: string;
  amount: number;
  percentage: number;
  displayText: string;
}

export interface UserSettlementStatus {
  pendingRefundAmount: number;
  settledRefundAmount: number;
  pendingRefundsCount: number;
  settledRefundsCount: number;
  isAllSettled: boolean;
}

export interface UserHabitRole {
  roleTitle: string;
  roleDescription: string;
  runPercentage: number;
}

export interface KitchenVitals {
  averageBasketSize: number;
  averageRestockLatencySeconds: number;
  formattedRestockLatency: string;
  compactRestockLatency: string;
  restockVelocityDays: number;
  formattedRestockVelocity: string;
  deadStock: DeadStockItem[];
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
  averageBasketSize: number;
  userAverageContribution: number;
  userCategoryFootprint: UserCategoryFootprint | null;
  userSettlement: UserSettlementStatus;
  userTopItems: TopItemHighlight[];
  userHabitRole: UserHabitRole;
  vitals: KitchenVitals;
  topItem: TopItemHighlight | null;
  allTopItems: TopItemHighlight[];
  pantryStockRatio: PantryStockRatio;
  deadStockItems: DeadStockItem[];
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
  dead_stock_items: Array<{ name: string; idle_days: number }> | null;
  avg_latency_seconds: string | number;
  latency_samples: number;
  avg_in_stock_days: string | number;
  velocity_samples: number;
  user_top_category: Array<{ name: string; amount: number | string }> | null;
  user_pending_amount: string | number;
  user_settled_amount: string | number;
  user_pending_count: number;
  user_settled_count: number;
  user_top_items: Array<{ name: string; count: number }> | null;
}

function formatLatencyCompact(seconds: number, sampleCount: number): string {
  if (sampleCount === 0 || seconds <= 0) return "—";
  if (seconds >= 86400) {
    const days = (seconds / 86400).toFixed(1);
    return `${days}d`;
  }
  if (seconds >= 3600) {
    const hours = (seconds / 3600).toFixed(1);
    return `${hours}h`;
  }
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes}m`;
}

function formatLatency(seconds: number, sampleCount: number): string {
  if (sampleCount === 0 || seconds <= 0) return "Instant / No delay";
  if (seconds >= 86400) {
    const days = (seconds / 86400).toFixed(1);
    return `${days} days response time`;
  }
  if (seconds >= 3600) {
    const hours = (seconds / 3600).toFixed(1);
    return `${hours} hours response time`;
  }
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} mins response time`;
}

function formatVelocity(days: number, sampleCount: number): string {
  if (sampleCount === 0 || days <= 0) return "Freshly stocked";
  if (days >= 1) {
    return `${days.toFixed(1)} days in stock`;
  }
  const hours = Math.max(1, Math.round(days * 24));
  return `${hours} hours in stock`;
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
    ),
    dead_stock AS (
      SELECT 
        COALESCE(json_agg(
          json_build_object(
            'name', name,
            'idle_days', idle_days
          ) ORDER BY idle_days DESC
        ), '[]'::json) AS items
      FROM (
        SELECT 
          name,
          GREATEST(0, ROUND(EXTRACT(EPOCH FROM (NOW() - COALESCE(updated_at, created_at))) / 86400))::int AS idle_days
        FROM pantry_items
        WHERE kitchen_id = $1
          AND is_out_of_stock = FALSE
        ORDER BY COALESCE(updated_at, created_at) ASC
        LIMIT 3
      ) d
    ),
    restock_metrics AS (
      SELECT
        COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (c.created_at - sli.created_at)))::numeric, 1), 0) AS avg_latency_seconds,
        COUNT(sli.id)::int AS latency_samples
      FROM shopping_list_items sli
      JOIN checkouts c ON sli.checkout_id = c.id
      WHERE sli.kitchen_id = $1
        AND c.created_at >= sli.created_at
    ),
    restock_velocity AS (
      WITH item_intervals AS (
        SELECT 
          sli.pantry_item_id,
          sli.created_at AS needed_at,
          LAG(c.created_at) OVER (PARTITION BY sli.pantry_item_id ORDER BY sli.created_at) AS prev_restocked_at
        FROM shopping_list_items sli
        JOIN checkouts c ON sli.checkout_id = c.id
        WHERE sli.kitchen_id = $1
          AND sli.pantry_item_id IS NOT NULL
      )
      SELECT
        COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (needed_at - prev_restocked_at)) / 86400)::numeric, 2), 0) AS avg_in_stock_days,
        COUNT(*)::int AS velocity_samples
      FROM item_intervals
      WHERE prev_restocked_at IS NOT NULL
        AND needed_at >= prev_restocked_at
    ),
    user_footprint AS (
      SELECT 
        COALESCE(json_agg(
          json_build_object(
            'name', store_name,
            'amount', store_spend
          )
        ), '[]'::json) AS top_category
      FROM (
        SELECT 
          store_name,
          SUM(total_claimed_amount)::numeric AS store_spend
        FROM monthly_checkouts, month_bounds mb
        WHERE created_at >= mb.cur_start AND user_id = $2
        GROUP BY store_name
        ORDER BY store_spend DESC
        LIMIT 1
      ) uf
    ),
    user_settlement AS (
      SELECT
        COALESCE(SUM(total_claimed_amount) FILTER (WHERE is_refunded = FALSE), 0)::numeric AS pending_amount,
        COALESCE(SUM(total_claimed_amount) FILTER (WHERE is_refunded = TRUE), 0)::numeric AS settled_amount,
        COUNT(*) FILTER (WHERE is_refunded = FALSE)::int AS pending_count,
        COUNT(*) FILTER (WHERE is_refunded = TRUE)::int AS settled_count
      FROM checkouts
      WHERE kitchen_id = $1 AND user_id = $2
    ),
    user_top_items AS (
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
          AND (sli.purchased_by = $2 OR c.user_id = $2)
          AND (
            (c.id IS NOT NULL AND c.created_at >= mb.cur_start AND c.created_at < mb.cur_end)
            OR (c.id IS NULL AND sli.is_purchased = TRUE AND sli.created_at >= mb.cur_start AND sli.created_at < mb.cur_end)
          )
          AND TRIM(sli.name) != ''
        GROUP BY TRIM(sli.name)
        ORDER BY item_count DESC, TRIM(sli.name) ASC
        LIMIT 5
      ) uti
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
      p.out_of_stock_items AS pantry_out_of_stock,
      ds.items AS dead_stock_items,
      rm.avg_latency_seconds,
      rm.latency_samples,
      rv.avg_in_stock_days,
      rv.velocity_samples,
      uf.top_category AS user_top_category,
      us.pending_amount AS user_pending_amount,
      us.settled_amount AS user_settled_amount,
      us.pending_count AS user_pending_count,
      us.settled_count AS user_settled_count,
      uti.items AS user_top_items
    FROM spend_stats s
    CROSS JOIN store_breakdown sb
    CROSS JOIN top_items ti
    CROSS JOIN pantry_stats p
    CROSS JOIN dead_stock ds
    CROSS JOIN restock_metrics rm
    CROSS JOIN restock_velocity rv
    CROSS JOIN user_footprint uf
    CROSS JOIN user_settlement us
    CROSS JOIN user_top_items uti;
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

  // Calculate Personal Impact & Basket Sizes
  const totalReceipts = Number(row?.total_receipts_count ?? 0);
  const userReceipts = Number(row?.user_receipts_count ?? 0);

  const averageBasketSize = totalReceipts > 0 ? Math.round((currentSpend / totalReceipts) * 100) / 100 : 0;
  const userAverageContribution = userReceipts > 0 ? Math.round((userSpend / userReceipts) * 100) / 100 : 0;

  const userSpendSharePercentage =
    currentSpend > 0 ? Math.min(100, Math.round((userSpend / currentSpend) * 100)) : 0;

  // User Primary Category Footprint
  let userCategoryFootprint: UserCategoryFootprint | null = null;
  const rawUserTop = Array.isArray(row?.user_top_category) && row.user_top_category.length > 0 ? row.user_top_category[0] : null;
  if (rawUserTop && userSpend > 0) {
    const topAmount = parseFloat(String(rawUserTop.amount ?? "0"));
    const topPct = Math.min(100, Math.round((topAmount / userSpend) * 100));
    userCategoryFootprint = {
      categoryName: rawUserTop.name,
      amount: topAmount,
      percentage: topPct,
      displayText: `${rawUserTop.name} · ${topPct}% of personal spend`,
    };
  }

  // User Settlement Status
  const pendingRefundAmount = parseFloat(String(row?.user_pending_amount ?? "0"));
  const settledRefundAmount = parseFloat(String(row?.user_settled_amount ?? "0"));
  const pendingRefundsCount = Number(row?.user_pending_count ?? 0);
  const settledRefundsCount = Number(row?.user_settled_count ?? 0);

  const userSettlement: UserSettlementStatus = {
    pendingRefundAmount,
    settledRefundAmount,
    pendingRefundsCount,
    settledRefundsCount,
    isAllSettled: pendingRefundsCount === 0 && pendingRefundAmount === 0,
  };

  // User Habit Role
  const runPercentage = totalReceipts > 0 ? Math.round((userReceipts / totalReceipts) * 100) : 0;
  let roleTitle = "Balanced Contributor";
  let roleDescription = `You logged ${runPercentage}% of household grocery runs this month.`;

  if (runPercentage >= 60) {
    roleTitle = "Household Carrier";
    roleDescription = `You logged ${runPercentage}% of all grocery runs this month.`;
  } else if (runPercentage >= 35) {
    roleTitle = "Core Supplier";
    roleDescription = `You logged ${runPercentage}% of household checkouts.`;
  } else if (userReceipts > 0) {
    roleTitle = "Active Roommate";
    roleDescription = `You contributed to ${userReceipts} grocery runs this month.`;
  } else {
    roleTitle = "Guest Observer";
    roleDescription = "No grocery checkouts logged yet this month.";
  }

  const userHabitRole: UserHabitRole = {
    roleTitle,
    roleDescription,
    runPercentage,
  };

  // User-Specific Stocked Items
  const rawUserTopItems = Array.isArray(row?.user_top_items) ? row.user_top_items : [];
  const userTopItems: TopItemHighlight[] = rawUserTopItems.map((item) => ({
    name: item.name,
    count: Number(item.count) || 0,
  }));

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

  // Dead Stock / Pantry Mummies
  const rawDeadStock = Array.isArray(row?.dead_stock_items) ? row.dead_stock_items : [];
  const deadStockItems: DeadStockItem[] = rawDeadStock.map((item) => ({
    name: item.name,
    idleDays: Number(item.idle_days) || 0,
  }));

  // Restock Latency & Velocity
  const latencySeconds = parseFloat(String(row?.avg_latency_seconds ?? "0"));
  const latencySamples = Number(row?.latency_samples ?? 0);
  const formattedRestockLatency = formatLatency(latencySeconds, latencySamples);
  const compactRestockLatency = formatLatencyCompact(latencySeconds, latencySamples);

  const velocityDays = parseFloat(String(row?.avg_in_stock_days ?? "0"));
  const velocitySamples = Number(row?.velocity_samples ?? 0);
  const formattedRestockVelocity = formatVelocity(velocityDays, velocitySamples);

  const vitals: KitchenVitals = {
    averageBasketSize,
    averageRestockLatencySeconds: latencySeconds,
    formattedRestockLatency,
    compactRestockLatency,
    restockVelocityDays: velocityDays,
    formattedRestockVelocity,
    deadStock: deadStockItems,
  };

  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(now);
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const hasData =
    currentSpend > 0 ||
    totalReceipts > 0 ||
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
    userReceiptsCount: userReceipts,
    totalReceiptsCount: totalReceipts,
    averageBasketSize,
    userAverageContribution,
    userCategoryFootprint,
    userSettlement,
    userTopItems,
    userHabitRole,
    vitals,
    topItem,
    allTopItems,
    pantryStockRatio: {
      inStock: pantryInStock,
      outOfStock: pantryOutOfStock,
      total: pantryTotal,
      inStockPercentage,
    },
    deadStockItems,
    hasData,
  };
}
