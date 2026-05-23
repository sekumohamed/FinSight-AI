import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "https://finsight-ai-tclm.onrender.com";

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
      {[
        { label:"Loan amount", value:principal, set:setPrincipal, min:10000, max:5000000, step:10000, display:fmt(principal) },
        { label:"Interest rate", value:rate, set:setRate, min:1, max:24, step:0.5, display:`${rate}%` },
        { label:"Tenure (months)", value:tenure, set:setTenure, min:3, max:360, step:3, display:`${tenure}m` }
      ].map((item, i) => (
        <div key={i} style={{ marginBottom:"10px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
            <span style={{ color:"#94a3b8", fontSize:"11px" }}>{item.label}</span>
            <span style={{ color:"white", fontSize:"11px", fontWeight:"500" }}>{item.display}</span>
          </div>
          <input type="range" min={item.min} max={item.max} step={item.step} value={item.value}
            onChange={e => item.set(Number(e.target.value))}
            style={{ width:"100%", accentColor:"#3b82f6" }}/>
        </div>
      ))}
      <div style={{ background:"#1e293b", borderRadius:"8px", padding:"10px" }}>
        {[
          { label:"Monthly EMI", value:fmt(emi), color:"#3b82f6", size:"13px" },
          { label:"Total interest", value:fmt(interest), color:"#f97316", size:"11px" },
          { label:"Total payment", value:fmt(total), color:"#22c55e", size:"11px" }
        ].map((item, i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom: i < 2 ? "6px" : "0" }}>
            <span style={{ color:"#64748b", fontSize:"11px" }}>{item.label}</span>
            <span style={{ color:item.color, fontSize:item.size, fontWeight: i===0?"600":"500" }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Hi! I am FinSight AI. I can help you with transaction disputes, fraud alerts, EMI calculations, and account queries. How can I help you today?" }
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
  const [demoRunning, setDemoRunning] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const bottomRef = useRef(null);
  const alertShown = useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const loadData = () => {
      axios.get(`${API}/transactions`)
        .then(r => {
          const data = r.data;
          setTransactions(data);
          if (alertShown.current) return;
          alertShown.current = true;
          const suspicious = data.filter(t => t.category === "Unknown" || t.amount > 10000);
          if (suspicious.length > 0) {
            const alertMsg = suspicious.map(t =>
              `TXN ${t.id} — ${t.merchant} — Rs.${t.amount.toLocaleString()} on ${t.date}`
            ).join("\n");
            setMessages(prev => [...prev, {
              role:"assistant",
              content:`Fraud Alert: I have detected ${suspicious.length} suspicious transaction(s) on your account:\n\n${alertMsg}\n\nWould you like me to help you dispute any of these?`,
              type:"alert"
            }]);
          }
          axios.get(`${API}/analytics`).then(r => setAnalytics(r.data));
        })
        .catch(() => setTimeout(loadData, 5000));
    };
    loadData();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome for voice input."); return; }
    const r = new SR();
    r.lang = "en-IN"; r.interimResults = false; r.maxAlternatives = 1;
    r.start(); setListening(true);
    r.onresult = e => { setInput(e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
  };

  const exportChat = () => {
    const lines = messages.map(m => `[${m.role === "user" ? "You" : "FinSight AI"}]\n${m.content}\n`).join("\n---\n\n");
    const content = `FinSight AI - Conversation Export\nDate: ${new Date().toLocaleString("en-IN")}\n${"=".repeat(50)}\n\n${lines}\n${"=".repeat(50)}\nFinSight AI - FlowZint AI Hackathon 2026`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type:"text/plain" }));
    a.download = `finsight-chat-${Date.now()}.txt`;
    a.click();
  };

  const raiseDispute = async (transaction_id, merchant, amount) => {
    try {
      const res = await axios.post(`${API}/dispute`, { transaction_id, merchant, amount });
      setDisputes(prev => [...prev, res.data]);
      setShowDisputes(true);
      setMessages(prev => [...prev, {
        role:"assistant",
        content:`Dispute ${res.data.id} has been raised for ${merchant} — Rs.${amount.toLocaleString()}. Track it in the Dispute Tracker panel.`,
        sources:["Transaction Database"]
      }]);
    } catch { console.error("Failed to raise dispute"); }
  };

  const runDemo = async () => {
    if (demoRunning) return;
    setDemoRunning(true);
    setShowTxns(true);
    if (isMobile) setShowSidebar(false);
    const delay = ms => new Promise(res => setTimeout(res, ms));
    const sendMsg = async message => {
      const userMsg = { role:"user", content:message };
      let msgs;
      await new Promise(resolve => {
        setMessages(prev => { msgs = [...prev, userMsg]; resolve(); return msgs; });
      });
      setInput(""); setLoading(true);
      try {
        const res = await axios.post(`${API}/chat`, {
          message, history: msgs.slice(0,-1).map(m => ({ role:m.role, content:m.content }))
        });
        await delay(600);
        setMessages(prev => [...prev, { role:"assistant", content:res.data.reply, sources:res.data.sources||[], suggestions:res.data.suggestions||[], confidence:res.data.confidence||null }]);
      } catch { setMessages(prev => [...prev, { role:"assistant", content:"Something went wrong." }]); }
      setLoading(false);
    };
    await delay(1000); await sendMsg("Check my account for fraud alerts"); await delay(2500);
    await sendMsg("I did not make the Unknown Merchant charge of Rs.15,000"); await delay(2500);
    setShowDisputes(true); await raiseDispute("TXN005","Unknown Merchant",15000); await delay(2000);
    setShowDisputes(false); setShowEMI(true); await sendMsg("Calculate EMI for 50 lakhs at 8.5% for 20 years"); await delay(2500);
    setShowEMI(false); setShowAnalytics(true); await delay(1000); await sendMsg("Show my spending breakdown"); await delay(2500);
    setShowAnalytics(false); await sendMsg("This is RIDICULOUS! Someone stole money from my account!"); await delay(2500);
    await sendMsg("என் கணக்கில் இருந்து பணம் போய்விட்டது"); await delay(2500);
    exportChat();
    setDemoRunning(false);
  };

  const send = async () => {
    if (!input.trim()) return;
    if (input.trim().toUpperCase() === "YES" && escalating) {
      const ref = "REF-" + Math.floor(Math.random()*900000+100000);
      setMessages(prev => [...prev,
        { role:"user", content:"YES" },
        { role:"assistant", content:`Connecting to a live agent. Reference: ${ref}. Please hold...`, type:"agent" }
      ]);
      setInput(""); setEscalating(false); setAgentMode(true);
      setTimeout(() => setMessages(prev => [...prev, {
        role:"assistant", type:"agent",
        content:`Hello! I am Priya from FinSight Bank. I can see reference ${ref} and your conversation. I understand you have a concern about suspicious transactions. Which transaction would you like to dispute first?`
      }]), 2000);
      return;
    }
    const userMsg = { role:"user", content:input };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory); setInput(""); setLoading(true);
    if (agentMode) {
      const replies = [
        "I have noted your concern and am raising an urgent dispute case. You will receive a confirmation SMS within 10 minutes.",
        "I have blocked the suspicious transaction and initiated a refund. The amount will be credited within 5-7 working days.",
        "I have escalated this to our fraud team. Case number: CASE-" + Math.floor(Math.random()*90000+10000) + ". You will be contacted within 24 hours.",
        "The transaction has been flagged as unauthorized and a chargeback has been initiated.",
        "Is there anything else I can help you with regarding your account security?"
      ];
      setTimeout(() => {
        setMessages([...newHistory, { role:"assistant", content:replies[Math.floor(Math.random()*replies.length)], type:"agent" }]);
        setLoading(false);
      }, 1000);
      return;
    }
    try {
      const res = await axios.post(`${API}/chat`, { message:input, history:messages.map(m => ({ role:m.role, content:m.content })) });
      if (res.data.escalate) setEscalating(true);
      setMessages([...newHistory, { role:"assistant", content:res.data.reply, sources:res.data.sources||[], suggestions:res.data.suggestions||[], confidence:res.data.confidence||null }]);
    } catch { setMessages([...newHistory, { role:"assistant", content:"Something went wrong. Please try again." }]); }
    setLoading(false);
  };

  const isSuspicious = t => t.category === "Unknown" || t.amount > 10000;

  const sidebarStyle = isMobile ? {
    position:"fixed", top:0, left: showSidebar ? 0 : "-100%", height:"100vh", width:"280px",
    background:"#0f172a", zIndex:1000, display:"flex", flexDirection:"column", overflowY:"auto",
    transition:"left 0.3s ease", boxShadow:"4px 0 20px rgba(0,0,0,0.3)"
  } : {
    width:"272px", background:"#0f172a", display:"flex", flexDirection:"column", flexShrink:0, overflowY:"auto"
  };

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter', sans-serif", background:"#f1f5f9", overflow:"hidden" }}>

      {/* Mobile overlay */}
      {isMobile && showSidebar && (
        <div onClick={() => setShowSidebar(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:999 }}/>
      )}

      {/* Sidebar */}
      <div style={sidebarStyle}>
        {/* Account Card */}
        <div style={{ padding:"18px 16px", borderBottom:"1px solid #1e293b" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px" }}>
            <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:"#3b82f6", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"700", color:"white", fontSize:"15px" }}>F</div>
            <div>
              <div style={{ color:"white", fontWeight:"600", fontSize:"14px" }}>FinSight AI</div>
              <div style={{ color:"#64748b", fontSize:"11px" }}>Financial Assistant</div>
            </div>
            {isMobile && (
              <button onClick={() => setShowSidebar(false)}
                style={{ marginLeft:"auto", background:"transparent", border:"none", color:"#64748b", fontSize:"20px", cursor:"pointer" }}>✕</button>
            )}
          </div>
          <div style={{ background:"linear-gradient(135deg, #1d4ed8, #3b82f6)", borderRadius:"12px", padding:"14px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:"-20px", right:"-20px", width:"80px", height:"80px", borderRadius:"50%", background:"rgba(255,255,255,0.05)" }}/>
            <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.6)", letterSpacing:"0.1em", marginBottom:"8px" }}>SAVINGS ACCOUNT</div>
            <div style={{ fontSize:"13px", color:"white", fontWeight:"600", marginBottom:"2px" }}>Seku Mohamed Hanifa A</div>
            <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.7)", marginBottom:"12px" }}>XXXX XXXX XXXX 4821</div>
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

        {/* Quick Actions */}
        <div style={{ padding:"12px" }}>
          <div style={{ color:"#64748b", fontSize:"11px", fontWeight:"600", padding:"6px 4px", letterSpacing:"0.05em" }}>QUICK ACTIONS</div>
          {["I have a dispute","Check fraud alerts","Calculate my EMI","What are my account limits"].map((q, i) => (
            <div key={i} onClick={() => { setInput(q); if(isMobile) setShowSidebar(false); }}
              style={{ padding:"9px 12px", borderRadius:"8px", color:"#94a3b8", fontSize:"13px", cursor:"pointer", marginBottom:"2px" }}
              onMouseEnter={e => e.currentTarget.style.background="#1e293b"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              {q}
            </div>
          ))}
        </div>

        {/* Toggle Buttons */}
        <div style={{ padding:"0 12px 8px" }}>
          {[
            { label:"Transactions", badge:`${transactions.filter(isSuspicious).length} alerts`, badgeBg:"#ef4444", action:() => setShowTxns(!showTxns) },
            { label:"EMI Calculator", badge:showEMI?"Hide":"Show", badgeBg:null, action:() => setShowEMI(!showEMI) },
            { label:"Dispute Tracker", badge:disputes.length, badgeBg:"#3b82f6", action:() => setShowDisputes(!showDisputes) },
            { label:"Analytics", badge:showAnalytics?"Hide":"Show", badgeBg:null, action:() => setShowAnalytics(!showAnalytics) }
          ].map((item, i) => (
            <div key={i} onClick={item.action}
              style={{ padding:"9px 12px", borderRadius:"8px", background:"#1e293b", color:"#94a3b8", fontSize:"13px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
              <span>{item.label}</span>
              <span style={{ background:item.badgeBg||"transparent", color:item.badgeBg?"white":"#94a3b8", borderRadius:"10px", padding:"1px 7px", fontSize:"10px", border:item.badgeBg?"none":"none" }}>
                {item.badge}
              </span>
            </div>
          ))}
        </div>

        {showEMI && <EMICalculator />}

        <div onClick={runDemo}
          style={{ margin:"12px", padding:"10px 12px", borderRadius:"8px", background:demoRunning?"#1e3a5f":"linear-gradient(135deg, #3b82f6, #8b5cf6)", color:"white", fontSize:"13px", cursor:demoRunning?"not-allowed":"pointer", textAlign:"center", fontWeight:"600" }}>
          {demoRunning ? "Demo running..." : "Run Demo Mode"}
        </div>
      </div>

      {/* Main Area */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ background:"white", padding:"12px 16px", borderBottom:"1px solid #e2e8f0", display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
          {isMobile && (
            <button onClick={() => setShowSidebar(true)}
              style={{ background:"transparent", border:"none", fontSize:"20px", cursor:"pointer", color:"#64748b", padding:"4px" }}>☰</button>
          )}
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:"600", color:"#0f172a", fontSize:"14px" }}>Financial Customer Care</div>
            <div style={{ fontSize:"11px", color:"#64748b" }}>Multilingual</div>
          </div>
          <button onClick={exportChat}
            style={{ fontSize:"11px", padding:"5px 12px", borderRadius:"16px", background:"#f1f5f9", color:"#64748b", border:"1px solid #e2e8f0", cursor:"pointer", fontWeight:"500", whiteSpace:"nowrap" }}>
            Export Chat
          </button>
          <div style={{ background:"#dcfce7", color:"#16a34a", fontSize:"12px", padding:"4px 12px", borderRadius:"20px", fontWeight:"500", whiteSpace:"nowrap" }}>Live</div>
        </div>

        {/* Stats Bar */}
        <div style={{ background:"#0f172a", padding:"6px 12px", display:"flex", gap:"12px", alignItems:"center", flexShrink:0, overflowX:"auto" }}>
          {[
            { dot:"#22c55e", label:"Protected", value:`Rs.${transactions.filter(t=>t.category==="Unknown").reduce((a,t)=>a+t.amount,0).toLocaleString()}`, color:"#22c55e" },
            { dot:"#3b82f6", label:"Disputes", value:disputes.length, color:"#3b82f6" },
            { dot:"#ef4444", label:"Alerts", value:transactions.filter(isSuspicious).length, color:"#ef4444" },
            { dot:"#f97316", label:"Messages", value:messages.length, color:"#f97316" }
          ].map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"6px", flexShrink:0 }}>
              {i > 0 && <div style={{ width:"1px", height:"14px", background:"#1e293b", marginRight:"6px" }}/>}
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:s.dot }}/>
              <span style={{ fontSize:"10px", color:"#64748b" }}>{s.label}</span>
              <span style={{ fontSize:"12px", color:s.color, fontWeight:"600" }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Transaction Table */}
        {showTxns && (
          <div style={{ background:"white", borderBottom:"1px solid #e2e8f0", padding:"10px 14px", maxHeight:"180px", overflowY:"auto", overflowX:"auto", flexShrink:0 }}>
            <div style={{ fontWeight:"600", fontSize:"12px", color:"#0f172a", marginBottom:"8px" }}>Recent Transactions</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"11px", minWidth:"500px" }}>
              <thead>
                <tr style={{ color:"#64748b" }}>
                  {["Date","Merchant","Category","Amount","Status","Action"].map(h => (
                    <th key={h} style={{ textAlign:h==="Amount"?"right":h==="Status"||h==="Action"?"center":"left", padding:"3px 6px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i} style={{ background:isSuspicious(t)?"#fef2f2":i%2===0?"#f8fafc":"white" }}>
                    <td style={{ padding:"5px 6px", color:"#64748b" }}>{t.date}</td>
                    <td style={{ padding:"5px 6px", color:"#0f172a", fontWeight:isSuspicious(t)?"600":"400" }}>{t.merchant}</td>
                    <td style={{ padding:"5px 6px", color:"#64748b" }}>{t.category}</td>
                    <td style={{ padding:"5px 6px", textAlign:"right", color:isSuspicious(t)?"#ef4444":"#0f172a", fontWeight:"500" }}>Rs.{t.amount.toLocaleString()}</td>
                    <td style={{ padding:"5px 6px", textAlign:"center" }}>
                      <span style={{ background:isSuspicious(t)?"#fef2f2":"#f0fdf4", color:isSuspicious(t)?"#ef4444":"#16a34a", padding:"2px 6px", borderRadius:"10px", fontSize:"10px" }}>
                        {isSuspicious(t)?"Alert":"OK"}
                      </span>
                    </td>
                    <td style={{ padding:"5px 6px", textAlign:"center" }}>
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

        {/* Dispute Tracker */}
        {showDisputes && disputes.length > 0 && (
          <div style={{ background:"white", borderBottom:"1px solid #e2e8f0", padding:"12px 16px", flexShrink:0 }}>
            <div style={{ fontWeight:"600", fontSize:"12px", color:"#0f172a", marginBottom:"10px" }}>Dispute Tracker</div>
            {disputes.map((d, di) => (
              <div key={di} style={{ marginBottom:"12px", padding:"10px", background:"#f8fafc", borderRadius:"8px", border:"1px solid #e2e8f0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
                  <span style={{ fontSize:"12px", fontWeight:"600", color:"#0f172a" }}>{d.id}</span>
                  <span style={{ fontSize:"11px", color:"#64748b" }}>{d.merchant} · Rs.{d.amount?.toLocaleString()}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center" }}>
                  {d.steps.map((step, si) => (
                    <div key={si} style={{ display:"flex", alignItems:"center", flex:1 }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
                        <div style={{ width:"22px", height:"22px", borderRadius:"50%", background:step.done?"#22c55e":"#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", color:step.done?"white":"#94a3b8", fontWeight:"600" }}>
                          {step.done?"✓":si+1}
                        </div>
                        <span style={{ fontSize:"8px", color:step.done?"#16a34a":"#94a3b8", textAlign:"center", whiteSpace:"nowrap" }}>{step.label}</span>
                      </div>
                      {si < d.steps.length-1 && <div style={{ flex:1, height:"2px", background:step.done?"#22c55e":"#e2e8f0", margin:"0 4px", marginBottom:"16px" }}/>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analytics */}
        {showAnalytics && analytics && (
          <div style={{ background:"white", borderBottom:"1px solid #e2e8f0", padding:"12px 16px", flexShrink:0 }}>
            <div style={{ fontWeight:"600", fontSize:"12px", color:"#0f172a", marginBottom:"10px" }}>Spending Analytics</div>
            <div style={{ display:"flex", gap:"8px", marginBottom:"12px" }}>
              {[
                { label:"Total Spent", value:`Rs.${Math.round(analytics.total_spent).toLocaleString()}` },
                { label:"Transactions", value:analytics.transaction_count },
                { label:"Avg Amount", value:`Rs.${Math.round(analytics.avg_transaction).toLocaleString()}` }
              ].map((item, i) => (
                <div key={i} style={{ flex:1, background:"#f8fafc", borderRadius:"8px", padding:"8px", textAlign:"center" }}>
                  <div style={{ fontSize:"13px", fontWeight:"600", color:"#0f172a" }}>{item.value}</div>
                  <div style={{ fontSize:"10px", color:"#64748b" }}>{item.label}</div>
                </div>
              ))}
            </div>
            {Object.entries(analytics.category_totals).sort((a,b)=>b[1]-a[1]).map(([cat,amt],i) => {
              const max = Math.max(...Object.values(analytics.category_totals));
              const colors = ["#3b82f6","#8b5cf6","#f97316","#22c55e","#ef4444","#06b6d4","#f59e0b"];
              return (
                <div key={i} style={{ marginBottom:"6px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
                    <span style={{ fontSize:"11px", color:"#0f172a" }}>{cat}</span>
                    <span style={{ fontSize:"11px", color:"#64748b" }}>Rs.{Math.round(amt).toLocaleString()}</span>
                  </div>
                  <div style={{ height:"5px", background:"#f1f5f9", borderRadius:"3px" }}>
                    <div style={{ height:"5px", width:`${Math.round((amt/max)*100)}%`, background:colors[i%colors.length], borderRadius:"3px" }}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:"12px" }}>
          {messages.map((m, i) => (
            <div key={i} className="msg-enter" style={{ display:"flex", flexDirection:"column", alignItems:m.role==="user"?"flex-end":"flex-start", gap:"6px" }}>
              <div style={{ display:"flex", gap:"8px", alignItems:"flex-end", justifyContent:m.role==="user"?"flex-end":"flex-start", width:"100%" }}>
                {m.role==="assistant" && (
                  <div style={{ width:"26px", height:"26px", borderRadius:"8px", background:"#3b82f6", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:"11px", fontWeight:"700", flexShrink:0 }}>F</div>
                )}
                <div style={{
                  maxWidth:isMobile?"85%":"72%", padding:"11px 15px",
                  borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  background:m.type==="agent"?"#0f172a":m.type==="alert"?"#fff7ed":m.role==="user"?"#3b82f6":"white",
                  color:m.type==="agent"?"#4ade80":m.type==="alert"?"#9a3412":m.role==="user"?"white":"#1e293b",
                  border:m.type==="agent"?"1px solid #22c55e":m.type==="alert"?"1px solid #fed7aa":"none",
                  boxShadow:"0 1px 3px rgba(0,0,0,0.06)", fontSize:"14px", lineHeight:"1.6"
                }}>
                  {m.content}
                  {m.sources && m.sources.length > 0 && (
                    <div style={{ marginTop:"8px", paddingTop:"8px", borderTop:"1px solid #f1f5f9" }}>
                      <div style={{ fontSize:"11px", color:"#94a3b8", marginBottom:"4px" }}>Sources used</div>
                      <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
                        {m.sources.map((s,si) => (
                          <span key={si} style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"10px", background:"#eff6ff", color:"#3b82f6", fontWeight:"500" }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {m.confidence && (
                    <div style={{ marginTop:"6px", display:"flex", alignItems:"center", gap:"6px" }}>
                      <span style={{ fontSize:"10px", color:"#94a3b8" }}>AI confidence</span>
                      <span style={{ fontSize:"10px", fontWeight:"600", padding:"1px 8px", borderRadius:"10px",
                        background:m.confidence>=90?"#f0fdf4":m.confidence>=75?"#fffbeb":"#fff7ed",
                        color:m.confidence>=90?"#16a34a":m.confidence>=75?"#d97706":"#ea580c"
                      }}>{m.confidence}%</span>
                    </div>
                  )}
                </div>
              </div>
              {m.role==="assistant" && m.suggestions && m.suggestions.length > 0 && (
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", paddingLeft:"34px" }}>
                  {m.suggestions.map((s,si) => (
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
              <div style={{ background:"white", padding:"11px 15px", borderRadius:"18px 18px 18px 4px", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                <span style={{ display:"flex", gap:"4px", alignItems:"center" }}>
                  {["dot1","dot2","dot3"].map(c => <span key={c} className={c} style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#94a3b8", display:"inline-block" }}/>)}
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input Bar */}
        <div style={{ padding:"12px 16px", background:"white", borderTop:"1px solid #e2e8f0", display:"flex", gap:"8px", flexShrink:0 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && send()}
            placeholder="Ask about a transaction, dispute, fraud alert..."
            style={{ flex:1, padding:"11px 16px", borderRadius:"24px", border:"1.5px solid #e2e8f0", fontSize:"14px", outline:"none", color:"#0f172a", background:"white" }}/>
          <button onClick={startVoice}
            style={{ padding:"11px 14px", background:listening?"#ef4444":"#f1f5f9", color:listening?"white":"#64748b", border:"none", borderRadius:"24px", cursor:"pointer", transition:"all 0.2s" }}>
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
            style={{ padding:"11px 20px", background:"#3b82f6", color:"white", border:"none", borderRadius:"24px", fontWeight:"600", cursor:"pointer", fontSize:"14px" }}>
            Send
          </button>
        </div>
        <div style={{ textAlign:"center", padding:"5px", fontSize:"11px", color:"#94a3b8", background:"white", borderTop:"1px solid #f1f5f9" }}>
          FinSight AI · Built for FlowZint AI Hackathon 2026 · Powered by Groq
        </div>
      </div>
    </div>
  );
}