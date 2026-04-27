import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

const DB_KEY = "cardlink_db";
const defaultDb = { users: [], companies: [], cards: [], contacts: [] };

function genId() { return Math.random().toString(36).slice(2, 10); }
function initials(name) { return name ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?"; }

const COLORS = ["#185FA5", "#0F6E56", "#534AB7", "#993556", "#D85A30"];
function cardColor(name) { return COLORS[name.charCodeAt(0) % COLORS.length]; }

// ── UI helpers ──────────────────────────────────────────────────────────────

function Avatar({ name, size = 44 }) {
  const c = cardColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: c + "22",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 600, fontSize: size * 0.32, color: c,
      border: `1.5px solid ${c}44`, flexShrink: 0,
    }}>{initials(name)}</div>
  );
}

function Badge({ children, color = "#185FA5" }) {
  return (
    <span style={{
      background: color + "18", color, fontSize: 11, fontWeight: 500,
      padding: "2px 8px", borderRadius: 20, border: `0.5px solid ${color}44`,
    }}>{children}</span>
  );
}

function Btn({ children, onClick, variant = "default", style = {} }) {
  const s = {
    padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: "pointer", border: "1px solid #dde1f0",
    background: "#fff", color: "#1a1a2e", transition: "opacity 0.1s", ...style,
  };
  if (variant === "primary") Object.assign(s, { background: "#185FA5", color: "#fff", border: "none" });
  if (variant === "danger")  Object.assign(s, { background: "#fde8e8", color: "#A32D2D", border: "1px solid #f3a0a0" });
  return <button onClick={onClick} style={s}>{children}</button>;
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e8eaf0", borderRadius: 14,
      padding: "20px 22px", ...style,
    }}>{children}</div>
  );
}

// ── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [db, setDb]         = useState(null);
  const [session, setSession] = useState(null);
  const [page, setPage]     = useState("login");
  const [view, setView]     = useState(null);
  const [toast, setToast]   = useState(null);

  useEffect(() => {
    try { setDb(JSON.parse(localStorage.getItem(DB_KEY)) || defaultDb); }
    catch { setDb(defaultDb); }
  }, []);

  const save = (newDb) => {
    setDb(newDb);
    localStorage.setItem(DB_KEY, JSON.stringify(newDb));
  };

  const toast$ = (msg, color = "#185FA5") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2600);
  };

  if (!db) return <div style={{ padding: 32, color: "#888" }}>Загрузка...</div>;

  const user = session ? db.users.find(u => u.id === session) : null;
  const go   = (p, v = null) => { setPage(p); setView(v); };

  return (
    <div style={{ minHeight: "100vh" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: toast.color, color: "#fff", padding: "9px 22px",
          borderRadius: 24, fontSize: 13, fontWeight: 500, zIndex: 9999,
        }}>{toast.msg}</div>
      )}

      {!user ? (
        <AuthPage db={db} save={save} setSession={setSession} go={go} toast$={toast$} />
      ) : (
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 16px 60px" }}>
          <Nav user={user} page={page} go={go} setSession={setSession} />
          {page === "dashboard" && <Dashboard db={db} save={save} user={user} go={go} toast$={toast$} />}
          {page === "card"      && view && <CardPage db={db} save={save} user={user} cardId={view} go={go} toast$={toast$} />}
          {page === "newcard"   && <NewCard db={db} save={save} user={user} go={go} toast$={toast$} />}
          {page === "contacts"  && <ContactsPage db={db} user={user} toast$={toast$} />}
          {page === "company"   && <CompanyPage db={db} save={save} user={user} go={go} toast$={toast$} />}
        </div>
      )}
    </div>
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function AuthPage({ db, save, setSession, go, toast$ }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");

  const submit = () => {
    if (mode === "login") {
      const u = db.users.find(u => u.email === email && u.password === pass);
      if (!u) { toast$("Неверные данные", "#A32D2D"); return; }
      setSession(u.id); go("dashboard");
    } else {
      if (!name || !email || !pass) { toast$("Заполните все поля", "#A32D2D"); return; }
      if (db.users.find(u => u.email === email)) { toast$("Email уже занят", "#A32D2D"); return; }
      const u = { id: genId(), name, email, password: pass };
      save({ ...db, users: [...db.users, u] });
      setSession(u.id); go("dashboard");
      toast$("Добро пожаловать, " + name + "!");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: "#185FA5" }}>CardLink</div>
        <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Цифровые визитки с NFC</div>
      </div>
      <Card style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
              background: mode === m ? "#185FA5" : "transparent",
              color: mode === m ? "#fff" : "#888",
              border: mode === m ? "none" : "1px solid #e8eaf0",
            }}>{m === "login" ? "Войти" : "Регистрация"}</button>
          ))}
        </div>
        {mode === "register" && <Field label="Имя" value={name} onChange={setName} placeholder="Иван Иванов" />}
        <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@company.com" />
        <Field label="Пароль" value={pass} onChange={setPass} type="password" placeholder="••••••••" />
        <Btn variant="primary" onClick={submit} style={{ width: "100%", padding: "10px 0", marginTop: 4 }}>
          {mode === "login" ? "Войти" : "Создать аккаунт"}
        </Btn>
      </Card>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav({ user, page, go, setSession }) {
  const tabs = [
    { id: "dashboard", label: "Визитки" },
    { id: "company",   label: "Компания" },
    { id: "contacts",  label: "Контакты" },
  ];
  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "14px 0", marginBottom: 12,
      borderBottom: "1px solid #e8eaf0", gap: 4,
    }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: "#185FA5", marginRight: 16 }}>CardLink</span>
      {tabs.map(t => (
        <button key={t.id} onClick={() => go(t.id)} style={{
          padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
          background: page === t.id ? "#185FA518" : "transparent",
          color: page === t.id ? "#185FA5" : "#888",
          border: page === t.id ? "1px solid #185FA544" : "1px solid transparent",
        }}>{t.label}</button>
      ))}
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 12, color: "#aaa", marginRight: 8 }}>{user.name}</span>
      <button onClick={() => setSession(null)} style={{ fontSize: 11, color: "#bbb", background: "none", border: "none", cursor: "pointer" }}>Выйти</button>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ db, save, user, go, toast$ }) {
  const cards = db.cards.filter(c => c.userId === user.id);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0 20px" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Мои визитки</div>
          <div style={{ fontSize: 13, color: "#888" }}>{cards.length} шт.</div>
        </div>
        <Btn variant="primary" onClick={() => go("newcard")}>+ Новая визитка</Btn>
      </div>
      {cards.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🪪</div>
          Нет визиток. Создайте первую!
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {cards.map(c => <CardTile key={c.id} card={c} onClick={() => go("card", c.id)} />)}
        </div>
      )}
    </div>
  );
}

function CardTile({ card, onClick }) {
  const color = cardColor(card.name);
  return (
    <Card style={{ cursor: "pointer" }} onClick={onClick}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Avatar name={card.name} size={40} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{card.name}</div>
          <div style={{ fontSize: 12, color: "#888" }}>{card.position || "—"}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>{card.company || card.email || ""}</div>
      <div style={{ display: "flex", gap: 4 }}>
        <Badge color={color}>Активна</Badge>
        {card.nfc && <Badge color="#0F6E56">NFC</Badge>}
      </div>
    </Card>
  );
}

// ── New Card ──────────────────────────────────────────────────────────────────

