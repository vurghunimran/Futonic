"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, isSameDay, parseISO } from "date-fns";
import {
  Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleUserRound,
  Copy, LayoutDashboard, LogOut, Plus, Search, Settings, Trash2, UserRoundPlus, Users, X,
} from "lucide-react";
import type { AgendaItem, FootballEntity } from "@/lib/types";
import { getTimingState, getWeekDays, moveWeek, weekLabel } from "@/lib/time";

type Page = "dashboard" | "clients" | "workers" | "settings";
type Worker = { id: string; name: string; surname: string; role: string };
type WorkItem = AgendaItem & { client: string; workerId: string };

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

const navigation = [
  { page: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { page: "clients" as const, label: "My Clients", icon: BriefcaseBusiness },
  { page: "workers" as const, label: "Workers", icon: Users },
  { page: "settings" as const, label: "Settings", icon: Settings },
];

export function Dashboard() {
  const router = useRouter();
  const [page, setPage] = useState<Page>("dashboard");
  const [clients, setClients] = useState<FootballEntity[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [work, setWork] = useState<WorkItem[]>([]);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"club" | "player">("player");
  const [toast, setToast] = useState("");
  const [workerOpen, setWorkerOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<WorkItem | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [results, setResults] = useState<FootballEntity[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [footballProvider, setFootballProvider] = useState("demo");
  const showToast = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    try {
      // Restore the administrator's selected data after hydration. The API/database
      // layer will replace this browser persistence during the next integration phase.
      setClients(JSON.parse(localStorage.getItem("futonic-clients") || "[]"));
      setWorkers(JSON.parse(localStorage.getItem("futonic-workers") || "[]"));
      setWork(JSON.parse(localStorage.getItem("futonic-work") || "[]"));
    } finally {
      setStorageReady(true);
    }
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("futonic-clients", JSON.stringify(clients));
    localStorage.setItem("futonic-workers", JSON.stringify(workers));
    localStorage.setItem("futonic-work", JSON.stringify(work));
  }, [clients, workers, work, storageReady]);
  useEffect(() => {
    if (!storageReady) return;
    const timeout = setTimeout(() => {
      fetch("/api/agenda/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: work }) })
        .then(async (response) => ({ response, data: await response.json().catch(() => ({})) }))
        .then(({ response, data }) => {
          if (!response.ok) return setToast(data.error || "Agenda could not synchronize");
          if (data.remindersSent) setToast(data.remindersSent === 1 ? "Telegram match reminder sent" : `${data.remindersSent} Telegram match reminders sent`);
          else if (data.remindersFailed) setToast("Telegram reminder failed. Reconnect the bot in Settings.");
          else if (data.urgentMatchCount && !data.telegramConnected) setToast("Urgent match saved. Connect Telegram in Settings to receive reminders.");
        })
        .catch(() => undefined);
    }, 500);
    return () => clearTimeout(timeout);
  }, [work, storageReady]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    if (query.trim().length < 3) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const response = await fetch(`/api/football/search?q=${encodeURIComponent(query.trim())}&type=${mode}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Search failed");
        setResults(data.results || []);
        setFootballProvider(data.provider || "demo");
      } catch (error) {
        if ((error as Error).name !== "AbortError") { setResults([]); setSearchError((error as Error).message); }
      } finally { setSearching(false); }
    }, 350);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [query, mode]);

  function selectPage(next: Page) {
    setPage(next);
    setProfileOpen(false);
    setNoticeOpen(false);
  }

  async function addClient(entity: FootballEntity) {
    if (clients.some((client) => client.id === entity.id)) return setToast(`${entity.name} is already in My Clients`);
    setClients((current) => [...current, entity]);
    setQuery("");
    setSearching(true);
    try {
      const params = new URLSearchParams({ teamId: entity.teamId || entity.id });
      if (entity.type === "player") params.set("playerName", entity.name);
      const response = await fetch(`/api/football/fixtures?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Fixtures could not be loaded");
      const incoming: WorkItem[] = (data.fixtures || []).map((fixture: AgendaItem) => ({ ...fixture, client: entity.name, workerId: "" }));
      setWork((current) => [...current, ...incoming.filter((fixture) => !current.some((saved) => saved.id === fixture.id))]);
      setToast(`${entity.name} added with ${incoming.length} upcoming match${incoming.length === 1 ? "" : "es"}`);
      setPage("dashboard");
    } catch (error) { setToast(`${entity.name} saved, but ${(error as Error).message.toLowerCase()}`); }
    finally { setSearching(false); }
  }

  function removeClient(entity: FootballEntity) {
    setClients((current) => current.filter((client) => client.id !== entity.id));
    setWork((current) => current.filter((item) => item.client !== entity.name));
    setToast(`${entity.name} and linked agenda work removed`);
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const pageTitle = navigation.find((item) => item.page === page)?.label || "Dashboard";
  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand brand-button" onClick={() => router.push("/login")} aria-label="Go to sign up"><div className="logo-wordmark" role="img" aria-label="Futonic" /></button>
      <nav className="nav">{navigation.map(({ page: target, label, icon: Icon }) => <button className={page === target ? "active" : ""} key={target} onClick={() => selectPage(target)}><Icon size={17} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="workspace"><div className="avatar">VM</div><div><div className="workspace-name">Vurghun M.</div><div className="workspace-role">Administrator</div></div></div></div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><div className="eyebrow">Creative operations</div><h1>{pageTitle}</h1></div>
        <div className="top-actions"><span className="date-hide top-date">{format(new Date(), "EEEE, MMMM d")}</span>
          <div className="menu-anchor"><button className={`icon-button ${noticeOpen ? "selected" : ""}`} aria-label="Notifications" onClick={() => { setNoticeOpen(!noticeOpen); setProfileOpen(false); }}><Bell size={17} /></button>{noticeOpen && <NotificationMenu work={work} onClose={() => setNoticeOpen(false)} />}</div>
          <div className="menu-anchor"><button className={`profile-button ${profileOpen ? "selected" : ""}`} aria-label="Profile menu" onClick={() => { setProfileOpen(!profileOpen); setNoticeOpen(false); }}><span className="avatar top-avatar">VM</span><ChevronDown size={14} /></button>{profileOpen && <div className="popover profile-menu"><div className="profile-summary"><strong>Vurghun M.</strong><span>Administrator</span></div><button onClick={() => selectPage("settings")}><Settings size={15} />Settings</button><button onClick={signOut}><LogOut size={15} />Sign out</button></div>}</div>
        </div>
      </header>
      <div className="content">
        {page === "dashboard" && <DashboardHome clients={clients} workers={workers} work={work} onSearch={() => selectPage("clients")} onAddWorker={() => setWorkerOpen(true)} onAddWork={() => setWorkOpen(true)} onOpenWork={setSelectedWork} onMoveWork={(item, amount) => { setWork((current) => current.map((entry) => entry.id === item.id ? { ...entry, startsAt: addDays(parseISO(entry.startsAt), amount).toISOString() } : entry)); setToast(`${item.title} moved ${amount < 0 ? "one day earlier" : "one day later"}`); }} onDeleteWork={(item) => { setWork((current) => current.filter((entry) => entry.id !== item.id)); setToast(`${item.title} removed from agenda`); }} />}
        {page === "clients" && <ClientsPage clients={clients} query={query} setQuery={setQuery} mode={mode} setMode={setMode} results={results} searching={searching} error={searchError} provider={footballProvider} onAdd={addClient} onRemove={removeClient} />}
        {page === "workers" && <WorkersPage workers={workers} onAdd={() => setWorkerOpen(true)} onRemove={(id) => setWorkers((current) => current.filter((worker) => worker.id !== id))} />}
        {page === "settings" && <SettingsPage onSaved={showToast} />}
      </div>
    </main>
    {workerOpen && <WorkerModal onClose={() => setWorkerOpen(false)} onAdd={(worker) => { setWorkers((current) => [...current, worker]); setWorkerOpen(false); setToast("Worker created"); }} />}
    {workOpen && <WorkModal clients={clients} workers={workers} onClose={() => setWorkOpen(false)} onAdd={(item) => { setWork((current) => [...current, item]); setWorkOpen(false); setToast("Work item created"); }} />}
    {selectedWork && <AssignmentDrawer item={selectedWork} workers={workers} onClose={() => setSelectedWork(null)} onSave={(item) => { setWork((current) => current.map((entry) => entry.id === item.id ? item : entry)); setSelectedWork(null); setToast("Assignment updated"); }} />}
    {toast && <div className="toast"><CheckCircle2 size={15} />{toast}</div>}
  </div>;
}

function DashboardHome({ clients, workers, work, onSearch, onAddWorker, onAddWork, onOpenWork, onMoveWork, onDeleteWork }: { clients: FootballEntity[]; workers: Worker[]; work: WorkItem[]; onSearch: () => void; onAddWorker: () => void; onAddWork: () => void; onOpenWork: (item: WorkItem) => void; onMoveWork: (item: WorkItem, amount: number) => void; onDeleteWork: (item: WorkItem) => void }) {
  return <>
    <section className="overview"><div className="welcome"><div className="eyebrow">Futonic workspace</div><h2>Your creative roster, your way.</h2><p>Only clients, workers and work selected by you appear here.</p></div><Metric label="My clients" value={String(clients.length)} note="Players and clubs" /><Metric label="Workers" value={String(workers.length)} note="Available to assign" /><Metric label="Open work" value={String(work.filter((item) => item.status !== "Completed").length)} note="Needs attention" /></section>
    <section className="quick-actions"><button onClick={onSearch}><Search size={19} /><span><strong>Add a client</strong><small>Find a player or club</small></span></button><button onClick={onAddWorker}><UserRoundPlus size={19} /><span><strong>Create worker</strong><small>Build your assignment team</small></span></button><button onClick={onAddWork}><Plus size={19} /><span><strong>Create work</strong><small>Add a manual design task</small></span></button></section>
    <AgendaCalendar work={work} onAddWork={onAddWork} onOpenWork={onOpenWork} onMoveWork={onMoveWork} onDeleteWork={onDeleteWork} />
  </>;
}

function AgendaCalendar({ work, onAddWork, onOpenWork, onMoveWork, onDeleteWork }: { work: WorkItem[]; onAddWork: () => void; onOpenWork: (item: WorkItem) => void; onMoveWork: (item: WorkItem, amount: number) => void; onDeleteWork: (item: WorkItem) => void }) {
  const [anchor, setAnchor] = useState(new Date());
  const days = getWeekDays(anchor);
  return <section className="calendar-card agenda-calendar">
    <div className="calendar-head"><div><div className="eyebrow">Main agenda</div><h2>Weekly design schedule</h2><p>{weekLabel(anchor)} · Asia/Baku (UTC+4)</p></div><div className="agenda-actions"><button className="button" aria-label="Previous week" onClick={() => setAnchor(moveWeek(anchor, -1))}><ChevronLeft size={15} /></button><button className="button" onClick={() => setAnchor(new Date())}>Today</button><button className="button" aria-label="Next week" onClick={() => setAnchor(moveWeek(anchor, 1))}><ChevronRight size={15} /></button><button className="button accent" onClick={onAddWork}><Plus size={15} />Add work</button></div></div>
    <div className="calendar-grid">{days.map((day) => { const dayWork = work.filter((item) => item.startsAt && isSameDay(parseISO(item.startsAt), day)); return <div className={`day ${isSameDay(day, new Date()) ? "today" : ""}`} key={day.toISOString()}><div className="day-head"><span className="day-name">{format(day, "EEE")}</span><span className="day-number">{format(day, "d")}</span></div><div className="day-body">{dayWork.length ? dayWork.sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((item) => { const timing = getTimingState(item); return <div className="agenda-item-wrap" key={item.id}><div className="agenda-card-tools"><button aria-label={`Move ${item.title} one day earlier`} title="Move one day earlier" onClick={() => onMoveWork(item, -1)}><ChevronLeft size={12} /></button><button aria-label={`Move ${item.title} one day later`} title="Move one day later" onClick={() => onMoveWork(item, 1)}><ChevronRight size={12} /></button><button className="agenda-delete" aria-label={`Delete ${item.title}`} title="Delete from agenda" onClick={() => onDeleteWork(item)}><X size={12} /></button></div><button className={`agenda-item ${timing.kind}`} onClick={() => onOpenWork(item)}><div className="agenda-time">{format(parseISO(item.startsAt), "HH:mm")}</div>{timing.label && <div className="agenda-urgency">{timing.label}</div>}{item.selectedPlayer && <div className="agenda-player"><CircleUserRound size={11} />{item.selectedPlayer}</div>}<strong>{item.title}</strong><span>{item.competition || item.client}</span><div className="badge">{item.status}</div></button></div>; }) : <button className="agenda-empty" onClick={onAddWork}><Plus size={13} />Add work</button>}</div></div>; })}</div>
    {!work.length && <div className="agenda-empty-banner"><CalendarDays size={18} /><span>Your agenda is empty. Add only the work and matches you choose.</span></div>}
  </section>;
}

function ClientsPage({ clients, query, setQuery, mode, setMode, results, searching, error, provider, onAdd, onRemove }: { clients: FootballEntity[]; query: string; setQuery: (value: string) => void; mode: "club" | "player"; setMode: (mode: "club" | "player") => void; results: FootballEntity[]; searching: boolean; error: string; provider: string; onAdd: (entity: FootballEntity) => void; onRemove: (entity: FootballEntity) => void }) {
  const providerLabel = provider === "thesportsdb" ? "TheSportsDB live" : provider === "api-football" ? "API-Football live" : "Demo data";
  return <><section className="page-intro"><div><div className="eyebrow">Your roster</div><h2>My Clients</h2><p>Search the football database. Selecting a client imports upcoming matches into your agenda.</p></div><span className={`provider-badge ${provider !== "demo" ? "live" : ""}`}>{providerLabel}</span></section><section className="search-panel"><div className="search-row"><div className="search-box"><Search size={17} /><input aria-label="Search clients" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${mode === "club" ? "clubs" : "players"} — minimum 3 letters`} /></div><div className="segmented"><button className={mode === "player" ? "active" : ""} onClick={() => setMode("player")}>Players</button><button className={mode === "club" ? "active" : ""} onClick={() => setMode("club")}>Clubs</button></div></div>{query.length >= 3 && <div className="results">{searching ? <div className="results-empty">Searching the football database…</div> : error ? <div className="results-error">{error}</div> : results.length ? results.map((entity) => <ClientCard entity={entity} action={<button className="mini-action" onClick={() => onAdd(entity)}><Plus size={14} />Add & import games</button>} key={entity.id} />) : <div className="results-empty">No results found.</div>}</div>}</section><section className="panel"><PanelHeader title="Saved clients" note={`${clients.length} selected`} />{clients.length ? <div className="client-grid">{clients.map((entity) => <ClientCard entity={entity} action={<button className="icon-button subtle" aria-label={`Remove ${entity.name}`} onClick={() => onRemove(entity)}><Trash2 size={14} /></button>} key={entity.id} />)}</div> : <EmptyState icon={<CircleUserRound size={25} />} title="No clients selected" text="Search above and add a player or club. Their upcoming matches will appear in the agenda." />}</section></>;
}

function ClientCard({ entity, action }: { entity: FootballEntity; action: React.ReactNode }) { return <div className="client-card"><div className={`crest large ${entity.image ? "has-image" : ""}`} style={entity.image ? { backgroundImage: `url(${entity.image})` } : undefined}>{entity.image ? "" : entity.crest}</div><div><span className="entity-type">{entity.type}</span><strong>{entity.name}</strong><small>{entity.subtitle}{entity.club ? ` · ${entity.club}` : ""}</small></div>{action}</div>; }

function WorkersPage({ workers, onAdd, onRemove }: { workers: Worker[]; onAdd: () => void; onRemove: (id: string) => void }) { return <><section className="page-intro"><div><div className="eyebrow">Assignment team</div><h2>Workers</h2><p>Workers created here become available in every Assign menu.</p></div><button className="button accent" onClick={onAdd}><UserRoundPlus size={16} />Create worker</button></section><section className="panel">{workers.length ? <div className="worker-grid">{workers.map((worker) => <article className="worker-card" key={worker.id}><div className="avatar worker-avatar">{worker.name[0]}{worker.surname[0]}</div><div><strong>{worker.name} {worker.surname}</strong><span>{worker.role}</span></div><button className="icon-button subtle" onClick={() => onRemove(worker.id)} aria-label={`Remove ${worker.name}`}><Trash2 size={14} /></button></article>)}</div> : <EmptyState icon={<Users size={25} />} title="No workers created" text="Create a worker with a name, surname and role to start assigning work." action="Create worker" onAction={onAdd} />}</section></>; }

function SettingsPage({ onSaved }: { onSaved: (message: string) => void }) {
  const [phone, setPhone] = useState("");
  const [activation, setActivation] = useState("");
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [accountLoading, setAccountLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      fetch("/api/settings/account").then(async (response) => ({ response, data: await response.json().catch(() => ({})) })),
      fetch("/api/telegram/activation").then(async (response) => ({ response, data: await response.json().catch(() => ({})) })),
    ]).then(([account, telegram]) => {
      if (account.response.ok) setPhone(account.data.phone || ""); else onSaved(account.data.error || "Could not load account");
      if (telegram.response.ok) { setActivation(telegram.data.telegramUrl); setTelegramConnected(telegram.data.connected); }
      else onSaved(telegram.data.error || "Could not load Telegram status");
    }).catch(() => onSaved("Could not load account settings")).finally(() => setAccountLoading(false));
  }, [onSaved]);
  async function regenerateActivation() { const response = await fetch("/api/telegram/activation", { method: "POST" }); const data = await response.json(); if (response.ok) { setActivation(data.telegramUrl); setTelegramConnected(false); onSaved("New activation link generated"); } else onSaved(data.error || "Could not generate activation link"); }
  async function save(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const response = await fetch("/api/settings/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone }) }); const data = await response.json().catch(() => ({})); if (response.ok) { setPhone(data.phone || phone); onSaved("Phone number saved to your account"); } else onSaved(data.error || "Could not save account settings"); }
  async function sendTestNotification() { const response = await fetch("/api/telegram/test", { method: "POST" }); const data = await response.json().catch(() => ({})); onSaved(response.ok ? "Test notification sent to Telegram" : data.error || "Test notification failed"); }
  return <><section className="page-intro"><div><div className="eyebrow">Account</div><h2>Settings</h2><p>Manage administrator access and Telegram activation.</p></div></section><div className="settings-grid"><section className="panel settings-card"><PanelHeader title="Contact & security" note="Your database account" /><form onSubmit={save}><Field label="Phone number"><input type="tel" value={phone} disabled={accountLoading} placeholder={accountLoading ? "Loading your account…" : "+994 50 123 45 67"} onChange={(event) => setPhone(event.target.value)} /></Field><p className="settings-help">This is the number used to sign in and identify the Telegram-connected account.</p><button className="button accent settings-save" disabled={accountLoading || !phone}>Save changes</button></form></section><section className="panel settings-card"><PanelHeader title="Telegram activation" note={telegramConnected ? "Connected to this account" : "Connect the administrator account"} /><Field label="Activation link"><div className="copy-field"><input value={activation} placeholder="Configure Telegram environment variables" readOnly /><button className="icon-button" disabled={!activation} onClick={() => { navigator.clipboard.writeText(activation); onSaved("Activation link copied"); }}><Copy size={15} /></button></div></Field><p className="settings-help">{telegramConnected ? `Telegram notifications are active for ${phone || "this account"}.` : "Open this link and tap Start in Telegram to activate match reminders."}</p><div className="drawer-actions"><button className="button" onClick={regenerateActivation}>Generate new link</button><button className="button accent" disabled={!telegramConnected} onClick={sendTestNotification}>Send test notification</button></div></section></div></>;
}

function WorkerModal({ onClose, onAdd }: { onClose: () => void; onAdd: (worker: Worker) => void }) { const [name, setName] = useState(""); const [surname, setSurname] = useState(""); const [role, setRole] = useState("Graphic Designer"); return <Modal title="Create worker" eyebrow="Assignment team" onClose={onClose}><Field label="Name"><input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="Surname"><input value={surname} onChange={(event) => setSurname(event.target.value)} /></Field><Field label="Role"><input value={role} onChange={(event) => setRole(event.target.value)} /></Field><div className="drawer-actions"><button className="button" onClick={onClose}>Cancel</button><button className="button accent" disabled={!name.trim() || !surname.trim() || !role.trim()} onClick={() => onAdd({ id: crypto.randomUUID(), name: name.trim(), surname: surname.trim(), role: role.trim() })}>Create worker</button></div></Modal>; }

function WorkModal({ clients, workers, onClose, onAdd }: { clients: FootballEntity[]; workers: Worker[]; onClose: () => void; onAdd: (item: WorkItem) => void }) {
  const [type, setType] = useState<"task" | "match">("task");
  const [title, setTitle] = useState("");
  const [client, setClient] = useState(clients[0]?.name || "");
  const [workerId, setWorkerId] = useState("");
  const [startsAt, setStartsAt] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd'T'15:00"));
  const [competition, setCompetition] = useState("Azerbaijan Premier League");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [player, setPlayer] = useState("");
  const [venue, setVenue] = useState("");
  const valid = startsAt && (type === "task" ? title.trim() : home.trim() && away.trim() && competition.trim());

  function createItem() {
    const common = { id: crypto.randomUUID(), kind: "manual" as const, client: client || "No client", workerId, startsAt: new Date(startsAt).toISOString(), status: workerId ? "Assigned" as const : "Unassigned" as const, priority: "Medium" as const };
    if (type === "match") {
      onAdd({ ...common, title: `${home.trim()} vs ${away.trim()}`, home: home.trim(), away: away.trim(), homeCode: initials(home), awayCode: initials(away), competition: competition.trim(), venue: venue.trim() || undefined, selectedPlayer: player.trim() || undefined, fixtureStatus: "Manually added" });
      return;
    }
    onAdd({ ...common, title: title.trim() });
  }

  return <Modal title="Create work" eyebrow={type === "match" ? "Manual match" : "Manual design task"} onClose={onClose}>
    <div className="segmented work-type"><button className={type === "task" ? "active" : ""} onClick={() => setType("task")}>Design task</button><button className={type === "match" ? "active" : ""} onClick={() => setType("match")}>Manual match</button></div>
    {type === "task" ? <Field label="Work title"><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Player announcement artwork" /></Field> : <>
      <Field label="Competition"><input list="manual-competitions" value={competition} onChange={(event) => setCompetition(event.target.value)} placeholder="Enter league or cup" /><datalist id="manual-competitions"><option value="Azerbaijan Premier League" /><option value="Azerbaijan Cup" /><option value="Kazakhstan Premier League" /><option value="Kazakhstan Cup" /></datalist></Field>
      <div className="two-col"><Field label="Home club"><input value={home} onChange={(event) => setHome(event.target.value)} placeholder="Home team" /></Field><Field label="Away club"><input value={away} onChange={(event) => setAway(event.target.value)} placeholder="Away team" /></Field></div>
      <Field label="Player focus (optional)"><input value={player} onChange={(event) => setPlayer(event.target.value)} placeholder="Player name shown on the match card" /></Field>
      <Field label="Venue (optional)"><input value={venue} onChange={(event) => setVenue(event.target.value)} placeholder="Stadium · City" /></Field>
    </>}
    <Field label={type === "match" ? "Kickoff date and time" : "Agenda date and time"}><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></Field>
    <Field label="Client"><select value={client} onChange={(event) => setClient(event.target.value)}><option value="">No client</option>{clients.map((entry) => <option key={entry.id}>{entry.name}</option>)}</select></Field>
    <Field label="Assign worker"><select value={workerId} onChange={(event) => setWorkerId(event.target.value)}><option value="">Unassigned</option>{workers.map((worker) => <option value={worker.id} key={worker.id}>{worker.name} {worker.surname} · {worker.role}</option>)}</select></Field>
    <div className="drawer-actions"><button className="button" onClick={onClose}>Cancel</button><button className="button accent" disabled={!valid} onClick={createItem}>Add to agenda</button></div>
  </Modal>;
}

function AssignmentDrawer({ item, workers, onClose, onSave }: { item: WorkItem; workers: Worker[]; onClose: () => void; onSave: (item: WorkItem) => void }) {
  const [draft, setDraft] = useState(item);
  const isMatch = item.kind === "fixture" || Boolean(item.home || item.away);
  return <Modal title={draft.title} eyebrow={item.client} onClose={onClose}>
    <Field label="Title"><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></Field>
    <Field label={isMatch ? "Kickoff date and time" : "Agenda date and time"}><input type="datetime-local" value={format(parseISO(draft.startsAt), "yyyy-MM-dd'T'HH:mm")} onChange={(event) => event.target.value && setDraft({ ...draft, startsAt: new Date(event.target.value).toISOString() })} /></Field>
    {isMatch && <>
      <Field label="Competition"><input value={draft.competition || ""} onChange={(event) => setDraft({ ...draft, competition: event.target.value })} /></Field>
      <div className="two-col"><Field label="Home club"><input value={draft.home || ""} onChange={(event) => setDraft({ ...draft, home: event.target.value, homeCode: initials(event.target.value) })} /></Field><Field label="Away club"><input value={draft.away || ""} onChange={(event) => setDraft({ ...draft, away: event.target.value, awayCode: initials(event.target.value) })} /></Field></div>
      <Field label="Player focus"><input value={draft.selectedPlayer || ""} onChange={(event) => setDraft({ ...draft, selectedPlayer: event.target.value || undefined })} placeholder="Optional" /></Field>
      <Field label="Venue"><input value={draft.venue || ""} onChange={(event) => setDraft({ ...draft, venue: event.target.value || undefined })} placeholder="Optional" /></Field>
    </>}
    <div className="assignment-summary"><BriefcaseBusiness size={19} /><span>Edit details or assign this work to a worker created in the Workers panel.</span></div>
    <Field label="Assign worker"><select value={draft.workerId} onChange={(event) => setDraft({ ...draft, workerId: event.target.value, status: event.target.value ? "Assigned" : "Unassigned" })}><option value="">Unassigned</option>{workers.map((worker) => <option value={worker.id} key={worker.id}>{worker.name} {worker.surname} · {worker.role}</option>)}</select></Field>
    <Field label="Status"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as WorkItem["status"] })}><option>Unassigned</option><option>Assigned</option><option>In Progress</option><option>Ready for Review</option><option>Completed</option><option>Cancelled</option></select></Field>
    {!workers.length && <p className="inline-warning">Create a worker first; the assignment list is currently empty.</p>}
    <div className="drawer-actions"><button className="button" onClick={onClose}>Cancel</button><button className="button accent" disabled={!draft.title.trim()} onClick={() => onSave({ ...draft, title: draft.title.trim() })}>Save changes</button></div>
  </Modal>;
}

function NotificationMenu({ work, onClose }: { work: WorkItem[]; onClose: () => void }) { const latest = work[work.length - 1]; return <div className="popover notification-menu"><div className="popover-head"><strong>Notifications</strong><button aria-label="Close" onClick={onClose}><X size={14} /></button></div>{latest ? <div className="notification-item"><div className="notice-dot" /><div><strong>{latest.title}</strong><span>{latest.status} · {latest.client}</span></div></div> : <div className="notification-empty"><Bell size={20} /><strong>You’re all caught up</strong><span>No notifications yet.</span></div>}</div>; }

function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) { return <div className="backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="drawer" role="dialog" aria-modal="true"><div className="drawer-head"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</aside></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="form-row"><label>{label}</label>{children}</div>; }
function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong><span>{note}</span></div>; }
function PanelHeader({ title, note, action }: { title: string; note: string; action?: React.ReactNode }) { return <div className="panel-head"><div><h3>{title}</h3><p>{note}</p></div>{action}</div>; }
function EmptyState({ icon, title, text, action, onAction }: { icon: React.ReactNode; title: string; text: string; action?: string; onAction?: () => void }) { return <div className="empty-state"><div className="empty-icon">{icon}</div><strong>{title}</strong><p>{text}</p>{action && <button className="button accent" onClick={onAction}>{action}</button>}</div>; }
