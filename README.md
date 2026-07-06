# 💰 AI Expense Tracker

A modern **AI-powered Expense Tracker** built using the **PERN Stack (PostgreSQL, Express.js, React, Node.js)** with **Google Gemini AI** integration. The application enables users to securely manage their finances, track spending habits, set monthly budgets, and receive personalized AI-generated financial insights.

---

## 🚀 Live Demo
[https://ai-expense-tracker-6v6cjijfa-mehak-uis-projects.vercel.app/login](https://ai-expense-tracker-6v6cjijfa-mehak-uis-projects.vercel.app)

---
# ✨ Features

### 🔐 Authentication
- Secure JWT-based authentication
- User registration & login
- Protected API routes
- Password hashing using bcrypt

### 💳 Transaction Management
- Add income & expense transactions
- Edit existing transactions
- Delete transactions
- Categorize transactions
- Filter by category and type

### 📊 Dashboard
- Monthly balance overview
- Income vs Expense summary
- Recent transactions
- Budget tracking
- Interactive charts
- Spending analytics

### 💰 Budget Management
- Create monthly budgets
- Track budget utilization
- Monitor remaining budget
- Category-wise budget allocation

### 🤖 AI Financial Insights
Powered by **Google Gemini AI**

- Monthly spending analysis
- Personalized saving recommendations
- Budget optimization suggestions
- Financial habit analysis
- Expense pattern detection

### 📱 User Experience
- Responsive UI
- Clean dashboard
- Modern design
- Fast performance
- Mobile-friendly

---

# 🛠 Tech Stack

## Frontend

- React.js
- Vite
- Tailwind CSS
- Axios
- React Router DOM
- Recharts
- Lucide React

## Backend

- Node.js
- Express.js
- PostgreSQL
- Neon Database
- JWT
- bcryptjs
- dotenv
- Google Gemini API

---

# 📂 Project Structure

```
AIExpenseTracker
│
├── Backend
│   ├── controllers
│   ├── middleware
│   ├── routes
│   ├── scripts
│   ├── utils
│   ├── server.js
│   └── package.json
│
└── Frontend
    └── AIExpenseTracker
        ├── public
        ├── src
        │   ├── assets
        │   ├── components
        │   ├── context
        │   ├── lib
        │   └── pages
        ├── vite.config.js
        └── package.json
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/mehak-ui/AIExpenseTracker.git

cd AIExpenseTracker
```

---

## Backend Setup

```bash
cd Backend

npm install

npm run dev
```

---

## Frontend Setup

```bash
cd Frontend/AIExpenseTracker

npm install

npm run dev
```

---

# 🔑 Environment Variables

## Backend

Create a `.env` file inside **Backend**

```env
PORT=8000

DATABASE_URL=your_neon_database_url

JWT_SECRET=your_secret_key

GEMINI_API_KEY=your_google_gemini_api_key
```

---

## Frontend

Create a `.env` file inside **Frontend/AIExpenseTracker**

Development

```env
VITE_API_URL=http://localhost:8000/api
```

Production

```env
VITE_API_URL=https://your-backend.onrender.com/api
```

---

# 🌱 Seed Demo Data

Run the following command:

```bash
npm run seed
```

This automatically creates:

- Demo User
- Categories
- Budgets
- Transactions
- AI-ready financial data

---

# 📡 API Overview

| Method | Endpoint | Description |
|----------|------------------------|---------------------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/transactions` | Get transactions |
| POST | `/api/transactions` | Add transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/categories` | Get categories |
| GET | `/api/budgets` | Get budgets |
| POST | `/api/budgets` | Create budget |
| GET | `/api/insights` | AI financial insights |

---

# 🚀 Deployment

### Frontend

- Vercel

### Backend

- Render

### Database

- Neon PostgreSQL

---

# 🔒 Security

- JWT Authentication
- Password Hashing (bcrypt)
- Environment Variables
- Protected Routes
- Secure PostgreSQL Connection

---

# 📈 Future Improvements

- Export reports as PDF/CSV
- Recurring transactions
- Multi-currency support
- Email notifications
- Dark mode
- OCR receipt scanning
- Voice expense logging
- Multi-user collaboration

---

# 👨‍💻 Author

**Mehak Chauhan**

GitHub: https://github.com/mehak-ui

LinkedIn: https://www.linkedin.com/in/your-linkedin/

---

# ⭐ Support

If you found this project helpful, consider giving it a ⭐ on GitHub!

---

## License

This project is licensed under the MIT License.
