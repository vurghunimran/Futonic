"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, LockKeyhole, UserPlus } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(mode === "register" ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return setError(result.error || "We could not continue. Check your details.");
    if (result.telegramUrl) window.open(result.telegramUrl, "_blank", "noopener,noreferrer");
    router.push("/dashboard");
    router.refresh();
  }

  return <main className="login-shell">
    <section className="login-brand-panel">
      <div className="logo-wordmark login-wordmark" role="img" aria-label="Futonic" />
      <div>
        <div className="eyebrow" style={{ color: "#fff8ef" }}>Design Match Agenda</div>
        <h1>Players first.<br />Deadlines handled.</h1>
        <p>Your private command centre for player-led football creative work, assignments and matchday delivery.</p>
      </div>
      <small>Built for focused creative teams.</small>
    </section>
    <section className="login-form-panel">
      <div className="login-icon">{mode === "register" ? <UserPlus size={22} /> : <LockKeyhole size={22} />}</div>
      <h2>{mode === "register" ? "Create your account" : "Welcome back"}</h2>
      <p>{mode === "register" ? "Register with your mobile number and connect Telegram." : "Sign in with your registered mobile number."}</p>
      <div className="segmented login-tabs">
        <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
        <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Sign in</button>
      </div>
      <form onSubmit={submit}>
        {mode === "register" && <div className="two-col"><div className="form-row"><label>Name</label><input name="name" autoComplete="given-name" required /></div><div className="form-row"><label>Surname</label><input name="surname" autoComplete="family-name" required /></div></div>}
        <div className="form-row"><label>Telephone</label><input name="phone" type="tel" autoComplete="tel" placeholder="+994 50 123 45 67" defaultValue={mode === "login" ? "+994501234567" : ""} required /></div>
        {error && <p className="form-error">{error}</p>}
        <button className="button accent login-submit" disabled={loading}>{loading ? "Please wait…" : mode === "register" ? "Register & connect Telegram" : "Open workspace"}<ArrowRight size={16} /></button>
      </form>
      {mode === "register" && <div className="telegram-note"><Bot size={18} /><span>After registration, Telegram opens the Futonic bot. Tap <b>Start</b> once—Telegram requires this confirmation—then reminders activate automatically.</span></div>}
      <p className="demo-hint">Demo sign-in number: +994 50 123 45 67</p>
    </section>
  </main>;
}
