import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../utils/db.js";
import { defaultCategories } from "../utils/defaultCategories.js";

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

export const register = async (req, res) => {
  const {
    name,
    email,
    password,
    currency = "USD",
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email and password are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters long",
    });
  }

  const client = await pool.connect();

  try {
    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        message: "Email already in use",
      });
    }

    await client.query("BEGIN");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userResult = await client.query(
      `
      INSERT INTO users
      (username, email, password_hash, currency)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, currency, created_at
      `,
      [name, email, passwordHash, currency]
    );

    const user = userResult.rows[0];

    for (const cat of defaultCategories) {
      await client.query(
        `
        INSERT INTO categories
        (user_id, name, type, icon, color, is_default)
        VALUES ($1, $2, $3, $4, $5, true)
        `,
        [
          user.id,
          cat.name,
          cat.type,
          cat.icon,
          cat.color,
        ]
      );
    }

    await client.query("COMMIT");

    const token = signToken(user.id);

    res.status(201).json({
      user,
      token,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Registration error:", err);

    res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT id,
             username,
             email,
             password_hash,
             currency
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!match) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = signToken(user.id);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        currency: user.currency,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id,
             username,
             email,
             currency,
             created_at
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("GetMe error:", err);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};
