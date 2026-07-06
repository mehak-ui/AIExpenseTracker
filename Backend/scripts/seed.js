import bcrypt from "bcryptjs";
import pool from "../utils/db.js";
import { defaultCategories } from "../utils/defaultCategories.js";

const DEMO_USER = {
  name: "Alex",
  email: "mmmmm@timetoprogrm.com",
  password: "password123",
  currency: "USD",
};

const BUDGETS = [
  { name: "Food & Dining", amount: 600 },
  { name: "Groceries", amount: 500 },
  { name: "Entertainment", amount: 120 },
  { name: "Transportation", amount: 350 },
  { name: "Clothing", amount: 200 },
];

const generateTransactions = (catMap) => {
  const txns = [];
  const today = new Date();

  let seed = 1;

  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const rangeFloat = (min, max) => min + rng() * (max - min);
  const rangeInt = (min, max) =>
    Math.floor(rangeFloat(min, max + 1));
  const pick = (arr) =>
    arr[Math.floor(rng() * arr.length)];

  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const monthStart = new Date(
      today.getFullYear(),
      today.getMonth() - monthsAgo,
      1
    );

    const daysInMonth = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0
    ).getDate();

    const monthLastDay =
      monthsAgo === 0 ? today.getDate() : daysInMonth;

    const dateOn = (day) => {
      const year = monthStart.getFullYear();
      const month = monthStart.getMonth() + 1;

      return `${year}-${String(month).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
    };

    const add = (
      day,
      categoryName,
      amount,
      type,
      description
    ) => {
      if (day < 1 || day > monthLastDay) return;

      const catId = catMap[categoryName];
      if (!catId) return;

      txns.push({
        categoryId: catId,
        amount: parseFloat(amount.toFixed(2)),
        type,
        description,
        date: dateOn(day),
      });
    };

        // Bi-weekly salary
    add(1, "Salary", 2750, "income", "Salary deposit");
    add(15, "Salary", 2750, "income", "Salary deposit");

    if (monthsAgo % 3 === 1) {
      add(
        rangeInt(10, 22),
        "Freelance",
        rangeFloat(400, 1100),
        "income",
        "Client project"
      );
    }

    if (rng() < 0.5) {
      add(
        rangeInt(8, 25),
        "Other Income",
        rangeFloat(15, 120),
        "income",
        pick(["Cashback", "Refund", "Gift"])
      );
    }

    // Fixed recurring expenses
    add(2, "Rent", 1800, "expense", "Monthly rent");

    add(
      rangeInt(5, 9),
      "Utilities",
      rangeFloat(75, 110),
      "expense",
      "Electricity"
    );

    add(
      rangeInt(10, 14),
      "Utilities",
      rangeFloat(45, 70),
      "expense",
      "Internet"
    );

    // Subscriptions
    add(3, "Entertainment", 15.99, "expense", "Netflix");
    add(5, "Entertainment", 10.99, "expense", "Spotify");
    add(7, "Entertainment", 9.99, "expense", "YouTube Premium");

    // Daily granular transactions
    for (let day = 1; day <= monthLastDay; day++) {
      const d = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        day
      );

      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;

      if (!isWeekend && rng() < 0.8) {
        add(
          day,
          "Food & Dining",
          rangeFloat(4, 8),
          "expense",
          pick(["Morning coffee", "Coffee", "Latte"])
        );
      }

      if (!isWeekend && rng() < 0.55) {
        add(
          day,
          "Food & Dining",
          rangeFloat(10, 18),
          "expense",
          pick(["Lunch", "Salad bowl", "Sandwich"])
        );
      }

      if (isWeekend && rng() < 0.5) {
        add(
          day,
          "Food & Dining",
          rangeFloat(28, 75),
          "expense",
          pick(["Dinner out", "Restaurant", "Brunch"])
        );
      }

      if (!isWeekend && rng() < 0.4) {
        add(
          day,
          "Transportation",
          rangeFloat(2.5, 6),
          "expense",
          pick(["Subway", "Parking"])
        );
      }

      if (rng() < 0.15) {
        add(
          day,
          "Shopping",
          rangeFloat(12, 48),
          "expense",
          "Amazon order"
        );
      }
    }

    // Weekly groceries
    for (let day = 1; day <= monthLastDay; day++) {
      const d = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        day
      );

      if (d.getDay() === 0) {
        add(
          day,
          "Groceries",
          rangeFloat(55, 120),
          "expense",
          pick(["Whole Foods", "Trader Joe's", "Weekly groceries"])
        );
      }
    }

        // Weekly gas
    for (let day = 4; day <= monthLastDay; day += 7) {
      add(
        day,
        "Transportation",
        rangeFloat(35, 60),
        "expense",
        "Gas"
      );
    }

    // Occasional larger expenses
    if (monthsAgo % 2 === 0) {
      add(
        rangeInt(8, 25),
        "Shopping",
        rangeFloat(55, 180),
        "expense",
        pick(["Clothes", "New shoes"])
      );
    }

    if ([10, 6, 2].includes(monthsAgo)) {
      add(
        rangeInt(10, 20),
        "Healthcare",
        rangeFloat(40, 130),
        "expense",
        "Doctor visit"
      );
    }

    if (monthsAgo % 2 === 0) {
      add(
        rangeInt(8, 14),
        "Personal Care",
        rangeFloat(35, 55),
        "expense",
        "Haircut"
      );
    }

    if ([11, 7, 3].includes(monthsAgo)) {
      add(
        rangeInt(15, 22),
        "Travel",
        rangeFloat(180, 380),
        "expense",
        "Weekend trip"
      );
    }
  }

  return txns;
};

const seed = async () => {
  const client = await pool.connect();

  try {
    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [DEMO_USER.email]
    );

    if (existing.rows.length > 0) {
      console.log(`Removing existing demo user (${DEMO_USER.email})...`);
      await client.query(
        "DELETE FROM users WHERE email = $1",
        [DEMO_USER.email]
      );
    }

    await client.query("BEGIN");

    console.log(`Creating user ${DEMO_USER.email}...`);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEMO_USER.password, salt);

    const userResult = await client.query(
      `
      INSERT INTO users (username, email, password_hash, currency)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [
        DEMO_USER.name,
        DEMO_USER.email,
        passwordHash,
        DEMO_USER.currency,
      ]
    );

    const userId = userResult.rows[0].id;

    console.log(
      `Seeding ${defaultCategories.length} default categories...`
    );

    for (const cat of defaultCategories) {
      await client.query(
        `
        INSERT INTO categories
          (user_id, name, type, icon, color, is_default)
        VALUES ($1, $2, $3, $4, $5, true)
        `,
        [userId, cat.name, cat.type, cat.icon, cat.color]
      );
    }

    const catRes = await client.query(
      `
      SELECT id, name
      FROM categories
      WHERE user_id = $1
      `,
      [userId]
    );

    const catMap = {};

    catRes.rows.forEach((c) => {
      catMap[c.name] = c.id;
    });

    const transactions = generateTransactions(catMap);

    console.log(
      `Inserting ${transactions.length} transactions across 12 months...`
    );

    const placeholders = [];
    const params = [];

    transactions.forEach((t, i) => {
      const base = i * 6;

      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`
      );

      params.push(
        userId,
        t.categoryId,
        t.amount,
        t.type,
        t.description,
        t.date
      );
    });

    if (placeholders.length > 0) {
      await client.query(
        `
        INSERT INTO transactions
          (user_id, category_id, amount, type, description, transaction_date)
        VALUES ${placeholders.join(", ")}
        `,
        params
      );
    }

    const today = new Date();

const monthStartStr = `${today.getFullYear()}-${String(
  today.getMonth() + 1
).padStart(2, "0")}-01`;

console.log(`Inserting ${BUDGETS.length} budgets...`);

for (const b of BUDGETS) {
  console.log(
    `Budget: ${b.name} -> Category ID: ${catMap[b.name]}`
  );

  if (!catMap[b.name]) {
    throw new Error(
      `Category "${b.name}" not found in defaultCategories.js`
    );
  }

  await client.query(
    `
    INSERT INTO budgets
      (user_id, category_id, amount, period, start_date)
    VALUES ($1, $2, $3, 'monthly', $4)
    `,
    [
      userId,
      catMap[b.name],
      b.amount,
      monthStartStr,
    ]
  );
}

await client.query("COMMIT");

console.log("\n🎉 Demo data seeded successfully!\n");
console.log("Email:", DEMO_USER.email);
console.log("Password:", DEMO_USER.password);
console.log("");
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Seed failed:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

};

seed();