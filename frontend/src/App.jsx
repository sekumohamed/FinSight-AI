import { useState, useEffect, useRef } from "react";
import axios from "axios";

function EMICalculator() {
  const [principal, setPrincipal] = useState(500000);
  const [rate, setRate] = useState(10);
  const [tenure, setTenure] = useState(12);
  const monthlyRate = rate / 12 / 100;
  const emi = monthlyRate === 0 ? principal / tenure :
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
    (Math.pow(1 + monthlyRate, tenure) - 1);
  const total = emi * tenure;
  const interest = total - principal;
  const fmt = (n) => "Rs." + Math.round(n).toLocaleString("en-IN");
  return (
    <div style={{ padding:"12px", borderTop:"1px solid #1e293b" }}>
      <div style={{ color:"#64748b", fontSize:"11px", fontWeight:"600", marginBottom:"10px", letterSpacing:"0.05em" }}>EMI CALCULATOR</div>
      <div style={{ marginBottom:"10px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
          <span style={{ color:"#94a3b8", fontSize:"11px" }}>Loan amount</span>
          <span style={{ color:"white", fontSize:"11px", fontWeight:"500" }}>{fmt(principal)}</span>
        </div>
        <input type="range" min="10000" max="5000000" step="10000" value={principal}
          onChange={e => setPrincipal(Number(e.target.value))}
          style={{ width:"100%", accentColor:"#3b82f6" }}/>
      </div>
      <div style={{ marginBottom:"10px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
          <span style={{ color:"#94a3b8", fontSize:"11px" }}>Interest rate</span>
          <span style={{ color:"white", fontSize:"11px", fontWeight:"500" }}>{rate}%</span>
        </div>
        <input type="range" min="1" max="24" step="0.5" value={rate}
          onChange={e => setRate(Number(e.target.value))}
          style={{ width:"100%", accentColor:"#3b82f6" }}/>
      </div>
      <div style={{ marginBottom:"12px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
          <span style={{ color:"#94a3b8", fontSize:"11px" }}>Tenure (months)</span>
          <span style={{ color:"white", fontSize:"11px", fontWeight:"500" }}>{tenure}m</span>
        </div>
        <input type="range" min="3" max="360" step="3" value={tenure}
          onChange={e => setTenure(Number(e.target.value))}
          style={{ width:"100%", accentColor:"#3b82f6" }}/>
      </div>
      <div style={{ background:"#1e293b", borderRadius:"8px", padding:"10px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
          <span style={{ color:"#64748b", fontSize:"11px" }}>Monthly EMI</span>
          <span style={{ color:"#3b82f6", fontSize:"13px", fontWeight:"600" }}>{fmt(emi)}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
          <span style={{ color:"#64748b", fontSize:"11px" }}>Total interest</span>
          <span style={{ color:"#f97316", fontSize:"11px", fontWeight:"500" }}>{fmt(interest)}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:"#64748b", fontSize:"11px" }}>Total payment</span>
          <span style={{ color:"#22c55e", fontSize:"11px", fontWeight:"500" }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I am FinSight AI. I can help you with transaction disputes, fraud alerts, EMI calculations, and account queries. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [showTxns, setShowTxns] = useState(true);
  const [showEMI, setShowEMI] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [listening, setListening] = useState(false);
  const [disputes, setDisputes] = useState([]);
  const [showDisputes, setShowDisputes] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const bottomRef = useRef(null);
  const alertShown = useRef(false);

  useEffect(() => {
    axios.get("https://finsight-ai-tclm.onrender.com/transactions").then(r => {
      const data = r.data;
      setTransactions(data);
      axios.get("https://finsight-ai-tclm.onrender.com/analytics").then(r => setAnalytics(r.data));
      if (alertShown.current) return;
      alertShown.current = true;
      const suspicious = data.filter(t => t.category === "Unknown" || t.amount > 10000);
      if (suspicious.length > 0) {
        const alertMsg = suspicious.map(t =>
          `TXN ${t.id} — ${t.merchant} — Rs.${t.amount.toLocaleString()} on ${t.date}`
        ).join("\n");
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Fraud Alert: I have detected ${suspicious.length} suspicious transaction(s) on your account:\n\n${alertMsg}\n\nWould you like me to help you dispute any of these?`,
          type: "alert"
        }]);
      }
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported. Please use Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.start();
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
  };

  const exportChat = () => {
    const lines = messages.map(m => {
      const role = m.role === "user" ? "You" : "FinSight AI";
      return `[${role}]\n${m.content}\n`;
    }).join("\n---\n\n");

    const content = `FinSight AI - Conversation Export
  Account: Seku Mohamed Hanifa A
  Account No: XXXX XXXX XXXX 4821
  Date: ${new Date().toLocaleString("en-IN")}
  ${"=".repeat(50)}

  ${lines}
  ${"=".repeat(50)}
  FinSight AI - FlowZint AI Hackathon 2026 - Powered by Groq`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finsight-chat-${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const runDemo = async () => {
    if (demoRunning) return;
    setDemoRunning(true);
    setDemoMode(true);
    setShowTxns(true);

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    const sendDemoMessage = async (message, currentMsgs) => {
      const userMsg = { role: "user", content: message };
      let resolvedMsgs;
      const newMsgs = await new Promise(resolve => {
        setMessages(prev => {
          resolvedMsgs = [...prev, userMsg];
          resolve(resolvedMsgs);
          return resolvedMsgs;
        });
      });
      setInput("");
      setLoading(true);
      try {
        const res = await axios.post("https://finsight-ai-tclm.onrender.com/chat", {
          message,
          history: newMsgs.slice(0,-1).map(m => ({ role: m.role, content: m.content }))
        });
        await delay(600);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: res.data.reply,
          sources: res.data.sources || [],
          suggestions: res.data.suggestions || [],
          confidence: res.data.confidence || null
        }]);
      } catch {
        setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong." }]);
      }
      setLoading(false);
    };

    // Step 1 — Fraud detection
    await delay(1000);
    setInput("Check my account for fraud alerts");
    await delay(800);
    await sendDemoMessage("Check my account for fraud alerts");
    await delay(2500);

    // Step 2 — Transaction dispute
    setInput("I did not make the Unknown Merchant charge of Rs.15,000");
    await delay(800);
    await sendDemoMessage("I did not make the Unknown Merchant charge of Rs.15,000");
    await delay(2500);

    // Step 3 — Show dispute tracker
    await delay(500);
    setShowDisputes(true);
    await raiseDispute("TXN005", "Unknown Merchant", 15000);
    await delay(2000);

    // Step 4 — EMI calculation
    setShowDisputes(false);
    setShowEMI(true);
    setInput("Calculate EMI for a home loan of 50 lakhs at 8.5% for 20 years");
    await delay(800);
    await sendDemoMessage("Calculate EMI for a home loan of 50 lakhs at 8.5% for 20 years");
    await delay(2500);

    // Step 5 — Spending analytics
    setShowEMI(false);
    setShowAnalytics(true);
    await delay(1000);
    setInput("Show me my spending breakdown by category");
    await delay(800);
    await sendDemoMessage("Show me my spending breakdown by category");
    await delay(2500);

    // Step 6 — Sentiment detection frustrated
    setShowAnalytics(false);
    setInput("This is RIDICULOUS! Someone stole money from my account!");
    await delay(800);
    await sendDemoMessage("This is RIDICULOUS! Someone stole money from my account!");
    await delay(2500);

    // Step 7 — Tamil multilingual
    setInput("என் கணக்கில் இருந்து பணம் போய்விட்டது");
    await delay(800);
    await sendDemoMessage("என் கணக்கில் இருந்து பணம் போய்விட்டது");
    await delay(2500);

    // Step 9 — Escalation
    setInput("YES");
    await delay(800);
    await sendDemoMessage("YES");
    await delay(2000);

    // Step 10 — Export chat
    await delay(1000);
    exportChat();

    setDemoRunning(false);
  };


  const raiseDispute = async (transaction_id, merchant, amount) => {
  try {
    const res = await axios.post("https://finsight-ai-tclm.onrender.com/dispute", {
      transaction_id, merchant, amount
    });
    setDisputes(prev => [...prev, res.data]);
    setShowDisputes(true);
    setMessages(prev => [...prev, {
      role: "assistant",
      content: `Dispute ${res.data.id} has been raised for ${merchant} — Rs.${amount.toLocaleString()}. You can track the status in the Dispute Tracker panel.`,
      sources: ["Transaction Database"]
    }]);
  } catch {
    console.error("Failed to raise dispute");
  }
};

  const send = async () => {
    if (!input.trim()) return;
    if (input.trim().toUpperCase() === "YES" && escalating) {
      const refNumber = "REF-" + Math.floor(Math.random()*900000+100000);
      setMessages(prev => [...prev,
        { role: "user", content: "YES" },
        { role: "assistant", content: `Connecting you to a live agent now. Your reference number is ${refNumber}. Please hold on...`, type: "agent" }
      ]);
      setInput("");
      setEscalating(false);
      setAgentMode(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Hello! I am Priya from FinSight Bank support team. I can see your reference number ${refNumber} and your complete conversation history. I understand you have a concern about suspicious transactions on your account. I am here to help you resolve this right away. Could you please confirm which specific transaction you want to dispute first?`,
          type: "agent"
        }]);
      }, 2000);
      return;
    }
    const userMsg = { role: "user", content: input };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);
    if (agentMode) {
      const agentReplies = [
        "I have noted your concern. I am now raising an urgent dispute case for this transaction. You will receive a confirmation SMS within 10 minutes.",
        "I have blocked the suspicious transaction and initiated a refund process. The amount will be credited back within 5-7 working days.",
        "I have escalated this to our fraud investigation team. Your case number is CASE-" + Math.floor(Math.random()*90000+10000) + ". You will be contacted within 24 hours.",
        "I have verified your account details. The transaction has been flagged as unauthorized and a chargeback has been initiated.",
        "Is there anything else I can help you with regarding your account security?"
      ];
      const reply = agentReplies[Math.floor(Math.random() * agentReplies.length)];
      setTimeout(() => {
        setMessages([...newHistory, {
          role: "assistant",
          content: reply,
          type: "agent"
        }]);
        setLoading(false);
      }, 1000);
      return;
    }
    try {
      const res = await axios.post("https://finsight-ai-tclm.onrender.com/chat", {
        message: input,
        history: messages.map(m => ({ role: m.role, content: m.content }))
      });
      if (res.data.escalate) setEscalating(true);
      setMessages([...newHistory, {
      role: "assistant",
      content: res.data.reply,
      sources: res.data.sources || [],
      suggestions: res.data.suggestions || [],
      confidence: res.data.confidence || null
    }]);
    } catch {
      setMessages([...newHistory, { role: "assistant", content: "Something went wrong. Please try again." }]);
    }
    setLoading(false);
  };

  const isSuspicious = (t) => t.category === "Unknown" || t.amount > 10000;

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter', sans-serif", background:"#f1f5f9" }}>
      <div style={{ width:"272px", background:"#0f172a", display:"flex", flexDirection:"column", flexShrink:0, overflowY:"auto" }}>
        <div style={{ padding:"18px 16px", borderBottom:"1px solid #1e293b" }}>
  <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px" }}>
    <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:"#3b82f6", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"700", color:"white", fontSize:"15px" }}>F</div>
    <div>
      <div style={{ color:"white", fontWeight:"600", fontSize:"14px" }}>FinSight AI</div>
      <div style={{ color:"#64748b", fontSize:"11px" }}>Financial Assistant</div>
    </div>
  </div>
  <div style={{ background:"linear-gradient(135deg, #1d4ed8, #3b82f6)", borderRadius:"12px", padding:"14px", position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute", top:"-20px", right:"-20px", width:"80px", height:"80px", borderRadius:"50%", background:"rgba(255,255,255,0.05)" }}/>
    <div style={{ position:"absolute", bottom:"-30px", right:"10px", width:"100px", height:"100px", borderRadius:"50%", background:"rgba(255,255,255,0.05)" }}/>
    <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.6)", letterSpacing:"0.1em", marginBottom:"8px" }}>SAVINGS ACCOUNT</div>
    <div style={{ fontSize:"13px", color:"white", fontWeight:"600", marginBottom:"2px" }}>Seku Mohamed Hanifa A</div>
    <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.7)", marginBottom:"12px", letterSpacing:"0.05em" }}>XXXX XXXX XXXX 4821</div>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
      <div>
        <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.6)", marginBottom:"2px" }}>AVAILABLE BALANCE</div>
        <div style={{ fontSize:"16px", color:"white", fontWeight:"700" }}>Rs.2,45,830</div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.6)", marginBottom:"2px" }}>IFSC</div>
        <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.8)" }}>SBIN0004821</div>
      </div>
    </div>
  </div>
</div>
        <div style={{ padding:"12px" }}>
          <div style={{ color:"#64748b", fontSize:"11px", fontWeight:"600", padding:"6px 4px", letterSpacing:"0.05em" }}>QUICK ACTIONS</div>
          {["I have a dispute", "Check fraud alerts", "Calculate my EMI", "What are my account limits"].map((q, i) => (
            <div key={i} onClick={() => setInput(q)}
              style={{ padding:"9px 12px", borderRadius:"8px", color:"#94a3b8", fontSize:"13px", cursor:"pointer", marginBottom:"2px" }}
              onMouseEnter={e => e.currentTarget.style.background="#1e293b"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              {q}
            </div>
          ))}
        </div>
        <div style={{ padding:"0 12px 8px" }}>
          <div onClick={() => setShowTxns(!showTxns)}
            style={{ padding:"9px 12px", borderRadius:"8px", background:"#1e293b", color:"#94a3b8", fontSize:"13px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
            <span>Transactions</span>
            <span style={{ background:"#ef4444", color:"white", borderRadius:"10px", padding:"1px 7px", fontSize:"10px" }}>
              {transactions.filter(isSuspicious).length} alerts
            </span>
          </div>
          <div onClick={() => setShowEMI(!showEMI)}
            style={{ padding:"9px 12px", borderRadius:"8px", background: showEMI ? "#1e3a5f" : "#1e293b", color: showEMI ? "#3b82f6" : "#94a3b8", fontSize:"13px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span>EMI Calculator</span>
            <span style={{ fontSize:"11px" }}>{showEMI ? "Hide" : "Show"}</span>
          </div>
        </div>
        <div onClick={() => setShowDisputes(!showDisputes)}
          style={{ padding:"9px 12px", borderRadius:"8px", background: showDisputes ? "#1e3a5f" : "#1e293b", color: showDisputes ? "#3b82f6" : "#94a3b8", fontSize:"13px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"6px" }}>
          <span>Dispute Tracker</span>
          <span style={{ background:"#3b82f6", color:"white", borderRadius:"10px", padding:"1px 7px", fontSize:"10px" }}>
            {disputes.length}
          </span>
        </div>
        {showEMI && <EMICalculator />}
        <div onClick={() => setShowAnalytics(!showAnalytics)}
          style={{ padding:"9px 12px", borderRadius:"8px", background: showAnalytics ? "#1e3a5f" : "#1e293b", color: showAnalytics ? "#3b82f6" : "#94a3b8", fontSize:"13px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"6px" }}>
          <span>Analytics</span>
          <span style={{ fontSize:"11px" }}>{showAnalytics ? "Hide" : "Show"}</span>
        </div>
          <div onClick={runDemo}
            style={{ margin:"12px", padding:"10px 12px", borderRadius:"8px", background: demoRunning ? "#1e3a5f" : "linear-gradient(135deg, #3b82f6, #8b5cf6)", color:"white", fontSize:"13px", cursor: demoRunning ? "not-allowed" : "pointer", textAlign:"center", fontWeight:"600" }}>
            {demoRunning ? "Demo running..." : "Run Demo Mode"}
          </div>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ background:"white", padding:"14px 20px", borderBottom:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ background:"white", padding:"14px 20px", borderBottom:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
              <div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:"600", color:"#0f172a", fontSize:"14px" }}>Financial Customer Care</div>
                  <div style={{ fontSize:"11px", color:"#64748b" }}> Multilingual</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", marginLeft:"auto", padding:"25px" }}>
                <button onClick={exportChat}
                  style={{ fontSize:"11px", padding:"5px 12px", borderRadius:"16px", background:"#f1f5f9", color:"#64748b", border:"1px solid #e2e8f0", cursor:"pointer", fontWeight:"500" }}>
                  Export Chat
                </button>
              </div>
            </div>
          </div>
          <div style={{ background:"#dcfce7", color:"#16a34a", fontSize:"12px", padding:"4px 12px", borderRadius:"20px", fontWeight:"500" }}>Live</div>
        </div>
        <div style={{ background:"#0f172a", padding:"8px 20px", display:"flex", gap:"24px", alignItems:"center", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#22c55e" }}/>
            <span style={{ fontSize:"11px", color:"#64748b" }}>Protected</span>
            <span style={{ fontSize:"13px", color:"#22c55e", fontWeight:"600" }}>
              Rs.{transactions.filter(t => t.category === "Unknown").reduce((a,t) => a + t.amount, 0).toLocaleString()}
            </span>
          </div>
          <div style={{ width:"1px", height:"16px", background:"#1e293b" }}/>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#3b82f6" }}/>
            <span style={{ fontSize:"11px", color:"#64748b" }}>Disputes raised</span>
            <span style={{ fontSize:"13px", color:"#3b82f6", fontWeight:"600" }}>{disputes.length}</span>
          </div>
          <div style={{ width:"1px", height:"16px", background:"#1e293b" }}/>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#ef4444" }}/>
            <span style={{ fontSize:"11px", color:"#64748b" }}>Fraud alerts</span>
            <span style={{ fontSize:"13px", color:"#ef4444", fontWeight:"600" }}>
              {transactions.filter(t => t.category === "Unknown" || t.amount > 10000).length}
            </span>
          </div>
          <div style={{ width:"1px", height:"16px", background:"#1e293b" }}/>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#f97316" }}/>
            <span style={{ fontSize:"11px", color:"#64748b" }}>Messages</span>
            <span style={{ fontSize:"13px", color:"#f97316", fontWeight:"600" }}>{messages.length}</span>
          </div>
          <div style={{ marginLeft:"auto", fontSize:"10px", color:"#334155" }}>
            
          </div>
        </div>

        {showTxns && (
          <div style={{ background:"white", borderBottom:"1px solid #e2e8f0", padding:"14px 20px", maxHeight:"200px", overflowY:"auto", flexShrink:0 }}>
            <div style={{ fontWeight:"600", fontSize:"12px", color:"#0f172a", marginBottom:"8px" }}>Recent Transactions</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
              <thead>
                <tr style={{ color:"#64748b" }}>
                  <th style={{ textAlign:"left", padding:"3px 8px" }}>Date</th>
                  <th style={{ textAlign:"left", padding:"3px 8px" }}>Merchant</th>
                  <th style={{ textAlign:"left", padding:"3px 8px" }}>Category</th>
                  <th style={{ textAlign:"right", padding:"3px 8px" }}>Amount</th>
                  <th style={{ textAlign:"center", padding:"3px 8px" }}>Status</th>
                  <th style={{ textAlign:"center", padding:"3px 8px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i} style={{ background: isSuspicious(t) ? "#fef2f2" : i%2===0 ? "#f8fafc" : "white" }}>
                    <td style={{ padding:"5px 8px", color:"#64748b" }}>{t.date}</td>
                    <td style={{ padding:"5px 8px", color:"#0f172a", fontWeight: isSuspicious(t) ? "600" : "400" }}>{t.merchant}</td>
                    <td style={{ padding:"5px 8px", color:"#64748b" }}>{t.category}</td>
                    <td style={{ padding:"5px 8px", textAlign:"right", color: isSuspicious(t) ? "#ef4444" : "#0f172a", fontWeight:"500" }}>Rs.{t.amount.toLocaleString()}</td>
                    <td style={{ padding:"5px 8px", textAlign:"center" }}>
                      {isSuspicious(t)
                        ? <span style={{ background:"#fef2f2", color:"#ef4444", padding:"2px 7px", borderRadius:"10px", fontSize:"10px" }}>Alert</span>
                        : <span style={{ background:"#f0fdf4", color:"#16a34a", padding:"2px 7px", borderRadius:"10px", fontSize:"10px" }}>OK</span>}
                    </td>
                    <td style={{ padding:"5px 8px", textAlign:"center" }}>
                    <button onClick={() => raiseDispute(t.id, t.merchant, t.amount)}
                      style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"6px", background:"#eff6ff", color:"#3b82f6", border:"1px solid #bfdbfe", cursor:"pointer" }}>
                      Dispute
                    </button>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {showDisputes && disputes.length > 0 && (
        <div style={{ background:"white", borderBottom:"1px solid #e2e8f0", padding:"14px 20px", flexShrink:0 }}>
          <div style={{ fontWeight:"600", fontSize:"12px", color:"#0f172a", marginBottom:"12px" }}>Dispute Tracker</div>
          {disputes.map((d, di) => (
            <div key={di} style={{ marginBottom:"16px", padding:"12px", background:"#f8fafc", borderRadius:"8px", border:"1px solid #e2e8f0" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
                <span style={{ fontSize:"12px", fontWeight:"600", color:"#0f172a" }}>{d.id}</span>
                <span style={{ fontSize:"11px", color:"#64748b" }}>{d.merchant} · Rs.{d.amount?.toLocaleString()}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center" }}>
                {d.steps.map((step, si) => (
                  <div key={si} style={{ display:"flex", alignItems:"center", flex:1 }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
                      <div style={{ width:"24px", height:"24px", borderRadius:"50%", background: step.done ? "#22c55e" : "#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", color: step.done ? "white" : "#94a3b8", fontWeight:"600" }}>
                        {step.done ? "✓" : si + 1}
                      </div>
                      <span style={{ fontSize:"9px", color: step.done ? "#16a34a" : "#94a3b8", textAlign:"center", whiteSpace:"nowrap" }}>{step.label}</span>
                    </div>
                    {si < d.steps.length - 1 && (
                      <div style={{ flex:1, height:"2px", background: step.done ? "#22c55e" : "#e2e8f0", margin:"0 4px", marginBottom:"16px" }}/>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAnalytics && analytics && (
      <div style={{ background:"white", borderBottom:"1px solid #e2e8f0", padding:"14px 20px", flexShrink:0 }}>
        <div style={{ fontWeight:"600", fontSize:"12px", color:"#0f172a", marginBottom:"4px" }}>Spending Analytics</div>
        <div style={{ display:"flex", gap:"12px", marginBottom:"14px" }}>
          <div style={{ flex:1, background:"#f8fafc", borderRadius:"8px", padding:"10px", textAlign:"center" }}>
            <div style={{ fontSize:"16px", fontWeight:"600", color:"#0f172a" }}>Rs.{Math.round(analytics.total_spent).toLocaleString()}</div>
            <div style={{ fontSize:"10px", color:"#64748b" }}>Total Spent</div>
          </div>
          <div style={{ flex:1, background:"#f8fafc", borderRadius:"8px", padding:"10px", textAlign:"center" }}>
            <div style={{ fontSize:"16px", fontWeight:"600", color:"#0f172a" }}>{analytics.transaction_count}</div>
            <div style={{ fontSize:"10px", color:"#64748b" }}>Transactions</div>
          </div>
          <div style={{ flex:1, background:"#f8fafc", borderRadius:"8px", padding:"10px", textAlign:"center" }}>
            <div style={{ fontSize:"16px", fontWeight:"600", color:"#0f172a" }}>Rs.{Math.round(analytics.avg_transaction).toLocaleString()}</div>
            <div style={{ fontSize:"10px", color:"#64748b" }}>Avg Amount</div>
          </div>
        </div>
        <div style={{ fontWeight:"500", fontSize:"11px", color:"#64748b", marginBottom:"8px" }}>Spending by Category</div>
        {Object.entries(analytics.category_totals)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, amt], i) => {
            const max = Math.max(...Object.values(analytics.category_totals));
            const pct = Math.round((amt / max) * 100);
            const colors = ["#3b82f6","#8b5cf6","#f97316","#22c55e","#ef4444","#06b6d4","#f59e0b"];
            return (
              <div key={i} style={{ marginBottom:"8px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
                  <span style={{ fontSize:"11px", color:"#0f172a" }}>{cat}</span>
                  <span style={{ fontSize:"11px", color:"#64748b", fontWeight:"500" }}>Rs.{Math.round(amt).toLocaleString()}</span>
                </div>
                <div style={{ height:"6px", background:"#f1f5f9", borderRadius:"3px" }}>
                  <div style={{ height:"6px", width:`${pct}%`, background: colors[i % colors.length], borderRadius:"3px", transition:"width 0.5s ease" }}/>
                </div>
              </div>
            );
        })}
      </div>
    )}

        <div style={{ flex:1, overflowY:"auto", padding:"20px", display:"flex", flexDirection:"column", gap:"12px" }}>
          {messages.map((m, i) => (
            <div key={i} className="msg-enter" style={{ display:"flex", flexDirection:"column", alignItems: m.role==="user" ? "flex-end" : "flex-start", gap:"6px" }}>
              <div style={{ display:"flex", gap:"8px", alignItems:"flex-end", justifyContent: m.role==="user" ? "flex-end" : "flex-start", width:"100%" }}>
                {m.role==="assistant" && (
                  <div style={{ width:"26px", height:"26px", borderRadius:"8px", background:"#3b82f6", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:"11px", fontWeight:"700", flexShrink:0 }}>F</div>
                )}
                <div style={{
                  maxWidth:"72%", padding:"11px 15px",
                  borderRadius: m.role==="user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: m.type==="agent" ? "#0f172a" : m.type==="alert" ? "#fff7ed" : m.role==="user" ? "#3b82f6" : "white",
                  color: m.type==="agent" ? "#4ade80" : m.type==="alert" ? "#9a3412" : m.role==="user" ? "white" : "#1e293b",
                  border: m.type==="agent" ? "1px solid #22c55e" : m.type==="alert" ? "1px solid #fed7aa" : "none",
                  boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
                  fontSize:"14px", lineHeight:"1.6"
                }}>
                  {m.content}
                  {m.sources && m.sources.length > 0 && (
                    <div style={{ marginTop:"8px", paddingTop:"8px", borderTop:"1px solid #f1f5f9" }}>
                      <div style={{ fontSize:"11px", color:"#94a3b8", marginBottom:"4px" }}>Sources used</div>
                      <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
                        {m.sources.map((s, si) => (
                          <span key={si} style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"10px", background:"#eff6ff", color:"#3b82f6", fontWeight:"500" }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.confidence && (
                    <div style={{ marginTop:"6px", display:"flex", alignItems:"center", gap:"6px" }}>
                      <div style={{ fontSize:"10px", color:"#94a3b8" }}>AI confidence</div>
                      <div style={{ fontSize:"10px", fontWeight:"600", padding:"1px 8px", borderRadius:"10px",
                        background: m.confidence >= 90 ? "#f0fdf4" : m.confidence >= 75 ? "#fffbeb" : "#fff7ed",
                        color: m.confidence >= 90 ? "#16a34a" : m.confidence >= 75 ? "#d97706" : "#ea580c"
                      }}>
                        {m.confidence}%
                      </div>
                    </div>
                  )}
                
                </div>
              </div>
              {m.role === "assistant" && m.suggestions && m.suggestions.length > 0 && (
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", paddingLeft:"34px" }}>
                  {m.suggestions.map((s, si) => (
                    <button key={si} onClick={() => setInput(s)}
                      style={{ fontSize:"11px", padding:"5px 12px", borderRadius:"14px", background:"#eff6ff", color:"#1d4ed8", cursor:"pointer", border:"1px solid #bfdbfe", fontWeight:"500" }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display:"flex", gap:"8px", alignItems:"flex-end" }}>
              <div style={{ width:"26px", height:"26px", borderRadius:"8px", background:"#3b82f6", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:"11px", fontWeight:"700" }}>F</div>
              <div style={{ background:"white", padding:"11px 15px", borderRadius:"18px 18px 18px 4px", color:"#94a3b8", fontSize:"14px", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                <span style={{ display:"flex", gap:"4px", alignItems:"center" }}>
                  <span className="dot1" style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#94a3b8", display:"inline-block" }}/>
                  <span className="dot2" style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#94a3b8", display:"inline-block" }}/>
                  <span className="dot3" style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#94a3b8", display:"inline-block" }}/>
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        <div style={{ padding:"14px 20px", background:"white", borderTop:"1px solid #e2e8f0", display:"flex", gap:"10px", flexShrink:0 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==="Enter" && send()}
            placeholder="Ask about a transaction, dispute, fraud alert..."
            style={{ flex:1, padding:"11px 18px", borderRadius:"24px", border:"1.5px solid #e2e8f0", fontSize:"14px", outline:"none", color:"#0f172a", background:"white" }}
          />
          <button onClick={startVoice}
            style={{ padding:"11px 16px", background: listening ? "#ef4444" : "#f1f5f9", color: listening ? "white" : "#64748b", border:"none", borderRadius:"24px", cursor:"pointer", fontSize:"14px", fontWeight:"500", transition:"all 0.2s" }}>
            {listening ? "..." : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>
          <button onClick={send}
            style={{ padding:"11px 22px", background:"#3b82f6", color:"white", border:"none", borderRadius:"24px", fontWeight:"600", cursor:"pointer", fontSize:"14px" }}>
            Send
          </button>
        </div>
        <div style={{ textAlign:"center", padding:"6px", fontSize:"11px", color:"#94a3b8", background:"white", borderTop:"1px solid #f1f5f9" }}>
          FinSight AI · Built for FlowZint AI Hackathon 2026 · Powered by Groq
        </div>
      </div>
    </div>
  );
}