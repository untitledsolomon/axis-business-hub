-- Reporting & Analytics Functions
-- Created: 2026-08-26
--
-- Axis has had a real double-entry GL (accounts + journal_entries +
-- journal_entry_lines) since finance_foundation, but nothing has ever
-- queried it as reports. This migration adds read-only RPCs for the
-- core accounting reports and a handful of business-analytics views,
-- all computed directly from posted journal entries so they can never
-- drift from the ledger.
--
-- Every function follows the existing _v1 RPC convention: SECURITY
-- DEFINER, org-membership auth check, org_id as first param. All of
-- them only ever look at journal_entries.status = 'posted' — draft
-- entries aren't real yet and void entries were reversed, so this is
-- the same filter the rest of the app already trusts.

-- ============================================================
-- 1. TRIAL BALANCE
-- Per-account debit/credit totals as of a date. Foundation for
-- everything else and a sanity check in its own right (debits should
-- equal credits across the whole org).
-- ============================================================

CREATE OR REPLACE FUNCTION get_trial_balance_v1(
    p_org_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    account_id UUID,
    account_code TEXT,
    account_name TEXT,
    account_category account_category,
    sub_type TEXT,
    total_debit BIGINT,
    total_credit BIGINT,
    balance BIGINT -- debit-normal accounts positive when debit > credit, credit-normal accounts positive when credit > debit
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized to view reports for this organisation';
    END IF;

    RETURN QUERY
    SELECT
        a.id,
        a.code,
        a.name,
        a.category,
        a.sub_type,
        COALESCE(SUM(l.debit), 0)::BIGINT,
        COALESCE(SUM(l.credit), 0)::BIGINT,
        CASE
            WHEN a.category IN ('asset', 'expense')
                THEN COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0)
            ELSE COALESCE(SUM(l.credit), 0) - COALESCE(SUM(l.debit), 0)
        END::BIGINT
    FROM accounts a
    LEFT JOIN journal_entry_lines l ON l.account_id = a.id
    LEFT JOIN journal_entries je ON je.id = l.journal_entry_id
        AND je.status = 'posted'
        AND je.entry_date <= p_as_of_date
    WHERE a.org_id = p_org_id
    GROUP BY a.id, a.code, a.name, a.category, a.sub_type
    ORDER BY a.code;
END;
$$;

-- ============================================================
-- 2. PROFIT & LOSS (Income Statement)
-- Revenue minus expenses for a period, grouped by sub_type for
-- subtotal lines, with a grand total net income/loss.
-- ============================================================

