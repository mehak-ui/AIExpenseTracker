import pool from "../utils/db.js";

const pctChange = (current, previous) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / previous) * 100;
};

export const getSummary = async (req, res) => {
  try {
    const result = await pool.query(
      `
      WITH monthly AS (
        SELECT
          date_trunc('month', transaction_date) AS month,
          type,
          SUM(amount) AS total
        FROM transactions
        WHERE user_id = $1
          AND transaction_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
        GROUP BY 1, 2
      )
      SELECT
        COALESCE(SUM(CASE WHEN month = date_trunc('month', CURRENT_DATE) AND type = 'income' THEN total END), 0) AS current_month_income,
        COALESCE(SUM(CASE WHEN month = date_trunc('month', CURRENT_DATE) AND type = 'expense' THEN total END), 0) AS current_month_expense,
        COALESCE(SUM(CASE WHEN month = date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' AND type = 'income' THEN total END), 0) AS previous_month_income,
        COALESCE(SUM(CASE WHEN month = date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' AND type = 'expense' THEN total END), 0) AS previous_month_expense
      FROM monthly
      `,
      [req.user.id]
    );

    const row = result.rows[0];

    const incomeThisMonth = parseFloat(row.current_month_income || 0);
    const expenseThisMonth = parseFloat(row.current_month_expense || 0);
    const incomeLastMonth = parseFloat(row.previous_month_income || 0);
    const expenseLastMonth = parseFloat(row.previous_month_expense || 0);

    const balance = incomeThisMonth - expenseThisMonth;

    const savingsRate =
      incomeThisMonth > 0
        ? ((incomeThisMonth - expenseThisMonth) / incomeThisMonth) * 100
        : 0;

    const incomeDelta = pctChange(incomeThisMonth, incomeLastMonth);
    const expenseDelta = pctChange(expenseThisMonth, expenseLastMonth);

    res.json({
      incomeThisMonth,
      expenseThisMonth,
      incomeLastMonth,
      expenseLastMonth,
      balance,
      savingsRate,
      incomeDelta,
      expenseDelta,
      incomeChange: incomeDelta,
      expenseChange: expenseDelta,
    });
  } catch (err) {
    console.error("Get Summary Error:", err);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getCategoryBreakdown = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                c.id AS category_id,
                c.name AS category_name,
                c.icon AS category_icon,
                c.color AS category_color,
                SUM(t.amount) AS total
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            WHERE t.user_id = $1
                AND t.type = 'expense'
                AND t.transaction_date >= date_trunc('month', CURRENT_DATE)
            GROUP BY c.id
            ORDER BY total DESC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Get Category Breakdown Error:", err);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getMonthlyTrend = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                to_char(date_trunc('month', transaction_date), 'YYYY-MM') AS month,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
            FROM transactions
            WHERE user_id = $1
                AND transaction_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
            GROUP BY 1
            ORDER BY 1`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) { 
        console.error("Get Monthly Trend Error:", err);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }   
};
