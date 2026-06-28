<div align="center">

<img src="public/img/logo fitt.png" alt="FitAlchemy Logo" width="100"/>

# 💪 FitAlchemy
### AI-Powered Fitness & Wellness Management Platform

[![Node.js](https://img.shields.io/badge/Node.js-22.x-68a063?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479a1?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952b3?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![Railway](https://img.shields.io/badge/Deployed-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/)
[![License](https://img.shields.io/badge/License-ISC-green?style=for-the-badge)](LICENSE)

**A comprehensive web-based wellness platform combining workout planning, meal tracking, AI coaching, and automated health status evaluation — all in one system.**

[🚀 Live Demo](https://fitalchemy-exercise-nutrition-and-mental-wellnes-production.up.railway.app) · [📋 Features](#-features) · [⚙️ Installation](#️-installation) · [📁 Project Structure](#-project-structure) · [🛠️ Tech Stack](#️-tech-stack)

---

</div>

## 📌 About

**FitAlchemy** is a Final Year Project (FYP) developed for the Faculty of Computer Science and Mathematics (FSKM), Universiti Malaysia Terengganu (UMT). It addresses the common problem of fragmented fitness applications by unifying workout planning, meal tracking, motivational quotes, AI-powered coaching, and automated health evaluation into a single, cohesive platform.

> 🎓 **FYP — Batch 2025/2026 | FSKM, UMT**

---

## ✨ Features

### 🏋️ Workout Planning
- Browse thousands of exercises powered by the **Wger API**
- Filter by muscle category (Arms, Chest, Legs, Back, Shoulders, Abs, etc.)
- View exercise tutorials and descriptions
- Add exercises to personalised weekly routine with calendar scheduling
- Track completion status with visual B&W "done" effect

### 🍽️ Meal Planning
- Discover thousands of recipes via **Spoonacular API**
- Full nutritional information (calories, protein, carbs, fat)
- Plan meals by day and meal type (Breakfast, Lunch, Dinner, Snack)
- Save favourite recipes and view complete ingredients + instructions

### 🤖 CoachAlchemy AI Chatbot
- Rule-based AI coach with **30+ intelligent intent categories**
- Supports **English**, **Bahasa Malaysia**, and **Manglish**
- Available as a floating drawer on **every page**
- Covers: workout tips, meal advice, emotional support, sleep, hydration, injury, supplements, Islamic fitness, and more
- Chat history persists across all pages via localStorage
- All interactions logged to database for health metrics analysis

### ✨ Quote Assistant
- Mood-based quote discovery using **API Ninjas**
- 9 mood categories (Sad, Stressed, Morning, Lazy, Happy, Focused, Active, Reflective, Brave)
- Quick topic chips and free-text search
- Save favourite quotes with persistent floating drawer

### 📊 Automated Health Status
Three-pillar automated wellness evaluation:
| Pillar | Method | Statuses |
|--------|--------|----------|
| **Physical** | BMI calculation from profile | Underweight / Normal / Overweight / Obese |
| **Fitness** | Workout activity vs WHO targets | Sedentary / Lightly Active / Active / Very Active |
| **Mental** | Sentiment analysis of chatbot logs | Low Mood / Neutral / Motivated |

### 📈 Progress Reports
- Daily and weekly activity tracking
- WHO 150 min/week activity benchmark
- Calorie burn vs calorie intake visualisation
- Fat ratio tracking
- Interactive weekly streak calendar

### 🌐 Landing Page
- Mobile-responsive showcase page
- Animated particle background
- CoachAlchemy live chat simulation
- QR code destination for poster presentations

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 22.x |
| **Framework** | Express.js 5.x (MVC Architecture) |
| **Database** | MySQL 8.0 (mysql2/promise) |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **UI Framework** | Bootstrap 5.3, Bootstrap Icons 1.11 |
| **Fonts** | Google Fonts (Merriweather, Merriweather Sans, Bebas Neue) |
| **External APIs** | Wger API, Spoonacular API, API Ninjas |
| **Email** | Nodemailer (Gmail SMTP) |
| **Auth** | bcrypt password hashing |
| **Deployment** | Railway (App + MySQL) |

---

## 📁 Project Structure

```
FitAlchemylatestMVC/
│
├── 📁 config/
│   ├── database.js          # MySQL connection pool (supports Railway SSL)
│   ├── email.js             # Nodemailer Gmail SMTP config
│   └── resetCodes.js        # In-memory password reset code store
│
├── 📁 controllers/
│   ├── AuthController.js         # Register, login, logout, forgot password
│   ├── CoachAlchemyController.js # AI chatbot — 30+ intents, EN/MY/Manglish
│   ├── ExerciseController.js     # Wger API integration + image proxy
│   ├── FavoritesController.js    # Save/retrieve/delete favorite quotes
│   ├── HealthStatusController.js # BMI + fitness + sentiment analysis
│   ├── MealController.js         # Spoonacular API recipe search
│   ├── MealPlanController.js     # CRUD meal plan management
│   ├── QuoteController.js        # API Ninjas quote fetching + batch cache
│   ├── ReportController.js       # Daily/weekly progress reports
│   └── RoutineController.js      # CRUD workout routine management
│
├── 📁 models/
│   ├── ChatbotLog.js    # Save/retrieve chatbot conversation logs
│   ├── Favorites.js     # Favorites JSON storage per user
│   ├── HealthStatus.js  # Health status CRUD
│   ├── MealPlan.js      # Meal plan DB operations
│   ├── Routine.js       # Workout routine DB operations
│   └── User.js          # User profile CRUD
│
├── 📁 routes/
│   ├── authRoutes.js       # /api/register, /api/login, /api/forgot-password
│   ├── coachRoutes.js      # /api/coach (POST)
│   ├── exerciseRoutes.js   # /api/exercises
│   ├── favoritesRoutes.js  # /api/favorites
│   ├── healthRoutes.js     # /api/health-status
│   ├── mealPlanRoutes.js   # /api/mealplan
│   ├── mealRoutes.js       # /api/recipes/search, /api/recipes/recommend
│   ├── quoteRoutes.js      # /api/quote, /api/quote/batch, /api/chatlog
│   ├── reportRoutes.js     # /api/report/daily, /api/report/weekly
│   └── routineRoutes.js    # /api/routine
│
├── 📁 views/
│   ├── landing.html     # Public landing page (QR destination)
│   ├── login.html       # Login & registration
│   ├── dashboard.html   # Main dashboard
│   ├── wger.html        # Workout planning page
│   ├── spoonacular.html # Meal planning page
│   ├── quote.html       # Quote assistant page
│   ├── report.html      # Progress reports page
│   └── profile.html     # User profile management
│
├── 📁 public/
│   ├── img/             # Static images (logo, backgrounds)
│   └── exercise-images/ # Cached exercise images from Wger
│
├── 📄 index.js          # Express app entry point
├── 📄 DB.sql            # Full database schema (local)
├── 📄 DB_railway.sql    # Railway-compatible schema (no DROP DATABASE)
├── 📄 package.json      # Dependencies
└── 📄 .gitignore        # Ignores .env and node_modules
```

---

## 🗄️ Database Schema

```sql
fitalchemy_db
├── users           — Profile, credentials, fitness goal, dietary preference
├── routines        — Saved workout exercises (planned_date, is_completed)
├── meal_plans      — Saved recipes (macros, planned_date, is_completed)
├── chatbot_logs    — CoachAlchemy conversation history (for sentiment analysis)
├── health_status   — Physical / Fitness / Mental status per user
├── weekly_reports  — Aggregated weekly activity data
└── favorites       — Saved quotes (JSON format)
```

---

## ⚙️ Installation

### Prerequisites
- Node.js 18+ 
- MySQL 8.0
- npm

### 1. Clone the repository
```bash
git clone https://github.com/oneeeeeee-aseli/FitAlchemy-Exercise-Nutrition-and-Mental-wellness-Management-Platform.git
cd FitAlchemy-Exercise-Nutrition-and-Mental-wellness-Management-Platform
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the root directory:
```env
PORT=3000

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=fitalchemy_db
DB_SSL=false

# API Keys
SPOONACULAR_API_KEY=your_spoonacular_key
API_NINJAS_KEY=your_api_ninjas_key

# Email (Gmail SMTP)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

### 4. Set up the database
```bash
# In MySQL Workbench or CLI, run:
source DB.sql
```

### 5. Run the application
```bash
# Development
npm run dev

# Production
npm start
```

### 6. Open in browser
```
http://localhost:3000
```

---

## 🌐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register new user |
| POST | `/api/login` | User login |
| POST | `/api/forgot-password` | Send reset email |
| POST | `/api/reset-password` | Reset password |
| GET | `/api/user?userId=` | Get user profile |
| PUT | `/api/user` | Update profile |

### Workout
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/exercises` | Fetch exercises (Wger API) |
| GET | `/api/routine?userId=` | Get user routine |
| POST | `/api/routine` | Save routine |

### Meal
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recipes/search` | Search recipes (Spoonacular) |
| GET | `/api/mealplan?userId=` | Get meal plan |
| POST | `/api/mealplan` | Save meal plan |

### AI Coach
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/coach` | Send message to CoachAlchemy |
| GET | `/api/chatlog?userId=` | Get chat history |
| POST | `/api/chatlog/save` | Save chat log |
| DELETE | `/api/chatlog` | Clear chat history |

### Health & Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health-status?userId=` | Get health status |
| POST | `/api/health-status/evaluate` | Re-evaluate health status |
| GET | `/api/report/daily` | Daily progress report |
| GET | `/api/report/weekly` | Weekly progress report |

### Quotes & Favorites
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quote/batch` | Fetch quotes by category |
| GET | `/api/favorites?userId=` | Get favorites |
| POST | `/api/favorites` | Save favorites |

---

## 🚀 Deployment (Railway)

This project is deployed on Railway with:
- **Web Service** — Node.js app (auto-deploy from GitHub)
- **MySQL Database** — Railway managed MySQL

### Environment Variables (Railway)
Set these in your Railway service Variables tab:

```
DB_HOST        → reference MYSQLHOST
DB_PORT        → reference MYSQLPORT  
DB_USER        → reference MYSQLUSER
DB_PASS        → reference MYSQLPASSWORD
DB_NAME        → reference MYSQLDATABASE
DB_SSL         → false
SPOONACULAR_API_KEY → your key
API_NINJAS_KEY → your key
EMAIL_USER     → your gmail
EMAIL_PASS     → your app password
PORT           → 3000
```

### Auto-deploy workflow
```bash
git add .
git commit -m "your message"
git push
# Railway auto-redeploys in ~1-2 minutes
```

---

## 👨‍💻 Developer

**Wan Aimi Firdaus bin Wan Azarie**
- 📧 [wanaimi04@gmail.com](mailto:wanaimi04@gmail.com)
- 📸 [@wannnkt._](https://www.instagram.com/wannnkt._)
- 🎥 [YouTube](https://www.youtube.com/@WANAIMIFIRDAUSBINWANAZARIE)

---

## 🏫 Academic Info

| | |
|--|--|
| **Project** | Final Year Project (FYP) |
| **Institution** | Universiti Malaysia Terengganu (UMT) |
| **Faculty** | Computer Science and Mathematics (FSKM) |
| **Year** | 2025/2026 |
| **Supervisor** | Ts. Dr. Sharifah Mashita Syed Mohamad |

---

<div align="center">

**Built with ❤️ for FYP | FSKM, UMT 2026**

⭐ Star this repo if you find it useful!

</div>
