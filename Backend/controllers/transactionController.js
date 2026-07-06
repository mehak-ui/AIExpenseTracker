import pool from "../utils/db.js";
import { analyzeTransactionList } from "../utils/gemini.js";

export const getTransactions = async (req, res) => {
    const { startDate, endDate, categoryId, type, search, limit = 50, offset = 0 } = req.query;

    const conditions = ['t.user_id = $1'];
    const values = [req.user.id];
    let idx = 2;

    if (startDate) {
        conditions.push(`t.transaction_date >= $${idx++}`);
        values.push(startDate);
    }
    if (endDate) {
        conditions.push(`t.transaction_date <= $${idx++}`);
        values.push(endDate);
    }
    if (categoryId) {
        conditions.push(`t.category_id = $${idx++}`);
        values.push(categoryId);
    }
    if (type) {
        conditions.push(`c.type = $${idx++}`);
        values.push(type);
    }   
    if (search) {
        conditions.push(`(t.description ILIKE $${idx++} OR t.notes ILIKE $${idx++})`);
        values.push(`%${search}%`,  `%${search}%`);
    }

    values.push(limit, offset);

    try {
        const result = await pool.query(
            `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
             FROM transactions t
             LEFT JOIN categories c ON t.category_id = c.id
             WHERE ${conditions.join(' AND ')}
             ORDER BY t.transaction_date DESC, t.id DESC
             LIMIT $${idx++} OFFSET $${idx++}`,
            values
        );
        res.json(result.rows);
    } catch (err) {
        console.error('GetTransactions error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createTransaction = async (req, res) => {
    const { category_id, amount, type, description, notes, transactionDate } = req.body;

    if (!amount || !type || !transactionDate) {
        return res.status(400).json({ error: 'Amount, type, and transaction date are required' });
    }
    if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({ error: 'Type must be either "income" or "expense"' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO transactions (user_id, category_id, amount, type, description, notes, transaction_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [req.user.id, category_id || null, amount, type, description || null, notes || null, transactionDate]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('CreateTransaction error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }   
};

export const getTransactionById = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
             FROM transactions t
             LEFT JOIN categories c ON t.category_id = c.id
             WHERE t.id = $1 AND t.user_id = $2`,
            [id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('GetTransactionById error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateTransaction = async (req, res) => {
    const { id } = req.params;
    const { category_id, amount, type, description, notes, transactionDate } = req.body;

    try {
        const result = await pool.query(
            `UPDATE transactions
                SET category_id = COALESCE($1, category_id),
                    amount = COALESCE($2, amount),
                    type = COALESCE($3, type),
                    description = COALESCE($4, description),
                    notes = COALESCE($5, notes),
                    transaction_date = COALESCE($6, transaction_date)
                WHERE id = $7 AND user_id = $8
                RETURNING *`,
            [category_id, amount, type, description, notes, transactionDate, id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('UpdateTransaction error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteTransaction = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json({ message: 'Transaction deleted successfully' });
    } catch (err) {
        console.error('DeleteTransaction error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const analyzeTransactions = async (req, res) => {
  const { transactionIds } = req.body;

  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res.status(400).json({
      message: "transactionIds array is required",
    });
  }

  const ids = transactionIds.slice(0, 50);

  try {
    const result = await pool.query(
      `
      SELECT
        t.id,
        t.amount,
        t.type,
        t.description,
        t.transaction_date,
        c.name AS category_name
      FROM transactions t
      LEFT JOIN categories c
        ON c.id = t.category_id
      WHERE t.user_id = $1
        AND t.id = ANY($2::int[])
      ORDER BY t.transaction_date DESC
      `,
      [req.user.id, ids]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No transactions found for analysis",
      });
    }

    const userRes = await pool.query(
      "SELECT currency FROM users WHERE id = $1",
      [req.user.id]
    );

    const currency = userRes.rows[0]?.currency || "USD";

    const analysis = await analyzeTransactionList({
      transactions: result.rows,
      currency,
    });

    res.json(analysis);
  } catch (err) {
    console.error("Analyze Transactions Error:", err);

    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};