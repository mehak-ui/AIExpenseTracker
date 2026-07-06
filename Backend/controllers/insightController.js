import pool from "../utils/db.js";
import {
  generateMonthlyInsight,
  generateBudgetAlert,
  generateSavingTips,        // FIX 4: was generateSavingsTips (extra 's')
} from "../utils/gemini.js";

// Get user's preferred currency
const getUserCurrency = async (userId) => {
  const result = await pool.query(
    "SELECT currency FROM users WHERE id = $1",
    [userId]
  );
  return result.rows[0]?.currency || "USD";
};

// Get previously generated insights
export const getInsights = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM ai_insights
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get Insights Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Build Monthly Insight
const buildMonthlyInsight = async (userId) => {
  const data = await pool.query(
    `
    WITH current_month AS (
      SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expense
      FROM transactions
      WHERE user_id = $1
      AND transaction_date >= date_trunc('month', CURRENT_DATE)
    ),

    breakdown AS (
      SELECT
        c.name AS category,
        SUM(t.amount) AS amount
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE
        t.user_id = $1
        AND t.type = 'expense'
        AND t.transaction_date >= date_trunc('month', CURRENT_DATE)
      GROUP BY c.name
      ORDER BY amount DESC
    ),

    trends AS (
      SELECT
        to_char(date_trunc('month', transaction_date), 'YYYY-MM') AS month,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
      FROM transactions
      WHERE
        user_id = $1
        AND transaction_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '3 months'
        AND transaction_date < date_trunc('month', CURRENT_DATE)
      GROUP BY 1
      ORDER BY 1
    )

    SELECT
      (SELECT income FROM current_month) AS income,
      (SELECT expense FROM current_month) AS expense,
      (SELECT json_agg(breakdown) FROM breakdown) AS breakdown,
      (SELECT json_agg(trends) FROM trends) AS trends
    `,
    [userId]
  );

  const row = data.rows[0];

  const totalIncome = parseFloat(row.income || 0);
  const totalExpenses = parseFloat(row.expense || 0);

  const savingRate =
    totalIncome > 0
      ? ((totalIncome - totalExpenses) / totalIncome) * 100
      : 0;

  const currency = await getUserCurrency(userId);

  const content = await generateMonthlyInsight({
    totalIncome,
    totalExpenses,
    savingRate,

    expenseBreakdown: (row.breakdown || []).map((b) => ({
      category: b.category,
      amount: parseFloat(b.amount),
    })),

    previousMonths: (row.trends || []).map((t) => ({
      month: t.month,
      income: parseFloat(t.income),
      expenses: parseFloat(t.expense),   // FIX 7: was 'expense', gemini.js expects 'expenses'
    })),

    currency,
  });

  const now = new Date();

  const periodStart = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-01`;

  const periodEnd = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return { content, periodStart, periodEnd };
};

// Build Savings Tips
const buildSavingsTips = async (userId) => {
  const top = await pool.query(
    `SELECT c.name AS category, SUM(t.amount) AS amount, COUNT(t.id) AS count
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1
     AND t.type = 'expense'
     AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY c.name
     ORDER BY amount DESC
     LIMIT 5`,
    [userId]
  );

  const incomeResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS income
     FROM transactions
     WHERE user_id = $1
     AND type = 'income'
     AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'`,
    [userId]
  );

  const currency = await getUserCurrency(userId);

  const content = await generateSavingTips({
    topCategories: top.rows.map((r) => ({
      category: r.category,
      amount: parseFloat(r.amount),
      transactions: parseInt(r.count, 10),     // FIX 6: was transactionCount, gemini.js expects 'transactions'
    })),
    monthlyIncome: parseFloat(incomeResult.rows[0].income),
    currency,
  });

  return { content, periodStart: null, periodEnd: null };
};

// Build Budget Alert
const buildBudgetAlert = async (userId, categoryId) => {
  if (!categoryId) {
    const error = new Error("categoryId is required for budget_alert");
    error.status = 400;     // FIX 3: was 'err.status' but variable is named 'error'
    throw error;            // FIX 3: was 'throw err' but variable is named 'error'
  }

  const budgetRow = await pool.query(
    `SELECT b.*, c.name AS category_name,
     COALESCE((
       SELECT SUM(amount) FROM transactions
       WHERE user_id = b.user_id
       AND category_id = b.category_id
       AND type = 'expense'
       AND transaction_date >= date_trunc('month', CURRENT_DATE)
     ), 0) AS spent
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = $1 AND b.category_id = $2`,
    [userId, categoryId]
  );

  if (budgetRow.rows.length === 0) {
    const err = new Error("Budget not found for category");
    err.status = 404;
    throw err;
  }

  const b = budgetRow.rows[0];
  const now = new Date();
  const daysIntoPeriod = now.getDate();
  const totalPeriodDays = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const currency = await getUserCurrency(userId);

  const content = await generateBudgetAlert({
    categoryName: b.category_name,
    budgetedAmount: parseFloat(b.amount),   // FIX 5: was budgetAmount, gemini.js expects 'budgetedAmount'
    spentAmount: parseFloat(b.spent),
    daysIntoPeriod,
    totalPeriodDays,
    currency,
  });

  return { content, periodStart: null, periodEnd: null };
};

// Generate and store a new insight
export const generateInsight = async (req, res) => {
  const { type, categoryId } = req.body;

  if (!type) {
    return res.status(400).json({ message: "Insight type is required" });
  }

  try {
    let result;
    if (type === "monthly_summary") {
      result = await buildMonthlyInsight(req.user.id);          // FIX 1: was req.userId
    } else if (type === "savings_tips") {
      result = await buildSavingsTips(req.user.id);             // FIX 1: was req.userId
    } else if (type === "budget_alert") {
      result = await buildBudgetAlert(req.user.id, categoryId); // FIX 1: was req.userId
    } else {
      return res.status(400).json({ message: "Unknown insight type" });
    }

    const inserted = await pool.query(
      `INSERT INTO ai_insights (user_id, insight_type, period_start, period_end, content_json)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, type, result.periodStart, result.periodEnd, result.content]
    );

    res.status(201).json(inserted.rows[0]);
  } catch (err) {
    console.error("GenerateInsight error:", err);
    res.status(err.status || 500).json({ message: err.message || "Server error" }); // FIX 2: was error.status/error.message
  }
};