function NewCard({ db, save, user, go, toast$ }) {
  const [f, setF] = useState({ name:"", position:"", company:"", phone:"", email:"", website:"", linkedin:"", telegram:"", description:"" });
  const u = k => v => setF(p => ({ ...p, [k]: v }));

  const create = () => {
    if (!f.name) { toast$("Введите имя", "#A32D2D"); return; }
    const card = { ...f, id: genId(), userId: user.id, nfc: false, createdAt: Date.now() };
    save({ ...db, cards: [...db.cards, card] });
    toast$("Визитка создана!"); go("card", card.id);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 20px" }}>
        <button onClick={() => go("dashboard")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#888" }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Новая визитка</div>
      </div>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Field label="Имя *"      value={f.name}      onChange={u("name")}      placeholder="Иван Иванов" />
          <Field label="Должность"  value={f.position}  onChange={u("position")}  placeholder="CEO" />
          <Field label="Компания"   value={f.company}   onChange={u("company")}   placeholder="ACME Corp" />
          <Field label="Телефон"    value={f.phone}     onChange={u("phone")}     placeholder="+7 701 000 00 00" />
          <Field label="Email"      value={f.email}     onChange={u("email")}     placeholder="you@company.com" />
          <Field label="Сайт"       value={f.website}   onChange={u("website")}   placeholder="https://..." />
          <Field label="LinkedIn"   value={f.linkedin}  onChange={u("linkedin")}  placeholder="linkedin.com/in/..." />
          <Field label="Telegram"   value={f.telegram}  onChange={u("telegram")}  placeholder="@username" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Описание</label>
          <textarea value={f.description} onChange={e => u("description")(e.target.value)}
            rows={3} placeholder="Краткое описание..."
            style={{ resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <Btn variant="primary" onClick={create} style={{ width: "100%", padding: "10px 0" }}>Создать визитку</Btn>
      </Card>
    </div>
  );
}

// ── Card Page ─────────────────────────────────────────────────────────────────

function CardPage({ db, save, user, cardId, go, toast$ }) {
  const [tab, setTab]         = useState("view");
  const [editing, setEditing] = useState(false);
  const [editF, setEditF]     = useState(null);
  const [lead, setLead]       = useState({ name: "", phone: "", email: "" });
  const [leadSent, setLeadSent] = useState(false);

  const card = db.cards.find(c => c.id === cardId);
  if (!card) return <div style={{ padding: 32, color: "#aaa" }}>Визитка не найдена</div>;

  const isOwner = card.userId === user.id;
  const color   = cardColor(card.name);
  const cardUrl = `${window.location.origin}/#/c/${card.id}`;

  const ef = k => v => setEditF(p => ({ ...p, [k]: v }));
  const saveEdit = () => {
    save({ ...db, cards: db.cards.map(c => c.id === card.id ? { ...editF } : c) });
    setEditing(false); toast$("Сохранено!");
  };

  const toggleNfc = () => {
    save({ ...db, cards: db.cards.map(c => c.id === card.id ? { ...c, nfc: !c.nfc } : c) });
    toast$(card.nfc ? "NFC-метка отвязана" : "NFC-метка привязана!", card.nfc ? "#A32D2D" : "#0F6E56");
  };

  const sendLead = () => {
    if (!lead.name || !lead.phone) { toast$("Введите имя и телефон", "#A32D2D"); return; }
    save({ ...db, contacts: [...db.contacts, { id: genId(), fromCard: card.id, toUser: card.userId, capturedBy: user.id, ...lead, createdAt: Date.now() }] });
    setLeadSent(true); toast$("Контакт отправлен!", "#0F6E56");
  };

  const downloadVcard = () => {
    const vc = `BEGIN:VCARD\nVERSION:3.0\nFN:${card.name}\nTITLE:${card.position||""}\nORG:${card.company||""}\nTEL:${card.phone||""}\nEMAIL:${card.email||""}\nURL:${card.website||""}\nEND:VCARD`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([vc], { type: "text/vcard" }));
    a.download = card.name.replace(/ /g,"_") + ".vcf";
    a.click(); toast$("vCard скачан!");
  };

  const TABS = [["view","Визитка"],["qr","QR-код"],["nfc","NFC"],["leads","Лиды"]];

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, margin:"8px 0 16px" }}>
        <button onClick={() => go("dashboard")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"#888" }}>←</button>
        <div style={{ fontSize:18, fontWeight:600, flex:1 }}>{card.name}</div>
        {isOwner && <>
          <Btn onClick={() => { setEditF({ ...card }); setEditing(true); }}>Редактировать</Btn>
          <Btn variant="danger" onClick={() => { save({ ...db, cards: db.cards.filter(c => c.id !== card.id) }); go("dashboard"); toast$("Удалено","#A32D2D"); }}>Удалить</Btn>
        </>}
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {TABS.map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:500, cursor:"pointer",
            background: tab===id ? color+"18":"transparent",
            color: tab===id ? color:"#888",
            border: tab===id ? `1px solid ${color}44`:"1px solid transparent",
          }}>{label}</button>
        ))}
      </div>

      {/* VIEW */}
      {tab === "view" && (
        editing && editF ? (
          <Card>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Редактирование</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
              {[["name","Имя"],["position","Должность"],["company","Компания"],["phone","Телефон"],["email","Email"],["website","Сайт"],["linkedin","LinkedIn"],["telegram","Telegram"]].map(([k,l]) => (
                <Field key={k} label={l} value={editF[k]||""} onChange={ef(k)} />
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn variant="primary" onClick={saveEdit}>Сохранить</Btn>
              <Btn onClick={() => setEditing(false)}>Отмена</Btn>
            </div>
          </Card>
        ) : (
          <div>
            <div style={{ background:`${color}0d`, border:`1px solid ${color}22`, borderRadius:14, padding:22, marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:16, marginBottom:14 }}>
                <Avatar name={card.name} size={60} />
                <div>
                  <div style={{ fontSize:20, fontWeight:700 }}>{card.name}</div>
                  <div style={{ fontSize:13, color:"#666", marginTop:2 }}>{card.position}</div>
                  <div style={{ fontSize:13, color, marginTop:2, fontWeight:600 }}>{card.company}</div>
                </div>
              </div>
              {card.description && <div style={{ fontSize:13, color:"#666", marginBottom:14, lineHeight:1.6 }}>{card.description}</div>}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {card.phone    && <InfoRow label="Телефон"  value={card.phone} />}
                {card.email    && <InfoRow label="Email"    value={card.email} />}
                {card.website  && <InfoRow label="Сайт"     value={card.website} />}
                {card.linkedin && <InfoRow label="LinkedIn" value={card.linkedin} />}
                {card.telegram && <InfoRow label="Telegram" value={card.telegram} />}
              </div>
            </div>
            <Btn onClick={downloadVcard} style={{ width:"100%", marginBottom:8 }}>💾 Сохранить контакт (vCard)</Btn>
            <div style={{ padding:"8px 12px", background:"#f5f6fa", borderRadius:8, fontSize:12, color:"#888" }}>
              🔗 <span style={{ color:"#185FA5" }}>{cardUrl}</span>
            </div>
          </div>
        )
      )}

      {/* QR */}
      {tab === "qr" && (
        <div style={{ display:"flex", justifyContent:"center" }}>
          <Card style={{ textAlign:"center", maxWidth:320 }}>
            <div style={{ display:"inline-block", padding:12, background:"#fff", borderRadius:8, border:"1px solid #e8eaf0", marginBottom:16 }}>
              <QRCodeSVG value={cardUrl} size={180} fgColor="#185FA5" />
            </div>
            <div style={{ fontSize:13, color:"#888", marginBottom:16 }}>
              При сканировании открывается ваша визитка
              <div style={{ color:"#185FA5", marginTop:4, wordBreak:"break-all" }}>{cardUrl}</div>
            </div>
            <Btn variant="primary" onClick={() => toast$("QR скачан!")}>Скачать QR-код</Btn>
          </Card>
        </div>
      )}

      {/* NFC */}
      {tab === "nfc" && (
        <div>
          <Card style={{ textAlign:"center", marginBottom:14 }}>
            <div style={{ fontSize:38, marginBottom:10 }}>📡</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>
              {card.nfc ? "NFC-метка привязана ✓" : "NFC-метка не привязана"}
            </div>
            <div style={{ fontSize:13, color:"#888", maxWidth:300, margin:"0 auto 18px" }}>
              {card.nfc
                ? "При сканировании метки откроется ваша визитка"
                : "Привяжите NFC-метку, чтобы делиться визиткой одним касанием"}
            </div>
            {isOwner && (
              <Btn variant={card.nfc ? "danger" : "primary"} onClick={toggleNfc}>
                {card.nfc ? "Отвязать метку" : "Записать на NFC-метку"}
              </Btn>
            )}
          </Card>
          <Card>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>Как записать на NFC-метку:</div>
            {["Нажмите «Записать на NFC-метку»","Приложите телефон к NFC-метке","Дождитесь подтверждения"].map((s,i) => (
              <div key={i} style={{ display:"flex", gap:10, marginBottom:8, fontSize:13 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", background:"#185FA518", color:"#185FA5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                {s}
              </div>
            ))}
            <div style={{ fontSize:11, color:"#aaa", marginTop:6 }}>* Web NFC API поддерживается в Chrome на Android</div>
          </Card>
        </div>
      )}

      {/* LEADS */}
      {tab === "leads" && (
        isOwner ? <LeadsView db={db} card={card} toast$={toast$} /> : (
          <Card>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>Оставить свой контакт</div>
            <div style={{ fontSize:13, color:"#888", marginBottom:16 }}>{card.name} получит ваши данные</div>
            {leadSent ? (
              <div style={{ textAlign:"center", padding:"24px 0", color:"#0F6E56", fontSize:15 }}>✓ Контакт отправлен!</div>
            ) : (
              <>
                <Field label="Ваше имя *" value={lead.name}  onChange={v => setLead(p=>({...p,name:v}))} />
                <Field label="Телефон *"  value={lead.phone} onChange={v => setLead(p=>({...p,phone:v}))} />
                <Field label="Email"      value={lead.email} onChange={v => setLead(p=>({...p,email:v}))} />
                <Btn variant="primary" onClick={sendLead} style={{ width:"100%", padding:"10px 0" }}>Отправить</Btn>
              </>
            )}
          </Card>
        )
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ padding:"8px 10px", background:"#fff", borderRadius:8, border:"1px solid #e8eaf0" }}>
      <div style={{ fontSize:11, color:"#aaa", marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value}</div>
    </div>
  );
}

function LeadsView({ db, card, toast$ }) {
  const leads = db.contacts.filter(c => c.fromCard === card.id);
  const exportCsv = () => {
    const rows = [["Имя","Телефон","Email","Дата"], ...leads.map(l => [l.name,l.phone,l.email,new Date(l.createdAt).toLocaleDateString()])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"}));
    a.download = "leads.csv"; a.click(); toast$("Экспортировано!");
  };
  if (!leads.length) return <div style={{ padding:"40px 0", textAlign:"center", color:"#aaa" }}>Пока нет контактов</div>;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ fontWeight:600 }}>{leads.length} контактов</div>
        <Btn onClick={exportCsv}>Экспорт CSV</Btn>
      </div>
      {leads.map(l => (
        <Card key={l.id} style={{ marginBottom:8 }}>
          <div style={{ fontWeight:500 }}>{l.name}</div>
          <div style={{ fontSize:12, color:"#888" }}>{l.phone} · {l.email}</div>
          <div style={{ fontSize:11, color:"#bbb", marginTop:4 }}>{new Date(l.createdAt).toLocaleDateString()}</div>
        </Card>
      ))}
    </div>
  );
}

// ── Contacts ──────────────────────────────────────────────────────────────────

function ContactsPage({ db, user, toast$ }) {
  const leads = db.contacts.filter(c => c.toUser === user.id);
  const exportAll = () => {
    const rows = [["Имя","Телефон","Email","Дата"], ...leads.map(l=>[l.name,l.phone,l.email,new Date(l.createdAt).toLocaleDateString()])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"}));
    a.download = "contacts.csv"; a.click(); toast$("Экспортировано!");
  };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", margin:"8px 0 20px" }}>
        <div>
          <div style={{ fontSize:18, fontWeight:600 }}>Полученные контакты</div>
          <div style={{ fontSize:13, color:"#888" }}>{leads.length} шт.</div>
        </div>
        {leads.length > 0 && <Btn onClick={exportAll}>Экспорт CSV</Btn>}
      </div>
      {!leads.length ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#aaa" }}>Контакты появятся, когда кто-то оставит данные через вашу визитку</div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:10 }}>
          {leads.map(c => {
            const src = db.cards.find(card => card.id === c.fromCard);
            return (
              <Card key={c.id}>
                <Avatar name={c.name} size={36} />
                <div style={{ fontWeight:500, marginTop:8 }}>{c.name}</div>
                <div style={{ fontSize:12, color:"#888" }}>{c.phone}</div>
                {c.email && <div style={{ fontSize:12, color:"#888" }}>{c.email}</div>}
                {src && <div style={{ fontSize:11, color:"#bbb", marginTop:6 }}>через «{src.name}»</div>}
                <div style={{ fontSize:11, color:"#bbb" }}>{new Date(c.createdAt).toLocaleDateString()}</div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Company ───────────────────────────────────────────────────────────────────

function CompanyPage({ db, save, user, go, toast$ }) {
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ name:"", industry:"", website:"" });
  const company = db.companies.find(c => c.ownerId === user.id);
  const empCards = company ? db.cards.filter(c => c.company === company.name) : [];

  const create = () => {
    if (!f.name) { toast$("Введите название","#A32D2D"); return; }
    save({ ...db, companies: [...db.companies, { id:genId(), ownerId:user.id, ...f }] });
    setShowForm(false); toast$("Компания создана!");
  };

  return (
    <div>
      <div style={{ fontSize:18, fontWeight:600, margin:"8px 0 20px" }}>Компания</div>
      {!company ? (
        !showForm ? (
          <div style={{ textAlign:"center", padding:"50px 0" }}>
            <div style={{ fontSize:38, marginBottom:12 }}>🏢</div>
            <div style={{ fontSize:14, color:"#888", marginBottom:16 }}>Создайте профиль компании</div>
            <Btn variant="primary" onClick={() => setShowForm(true)}>Создать компанию</Btn>
          </div>
        ) : (
          <Card style={{ maxWidth:420 }}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Новая компания</div>
            <Field label="Название *" value={f.name}     onChange={v=>setF(p=>({...p,name:v}))} />
            <Field label="Отрасль"    value={f.industry} onChange={v=>setF(p=>({...p,industry:v}))} />
            <Field label="Сайт"       value={f.website}  onChange={v=>setF(p=>({...p,website:v}))} />
            <div style={{ display:"flex", gap:8 }}>
              <Btn variant="primary" onClick={create}>Создать</Btn>
              <Btn onClick={() => setShowForm(false)}>Отмена</Btn>
            </div>
          </Card>
        )
      ) : (
        <div>
          <Card style={{ marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ fontSize:32 }}>🏢</div>
              <div>
                <div style={{ fontSize:17, fontWeight:700 }}>{company.name}</div>
                {company.industry && <div style={{ fontSize:13, color:"#888" }}>{company.industry}</div>}
                {company.website  && <div style={{ fontSize:12, color:"#185FA5" }}>{company.website}</div>}
              </div>
            </div>
          </Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontWeight:600 }}>Сотрудники · {empCards.length}</div>
            <Btn variant="primary" onClick={() => go("newcard")}>+ Добавить</Btn>
          </div>
          {!empCards.length ? (
            <div style={{ fontSize:13, color:"#aaa" }}>Создайте визитку с указанием компании «{company.name}»</div>
          ) : empCards.map(c => (
            <div key={c.id} onClick={() => go("card",c.id)} style={{
              display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
              background:"#fff", border:"1px solid #e8eaf0", borderRadius:10,
              marginBottom:8, cursor:"pointer",
            }}>
              <Avatar name={c.name} size={36} />
              <div>
                <div style={{ fontWeight:500, fontSize:14 }}>{c.name}</div>
                <div style={{ fontSize:12, color:"#888" }}>{c.position}</div>
              </div>
              {c.nfc && <Badge color="#0F6E56">NFC</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
