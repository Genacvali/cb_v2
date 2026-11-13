-- Mark top-ups created by «Распределить» so they can be reset reliably.
ALTER TABLE public.expense_category_allocations
  ADD COLUMN IF NOT EXISTS is_adjustment BOOLEAN NOT NULL DEFAULT false;

-- Backfill with the same rule the app used before this column existed:
-- extra fixed rows for an income source that already funds the category.
WITH ranked AS (
  SELECT
    id,
    allocation_type,
    COUNT(*) OVER pair AS rows_in_pair,
    BOOL_OR(allocation_type = 'percentage') OVER pair AS has_percentage,
    ROW_NUMBER() OVER (
      PARTITION BY expense_category_id, income_category_id, allocation_type
      ORDER BY created_at, id
    ) AS fixed_rank
  FROM public.expense_category_allocations
  WINDOW pair AS (PARTITION BY expense_category_id, income_category_id)
)
UPDATE public.expense_category_allocations AS a
SET is_adjustment = true
FROM ranked AS r
WHERE a.id = r.id
  AND r.allocation_type = 'fixed'
  AND r.rows_in_pair > 1
  AND (r.has_percentage OR r.fixed_rank > 1);
