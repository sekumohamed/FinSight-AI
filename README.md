# FinSight AI — Intelligent Financial Customer Care Bot

> Built for FlowZint AI Hackathon 2026 | Category: Customer Care Bot

🔗 **Live Demo:** https://finsight-ai-ivory-iota.vercel.app

---

## What is FinSight AI?

FinSight AI is an advanced AI-powered financial customer care bot built for Indian banking customers. It goes beyond a basic chatbot — it proactively detects fraud, handles disputes, calculates EMIs, and supports multilingual conversations.

---

## Features

| Feature | Description |
|---|---|
| Proactive Fraud Detection | Scans transactions on load and alerts users automatically |
| Transaction Dispute Management | Raise disputes with a visual timeline tracker |
| Sentiment Detection | Detects frustrated/urgent users and adapts tone |
| Multilingual Support | Responds in Tamil and Hindi automatically |
| Smart Escalation | Connects to live human agent after unresolved issues |
| EMI Calculator | Interactive loan calculator with live sliders |
| Spending Analytics | Visual spending breakdown by category |
| Explainability Panel | Shows which data source was used per response |
| AI Confidence Score | Transparency score on every bot response |
| Voice Input | Speak queries using browser microphone |
| Chat Export | Download full conversation as text file |
| Demo Mode | Auto-plays full feature showcase in 60 seconds |

---

## Tech Stack

- **Frontend:** React + Vite, deployed on Vercel
- **Backend:** FastAPI + Python, deployed on Render
- **AI Model:** Groq API with LLaMA 3.3 70B
- **Database:** SQLite
- **Languages Supported:** English, Tamil, Hindi

---

## Running Locally

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure
```
FinSight-AI/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── Procfile
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
├── .gitignore
└── README.md 

---

Built by **Seku Mohamed Hanifa A** for FlowZint AI Hackathon 2026