CREATE OR REPLACE FUNCTION get_profit_and_loss_v1(
    p_org_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE (
    account_id UUID,
    account_code TEXT,
    account_name TEXT,
    account_category account_category,
    sub_type TEXT,
    amount BIGINT -- revenue positive when credit > debit, expense positive when debit > credit
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized to view reports for this organisation';
    END IF;

    IF p_start_date > p_end_date THEN
        RAISE EXCEPTION 'start_date must be on or before end_date';
    END IF;

    RETURN QUERY
    SELECT
        a.id,
        a.code,
        a.name,
        a.category,
        a.sub_type,
        CASE
            WHEN a.category = 'revenue' THEN COALESCE(SUM(l.credit), 0) - COALESCE(SUM(l.debit), 0)
            ELSE COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0)
        END::BIGINT
    FROM accounts a
    JOIN journal_entry_lines l ON l.account_id = a.id
    JOIN journal_entries je ON je.id = l.journal_entry_id
        AND je.status = 'posted'
        AND je.entry_date BETWEEN p_start_date AND p_end_date
    WHERE a.org_id = p_org_id
        AND a.category IN ('revenue', 'expense')
    GROUP BY a.id, a.code, a.name, a.category, a.sub_type
    HAVING COALESCE(SUM(l.debit), 0) <> 0 OR COALESCE(SUM(l.credit), 0) <> 0
    ORDER BY a.category DESC, a.code; -- revenue before expense
END;
$$;

-- ============================================================
-- 3. BALANCE SHEET
-- Assets / liabilities / equity as of a date. Equity includes
-- retained earnings = cumulative net income up to that date (not
-- posted as a real closing entry — computed on the fly), so the
-- sheet balances even though Axis doesn't run a year-end close.
-- ============================================================

CREATE OR REPLACE FUNCTION get_balance_sheet_v1(
    p_org_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    account_id UUID,
    account_code TEXT,
    account_name TEXT,
    account_category account_category,
    sub_type TEXT,
    balance BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_retained_earnings BIGINT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized to view reports for this organisation';
    END IF;

    -- Cumulative net income (all-time up to as_of_date) folded into equity.
    SELECT COALESCE(SUM(
        CASE
            WHEN a.category = 'revenue' THEN l.credit - l.debit
            ELSE l.debit - l.credit -- expense
        END
    ), 0) INTO v_retained_earnings
    FROM accounts a
    JOIN journal_entry_lines l ON l.account_id = a.id
    JOIN journal_entries je ON je.id = l.journal_entry_id
        AND je.status = 'posted'
        AND je.entry_date <= p_as_of_date
    WHERE a.org_id = p_org_id
        AND a.category IN ('revenue', 'expense');

    RETURN QUERY
    SELECT
        a.id,
        a.code,
        a.name,
        a.category,
        a.sub_type,
        (COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0))::BIGINT
    FROM accounts a
    LEFT JOIN journal_entry_lines l ON l.account_id = a.id
    LEFT JOIN journal_entries je ON je.id = l.journal_entry_id
        AND je.status = 'posted'
        AND je.entry_date <= p_as_of_date
    WHERE a.org_id = p_org_id
        AND a.category = 'asset'
    GROUP BY a.id, a.code, a.name, a.category, a.sub_type

    UNION ALL

    SELECT
        a.id,
        a.code,
        a.name,
        a.category,
        a.sub_type,
        (COALESCE(SUM(l.credit), 0) - COALESCE(SUM(l.debit), 0))::BIGINT
    FROM accounts a
    LEFT JOIN journal_entry_lines l ON l.account_id = a.id
    LEFT JOIN journal_entries je ON je.id = l.journal_entry_id
        AND je.status = 'posted'
        AND je.entry_date <= p_as_of_date
    WHERE a.org_id = p_org_id
        AND a.category = 'liability'
    GROUP BY a.id, a.code, a.name, a.category, a.sub_type

    UNION ALL

    SELECT
        a.id,
        a.code,
        a.name,
        a.category,
        a.sub_type,
        (COALESCE(SUM(l.credit), 0) - COALESCE(SUM(l.debit), 0))::BIGINT
    FROM accounts a
    LEFT JOIN journal_entry_lines l ON l.account_id = a.id
    LEFT JOIN journal_entries je ON je.id = l.journal_entry_id
        AND je.status = 'posted'
        AND je.entry_date <= p_as_of_date
    WHERE a.org_id = p_org_id
        AND a.category = 'equity'
    GROUP BY a.id, a.code, a.name, a.category, a.sub_type

    UNION ALL

    -- Synthetic retained-earnings row so equity ties out without a real closing entry.
    SELECT
        NULL::UUID,
        'RE',
        'Retained Earnings (Current)',
        'equity'::account_category,
        'Equity',
        v_retained_earnings

    ORDER BY account_category, account_code;
END;
$$;

-- ============================================================
-- 4. ACCOUNT LEDGER DETAIL (running balance)
-- Drill-down from any report line into the posted entries behind it.
-- ============================================================

CREATE OR REPLACE FUNCTION get_account_ledger_v1(
    p_org_id UUID,
    p_account_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE (
    entry_date DATE,
    journal_entry_id UUID,
    reference TEXT,
    description TEXT,
    debit BIGINT,
    credit BIGINT,
    running_balance BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_category account_category;
    v_opening_balance BIGINT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized to view reports for this organisation';
    END IF;

    SELECT category INTO v_category FROM accounts WHERE id = p_account_id AND org_id = p_org_id;
    IF v_category IS NULL THEN
        RAISE EXCEPTION 'Account not found in this organisation';
    END IF;

    SELECT COALESCE(SUM(
        CASE WHEN v_category IN ('asset', 'expense') THEN l.debit - l.credit ELSE l.credit - l.debit END
    ), 0) INTO v_opening_balance
    FROM journal_entry_lines l
    JOIN journal_entries je ON je.id = l.journal_entry_id AND je.status = 'posted'
    WHERE l.account_id = p_account_id AND je.entry_date < p_start_date;

    RETURN QUERY
    WITH lines AS (
        SELECT
            je.entry_date,
            je.id AS journal_entry_id,
            je.reference,
            COALESCE(l.description, je.description) AS description,
            l.debit,
            l.credit,
            je.created_at
        FROM journal_entry_lines l
        JOIN journal_entries je ON je.id = l.journal_entry_id AND je.status = 'posted'
        WHERE l.account_id = p_account_id
            AND je.entry_date BETWEEN p_start_date AND p_end_date
    )
    SELECT
        lines.entry_date,
        lines.journal_entry_id,
        lines.reference,
        lines.description,
        lines.debit,
        lines.credit,
        (v_opening_balance + SUM(
            CASE WHEN v_category IN ('asset', 'expense') THEN lines.debit - lines.credit ELSE lines.credit - lines.debit END
        ) OVER (ORDER BY lines.entry_date, lines.created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW))::BIGINT
    FROM lines
    ORDER BY lines.entry_date, lines.created_at;
END;
$$;

-- ============================================================
-- 5. REVENUE TREND (business analytics)
-- Monthly revenue and expense totals for charting.
-- ============================================================

CREATE OR REPLACE FUNCTION get_revenue_trend_v1(
    p_org_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE (
    month DATE,
    revenue BIGINT,
    expenses BIGINT,
    net BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized to view reports for this organisation';
    END IF;

    RETURN QUERY
    WITH monthly AS (
        SELECT
            DATE_TRUNC('month', je.entry_date)::DATE AS month,
            COALESCE(SUM(CASE WHEN a.category = 'revenue' THEN l.credit - l.debit ELSE 0 END), 0)::BIGINT AS revenue,
            COALESCE(SUM(CASE WHEN a.category = 'expense' THEN l.debit - l.credit ELSE 0 END), 0)::BIGINT AS expenses
        FROM journal_entries je
        JOIN journal_entry_lines l ON l.journal_entry_id = je.id
        JOIN accounts a ON a.id = l.account_id
        WHERE je.org_id = p_org_id
            AND je.status = 'posted'
            AND je.entry_date BETWEEN p_start_date AND p_end_date
            AND a.category IN ('revenue', 'expense')
        GROUP BY DATE_TRUNC('month', je.entry_date)
    )
    SELECT monthly.month, monthly.revenue, monthly.expenses, (monthly.revenue - monthly.expenses)::BIGINT AS net
    FROM monthly
    ORDER BY monthly.month;
END;
$$;

-- ============================================================
-- 6. AR AGING (business analytics)
-- Open invoice balances bucketed by days overdue. Uses invoices
-- directly rather than the GL, since that's the source of truth for
-- what a client owes. NOTE: mark_invoice_paid_v1 only supports
-- full-amount payment today — there is no partial-payment RPC yet, so
-- an invoice's amount due is simply its grand_total while unpaid. If
-- a partial-payment RPC is added later, this should switch to netting
-- against the AR sub-ledger (or a real amount_paid column) instead.
-- ============================================================

CREATE OR REPLACE FUNCTION get_ar_aging_v1(
    p_org_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    invoice_id UUID,
    invoice_number TEXT,
    client_id UUID,
    client_name TEXT,
    due_date DATE,
    days_overdue INT,
    bucket TEXT,
    amount_due BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized to view reports for this organisation';
    END IF;

    RETURN QUERY
    SELECT
        i.id,
        i.invoice_number,
        i.client_id,
        c.name,
        i.due_date,
        GREATEST(0, p_as_of_date - i.due_date)::INT AS days_overdue,
        CASE
            WHEN p_as_of_date <= i.due_date THEN 'current'
            WHEN p_as_of_date - i.due_date <= 30 THEN '1-30'
            WHEN p_as_of_date - i.due_date <= 60 THEN '31-60'
            WHEN p_as_of_date - i.due_date <= 90 THEN '61-90'
            ELSE '90+'
        END AS bucket,
        i.grand_total::BIGINT AS amount_due
    FROM invoices i
    JOIN clients c ON c.id = i.client_id
    WHERE i.org_id = p_org_id
        AND i.status IN ('sent', 'viewed', 'partial', 'overdue')
        AND i.issue_date <= p_as_of_date
    ORDER BY days_overdue DESC;
END;
$$;

-- ============================================================
-- 7. EXPENSE BREAKDOWN (business analytics)
-- Expenses grouped by category for a period, for a pie/bar chart.
-- ============================================================

CREATE OR REPLACE FUNCTION get_expense_breakdown_v1(
    p_org_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE (
    category TEXT,
    total BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized to view reports for this organisation';
    END IF;

    RETURN QUERY
    SELECT e.category, SUM(e.amount)::BIGINT
    FROM expenses e
    WHERE e.org_id = p_org_id
        AND e.expense_date BETWEEN p_start_date AND p_end_date
    GROUP BY e.category
    ORDER BY SUM(e.amount) DESC;
END;
$$;

-- ============================================================
-- 8. TOP CLIENTS (business analytics)
-- Ranked by total invoiced (grand_total) over a period, excluding
-- voided/draft invoices.
-- ============================================================

CREATE OR REPLACE FUNCTION get_top_clients_v1(
    p_org_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_limit INT DEFAULT 10
) RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    invoice_count BIGINT,
    total_invoiced BIGINT,
    total_paid BIGINT -- sum of grand_total for invoices marked 'paid' (no partial-payment amounts exist yet — see AR aging note above)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized to view reports for this organisation';
    END IF;

    RETURN QUERY
    SELECT
        c.id,
        c.name,
        COUNT(i.id),
        COALESCE(SUM(i.grand_total), 0)::BIGINT,
        COALESCE(SUM(i.grand_total) FILTER (WHERE i.status = 'paid'), 0)::BIGINT
    FROM clients c
    JOIN invoices i ON i.client_id = c.id
    WHERE c.org_id = p_org_id
        AND i.status NOT IN ('draft', 'voided')
        AND i.issue_date BETWEEN p_start_date AND p_end_date
    GROUP BY c.id, c.name
    ORDER BY SUM(i.grand_total) DESC
    LIMIT p_limit;
END;
$$;
