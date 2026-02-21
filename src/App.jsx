import { useState } from "react";

// ─── Constants & Config ───
const LOAN_TYPES = [
  { id: "term", label: "Term Loan", icon: "🏦", defaultRate: 11.5, defaultTenure: 60, defaultAmount: 1500000 },
  { id: "ccod", label: "CC/OD Facility", icon: "💳", defaultRate: 13.5, defaultTenure: 12, defaultAmount: 800000 },
  { id: "mudra", label: "MUDRA Loan", icon: "🏛️", defaultRate: 10.0, defaultTenure: 36, defaultAmount: 500000 },
  { id: "vehicle", label: "Vehicle/Equipment", icon: "🚛", defaultRate: 12.0, defaultTenure: 48, defaultAmount: 1200000 },
  { id: "working", label: "Working Capital", icon: "⚙️", defaultRate: 14.0, defaultTenure: 24, defaultAmount: 600000 },
];

const RESTRUCTURE_STRATEGIES = [
  { id: "prepay_highest", label: "Prepay Highest Rate First", description: "Avalanche method — target the costliest loan" },
  { id: "consolidate", label: "Consolidate All Loans", description: "Single loan at a negotiated lower rate" },
  { id: "balance_transfer", label: "Balance Transfer", description: "Move high-rate loans to a lower-rate lender" },
  { id: "extend_tenure", label: "Extend Tenure + Reduce EMI", description: "Ease monthly cash flow pressure" },
  { id: "hybrid", label: "Hybrid Optimal", description: "AI-recommended mix of strategies" },
];

const formatINR = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

