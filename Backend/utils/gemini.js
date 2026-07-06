/* import dotenv from "dotenv";
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

if (!process.env.GOOGLE_API_KEY) {
    console.error("Error: GOOGLE_API_KEY is not set in the environment variables.");
} */
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

if (!process.env.GEMINI_API) {
  throw new Error("GEMINI_API is not set in the environment variables.");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API,
});

const stripMarkdown = (text) => {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
    }
    return cleaned.trim();
};

export const generateMonthlyInsight = async ({
    totalIncome,
    totalExpenses,
    savingRate,
    expenseBreakdown,
    previousMonths,
    currency = 'USD',
}) => {
    const breakdownText = expenseBreakdown.length > 0
    ? expenseBreakdown.map(c => `${c.category}: ${currency} ${c.amount.toFixed(2)}`).join('\n')
    : 'No expenses recorded.';

    const trendText = previousMonths.length > 0
    ? previousMonths.map(m => `- ${m.month}: Income: ${currency} ${m.income.toFixed(2)}, Expenses: ${currency} ${m.expenses.toFixed(2)}`).join('\n')
    : 'No previous month data available.';

    const prompt = `Analyze this user's monthly financial data and provide a concise insight. Include suggestions for improvement if applicable.

    Currency: ${currency}
    Total Income (this month): ${currency} ${totalIncome.toFixed(2)}
    Total Expenses (this month): ${currency} ${totalExpenses.toFixed(2)}
    Saving Rate: ${savingRate.toFixed(2)}%

    Expense Breakdown by category (this month):
${breakdownText}
    Previous Months' Trends:
${trendText}

Return only valid JSON (no markdown, no commentary) in this exact structure:
{
  "summary": "2-3 sentence summary of the user's financial situation this month.",
  "highlight": ["Positive observation 1", "Positive observation 2"],
  "concern": ["Concern 1", "Concern 2"],
  "recommendations": [
    {"title": "Short title", "detail": "Actionable recommendation"}
  ],
  "topSpendingCategory": "Category name",
  "estimatedMonthlySavings": number,
  "healthScore": number
}

Constraints:
- "healthScore" must be an integer between 0 and 100.
- Provide 3 recommendations.
- Reference actual numbers from the data. Tone: friendly, encouraging, and honest.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const cleaned = stripMarkdown(response.text);
        return JSON.parse(cleaned);
    } catch (err) {
    console.error("===== GEMINI ERROR =====");
    console.error(err);

    if (err.response) {
        console.error(err.response);
    }

    throw err;
}
};

export const generateBudgetAlert = async ({
    categoryName,
    budgetedAmount,
    spentAmount,
    daysIntoPeriod,
    totalPeriodDays,
    currency = 'USD',
}) => {
    const percentUsed = ((spentAmount / budgetedAmount) * 100).toFixed(1);
    const daysLeft = totalPeriodDays - daysIntoPeriod;

    const prompt = `A user is tracking a budget. Generate a helpful alert.
    
Category: ${categoryName}
Budget: ${currency} ${budgetedAmount.toFixed(2)}
Spent so far: ${currency} ${spentAmount.toFixed(2)} (${percentUsed}% used)
Days into period: ${daysIntoPeriod} of ${totalPeriodDays} (${daysLeft} days remaining)

Return ONLY valid JSON (no markdown):
{
  "severity": "info|warning|critical",
  "title": "Short alert title",
  "message": "1-2 sentence empathetic message referencing actual numbers",
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}

Severity guide:
- info: under 70% spent
- warning: 70% - 100% spent
- critical: over 100% spent`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const cleaned = stripMarkdown(response.text);
        return JSON.parse(cleaned);
    } catch (err) {
        console.error("gemini api error (budget alert):", err);
        throw new Error("Failed to generate budget alert");
    }
};

export const generateSavingTips = async ({ topCategories, monthlyIncome, currency = 'USD' }) => {
    const categoriesText = topCategories.length > 0
    ? topCategories.map(c => `${c.category}: ${currency} ${c.amount.toFixed(2)} across ${c.transactions} transactions`).join('\n')
    : 'No spending categories available.';

    const prompt = `Generate personalized saving tips for a user.
    
Monthly Income (last 30 days): ${currency} ${monthlyIncome.toFixed(2)}
Top Spending Categories (last 30 days):
${categoriesText}

Return ONLY valid JSON (no markdown):
{
  "overallTip": "Top-level 1-sentence advice",
  "tips": [
    {
      "category": "Category this targets",
      "title": "Short tip title",
      "details": "2-3 sentence actionable suggestion",
      "estimatedSavings": number
    }
  ]
}

Provide exactly 4 tips. Each tip should reference an actual category from the data and include a realistic monthly savings estimate. Tone: friendly, encouraging, and honest.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const cleaned = stripMarkdown(response.text);
        return JSON.parse(cleaned);
    } catch (err) {
        console.error("gemini api error (saving tips):", err);
        throw new Error("Failed to generate saving tips");
    }
};

