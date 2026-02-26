# Govt IT Job Tracker – Automated Job Monitoring System

An automated full-stack application that continuously monitors government job portals, filters IT-related jobs based on eligibility, and displays them in a real-time dashboard.

Built to solve a real problem: **finding relevant government IT jobs without manually checking dozens of websites every day.**

---

## 🚀 Features

- 🔎 **Automated Job Scraping**
  - Scrapes multiple government job aggregator websites
  - Verifies job pages to detect real IT/Computer Science jobs

- 🎯 **Eligibility Filtering**
  - Skips jobs requiring GATE
  - Skips jobs requiring ≥65% marks
  - Removes expired jobs automatically

- 🧹 **Automatic Cleanup**
  - Deletes expired or irrelevant jobs from database
  - Keeps only actionable opportunities

- 📊 **React Dashboard**
  - View latest jobs
  - Clickable job links
  - Created date tracking

- ☁️ **Cloud Database**
  - Supabase PostgreSQL backend
  - Sequelize ORM integration

- ⚡ **Automation Ready**
  - Can run via GitHub Actions cron
  - Supports multiple RSS sources

---

## 🛠 Tech Stack

### Backend

- Node.js
- Express
- Sequelize ORM
- Supabase PostgreSQL
- Axios + Cheerio (Web Scraping)
- RSS Parser

### Frontend

- React + Vite
- Axios

### DevOps

- GitHub Actions (optional cron)
- Vercel / Render deployment ready

---

## 📂 Project Structure

```
govt-it-job-tracker/
│
├── backend/
│   ├── src/
│   │   ├── models/
│   │   ├── scrappers/
│   │   ├── routes/
│   │   ├── services/
│   │   └── config/
│   └── server.js
│
├── frontend/
│   └── React dashboard
│
└── .github/workflows/
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone Repo

```
git clone https://github.com/yourusername/govt-it-job-tracker.git
cd govt-it-job-tracker
```

---

### 2️⃣ Backend Setup

```
cd backend
npm install
```

Create `.env`

```
DB_HOST=
DB_USER=
DB_PASS=
DB_NAME=
DB_PORT=5432
```

Run server:

```
node server.js
```

---

### 3️⃣ Frontend Setup

```
cd frontend
npm install
npm run dev
```

Open → http://localhost:5173

---

## 🧠 How It Works

1. Scraper checks multiple RSS/job sources
2. Opens each job page
3. Filters IT-eligible jobs
4. Saves to Supabase
5. React dashboard displays latest jobs

Expired jobs are automatically removed.

---

## 📌 Future Improvements

- Telegram / Email alerts
- Deadline countdown timer
- Mark job as applied
- Official website scrapers
- AI-based job relevance scoring

---

## 🎯 Why I Built This

Searching for government IT jobs manually was inefficient and error-prone.

This system automates the process and ensures only **eligible, relevant, and active jobs** are shown.

---

## 📜 License

MIT License

---

## ⭐ If you find this useful, give it a star!