const formatINRFull = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// ─── Financial Calculation Engine ───
function calcEMI(principal, annualRate, tenureMonths) {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / tenureMonths;
  return (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
}

function calcTotalInterest(principal, annualRate, tenureMonths) {
  const emi = calcEMI(principal, annualRate, tenureMonths);
  return emi * tenureMonths - principal;
}

function simulateRestructure(loans, strategyId) {
  const totalPrincipal = loans.reduce((s, l) => s + l.amount, 0);
  const currentTotalInterest = loans.reduce((s, l) => s + calcTotalInterest(l.amount, l.rate, l.tenure), 0);
  const currentMonthlyEMI = loans.reduce((s, l) => s + calcEMI(l.amount, l.rate, l.tenure), 0);
  const currentTotalPayout = totalPrincipal + currentTotalInterest;
  const maxTenure = Math.max(...loans.map(l => l.tenure));

  let newInterest, newEMI, newTenure, details;

  switch (strategyId) {
    case "prepay_highest": {
      const sorted = [...loans].sort((a, b) => b.rate - a.rate);
      const highest = sorted[0];
      const reducedTenure = Math.max(6, Math.round(highest.tenure * 0.65));
      newInterest = sorted.reduce((s, l, i) => {
        const t = i === 0 ? reducedTenure : l.tenure;
        return s + calcTotalInterest(l.amount, l.rate, t);
      }, 0);
      const monthlyFreed = currentMonthlyEMI * 0.15;
      newEMI = currentMonthlyEMI + monthlyFreed;
      newTenure = reducedTenure;
      details = `Aggressively prepay ${LOAN_TYPES.find(t => t.id === highest.type)?.label || "highest rate loan"} (${highest.rate}% p.a.) — reduces tenure by ~${highest.tenure - reducedTenure} months`;
      break;
    }
    case "consolidate": {
      const weightedRate = loans.reduce((s, l) => s + l.rate * l.amount, 0) / totalPrincipal;
      const newRate = Math.max(9.5, weightedRate - 2.5);
      newTenure = Math.round(maxTenure * 1.1);
      newInterest = calcTotalInterest(totalPrincipal, newRate, newTenure);
      newEMI = calcEMI(totalPrincipal, newRate, newTenure);
      details = `Consolidate ${loans.length} loans into single facility at ${newRate.toFixed(1)}% (vs weighted avg ${weightedRate.toFixed(1)}%) — simpler compliance, one EMI`;
      break;
    }
    case "balance_transfer": {
      const highRateLoans = loans.filter(l => l.rate > 11);
      const lowRateLoans = loans.filter(l => l.rate <= 11);
      const transferRate = 9.75;
      newInterest = highRateLoans.reduce((s, l) => s + calcTotalInterest(l.amount, transferRate, l.tenure), 0) +
        lowRateLoans.reduce((s, l) => s + calcTotalInterest(l.amount, l.rate, l.tenure), 0);
      newEMI = highRateLoans.reduce((s, l) => s + calcEMI(l.amount, transferRate, l.tenure), 0) +
        lowRateLoans.reduce((s, l) => s + calcEMI(l.amount, l.rate, l.tenure), 0);
      newTenure = maxTenure;
      const recoveryMonths = (currentMonthlyEMI - newEMI) > 0 ? Math.round(highRateLoans.reduce((s, l) => s + l.amount, 0) * 0.01 / (currentMonthlyEMI - newEMI)) : 6;
      details = `Transfer ${highRateLoans.length} high-rate loan(s) to ${transferRate}% lender — processing fee ~1% one-time, recovered in ${recoveryMonths} months`;
      break;
    }
    case "extend_tenure": {
      newInterest = loans.reduce((s, l) => s + calcTotalInterest(l.amount, l.rate, Math.round(l.tenure * 1.5)), 0);
      newEMI = loans.reduce((s, l) => s + calcEMI(l.amount, l.rate, Math.round(l.tenure * 1.5)), 0);
      newTenure = Math.round(maxTenure * 1.5);
      details = `Extend all loan tenures by ~50% — EMI drops significantly, total interest increases but cash flow pressure eases immediately`;
      break;
    }
    case "hybrid": {
      const sorted2 = [...loans].sort((a, b) => b.rate - a.rate);
      const topHalf = sorted2.slice(0, Math.ceil(sorted2.length / 2));
      const bottomHalf = sorted2.slice(Math.ceil(sorted2.length / 2));
      const btRate = 9.75;
      newInterest = topHalf.reduce((s, l) => s + calcTotalInterest(l.amount, btRate, Math.round(l.tenure * 0.8)), 0) +
        bottomHalf.reduce((s, l) => s + calcTotalInterest(l.amount, l.rate, l.tenure), 0);
      newEMI = topHalf.reduce((s, l) => s + calcEMI(l.amount, btRate, Math.round(l.tenure * 0.8)), 0) +
        bottomHalf.reduce((s, l) => s + calcEMI(l.amount, l.rate, l.tenure), 0);
      newTenure = maxTenure;
      details = `Balance-transfer top ${topHalf.length} costliest loan(s) to ${btRate}% + accelerate repayment. Keep low-rate loans unchanged. Best risk-adjusted savings.`;
      break;
    }
    default:
      newInterest = currentTotalInterest;
      newEMI = currentMonthlyEMI;
      newTenure = maxTenure;
      details = "";
  }

  const savings = currentTotalInterest - newInterest;
  const emiReduction = currentMonthlyEMI - newEMI;

  return {
    strategyId,
    currentTotalInterest,
    currentMonthlyEMI,
    currentTotalPayout,
    newInterest,
    newEMI,
    newTenure,
    savings: Math.max(0, savings),
    emiReduction,
    savingsPercent: currentTotalInterest > 0 ? (savings / currentTotalInterest) * 100 : 0,
    details,
    totalPrincipal,
  };
}

// ─── PDF Report Generator ───
function generateReportHTML(loans, results, businessName) {
  const bestResult = results.reduce((best, r) => r.savings > best.savings ? r : best, results[0]);
  const stratLabel = RESTRUCTURE_STRATEGIES.find(s => s.id === bestResult.strategyId)?.label || "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Loan Restructuring Report - ${businessName}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; line-height: 1.6; font-size: 11pt; }
  .header { background: linear-gradient(135deg, #0a1628 0%, #1a365d 100%); color: white; padding: 32px; margin: -20mm -20mm 24px; }
  .header h1 { font-size: 22pt; font-weight: 700; margin-bottom: 4px; }
  .header p { opacity: 0.8; font-size: 10pt; }
  .badge { display: inline-block; background: #f6ad55; color: #1a1a2e; padding: 3px 12px; border-radius: 20px; font-size: 9pt; font-weight: 600; margin-top: 8px; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 13pt; color: #1a365d; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 16px; }
  th { background: #f7fafc; color: #4a5568; font-weight: 600; text-align: left; padding: 8px 12px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px 12px; border-bottom: 1px solid #edf2f7; }
  .highlight-row { background: #f0fff4; }
  .savings-box { background: linear-gradient(135deg, #f0fff4, #c6f6d5); border: 2px solid #38a169; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
  .savings-amount { font-size: 28pt; font-weight: 800; color: #22543d; }
  .savings-label { font-size: 10pt; color: #4a5568; margin-top: 4px; }
  .strategy-box { background: #ebf8ff; border-left: 4px solid #3182ce; padding: 12px 16px; margin: 12px 0; border-radius: 0 8px 8px 0; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 9pt; color: #a0aec0; text-align: center; }
  .metric-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 16px 0; }
  .metric { background: #f7fafc; padding: 12px; border-radius: 8px; text-align: center; }
  .metric-value { font-size: 16pt; font-weight: 700; color: #1a365d; }
  .metric-label { font-size: 8pt; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; }
</style></head><body>
  <div class="header">
    <h1>Loan Restructuring Analysis</h1>
    <p>${businessName} — Confidential Report</p>
    <span class="badge">Generated ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
  </div>

  <div class="section">
    <h2>Current Loan Portfolio</h2>
    <table>
      <thead><tr><th>Loan Type</th><th>Principal</th><th>Rate (p.a.)</th><th>Tenure</th><th>Monthly EMI</th><th>Total Interest</th></tr></thead>
      <tbody>
        ${loans.map(l => `<tr>
          <td>${LOAN_TYPES.find(t => t.id === l.type)?.label || l.type}</td>
          <td>${formatINRFull(l.amount)}</td>
          <td>${l.rate}%</td>
          <td>${l.tenure} months</td>
          <td>${formatINRFull(calcEMI(l.amount, l.rate, l.tenure))}</td>
          <td>${formatINRFull(calcTotalInterest(l.amount, l.rate, l.tenure))}</td>
        </tr>`).join("")}
        <tr style="font-weight:700;background:#f7fafc;">
          <td>TOTAL</td>
          <td>${formatINRFull(loans.reduce((s, l) => s + l.amount, 0))}</td>
          <td>—</td><td>—</td>
          <td>${formatINRFull(loans.reduce((s, l) => s + calcEMI(l.amount, l.rate, l.tenure), 0))}</td>
          <td>${formatINRFull(loans.reduce((s, l) => s + calcTotalInterest(l.amount, l.rate, l.tenure), 0))}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="savings-box">
    <div class="savings-amount">${formatINRFull(bestResult.savings)}</div>
    <div class="savings-label">Maximum Potential Interest Savings with "${stratLabel}" Strategy</div>
  </div>

  <div class="section">
    <h2>Strategy Comparison</h2>
    <table>
      <thead><tr><th>Strategy</th><th>New Total Interest</th><th>Interest Saved</th><th>New Monthly EMI</th><th>EMI Change</th></tr></thead>
      <tbody>
        ${results.map(r => {
          const strat = RESTRUCTURE_STRATEGIES.find(s => s.id === r.strategyId);
          const isBest = r.strategyId === bestResult.strategyId;
          return `<tr class="${isBest ? 'highlight-row' : ''}">
            <td>${isBest ? '⭐ ' : ''}${strat?.label}</td>
            <td>${formatINRFull(r.newInterest)}</td>
            <td style="color:#38a169;font-weight:600;">${formatINRFull(r.savings)}</td>
            <td>${formatINRFull(r.newEMI)}</td>
            <td style="color:${r.emiReduction > 0 ? '#38a169' : '#e53e3e'}">${r.emiReduction > 0 ? '↓' : '↑'} ${formatINRFull(Math.abs(r.emiReduction))}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Recommended Action Plan</h2>
    <div class="strategy-box">
      <strong>${stratLabel}</strong><br/>
      ${bestResult.details}
    </div>
    <div class="metric-grid">
      <div class="metric"><div class="metric-value">${formatINR(bestResult.savings)}</div><div class="metric-label">Total Savings</div></div>
      <div class="metric"><div class="metric-value">${bestResult.savingsPercent.toFixed(1)}%</div><div class="metric-label">Interest Reduction</div></div>
      <div class="metric"><div class="metric-value">${bestResult.newTenure}mo</div><div class="metric-label">Optimized Tenure</div></div>
    </div>
  </div>

  <div class="footer">
    <p>This report is generated by <strong>LoanRestructure Pro</strong> for advisory purposes only. Actual savings may vary based on lender terms, processing fees, and market conditions. Consult your CA or financial advisor before taking action.</p>
    <p style="margin-top:4px;">© ${new Date().getFullYear()} LoanRestructure Pro</p>
  </div>
</body></html>`;
}

// ─── Chart Components ───
function BarChart({ data, height = 200 }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height, padding: "0 4px" }}>
      {data.map((d, i) => {
        const h = max > 0 ? (d.value / max) * (height - 40) : 0;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#1a365d", fontFamily: "'DM Mono', monospace" }}>
              {formatINR(d.value)}
            </span>
            <div style={{
              width: "100%", height: h,
              background: d.color || "linear-gradient(180deg, #3182ce, #2c5282)",
              borderRadius: "6px 6px 2px 2px", transition: "height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
              minHeight: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }} />
            <span style={{ fontSize: "9px", color: "#718096", textAlign: "center", lineHeight: 1.2, maxWidth: 80, fontFamily: "'DM Sans', sans-serif" }}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ current, saved, size = 140 }) {
  const pct = current > 0 ? ((current - saved) / current) * 100 : 100;
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#38a169" strokeWidth="12"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x={size/2} y={size/2-6} textAnchor="middle" style={{ fontSize: "18px", fontWeight: 800, fill: "#22543d", fontFamily: "'DM Mono', monospace" }}>
        {(100 - pct).toFixed(1)}%
      </text>
      <text x={size/2} y={size/2+12} textAnchor="middle" style={{ fontSize: "9px", fill: "#718096", fontFamily: "'DM Sans', sans-serif" }}>
        INTEREST SAVED
      </text>
    </svg>
  );
}

// ─── Main App ───
export default function App() {
  const [step, setStep] = useState("input");
  const [businessName, setBusinessName] = useState("ABC Trading Co.");
  const [loans, setLoans] = useState([
    { type: "term", amount: 1500000, rate: 11.5, tenure: 60 },
    { type: "ccod", amount: 800000, rate: 13.5, tenure: 12 },
    { type: "mudra", amount: 500000, rate: 10.0, tenure: 36 },
  ]);
  const [results, setResults] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);

  const addLoan = (typeId) => {
    const lt = LOAN_TYPES.find(t => t.id === typeId);
    if (!lt) return;
    setLoans([...loans, { type: lt.id, amount: lt.defaultAmount, rate: lt.defaultRate, tenure: lt.defaultTenure }]);
  };

  const removeLoan = (idx) => setLoans(loans.filter((_, i) => i !== idx));

  const updateLoan = (idx, field, val) => {
    const next = [...loans];
    next[idx] = { ...next[idx], [field]: Number(val) };
    setLoans(next);
  };

  const runAnalysis = () => {
    if (loans.length === 0) return;
    const res = RESTRUCTURE_STRATEGIES.map(s => simulateRestructure(loans, s.id));
    setResults(res);
    const best = res.reduce((b, r) => r.savings > b.savings ? r : b, res[0]);
    setSelectedStrategy(best.strategyId);
    setStep("results");
    setAnimateIn(false);
    setTimeout(() => setAnimateIn(true), 50);
  };

  const downloadReport = () => {
    const html = generateReportHTML(loans, results, businessName);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LoanRestructure_${businessName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPrincipal = loans.reduce((s, l) => s + l.amount, 0);
  const totalInterest = loans.reduce((s, l) => s + calcTotalInterest(l.amount, l.rate, l.tenure), 0);
  const totalEMI = loans.reduce((s, l) => s + calcEMI(l.amount, l.rate, l.tenure), 0);
  const activeResult = results.find(r => r.strategyId === selectedStrategy);

  const inputStyle = {
    width: "100%", padding: "10px 12px", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: "8px",
    fontSize: "14px", fontFamily: "'DM Mono', monospace", background: "rgba(255,255,255,0.05)", color: "#fff",
    outline: "none", transition: "border-color 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(165deg, #0a1628 0%, #1a2744 35%, #0f2027 100%)",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      color: "#e2e8f0", margin: 0, padding: 0,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(0,0,0,0.2)", backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: 38, height: 38, borderRadius: "10px",
            background: "linear-gradient(135deg, #f6ad55, #ed8936)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px", fontWeight: 800, color: "#1a1a2e",
            fontFamily: "'Playfair Display', serif",
            boxShadow: "0 4px 15px rgba(246,173,85,0.3)",
          }}>LR</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "16px", letterSpacing: "-0.3px", color: "#fff" }}>
              LoanRestructure <span style={{ color: "#f6ad55" }}>Pro</span>
            </div>
            <div style={{ fontSize: "10px", color: "#718096", letterSpacing: "1.5px", textTransform: "uppercase" }}>
              SME Debt Optimization Engine
            </div>
          </div>
        </div>
        {step === "results" && (
          <button onClick={() => { setStep("input"); setResults([]); }} style={{
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
            color: "#a0aec0", padding: "8px 16px", borderRadius: "8px", cursor: "pointer",
            fontSize: "12px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
          }}>← Edit Loans</button>
        )}
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

        {/* ════ INPUT STEP ════ */}
        {step === "input" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 6 }}>
                Business / Client Name
              </label>
              <input value={businessName} onChange={e => setBusinessName(e.target.value)}
                style={{ ...inputStyle, maxWidth: 360 }} placeholder="Enter business name..." />
            </div>

            <div style={{ fontSize: "11px", fontWeight: 600, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>
              Loan Portfolio ({loans.length} active)
            </div>

            {loans.map((loan, idx) => {
              const lt = LOAN_TYPES.find(t => t.id === loan.type);
              const emi = calcEMI(loan.amount, loan.rate, loan.tenure);
              const interest = calcTotalInterest(loan.amount, loan.rate, loan.tenure);
              return (
                <div key={idx} style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "14px", padding: "18px 20px", marginBottom: 12, backdropFilter: "blur(10px)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "20px" }}>{lt?.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "#fff" }}>{lt?.label}</div>
                        <div style={{ fontSize: "11px", color: "#718096" }}>
                          EMI: {formatINRFull(emi)} • Interest: {formatINRFull(interest)}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeLoan(idx)} style={{
                      background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.3)",
                      color: "#fc8181", width: 30, height: 30, borderRadius: "8px", cursor: "pointer",
                      fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>×</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: "10px", color: "#718096", fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Principal (₹)</label>
                      <input type="number" value={loan.amount} onChange={e => updateLoan(idx, "amount", e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "#718096", fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Rate (% p.a.)</label>
                      <input type="number" step="0.1" value={loan.rate} onChange={e => updateLoan(idx, "rate", e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "#718096", fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Tenure (months)</label>
                      <input type="number" value={loan.tenure} onChange={e => updateLoan(idx, "tenure", e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, marginBottom: 28 }}>
              {LOAN_TYPES.filter(lt => !loans.find(l => l.type === lt.id)).map(lt => (
                <button key={lt.id} onClick={() => addLoan(lt.id)} style={{
                  background: "rgba(255,255,255,0.04)", border: "1.5px dashed rgba(255,255,255,0.15)",
                  color: "#a0aec0", padding: "8px 16px", borderRadius: "10px", cursor: "pointer",
                  fontSize: "12px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                  display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                }}>
                  <span style={{ fontSize: "14px" }}>{lt.icon}</span> + {lt.label}
                </button>
              ))}
            </div>

            {loans.length > 0 && (
              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px", padding: "18px 24px", marginBottom: 20,
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16,
              }}>
                {[
                  { label: "Total Principal", value: formatINR(totalPrincipal), color: "#63b3ed" },
                  { label: "Total Interest", value: formatINR(totalInterest), color: "#fc8181" },
                  { label: "Monthly EMI", value: formatINRFull(totalEMI), color: "#f6ad55" },
                ].map((m, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#718096", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: m.color, fontFamily: "'DM Mono', monospace" }}>{m.value}</div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={runAnalysis} disabled={loans.length === 0} style={{
              width: "100%", padding: "16px",
              background: loans.length > 0 ? "linear-gradient(135deg, #f6ad55, #ed8936)" : "#4a5568",
              border: "none", borderRadius: "12px", cursor: loans.length > 0 ? "pointer" : "not-allowed",
              fontSize: "15px", fontWeight: 700, color: "#1a1a2e",
              fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.3px",
              boxShadow: loans.length > 0 ? "0 8px 30px rgba(246,173,85,0.3)" : "none",
              transition: "all 0.3s",
            }}>
              {loans.length > 0 ? `🔍 Analyze ${loans.length} Loan${loans.length > 1 ? "s" : ""} — Find Savings` : "Add at least one loan to begin"}
            </button>
          </div>
        )}

        {/* ════ RESULTS STEP ════ */}
        {step === "results" && (
          <div style={{ opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.6s ease" }}>

            {activeResult && (
              <div style={{
                background: "linear-gradient(135deg, rgba(56,161,105,0.15), rgba(49,130,206,0.1))",
                border: "1.5px solid rgba(56,161,105,0.3)", borderRadius: "16px", padding: "24px", marginBottom: 20, textAlign: "center",
              }}>
                <div style={{ fontSize: "11px", color: "#68d391", textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, marginBottom: 8 }}>
                  Maximum Potential Savings
                </div>
                <div style={{ fontSize: "42px", fontWeight: 900, color: "#68d391", fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>
                  {formatINRFull(activeResult.savings)}
                </div>
                <div style={{ fontSize: "13px", color: "#a0aec0", marginTop: 8 }}>
                  on total interest of {formatINRFull(activeResult.currentTotalInterest)} across {formatINR(activeResult.totalPrincipal)} in loans
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px", padding: "20px",
              }}>
                <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16, textAlign: "center" }}>
                  Interest Comparison
                </div>
                {activeResult && (
                  <BarChart height={180} data={[
                    { label: "Current Interest", value: activeResult.currentTotalInterest, color: "linear-gradient(180deg, #fc8181, #e53e3e)" },
                    { label: "After Restructure", value: activeResult.newInterest, color: "linear-gradient(180deg, #68d391, #38a169)" },
                  ]} />
                )}
              </div>
              <div style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>
                  Savings Rate
                </div>
                {activeResult && <DonutChart current={activeResult.currentTotalInterest} saved={activeResult.savings} />}
                {activeResult && (
                  <div style={{ marginTop: 8, fontSize: "12px", color: "#a0aec0", textAlign: "center" }}>
                    EMI: {formatINRFull(activeResult.currentMonthlyEMI)} → {formatINRFull(activeResult.newEMI)}
                  </div>
                )}
              </div>
            </div>

            <div style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>
              Restructuring Strategies
            </div>

            {results.sort((a, b) => b.savings - a.savings).map((r, i) => {
              const strat = RESTRUCTURE_STRATEGIES.find(s => s.id === r.strategyId);
              const isActive = selectedStrategy === r.strategyId;
              const isBest = i === 0;
              return (
                <div key={r.strategyId} onClick={() => setSelectedStrategy(r.strategyId)} style={{
                  background: isActive ? "rgba(56,161,105,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${isActive ? "rgba(56,161,105,0.4)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: "12px", padding: "16px 20px", marginBottom: 8,
                  cursor: "pointer", transition: "all 0.3s",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {isBest && <span style={{
                        background: "#f6ad55", color: "#1a1a2e", fontSize: "9px", fontWeight: 800,
                        padding: "2px 8px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.5px",
                      }}>Best</span>}
                      <span style={{ fontWeight: 700, fontSize: "14px", color: isActive ? "#68d391" : "#e2e8f0" }}>
                        {strat?.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#718096", lineHeight: 1.5 }}>{r.details}</div>
                  </div>
                  <div style={{ textAlign: "right", marginLeft: 16, minWidth: 100 }}>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#68d391", fontFamily: "'DM Mono', monospace" }}>
                      {formatINR(r.savings)}
                    </div>
                    <div style={{ fontSize: "10px", color: "#718096" }}>saved ({r.savingsPercent.toFixed(0)}%)</div>
                  </div>
                </div>
              );
            })}

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={downloadReport} style={{
                flex: 1, padding: "14px",
                background: "linear-gradient(135deg, #3182ce, #2c5282)",
                border: "none", borderRadius: "12px", cursor: "pointer",
                fontSize: "14px", fontWeight: 700, color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: "0 6px 25px rgba(49,130,206,0.3)",
              }}>📄 Download Report</button>
              <button onClick={() => { setStep("input"); setResults([]); }} style={{
                padding: "14px 24px",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px", cursor: "pointer",
                fontSize: "14px", fontWeight: 600, color: "#a0aec0",
                fontFamily: "'DM Sans', sans-serif",
              }}>↻ New Analysis</button>
            </div>

            <div style={{
              marginTop: 24, padding: "14px 18px",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "10px", fontSize: "10px", color: "#4a5568", lineHeight: 1.6,
            }}>
              <strong style={{ color: "#718096" }}>Disclaimer:</strong> Savings are estimates based on standard amortization models. Actual results depend on lender policies, processing fees, prepayment penalties, and market conditions. Consult a qualified CA or financial advisor before restructuring.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
