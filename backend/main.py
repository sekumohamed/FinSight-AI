from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import os
import sqlite3
import json

load_dotenv()

app = FastAPI()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "https://finsight-ai-ivory-iota.vercel.app",
    "https://*.vercel.app"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

def init_db():
    conn = sqlite3.connect("transactions.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        date TEXT,
        merchant TEXT,
        amount REAL,
        category TEXT,
        status TEXT
    )''')
    c.execute("SELECT COUNT(*) FROM transactions")
    if c.fetchone()[0] == 0:
        transactions = [
            ("TXN001", "2026-05-01", "Swiggy", 4500, "Food", "completed"),
            ("TXN002", "2026-05-03", "Amazon", 12999, "Shopping", "completed"),
            ("TXN003", "2026-05-05", "Netflix", 649, "Entertainment", "completed"),
            ("TXN004", "2026-05-08", "Zomato", 850, "Food", "completed"),
            ("TXN005", "2026-05-10", "Unknown Merchant", 15000, "Unknown", "completed"),
            ("TXN006", "2026-05-12", "Uber", 320, "Transport", "completed"),
            ("TXN007", "2026-05-14", "BigBasket", 2300, "Groceries", "completed"),
            ("TXN008", "2026-05-15", "Unknown Merchant", 8999, "Unknown", "completed"),
        ]
        c.executemany("INSERT INTO transactions VALUES (?,?,?,?,?,?)", transactions)
    conn.commit()
    conn.close()

init_db()

def get_transactions():
    conn = sqlite3.connect("transactions.db")
    c = conn.cursor()
    c.execute("SELECT * FROM transactions ORDER BY date DESC")
    rows = c.fetchall()
    conn.close()
    return [{"id":r[0],"date":r[1],"merchant":r[2],"amount":r[3],"category":r[4],"status":r[5]} for r in rows]

SYSTEM_PROMPT = """You are FinSight AI, an advanced financial customer care assistant for an Indian bank.

You have access to the user's recent transactions:
{transactions}

SENTIMENT DETECTION — analyze every message and detect one of these states:
- FRUSTRATED: user uses words like angry, ridiculous, unacceptable, worst, cheated, fraud, stolen, exclamation marks, or ALL CAPS
- CONFUSED: user asks what, how, why, I don't understand, repeats questions
- URGENT: user mentions immediately, right now, emergency, block, stolen card
- CALM: normal tone

RESPONSE RULES based on sentiment:
- FRUSTRATED: Start with "I completely understand your frustration and I sincerely apologize." Be extra empathetic. Use short sentences. Escalate faster.
- CONFUSED: Use simple language. Break into numbered steps. Avoid jargon.
- URGENT: Start with "I am treating this as high priority." Give immediate action steps first.
- CALM: Professional and friendly tone.

Your capabilities:
1. TRANSACTION DISPUTES — Help users dispute unauthorized or incorrect charges. Classify dispute type as fraud, error, or duplicate.
2. FRAUD DETECTION — Flag suspicious transactions, especially Unknown Merchant entries.
3. LOAN AND EMI CALCULATIONS — Calculate EMI and interest amounts.
4. ACCOUNT QUERIES — Answer questions about balance, limits, fees.
5. SMART FAQ — Answer banking policy questions clearly.

Rules:
- Format amounts in Indian Rupees
- For disputes always ask: which transaction, what happened, when noticed
- Flag Unknown Merchant transactions as suspicious
- Keep responses concise and clear
- Never make up transaction data not in the list above"""

class ChatRequest(BaseModel):
    message: str
    history: list = []

def detect_language(text):
    tamil_chars = set("அஆஇஈஉஊஏஐஒஓஔகசடதநபமயரலவழளறன")
    hindi_chars = set("अआइईउऊएऐओऔकखगचछजटडतथदनपफबमयरलवशषसह")
    if any(c in tamil_chars for c in text):
        return "tamil"
    if any(c in hindi_chars for c in text):
        return "hindi"
    return "english"

@app.post("/chat")
async def chat(req: ChatRequest):
    transactions = get_transactions()
    txn_summary = json.dumps(transactions, indent=2)

    lang = detect_language(req.message)

    lang_instruction = ""
    if lang == "tamil":
        lang_instruction = "\n\nIMPORTANT: The user is writing in Tamil. Respond entirely in Tamil language."
    elif lang == "hindi":
        lang_instruction = "\n\nIMPORTANT: The user is writing in Hindi. Respond entirely in Hindi language."

    user_turn_count = sum(1 for m in req.history if m.get("role") == "user")

    escalation_instruction = ""
    if user_turn_count >= 3:
        escalation_instruction = """

ESCALATION RULE: The user has been in this conversation for several turns.
If the issue is still not resolved, add this exact line at the end of your response:
---
ESCALATE: Would you like me to connect you to a live human agent who can resolve this immediately? Type YES to connect."""

    system = SYSTEM_PROMPT.format(transactions=txn_summary) + lang_instruction + escalation_instruction
    messages = [{"role": "system", "content": system}] + req.history + [{"role": "user", "content": req.message}]

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=1000
    )

    reply = response.choices[0].message.content
    escalate = "ESCALATE:" in reply

    # Explainability — detect what sources were used
    sources = []
    msg_lower = req.message.lower()
    if any(word in msg_lower for word in ["transaction", "charge", "payment", "merchant", "txn", "dispute", "fraud"]):
        sources.append("Transaction Database")
    if any(word in msg_lower for word in ["emi", "loan", "interest", "tenure", "calculate"]):
        sources.append("EMI Calculator")
    if any(word in msg_lower for word in ["policy", "limit", "fee", "charges", "account", "balance", "block"]):
        sources.append("Banking Knowledge Base")
    if not sources:
        sources.append("General Financial Knowledge")

    # Confidence score based on keyword match strength
    keyword_matches = 0
    all_keywords = ["transaction", "charge", "payment", "merchant", "txn", "dispute", 
                    "fraud", "emi", "loan", "interest", "balance", "account", "block",
                    "unknown", "unauthorized", "refund", "credit", "debit"]
    for word in all_keywords:
        if word in msg_lower:
            keyword_matches += 1
    
    if keyword_matches >= 3:
        confidence = 95
    elif keyword_matches == 2:
        confidence = 88
    elif keyword_matches == 1:
        confidence = 78
    else:
        confidence = 65

    # Smart suggestions based on context
    suggestions = []
    if "dispute" in msg_lower or "transaction" in msg_lower:
        suggestions = ["Show all my transactions", "Block my card", "Talk to human agent"]
    elif "fraud" in msg_lower or "unknown" in msg_lower:
        suggestions = ["Dispute this transaction", "Block my card immediately", "Show fraud alerts"]
    elif "emi" in msg_lower or "loan" in msg_lower:
        suggestions = ["Calculate EMI for 10 lakhs", "What is the interest rate?", "Prepayment options"]
    elif "balance" in msg_lower or "account" in msg_lower:
        suggestions = ["Show recent transactions", "Download statement", "Check spending limits"]
    else:
        suggestions = ["I have a dispute", "Check fraud alerts", "Calculate my EMI"]

    return {
        "reply": reply,
        "language": lang,
        "escalate": escalate,
        "sources": sources,
        "suggestions": suggestions,
        "confidence": confidence
    }
disputes_db = {}

@app.post("/dispute")
async def create_dispute(data: dict):
    import random
    import datetime
    dispute_id = "DIS-" + str(random.randint(100000, 999999))
    disputes_db[dispute_id] = {
        "id": dispute_id,
        "transaction_id": data.get("transaction_id"),
        "merchant": data.get("merchant"),
        "amount": data.get("amount"),
        "status": "raised",
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "steps": [
            {"label": "Dispute Raised", "done": True},
            {"label": "Under Review", "done": False},
            {"label": "Decision Pending", "done": False},
            {"label": "Resolved", "done": False}
        ]
    }
    return disputes_db[dispute_id]

@app.get("/dispute/{dispute_id}")
async def get_dispute(dispute_id: str):
    return disputes_db.get(dispute_id, {"error": "Not found"})

@app.get("/analytics")
async def analytics():
    transactions = get_transactions()
    category_totals = {}
    for t in transactions:
        cat = t["category"]
        category_totals[cat] = category_totals.get(cat, 0) + t["amount"]
    return {
        "category_totals": category_totals,
        "total_spent": sum(t["amount"] for t in transactions),
        "transaction_count": len(transactions),
        "avg_transaction": sum(t["amount"] for t in transactions) / len(transactions) if transactions else 0
    }

@app.get("/transactions")
async def transactions():
    return get_transactions()

@app.get("/")
async def root():
    return {"status": "FinSight AI backend running"}