// FIX: renamed from analyzeTransactionLList (double L was a typo)
export const analyzeTransactionList = async ({ transactions, currency = 'USD' }) => {
    const formatDate = (d) => {
        if (!d) return '';
        if (d instanceof Date) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
        return String(d).split('T')[0];
    };

    const lines = transactions.slice(0, 50).map(t => {
        const date = formatDate(t.transaction_date);
        const amt = parseFloat(t.amount).toFixed(2);
        const cat = t.category_name || 'Uncategorized';
        const desc = t.description ? ` | ${t.description}` : '';
        return `- ${date}: ${t.type} ${currency} ${amt} | ${cat}${desc}`;
    }).join('\n');

    const prompt = `Analyze these ${transactions.length} transactions and provide a concise, helpful spending insight. Include any patterns, anomalies, or recommendations for improvement.
    
Transactions:
${lines}

Return ONLY valid JSON (no markdown):
{
  "insights": "2-4 sentence analysis with specific numbers from the data. Tone: friendly, encouraging, and helpful.",
  "highlight": "Single short phrase capturing the key takeaway (e.g., 'High spending on dining out', 'Stable income', 'Dining out spending spike', 'Unexpected large expense', etc.)"
}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const cleaned = stripMarkdown(response.text);
        return JSON.parse(cleaned);
    } catch (err) {
        console.error("gemini api error (transaction analysis):", err);
        throw new Error("Failed to analyze transactions");
    }
};

export const analyzeBudgetList = async ({ budgets, currency = 'USD' }) => {
    const lines = budgets.map(b => {
        const spent = parseFloat(b.spent);
        const total = parseFloat(b.amount);
        const pct = total > 0 ? ((spent / total) * 100).toFixed(1) : '0.0';
        return `Budget ID ${b.id} | Category: ${b.category_name} | Limit: ${currency} ${total.toFixed(2)} | Spent: ${currency} ${spent.toFixed(2)} (${pct}% used)`;
    }).join('\n');

    const prompt = `You're a personal finance assistant. Analyze each budget below and provide a one-sentence assessment.

Today: ${new Date().toISOString().split('T')[0]}
Budgets:
${lines}

For each budget, return:
- status: 'good' (well-paced, under target), 'caution' (approaching limit or above 70%), 'concerning' (over budget)
- message: A specific, friendly 1-sentence assessment with actionable feedback or encouragement

Return ONLY valid JSON (no markdown):
{
  "analyses": [
    { "budget": number, "status": "good"|"caution"|"concerning", "message": "string" }
  ]
}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const cleaned = stripMarkdown(response.text);
        return JSON.parse(cleaned);
    } catch (err) {
        console.error("gemini api error (budget analysis):", err);
        throw new Error("Failed to analyze budgets");
    }
};

export default {
    generateMonthlyInsight,
    generateBudgetAlert,
    generateSavingTips,
    analyzeTransactionList,    // FIX: updated to match renamed function
    analyzeBudgetList,
}; 










