import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from './supabaseClient';

// ============================================================
// KARIBU CAFÉ — Complete Management System
// Fresh build from locked spec — billing at the core
// Likasi, Haut-Katanga, DRC
// ============================================================

// ─── CONFIG ───
const TABLES = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, label: `${i + 1}` }));
const PAYMENT_METHODS = [
  { id: "cdf_cash", label: "CDF Cash", icon: "💵", color: "#2D8B55" },
  { id: "usd_cash", label: "USD Cash", icon: "💲", color: "#1A73E8" },
  { id: "mpesa", label: "M-Pesa", icon: "📱", color: "#4CAF50" },
  { id: "airtel", label: "Airtel Money", icon: "📲", color: "#E53935" },
  { id: "visa", label: "Card / Visa", icon: "💳", color: "#7C3AED" },
];
const USD_RATE = 0.00036;
const fmtCDF = (a) => `${Math.round(a).toLocaleString()} FC`;
const fmtUSD = (a) => `$${(a * USD_RATE).toFixed(2)}`;
const fmtDual = (a) => `${fmtCDF(a)} (${fmtUSD(a)})`;
const dateStr = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const timeStr = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// ─── THEME ───
const C = {
  cream: "#FBF7F2", white: "#FFFFFF", bark: "#2C1810", bark2: "#5C3D2E",
  clay: "#C7632D", clayLt: "#F4E0D0", clayDk: "#8B3E15",
  sage: "#7A9E7E", sageLt: "#E8F0E9", sageDk: "#3D6B42",
  sand: "#E8DDD4", sandLt: "#F5EDE5", stone: "#A89B91",
  espresso: "#3E2723", latte: "#D4B896",
  ok: "#2D8B55", okLt: "#E5F5EC",
  warn: "#D4920A", warnLt: "#FFF6E0",
  err: "#C44040", errLt: "#FDE8E8",
  blue: "#1A73E8", blueLt: "#E8F0FE",
};
const font = `'Nunito','Segoe UI',system-ui,sans-serif`;
const fontD = `'DM Serif Display',Georgia,serif`;
const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');`;

// ─── DEFAULT DATA ───
const DEFAULT_MENU = [
  { id: "c1", name: "Hot Drinks", emoji: "☕", items: [
    { id: "h1", name: "Espresso", price: 3500, desc: "Rich single shot", avail: true },
    { id: "h2", name: "Double Espresso", price: 5500, desc: "Bold double shot", avail: true },
    { id: "h3", name: "Cappuccino", price: 6000, desc: "Espresso with foamed milk", avail: true },
    { id: "h4", name: "Café Latte", price: 6500, desc: "Smooth espresso & steamed milk", avail: true },
    { id: "h5", name: "Hot Chocolate", price: 5500, desc: "Creamy cocoa", avail: true },
    { id: "h6", name: "Thé Noir", price: 3000, desc: "Black tea", avail: true },
    { id: "h7", name: "Ginger Tea", price: 3500, desc: "Fresh ginger & honey infusion", avail: true },
    { id: "h8", name: "Chai Latte", price: 6000, desc: "Spiced tea with steamed milk", avail: true },
  ]},
  { id: "c2", name: "Cold Drinks", emoji: "🧊", items: [
    { id: "d1", name: "Iced Coffee", price: 6500, desc: "Espresso over ice", avail: true },
    { id: "d2", name: "Fresh Orange Juice", price: 7000, desc: "Squeezed to order", avail: true },
    { id: "d3", name: "Mango Smoothie", price: 8000, desc: "Fresh mango & yogurt", avail: true },
    { id: "d4", name: "Passion Fruit Juice", price: 6000, desc: "Tropical & tangy", avail: true },
    { id: "d5", name: "Mineral Water", price: 2000, desc: "500ml bottle", avail: true },
    { id: "d6", name: "Coca-Cola", price: 3500, desc: "330ml can", avail: true },
    { id: "d7", name: "Limonade Maison", price: 5000, desc: "Homemade lemonade", avail: true },
  ]},
  { id: "c3", name: "Pastries", emoji: "🥐", items: [
    { id: "p1", name: "Croissant au Beurre", price: 4500, desc: "Buttery flaky croissant", avail: true },
    { id: "p2", name: "Pain au Chocolat", price: 5000, desc: "Chocolate-filled pastry", avail: true },
    { id: "p3", name: "Mandazi", price: 2500, desc: "East African sweet fried dough", avail: true },
    { id: "p4", name: "Beignets", price: 3000, desc: "Golden doughnuts", avail: true },
    { id: "p5", name: "Rouleau Cannelle", price: 5500, desc: "Cinnamon roll", avail: true },
    { id: "p6", name: "Muffin Myrtille", price: 4000, desc: "Blueberry muffin", avail: true },
  ]},
  { id: "c4", name: "Breakfast", emoji: "🍳", items: [
    { id: "b1", name: "Petit-Déjeuner Complet", price: 18000, desc: "Eggs, toast, sausage, juice", avail: true },
    { id: "b2", name: "Omelette Légumes", price: 10000, desc: "Veggie omelette with toast", avail: true },
    { id: "b3", name: "Pancakes", price: 8000, desc: "Stack with maple syrup", avail: true },
    { id: "b4", name: "Granola Bowl", price: 7000, desc: "Yogurt, granola & fresh fruit", avail: true },
    { id: "b5", name: "Tartines Avocat", price: 9000, desc: "Avocado toast", avail: true },
  ]},
  { id: "c5", name: "Light Meals", emoji: "🥪", items: [
    { id: "l1", name: "Club Sandwich", price: 14000, desc: "Chicken, lettuce, tomato, fries", avail: true },
    { id: "l2", name: "Croque Monsieur", price: 10000, desc: "Ham & cheese toastie", avail: true },
    { id: "l3", name: "Salade du Chef", price: 12000, desc: "Mixed salad with grilled chicken", avail: true },
    { id: "l4", name: "Wrap Poulet", price: 11000, desc: "Chicken wrap with vegetables", avail: true },
    { id: "l5", name: "Brochettes Bœuf", price: 16000, desc: "Beef skewers with frites", avail: true },
  ]},
  { id: "c6", name: "Desserts", emoji: "🍰", items: [
    { id: "ds1", name: "Fondant Chocolat", price: 9000, desc: "Warm chocolate lava cake", avail: true },
    { id: "ds2", name: "Crème Brûlée", price: 8000, desc: "Classic vanilla custard", avail: true },
    { id: "ds3", name: "Fruit de Saison", price: 6000, desc: "Seasonal fruit plate", avail: true },
    { id: "ds4", name: "Glace 3 Boules", price: 7000, desc: "3 scoops ice cream", avail: true },
  ]},
  { id: "c7", name: "Snacks", emoji: "🍿", items: [
    { id: "s1", name: "Samoussa", price: 5000, desc: "3 pieces, meat or veggie", avail: true },
    { id: "s2", name: "Frites", price: 4000, desc: "Crispy French fries", avail: true },
    { id: "s3", name: "Chips & Guacamole", price: 6000, desc: "Tortilla chips with guac", avail: true },
    { id: "s4", name: "Arachides Grillées", price: 2000, desc: "Roasted peanuts", avail: true },
  ]},
];

const DEFAULT_INVENTORY = [
  { id: "i1", name: "Coffee Beans", unit: "kg", stock: 25, min: 5, cost: 15000, supplier: "s1" },
  { id: "i2", name: "Fresh Milk", unit: "L", stock: 40, min: 10, cost: 3000, supplier: "s2" },
  { id: "i3", name: "Sugar", unit: "kg", stock: 30, min: 5, cost: 2500, supplier: "s2" },
  { id: "i4", name: "Cocoa Powder", unit: "kg", stock: 8, min: 2, cost: 12000, supplier: "s1" },
  { id: "i5", name: "Flour", unit: "kg", stock: 50, min: 10, cost: 2000, supplier: "s2" },
  { id: "i6", name: "Butter", unit: "kg", stock: 10, min: 3, cost: 8000, supplier: "s2" },
  { id: "i7", name: "Eggs", unit: "pcs", stock: 120, min: 30, cost: 500, supplier: "s3" },
  { id: "i8", name: "Chicken", unit: "kg", stock: 8, min: 3, cost: 12000, supplier: "s3" },
  { id: "i9", name: "Beef", unit: "kg", stock: 6, min: 2, cost: 16000, supplier: "s3" },
  { id: "i10", name: "Potatoes", unit: "kg", stock: 20, min: 5, cost: 2000, supplier: "s3" },
  { id: "i11", name: "Tomatoes", unit: "kg", stock: 8, min: 3, cost: 3000, supplier: "s3" },
  { id: "i12", name: "Lettuce", unit: "pcs", stock: 15, min: 5, cost: 1500, supplier: "s3" },
  { id: "i13", name: "Bread", unit: "pcs", stock: 20, min: 5, cost: 2500, supplier: "s2" },
  { id: "i14", name: "Chocolate", unit: "kg", stock: 5, min: 2, cost: 18000, supplier: "s1" },
  { id: "i15", name: "Mango", unit: "kg", stock: 10, min: 3, cost: 4000, supplier: "s3" },
  { id: "i16", name: "Yogurt", unit: "L", stock: 12, min: 4, cost: 5000, supplier: "s2" },
];

const DEFAULT_SUPPLIERS = [
  { id: "s1", name: "Lubumbashi Coffee Co.", phone: "+243 97 123 4567", items: "Coffee, cocoa, chocolate" },
  { id: "s2", name: "Likasi Fresh Market", phone: "+243 81 234 5678", items: "Dairy, flour, sugar, bread" },
  { id: "s3", name: "Katanga Farm Direct", phone: "+243 99 345 6789", items: "Eggs, meat, fruit, vegetables" },
];

const DEFAULT_RECIPES = {
  h1: [{ inv: "i1", qty: 0.02 }],
  h2: [{ inv: "i1", qty: 0.04 }],
  h3: [{ inv: "i1", qty: 0.02 }, { inv: "i2", qty: 0.15 }],
  h4: [{ inv: "i1", qty: 0.02 }, { inv: "i2", qty: 0.25 }],
  h5: [{ inv: "i4", qty: 0.03 }, { inv: "i2", qty: 0.25 }],
  h8: [{ inv: "i2", qty: 0.2 }],
  d1: [{ inv: "i1", qty: 0.02 }, { inv: "i2", qty: 0.1 }],
  d3: [{ inv: "i15", qty: 0.25 }, { inv: "i16", qty: 0.1 }],
  p1: [{ inv: "i5", qty: 0.08 }, { inv: "i6", qty: 0.04 }],
  p2: [{ inv: "i5", qty: 0.08 }, { inv: "i6", qty: 0.03 }, { inv: "i14", qty: 0.02 }],
  b2: [{ inv: "i7", qty: 3 }, { inv: "i11", qty: 0.05 }],
  b3: [{ inv: "i5", qty: 0.1 }, { inv: "i7", qty: 2 }, { inv: "i2", qty: 0.1 }],
  l1: [{ inv: "i8", qty: 0.15 }, { inv: "i13", qty: 0.33 }, { inv: "i12", qty: 0.5 }],
  l5: [{ inv: "i9", qty: 0.25 }, { inv: "i10", qty: 0.2 }],
  ds1: [{ inv: "i14", qty: 0.08 }, { inv: "i7", qty: 2 }, { inv: "i6", qty: 0.05 }],
  s2: [{ inv: "i10", qty: 0.2 }],
};

const DEFAULT_LEDGER = [
  { id: "le1", date: "2026-03-15", type: "expense", cat: "Rent", desc: "Monthly rent — March", amount: 500000 },
  { id: "le2", date: "2026-03-15", type: "expense", cat: "Supplies", desc: "Coffee beans restock", amount: 150000 },
  { id: "le3", date: "2026-03-14", type: "expense", cat: "Payroll", desc: "Staff wages — week 11", amount: 300000 },
];
const EXP_CATS = ["Supplies", "Rent", "Payroll", "Utilities", "Equipment", "Market Run", "Transport", "Other"];

const DEFAULT_STAFF = [
  { id: "st1", name: "Dorothée M.", role: "Manager", pin: "1111" },
  { id: "st2", name: "Jean-Claude K.", role: "Barista", pin: "2222" },
  { id: "st3", name: "Amina B.", role: "Kitchen", pin: "3333" },
];

// ─── SHARED STYLES ───
const sBtn = { border: "none", borderRadius: 12, cursor: "pointer", fontFamily: font, fontWeight: 600, transition: "all .15s", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14 };
const sBtnP = { ...sBtn, background: C.clay, color: "#fff", padding: "12px 24px" };
const sBtnS = { ...sBtn, background: C.sandLt, color: C.bark2, padding: "10px 20px", fontSize: 13 };
const sBtnGhost = { ...sBtn, background: "transparent", color: C.stone, padding: "8px 16px", fontSize: 13 };
const sCard = { background: C.white, borderRadius: 16, border: `1px solid ${C.sand}` };
const sInput = { width: "100%", boxSizing: "border-box", padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${C.sand}`, fontSize: 14, fontFamily: font, fontWeight: 500, outline: "none", color: C.bark, background: C.white, transition: "border .2s" };
const sChip = (active, color) => ({ ...sBtn, padding: "8px 16px", fontSize: 13, borderRadius: 24, background: active ? (color || C.bark) : C.sandLt, color: active ? "#fff" : C.bark2, border: "none" });

// ─── SHARED COMPONENTS ───
const Badge = ({ children, bg, color }) => <span style={{ background: bg || C.sandLt, color: color || C.bark2, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>;
const Stat = ({ label, value, accent }) => <div style={{ background: C.sandLt, borderRadius: 14, padding: "16px 18px", flex: 1 }}><div style={{ fontSize: 12, color: C.stone, fontWeight: 600, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div><div style={{ fontSize: 22, fontWeight: 800, color: accent || C.bark }}>{value}</div></div>;
const Empty = ({ icon, text }) => <div style={{ textAlign: "center", padding: "48px 24px", color: C.stone }}><div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div><p style={{ fontSize: 15, fontWeight: 600 }}>{text}</p></div>;

const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 4, padding: "4px", background: C.sandLt, borderRadius: 14, overflow: "auto" }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        ...sBtn, padding: "10px 18px", fontSize: 13, borderRadius: 10, whiteSpace: "nowrap",
        background: active === t.id ? C.white : "transparent",
        color: active === t.id ? C.bark : C.stone,
        boxShadow: active === t.id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
        border: "none", fontWeight: active === t.id ? 700 : 500,
      }}>
        {t.icon && <span style={{ fontSize: 16 }}>{t.icon}</span>}
        {t.label}
        {t.badge > 0 && <span style={{ background: C.err, color: "#fff", borderRadius: 8, padding: "2px 7px", fontSize: 10, fontWeight: 800, marginLeft: 2 }}>{t.badge}</span>}
      </button>
    ))}
  </div>
);

const FormRow = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: `repeat(${Array.isArray(children) ? children.length : 1}, 1fr)`, gap: 8 }}>{children}</div>;
const FormCard = ({ title, children, onClose }) => (
  <div style={{ ...sCard, padding: 20, marginBottom: 16, borderColor: C.clay, borderWidth: 2 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.bark }}>{title}</h4>
      {onClose && <button onClick={onClose} style={{ ...sBtnGhost, padding: "4px 8px" }}>✕</button>}
    </div>
    {children}
  </div>
);

// ============================================================
// CUSTOMER VIEW — QR Table Ordering with Order History
// ============================================================
const CustomerView = ({ table, menu, onOrder, setMode, orders }) => {
  const [guest, setGuest] = useState(null); // { name, phone, guests }
  const [gName, setGName] = useState("");
  const [gPhone, setGPhone] = useState("+243 ");
  const [gCount, setGCount] = useState(2);
  const [recognized, setRecognized] = useState(false);
  const [cart, setCart] = useState([]);
  const [catId, setCatId] = useState(menu[0]?.id);
  const [showCart, setShowCart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(null);

  // Look up past orders by phone
  const guestOrders = useMemo(() => {
    if (!guest?.phone) return [];
    const clean = guest.phone.replace(/\s/g, "");
    return orders.filter(o => o.guest?.phone?.replace(/\s/g, "") === clean).sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [guest, orders]);

  // Phone lookup on welcome screen
  const checkPhone = (phone) => {
    const clean = phone.replace(/\s/g, "");
    if (clean.length < 8) return;
    const past = orders.find(o => o.guest?.phone?.replace(/\s/g, "") === clean);
    if (past?.guest?.name) {
      setGName(past.guest.name);
      setRecognized(true);
    } else {
      setRecognized(false);
    }
  };

  const add = (item) => setCart(p => { const e = p.find(c => c.id === item.id); return e ? p.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c) : [...p, { ...item, qty: 1 }]; });
  const adj = (id, d) => setCart(p => p.map(c => c.id === id ? { ...c, qty: c.qty + d } : c).filter(c => c.qty > 0));
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const count = cart.reduce((s, c) => s + c.qty, 0);

  const reOrder = (pastOrder) => {
    // Add all items from a past order to the current cart
    pastOrder.items.forEach(item => {
      setCart(p => {
        const e = p.find(c => c.id === item.id);
        if (e) return p.map(c => c.id === item.id ? { ...c, qty: c.qty + item.qty } : c);
        return [...p, { ...item }];
      });
    });
    setShowHistory(false);
  };

  const place = () => {
    const order = { id: `K-${uid().toUpperCase()}`, table, guest: { ...guest }, items: [...cart], total, status: "new", time: new Date().toISOString(), payments: [] };
    onOrder(order);
    setDone(order);
    setCart([]); setShowCart(false); setConfirm(false);
  };

  const resetForNewGuest = () => {
    setDone(null); setGuest(null); setGName(""); setGPhone("+243 "); setGCount(2); setRecognized(false); setCart([]); setCatId(menu[0]?.id);
  };

  // ── WELCOME SCREEN ──
  if (!guest) return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: font, display: "flex", flexDirection: "column" }}>
      <div style={{ background: C.clay, padding: "56px 24px 40px", color: "#fff", borderRadius: "0 0 36px 36px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>☕</div>
        <h1 style={{ fontFamily: fontD, fontSize: 30, margin: "0 0 4px" }}>Karibu Café</h1>
        <p style={{ margin: 0, fontSize: 15, opacity: .85 }}>Welcome to Table {table}</p>
      </div>
      <div style={{ padding: "32px 24px", flex: 1 }}>
        <h2 style={{ fontFamily: fontD, fontSize: 22, margin: "0 0 4px", color: C.bark }}>Before we start</h2>
        <p style={{ fontSize: 14, color: C.stone, margin: "0 0 24px" }}>Tell us a little about you so we can serve you better</p>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: C.bark2, display: "block", marginBottom: 6 }}>Phone number</label>
          <input value={gPhone} onChange={e => { setGPhone(e.target.value); checkPhone(e.target.value); }} placeholder="+243 XX XXX XXXX" style={sInput} />
          {recognized && <div style={{ marginTop: 6, fontSize: 13, color: C.ok, fontWeight: 600 }}>Welcome back! We remember you.</div>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: C.bark2, display: "block", marginBottom: 6 }}>Your name {recognized && <span style={{ fontWeight: 500, color: C.ok }}>(auto-filled)</span>}</label>
          <input value={gName} onChange={e => setGName(e.target.value)} placeholder="e.g. Jean-Pierre" style={{ ...sInput, borderColor: recognized ? C.ok : C.sand }} />
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: C.bark2, display: "block", marginBottom: 8 }}>Number of guests</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <button key={n} onClick={() => setGCount(n)} style={{
                ...sBtn, width: 44, height: 44, borderRadius: 12, fontSize: 16, fontWeight: 700, padding: 0,
                background: gCount === n ? C.clay : C.white,
                color: gCount === n ? "#fff" : C.bark,
                border: gCount === n ? "none" : `1.5px solid ${C.sand}`,
              }}>{n}</button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => { if (gName.trim()) setGuest({ name: gName.trim(), phone: gPhone.trim(), guests: gCount }); }}
          disabled={!gName.trim()}
          style={{ ...sBtnP, width: "100%", padding: 16, fontSize: 16, borderRadius: 16, opacity: gName.trim() ? 1 : 0.4 }}
        >
          View menu
        </button>
      </div>
    </div>
  );

  // ── ORDER CONFIRMATION ──
  if (done) return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: font }}>
      <div style={{ background: C.sage, padding: "56px 24px 40px", textAlign: "center", color: "#fff", borderRadius: "0 0 36px 36px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 32 }}>✓</div>
        <h2 style={{ fontFamily: fontD, fontSize: 28, margin: "0 0 4px" }}>Order sent!</h2>
        <p style={{ opacity: .85, margin: 0, fontSize: 15 }}>We're preparing it now, {guest.name}</p>
      </div>
      <div style={{ padding: "24px 20px" }}>
        <div style={{ ...sCard, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div><div style={{ fontSize: 12, color: C.stone, fontWeight: 600 }}>ORDER</div><div style={{ fontSize: 20, fontWeight: 800, color: C.bark, fontFamily: "monospace" }}>{done.id}</div></div>
            <Badge bg={C.clayLt} color={C.clayDk}>Table {done.table}</Badge>
          </div>
          <div style={{ background: C.sandLt, borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.stone }}>Name</span><span style={{ fontWeight: 700, color: C.bark }}>{guest.name}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}><span style={{ color: C.stone }}>Phone</span><span style={{ fontWeight: 600, color: C.bark2 }}>{guest.phone}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}><span style={{ color: C.stone }}>Guests</span><span style={{ fontWeight: 600, color: C.bark2 }}>{guest.guests}</span></div>
          </div>
          <div style={{ borderTop: `1.5px dashed ${C.sand}`, paddingTop: 12 }}>
            {done.items.map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 14 }}><span style={{ fontWeight: 600 }}>{i.qty}× {i.name}</span><span style={{ color: C.stone }}>{fmtCDF(i.price * i.qty)}</span></div>)}
          </div>
          <div style={{ borderTop: `2px solid ${C.bark}`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 17, fontWeight: 800 }}>Total</span>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 19, fontWeight: 800, color: C.clay }}>{fmtCDF(done.total)}</div><div style={{ fontSize: 12, color: C.stone }}>{fmtUSD(done.total)}</div></div>
          </div>
        </div>
        <p style={{ textAlign: "center", color: C.stone, fontSize: 14, margin: "20px 0" }}>Pay at the counter when ready</p>
        <div style={{ display: "grid", gap: 10, maxWidth: 320, margin: "0 auto" }}>
          <button style={sBtnP} onClick={() => setDone(null)}>Order more items</button>
          <button style={{ ...sBtnS, width: "100%", borderColor: C.stone, color: C.bark2 }} onClick={resetForNewGuest}>New order (different person)</button>
        </div>
      </div>
    </div>
  );

  // ── MY ORDERS HISTORY SHEET ──
  if (showHistory) return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: font }}>
      <div style={{ background: C.white, borderBottom: `1px solid ${C.sand}`, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => setShowHistory(false)} style={{ ...sBtnGhost, padding: "6px 0", color: C.clay, fontWeight: 700 }}>← Back to menu</button>
        <span style={{ fontSize: 13, color: C.stone, fontWeight: 600 }}>{guest.name}</span>
      </div>
      <div style={{ padding: 20 }}>
        <h3 style={{ fontFamily: fontD, fontSize: 22, margin: "0 0 4px", color: C.bark }}>My orders</h3>
        <p style={{ fontSize: 14, color: C.stone, margin: "0 0 20px" }}>{guestOrders.length} past order{guestOrders.length !== 1 ? "s" : ""} at Karibu Café</p>
        
        {guestOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.bark2 }}>No orders yet</p>
            <p style={{ fontSize: 13, color: C.stone }}>Your order history will appear here</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {guestOrders.map(o => {
              const statusColors = { new: C.warn, preparing: C.blue, ready: C.ok, served: C.stone, paid: "#7C3AED" };
              return (
                <div key={o.id} style={{ ...sCard, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.bark }}>{o.id}</div>
                      <div style={{ fontSize: 12, color: C.stone }}>{new Date(o.time).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · {timeStr(o.time)} · Table {o.table}</div>
                    </div>
                    <Badge bg={C.sandLt} color={statusColors[o.status] || C.stone}>{o.status}</Badge>
                  </div>
                  {o.items.map(i => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 13 }}>
                      <span>{i.qty}× {i.name}</span>
                      <span style={{ color: C.stone }}>{fmtCDF(i.price * i.qty)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${C.sand}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.clay }}>{fmtCDF(o.total)}</span>
                    <button onClick={() => reOrder(o)} style={{ ...sBtnP, padding: "8px 18px", fontSize: 13, background: C.sage }}>
                      Re-order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── MENU & ORDERING ──
  return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: font, paddingBottom: count > 0 ? 100 : 24 }}>
      {/* Header with guest info */}
      <div style={{ background: C.clay, padding: "44px 24px 28px", color: "#fff", borderRadius: "0 0 36px 36px", position: "relative" }}>
        <h1 style={{ fontFamily: fontD, fontSize: 30, margin: "0 0 4px" }}>Karibu Café</h1>
        <p style={{ margin: 0, fontSize: 14, opacity: .8 }}>Table {table} — Welcome, {guest.name}!</p>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <span style={{ background: "rgba(255,255,255,.15)", padding: "4px 12px", borderRadius: 12, fontSize: 12 }}>{guest.guests} guest{guest.guests > 1 ? "s" : ""}</span>
          <span style={{ background: "rgba(255,255,255,.15)", padding: "4px 12px", borderRadius: 12, fontSize: 12 }}>{guest.phone}</span>
        </div>
      </div>

      {/* My Orders button + Categories */}
      <div style={{ padding: "12px 20px 0", display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => setShowHistory(true)} style={{
          ...sBtn, padding: "10px 16px", fontSize: 13, borderRadius: 24, whiteSpace: "nowrap",
          background: C.white, color: C.clay, border: `1.5px solid ${C.clay}`, fontWeight: 700,
        }}>
          My orders {guestOrders.length > 0 && <span style={{ background: C.clay, color: "#fff", borderRadius: 8, padding: "2px 7px", fontSize: 10, fontWeight: 800 }}>{guestOrders.length}</span>}
        </button>
        <div style={{ width: 1, height: 24, background: C.sand }} />
        <div style={{ overflowX: "auto", display: "flex", gap: 6 }}>
          {menu.map(cat => (
            <button key={cat.id} onClick={() => setCatId(cat.id)} style={sChip(catId === cat.id, C.bark)}>
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: "12px 20px" }}>
        {menu.filter(c => c.id === catId).flatMap(c => c.items).filter(i => i.avail).map(item => {
          const inCart = cart.find(c => c.id === item.id);
          return (
            <div key={item.id} style={{ ...sCard, marginBottom: 10, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1, marginRight: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.bark, marginBottom: 3 }}>{item.name}</div>
                <div style={{ fontSize: 13, color: C.stone, marginBottom: 8, lineHeight: 1.4 }}>{item.desc}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.clay }}>{fmtCDF(item.price)}</div>
                <div style={{ fontSize: 11, color: C.stone }}>{fmtUSD(item.price)}</div>
              </div>
              {inCart ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.sandLt, borderRadius: 14, padding: "6px 10px" }}>
                  <button onClick={() => adj(item.id, -1)} style={{ ...sBtn, width: 34, height: 34, borderRadius: "50%", background: C.white, border: `1.5px solid ${C.sand}`, fontSize: 18, color: C.bark, padding: 0 }}>−</button>
                  <span style={{ fontSize: 16, fontWeight: 800, minWidth: 20, textAlign: "center" }}>{inCart.qty}</span>
                  <button onClick={() => adj(item.id, 1)} style={{ ...sBtn, width: 34, height: 34, borderRadius: "50%", background: C.clay, fontSize: 18, color: "#fff", padding: 0 }}>+</button>
                </div>
              ) : (
                <button onClick={() => add(item)} style={{ ...sBtn, width: 44, height: 44, borderRadius: "50%", background: C.clayLt, color: C.clay, fontSize: 24, padding: 0, border: "none" }}>+</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Cart bar */}
      {count > 0 && !showCart && (
        <div onClick={() => setShowCart(true)} style={{ position: "fixed", bottom: 20, left: 20, right: 20, background: C.bark, color: "#fff", borderRadius: 18, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", boxShadow: "0 8px 32px rgba(44,24,16,.25)", zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: C.clay, borderRadius: 10, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{count}</div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>View order</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{fmtCDF(total)}</span>
        </div>
      )}

      {/* Cart sheet */}
      {showCart && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,24,16,.4)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={() => { setShowCart(false); setConfirm(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.cream, borderRadius: "28px 28px 0 0", width: "100%", maxHeight: "85vh", overflow: "auto", padding: "24px 20px 40px" }}>
            <div style={{ width: 40, height: 4, background: C.sand, borderRadius: 2, margin: "0 auto 20px" }} />
            <h3 style={{ fontFamily: fontD, fontSize: 22, margin: "0 0 16px", color: C.bark }}>Your order — Table {table}</h3>
            {cart.map(item => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.sand}` }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div><div style={{ fontSize: 12, color: C.stone }}>{fmtCDF(item.price)}</div></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => adj(item.id, -1)} style={{ ...sBtn, width: 28, height: 28, borderRadius: "50%", background: C.sandLt, fontSize: 14, color: C.bark, padding: 0, border: "none" }}>−</button>
                  <span style={{ fontSize: 14, fontWeight: 800, minWidth: 18, textAlign: "center" }}>{item.qty}</span>
                  <button onClick={() => adj(item.id, 1)} style={{ ...sBtn, width: 28, height: 28, borderRadius: "50%", background: C.sandLt, fontSize: 14, color: C.bark, padding: 0, border: "none" }}>+</button>
                  <span style={{ fontWeight: 700, fontSize: 14, minWidth: 70, textAlign: "right" }}>{fmtCDF(item.price * item.qty)}</span>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "20px 0", fontSize: 18, fontWeight: 800 }}>
              <span>Total</span>
              <div style={{ textAlign: "right" }}><div style={{ color: C.clay }}>{fmtCDF(total)}</div><div style={{ fontSize: 12, fontWeight: 500, color: C.stone }}>{fmtUSD(total)}</div></div>
            </div>
            {!confirm ? (
              <button onClick={() => setConfirm(true)} style={{ ...sBtnP, width: "100%", padding: 16, fontSize: 16, borderRadius: 16 }}>Review & confirm</button>
            ) : (
              <div style={{ background: C.warnLt, border: `1.5px solid ${C.warn}`, borderRadius: 16, padding: 20, textAlign: "center" }}>
                <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 16, color: C.bark }}>Send order to kitchen?</p>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: C.bark2 }}>{count} items — {fmtCDF(total)} — Table {table}</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setConfirm(false)} style={{ ...sBtnS, flex: 1 }}>Go back</button>
                  <button onClick={place} style={{ ...sBtnP, flex: 1, background: C.sage }}>Confirm ✓</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// STAFF DASHBOARD
// ============================================================
const MANAGER_TABS = ["menu", "inventory", "accounts", "staff", "reports"];
const DEFAULT_PIN = "0000";

const PinGate = ({ onUnlock }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [storedPin] = useState(() => DEFAULT_PIN);
  const tryPin = (p) => {
    if (p.length === 4) {
      if (p === storedPin) { onUnlock(); } else { setError(true); setPin(""); setTimeout(() => setError(false), 1500); }
    }
  };
  const press = (n) => { const next = pin + n; setPin(next); tryPin(next); };
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", maxWidth: 300, margin: "0 auto" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.clayLt, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>🔒</div>
      <h3 style={{ fontFamily: fontD, fontSize: 22, margin: "0 0 6px", color: C.bark }}>Manager access</h3>
      <p style={{ fontSize: 14, color: C.stone, margin: "0 0 24px" }}>Enter your 4-digit PIN</p>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 24 }}>
        {[0,1,2,3].map(i => <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: i < pin.length ? (error ? C.err : C.clay) : C.sand, transition: "all .2s" }} />)}
      </div>
      {error && <p style={{ color: C.err, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Wrong PIN — try again</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, maxWidth: 240, margin: "0 auto" }}>
        {[1,2,3,4,5,6,7,8,9,null,0,"⌫"].map((n, i) => n === null ? <div key={i} /> : (
          <button key={i} onClick={() => n === "⌫" ? setPin(p => p.slice(0, -1)) : press(String(n))} style={{ ...sBtn, width: "100%", height: 52, borderRadius: 14, fontSize: n === "⌫" ? 20 : 22, fontWeight: 700, background: C.white, color: C.bark, border: `1.5px solid ${C.sand}` }}>{n}</button>
        ))}
      </div>
    </div>
  );
};

const StaffDash = ({ orders, setOrders, menu, setMenu, inventory, setInventory, suppliers, setSuppliers, recipes, ledger, setLedger, staff, setStaff, attendance, setAttendance, cashRegister, setCashRegister, loyaltyActive, isAdmin }) => {
  const [tab, setTab] = useState("orders");
  const [managerUnlocked, setManagerUnlocked] = useState(false);
  const [showPinGate, setShowPinGate] = useState(false);
  const pendN = orders.filter(o => o.status === "new").length;
  const prepN = orders.filter(o => o.status === "preparing").length;
  const lowS = inventory.filter(i => i.stock <= i.min).length;

  const isManagerTab = (id) => MANAGER_TABS.includes(id);
  const canAccess = (id) => !isManagerTab(id) || managerUnlocked || isAdmin;

  const handleTabChange = (id) => {
    if (isManagerTab(id) && !managerUnlocked && !isAdmin) {
      setShowPinGate(id);
    } else {
      setTab(id);
    }
  };

  const staffTabs = [
    { id: "orders", label: "Orders", icon: "📋", badge: pendN },
    { id: "kitchen", label: "Kitchen", icon: "👨‍🍳", badge: prepN },
    { id: "tables", label: "Tables", icon: "🪑" },
    { id: "billing", label: "Billing", icon: "💰" },
  ];
  const managerTabs = [
    { id: "menu", label: "Menu", icon: "📖", locked: !managerUnlocked && !isAdmin },
    { id: "inventory", label: "Inventory", icon: "📦", badge: lowS, locked: !managerUnlocked && !isAdmin },
    { id: "accounts", label: "Accounts", icon: "📒", locked: !managerUnlocked && !isAdmin },
    { id: "staff", label: "Staff", icon: "👥", locked: !managerUnlocked && !isAdmin },
    { id: "reports", label: "Reports", icon: "📊", locked: !managerUnlocked && !isAdmin },
  ];
  const tabList = [...staffTabs, ...managerTabs];

  const setStatus = (id, s) => {
    setOrders(p => p.map(o => o.id === id ? { ...o, status: s } : o));
    supabase.from('orders').update({ status: s, updated_at: new Date().toISOString() }).eq('order_number', id)
      .then(({ error }) => { if (error) console.error('Status update failed:', error); });
  };
  const deleteOrder = (id) => {
    if (managerUnlocked || isAdmin) {
      setOrders(p => p.filter(o => o.id !== id));
      supabase.from('orders').delete().eq('order_number', id)
        .then(({ error }) => { if (error) console.error('Delete failed:', error); });
    }
  };

  const statusStyle = { new: { bg: C.warnLt, color: C.warn, label: "New" }, preparing: { bg: C.blueLt, color: C.blue, label: "Preparing" }, ready: { bg: C.okLt, color: C.ok, label: "Ready" }, served: { bg: C.sandLt, color: C.stone, label: "Served" }, paid: { bg: "#F0EBFF", color: "#7C3AED", label: "Paid" } };

  // PIN gate overlay
  if (showPinGate) return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: font }}>
      <div style={{ background: C.white, borderBottom: `1px solid ${C.sand}`, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => setShowPinGate(false)} style={{ ...sBtnGhost, padding: "6px 0" }}>← Back</button>
        <div style={{ fontSize: 12, color: C.stone, fontWeight: 600 }}>Manager PIN required</div>
      </div>
      <PinGate onUnlock={() => { setManagerUnlocked(true); setTab(showPinGate); setShowPinGate(false); }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: font }}>
      <div style={{ background: C.white, borderBottom: `1px solid ${C.sand}`, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontFamily: fontD, fontSize: 20, margin: 0, color: C.bark }}>Karibu Café</h1>
          <p style={{ fontSize: 11, color: C.stone, margin: "2px 0 0", fontWeight: 600 }}>
            {managerUnlocked || isAdmin ? "Manager" : "Staff"} Dashboard
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {managerUnlocked && <button onClick={() => setManagerUnlocked(false)} style={{ ...sBtn, padding: "5px 12px", fontSize: 11, background: C.errLt, color: C.err, border: "none", borderRadius: 8 }}>Lock 🔒</button>}
          <div style={{ fontSize: 12, color: C.stone, fontWeight: 600 }}>{new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</div>
        </div>
      </div>

      <div style={{ padding: "12px 20px 0" }}>
        <div style={{ display: "flex", gap: 4, padding: "4px", background: C.sandLt, borderRadius: 14, overflow: "auto" }}>
          {tabList.map(t => (
            <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
              ...sBtn, padding: "10px 14px", fontSize: 12, borderRadius: 10, whiteSpace: "nowrap",
              background: tab === t.id ? C.white : "transparent",
              color: tab === t.id ? C.bark : t.locked ? C.stone : C.stone,
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
              border: "none", fontWeight: tab === t.id ? 700 : 500,
              opacity: t.locked ? 0.6 : 1,
            }}>
              {t.icon && <span style={{ fontSize: 14 }}>{t.icon}</span>}
              {t.label}
              {t.locked && <span style={{ fontSize: 10 }}>🔒</span>}
              {t.badge > 0 && <span style={{ background: C.err, color: "#fff", borderRadius: 8, padding: "2px 7px", fontSize: 10, fontWeight: 800, marginLeft: 2 }}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── ORDERS ── */}
      {tab === "orders" && (
        <div style={{ padding: 20 }}>
          {orders.length === 0 ? <Empty icon="☕" text="No orders yet" /> :
            <div style={{ display: "grid", gap: 12 }}>
              {[...orders].reverse().map(o => { const ss = statusStyle[o.status] || statusStyle.new; return (
                <div key={o.id} style={{ ...sCard, padding: 18, borderLeft: `4px solid ${ss.color}`, borderRadius: "4px 16px 16px 4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div><div style={{ fontSize: 15, fontWeight: 800, color: C.bark }}>{o.id}</div><div style={{ fontSize: 12, color: C.stone }}>Table {o.table} · {timeStr(o.time)}</div></div>
                    <Badge bg={ss.bg} color={ss.color}>{ss.label}</Badge>
                  </div>
                  {o.guest && (
                    <div style={{ background: C.sandLt, borderRadius: 10, padding: "8px 12px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                      <span style={{ fontWeight: 700, color: C.bark }}>{o.guest.name}</span>
                      <span style={{ color: C.stone }}>{o.guest.phone} · {o.guest.guests} guest{o.guest.guests > 1 ? "s" : ""}</span>
                    </div>
                  )}
                  {o.items.map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 14 }}><span style={{ fontWeight: 600 }}>{i.qty}× {i.name}</span><span style={{ color: C.stone }}>{fmtCDF(i.price * i.qty)}</span></div>)}
                  <div style={{ borderTop: `1px solid ${C.sand}`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 15 }}>
                    <span>Total</span><span style={{ color: C.clay }}>{fmtCDF(o.total)}</span>
                  </div>
                  {o.payments?.length > 0 && <div style={{ fontSize: 12, color: C.ok, marginTop: 4 }}>Paid: {o.payments.map(p => `${p.method} ${fmtCDF(p.amount)}`).join(", ")}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {o.status === "new" && <button onClick={() => setStatus(o.id, "preparing")} style={{ ...sBtnP, flex: 1, padding: 12 }}>Start preparing</button>}
                    {o.status === "preparing" && <button onClick={() => setStatus(o.id, "ready")} style={{ ...sBtnP, flex: 1, padding: 12, background: C.sage }}>Mark ready</button>}
                    {o.status === "ready" && <button onClick={() => setStatus(o.id, "served")} style={{ ...sBtnP, flex: 1, padding: 12, background: C.latte, color: C.bark }}>Mark served</button>}
                    {o.status === "served" && <button onClick={() => setTab("billing")} style={{ ...sBtnP, flex: 1, padding: 12, background: "#7C3AED" }}>Take payment</button>}
                    {(managerUnlocked || isAdmin) && <button onClick={() => deleteOrder(o.id)} style={{ ...sBtn, padding: "12px 16px", background: C.errLt, color: C.err, border: "none", borderRadius: 12, fontSize: 13 }}>Delete</button>}
                  </div>
                </div>
              ); })}
            </div>}
        </div>
      )}

      {/* ── KITCHEN ── */}
      {tab === "kitchen" && (
        <div style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[{ l: "Queue", s: "new", c: C.warn }, { l: "Preparing", s: "preparing", c: C.blue }, { l: "Ready", s: "ready", c: C.ok }].map(col => {
              const co = orders.filter(o => o.status === col.s);
              return (
                <div key={col.s}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: col.c }} /><span style={{ fontSize: 14, fontWeight: 700 }}>{col.l}</span><span style={{ fontSize: 12, color: C.stone }}>({co.length})</span></div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {co.map(o => (
                      <div key={o.id} style={{ ...sCard, padding: 14, borderTop: `3px solid ${col.c}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: C.bark }}>T{o.table}</span>
                          <span style={{ fontSize: 11, color: C.stone }}>{timeStr(o.time)}</span>
                        </div>
                        {o.guest && <div style={{ fontSize: 12, fontWeight: 600, color: C.clay, marginBottom: 6 }}>{o.guest.name} · {o.guest.guests}p</div>}
                        {o.items.map(i => <div key={i.id} style={{ fontSize: 14, padding: "3px 0" }}><strong>{i.qty}×</strong> {i.name}</div>)}
                        <div style={{ marginTop: 10 }}>
                          {col.s === "new" && <button onClick={() => setStatus(o.id, "preparing")} style={{ ...sBtnP, width: "100%", padding: 10, fontSize: 13, background: C.blue }}>Start ▶</button>}
                          {col.s === "preparing" && <button onClick={() => setStatus(o.id, "ready")} style={{ ...sBtnP, width: "100%", padding: 10, fontSize: 13, background: C.ok }}>Done ✓</button>}
                          {col.s === "ready" && <button onClick={() => setStatus(o.id, "served")} style={{ ...sBtnP, width: "100%", padding: 10, fontSize: 13, background: C.latte, color: C.bark }}>Served</button>}
                        </div>
                      </div>
                    ))}
                    {co.length === 0 && <div style={{ padding: 24, textAlign: "center", color: C.stone, fontSize: 13, background: C.sandLt, borderRadius: 12 }}>Empty</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TABLES ── */}
      {tab === "tables" && (
        <div style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {TABLES.map(t => {
              const tOrders = orders.filter(o => o.table === t.id && !["paid"].includes(o.status));
              const hasNew = tOrders.some(o => o.status === "new");
              const hasPrep = tOrders.some(o => o.status === "preparing");
              const hasReady = tOrders.some(o => o.status === "ready");
              const hasServed = tOrders.some(o => o.status === "served");
              const occupied = tOrders.length > 0;
              const tTotal = tOrders.reduce((s, o) => s + o.total, 0);
              const bg = hasNew ? C.warnLt : hasPrep ? C.blueLt : hasReady ? C.okLt : hasServed ? C.clayLt : C.white;
              const border = hasNew ? C.warn : hasPrep ? C.blue : hasReady ? C.ok : hasServed ? C.clay : C.sand;
              return (
                <div key={t.id} style={{ ...sCard, padding: 16, textAlign: "center", borderColor: border, borderWidth: occupied ? 2 : 1, background: bg }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: C.bark }}>{t.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: occupied ? border : C.stone, marginTop: 4 }}>
                    {occupied ? `${tOrders.length} order${tOrders.length > 1 ? "s" : ""}` : "Open"}
                  </div>
                  {tTotal > 0 && <div style={{ fontSize: 13, fontWeight: 800, color: C.clay, marginTop: 4 }}>{fmtCDF(tTotal)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BILLING ── */}
      {tab === "billing" && <BillingPanel orders={orders} setOrders={setOrders} ledger={ledger} setLedger={setLedger} cashRegister={cashRegister} setCashRegister={setCashRegister} />}

      {/* ── MENU ── */}
      {tab === "menu" && <MenuManager menu={menu} setMenu={setMenu} />}

      {/* ── INVENTORY ── */}
      {tab === "inventory" && <InventoryPanel inventory={inventory} setInventory={setInventory} suppliers={suppliers} setSuppliers={setSuppliers} />}

      {/* ── ACCOUNTS ── */}
      {tab === "accounts" && <AccountsPanel ledger={ledger} setLedger={setLedger} cashRegister={cashRegister} setCashRegister={setCashRegister} />}

      {/* ── STAFF ── */}
      {tab === "staff" && <StaffPanel staff={staff} setStaff={setStaff} attendance={attendance} setAttendance={setAttendance} />}

      {/* ── REPORTS ── */}
      {tab === "reports" && <ReportsPanel orders={orders} ledger={ledger} inventory={inventory} />}
    </div>
  );
};

// ============================================================
// BILLING PANEL
// ============================================================
const BillingPanel = ({ orders, setOrders, ledger, setLedger, cashRegister, setCashRegister }) => {
  const [selOrder, setSelOrder] = useState(null);
  const [payments, setPayments] = useState([]);
  const [payMethod, setPayMethod] = useState("cdf_cash");
  const [payAmount, setPayAmount] = useState("");
  const [showReceipt, setShowReceipt] = useState(null);

  const unpaid = orders.filter(o => o.status === "served");
  const order = selOrder ? orders.find(o => o.id === selOrder) : null;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = order ? order.total - totalPaid : 0;

  const addPayment = () => {
    const amt = payAmount === "" ? remaining : parseInt(payAmount);
    if (amt <= 0) return;
    setPayments(p => [...p, { method: PAYMENT_METHODS.find(m => m.id === payMethod).label, methodId: payMethod, amount: Math.min(amt, remaining) }]);
    setPayAmount("");
  };

  const closeCheck = () => {
    if (remaining > 0) return;
    setOrders(p => p.map(o => o.id === selOrder ? { ...o, status: "paid", payments: [...payments] } : o));
    // Update Supabase
    supabase.from('orders').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('order_number', selOrder)
      .then(({ error }) => { if (error) console.error('Close check failed:', error); });
    // Insert payments into Supabase
    const orderObj = orders.find(o => o.id === selOrder);
    if (orderObj?.dbId) {
      supabase.from('payments').insert(payments.map(p => ({ order_id: orderObj.dbId, method: p.methodId, method_label: p.method, amount: p.amount, currency: 'CDF' })))
        .then(({ error }) => { if (error) console.error('Payment insert failed:', error); });
    }
    // Ledger entry in Supabase
    supabase.from('ledger').insert({ date: new Date().toISOString().split('T')[0], type: 'revenue', category: 'Sales', description: `Order ${selOrder} — Table ${order.table}`, amount: order.total, reference: selOrder })
      .then(({ error }) => { if (error) console.error('Ledger insert failed:', error); });
    setLedger(p => [...p, { id: `le-${uid()}`, date: new Date().toISOString().split("T")[0], type: "revenue", cat: "Sales", desc: `Order ${selOrder} — Table ${order.table}`, amount: order.total }]);
    const cdfCash = payments.filter(p => p.methodId === "cdf_cash").reduce((s, p) => s + p.amount, 0);
    const usdCash = payments.filter(p => p.methodId === "usd_cash").reduce((s, p) => s + p.amount, 0);
    setCashRegister(p => ({ ...p, cdf: { ...p.cdf, sales: p.cdf.sales + cdfCash }, usd: { ...p.usd, sales: p.usd.sales + usdCash } }));
    setShowReceipt({ ...order, payments: [...payments] });
    setSelOrder(null); setPayments([]);
  };

  if (showReceipt) return (
    <div style={{ padding: 20 }}>
      <div style={{ ...sCard, padding: 32, maxWidth: 380, margin: "0 auto", fontFamily: "'Courier New', monospace", fontSize: 13, color: "#000", lineHeight: 1.7 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: fontD }}>KARIBU CAFÉ</div>
          <div style={{ fontSize: 11, color: "#666" }}>Likasi, Haut-Katanga, DRC</div>
          <div style={{ borderBottom: "1px dashed #999", margin: "12px 0" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>Order: {showReceipt.id}</span><span>Table {showReceipt.table}</span></div>
        <div style={{ fontSize: 12, color: "#666" }}>{new Date(showReceipt.time).toLocaleString()}</div>
        <div style={{ borderBottom: "1px dashed #999", margin: "8px 0" }} />
        {showReceipt.items.map((i, idx) => <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span>{i.qty} {i.name}</span><span>{fmtCDF(i.price * i.qty)}</span></div>)}
        <div style={{ borderBottom: "1px dashed #999", margin: "8px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15 }}><span>TOTAL</span><span>{fmtCDF(showReceipt.total)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666" }}><span>USD</span><span>{fmtUSD(showReceipt.total)}</span></div>
        <div style={{ borderBottom: "1px dashed #999", margin: "8px 0" }} />
        <div style={{ fontSize: 12, fontWeight: 700 }}>Payment:</div>
        {showReceipt.payments.map((p, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>{p.method}</span><span>{fmtCDF(p.amount)}</span></div>)}
        <div style={{ borderBottom: "1px dashed #999", margin: "8px 0" }} />
        <div style={{ textAlign: "center", fontSize: 12, color: "#666" }}><p style={{ margin: 4 }}>Merci! Thank you!</p><p style={{ margin: 4 }}>karibu-cafe.cd</p></div>
      </div>
      <div style={{ textAlign: "center", marginTop: 20 }}><button style={sBtnP} onClick={() => setShowReceipt(null)}>Done</button></div>
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Stat label="Unpaid checks" value={unpaid.length} accent={unpaid.length > 0 ? C.warn : C.ok} />
        <Stat label="CDF in drawer" value={fmtCDF(cashRegister.cdf.opening + cashRegister.cdf.sales - cashRegister.cdf.expenses)} accent={C.ok} />
        <Stat label="USD in drawer" value={`$${(cashRegister.usd.opening + cashRegister.usd.sales - cashRegister.usd.expenses).toFixed(2)}`} accent={C.blue} />
      </div>

      {!selOrder ? (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>Unpaid orders</h3>
          {unpaid.length === 0 ? <Empty icon="✅" text="All orders are paid" /> :
            <div style={{ display: "grid", gap: 8 }}>
              {unpaid.map(o => (
                <div key={o.id} onClick={() => setSelOrder(o.id)} style={{ ...sCard, padding: 16, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `4px solid ${C.warn}`, borderRadius: "4px 16px 16px 4px" }}>
                  <div><div style={{ fontWeight: 700, fontSize: 14 }}>{o.id}</div><div style={{ fontSize: 12, color: C.stone }}>Table {o.table} · {o.items.length} items</div></div>
                  <div style={{ textAlign: "right" }}><div style={{ fontSize: 16, fontWeight: 800, color: C.clay }}>{fmtCDF(o.total)}</div><div style={{ fontSize: 11, color: C.stone }}>{fmtUSD(o.total)}</div></div>
                </div>
              ))}
            </div>}
        </div>
      ) : order && (
        <div>
          <button onClick={() => { setSelOrder(null); setPayments([]); }} style={{ ...sBtnGhost, marginBottom: 16, padding: "6px 0" }}>← Back to list</button>
          <div style={{ ...sCard, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div><div style={{ fontSize: 18, fontWeight: 800 }}>{order.id}</div><div style={{ fontSize: 13, color: C.stone }}>Table {order.table}</div></div>
              <Badge bg={C.warnLt} color={C.warn}>Unpaid</Badge>
            </div>
            {order.items.map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14 }}><span>{i.qty}× {i.name}</span><span style={{ color: C.stone }}>{fmtCDF(i.price * i.qty)}</span></div>)}
            <div style={{ borderTop: `2px solid ${C.bark}`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 17 }}>
              <span>Total</span><span style={{ color: C.clay }}>{fmtCDF(order.total)}</span>
            </div>
          </div>

          {/* Payments made */}
          {payments.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {payments.map((p, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", background: C.okLt, borderRadius: 10, marginBottom: 4, fontSize: 13 }}><span style={{ color: C.sageDk, fontWeight: 600 }}>{p.method}</span><span style={{ fontWeight: 700, color: C.ok }}>{fmtCDF(p.amount)}</span></div>)}
            </div>
          )}

          {/* Remaining */}
          {remaining > 0 && (
            <div style={{ ...sCard, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Remaining: <span style={{ color: C.err }}>{fmtCDF(remaining)}</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {PAYMENT_METHODS.map(m => (
                  <button key={m.id} onClick={() => setPayMethod(m.id)} style={sChip(payMethod === m.id, m.color)}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={`Amount (${fmtCDF(remaining)})`} type="number" style={{ ...sInput, flex: 1 }} />
                <button onClick={addPayment} style={{ ...sBtnP, padding: "12px 20px" }}>Add</button>
              </div>
              <button onClick={() => { setPayAmount(""); addPayment(); }} style={{ ...sBtnS, width: "100%", marginTop: 8 }}>Pay full remaining ({fmtCDF(remaining)})</button>
            </div>
          )}

          {remaining <= 0 && totalPaid > 0 && (
            <button onClick={closeCheck} style={{ ...sBtnP, width: "100%", padding: 16, fontSize: 16, background: C.ok, borderRadius: 16 }}>Close check & print receipt ✓</button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// MENU MANAGER (full CRUD)
// ============================================================
const MenuManager = ({ menu, setMenu }) => {
  const [addCat, setAddCat] = useState(false);
  const [addItem, setAddItem] = useState(null);
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("🍽️");
  const [iName, setIName] = useState(""); const [iPrice, setIPrice] = useState(""); const [iDesc, setIDesc] = useState("");
  const emojis = ["☕", "🧊", "🥐", "🍳", "🥪", "🍰", "🍿", "🍽️", "🥤", "🍹"];

  const saveCat = () => { if (catName) { setMenu(p => [...p, { id: `c-${uid()}`, name: catName, emoji: catEmoji, items: [] }]); setCatName(""); setAddCat(false); } };
  const delCat = (id) => setMenu(p => p.filter(c => c.id !== id));
  const saveItem = (catId) => { if (iName && iPrice) { setMenu(p => p.map(c => c.id === catId ? { ...c, items: [...c.items, { id: `m-${uid()}`, name: iName, price: parseInt(iPrice), desc: iDesc, avail: true }] } : c)); setIName(""); setIPrice(""); setIDesc(""); setAddItem(null); } };
  const delItem = (catId, itemId) => setMenu(p => p.map(c => c.id === catId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c));
  const togItem = (catId, itemId) => setMenu(p => p.map(c => c.id === catId ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, avail: !i.avail } : i) } : c));

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Menu management</h3>
        <button onClick={() => setAddCat(true)} style={sBtnP}>+ Category</button>
      </div>

      {addCat && (
        <FormCard title="New category" onClose={() => setAddCat(false)}>
          <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category name" style={{ ...sInput, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>{emojis.map(e => <button key={e} onClick={() => setCatEmoji(e)} style={{ ...sBtn, width: 38, height: 38, fontSize: 20, borderRadius: 10, background: catEmoji === e ? C.clayLt : C.sandLt, border: catEmoji === e ? `2px solid ${C.clay}` : "none", padding: 0 }}>{e}</button>)}</div>
          <button onClick={saveCat} style={{ ...sBtnP, width: "100%" }}>Add category</button>
        </FormCard>
      )}

      {menu.map(cat => (
        <div key={cat.id} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{cat.emoji} {cat.name} <span style={{ fontSize: 12, color: C.stone, fontWeight: 500 }}>({cat.items.length})</span></h4>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setAddItem(cat.id)} style={{ ...sBtnS, padding: "6px 14px", fontSize: 12 }}>+ Item</button>
              {cat.items.length === 0 && <button onClick={() => delCat(cat.id)} style={{ ...sBtn, padding: "6px 14px", fontSize: 12, background: C.errLt, color: C.err, border: "none" }}>Delete</button>}
            </div>
          </div>

          {addItem === cat.id && (
            <FormCard title="New item" onClose={() => setAddItem(null)}>
              <div style={{ display: "grid", gap: 8 }}>
                <input value={iName} onChange={e => setIName(e.target.value)} placeholder="Item name" style={sInput} />
                <input value={iDesc} onChange={e => setIDesc(e.target.value)} placeholder="Description" style={sInput} />
                <input value={iPrice} onChange={e => setIPrice(e.target.value)} placeholder="Price (FC)" type="number" style={sInput} />
                <button onClick={() => saveItem(cat.id)} style={{ ...sBtnP, width: "100%" }}>Add item</button>
              </div>
            </FormCard>
          )}

          <div style={{ display: "grid", gap: 6 }}>
            {cat.items.map(item => (
              <div key={item.id} style={{ ...sCard, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: item.avail ? 1 : .5 }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div><div style={{ fontSize: 12, color: C.stone }}>{item.desc}</div></div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.clay }}>{fmtCDF(item.price)}</span>
                  <button onClick={() => togItem(cat.id, item.id)} style={{ ...sBtn, padding: "5px 12px", fontSize: 11, borderRadius: 8, border: "none", background: item.avail ? C.okLt : C.sandLt, color: item.avail ? C.ok : C.stone }}>{item.avail ? "On" : "Off"}</button>
                  <button onClick={() => delItem(cat.id, item.id)} style={{ ...sBtnGhost, padding: "4px 8px" }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// INVENTORY
// ============================================================
const InventoryPanel = ({ inventory, setInventory, suppliers, setSuppliers }) => {
  const [view, setView] = useState("stock");
  const [showAdd, setShowAdd] = useState(false);
  const [showAddSup, setShowAddSup] = useState(false);
  const [search, setSearch] = useState("");
  const [f, setF] = useState({ name: "", unit: "kg", stock: "", min: "", cost: "", supplier: "" });
  const [sf, setSf] = useState({ name: "", phone: "", items: "" });

  const low = inventory.filter(i => i.stock <= i.min);
  const filtered = inventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}><Stat label="Items" value={inventory.length} /><Stat label="Low stock" value={low.length} accent={low.length > 0 ? C.err : C.ok} /></div>
      {low.length > 0 && <div style={{ background: C.errLt, borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>{low.map(i => <Badge key={i.id} bg="#fff" color={C.err}>{i.name}: {i.stock} {i.unit}</Badge>)}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Tabs tabs={[{ id: "stock", label: "Stock" }, { id: "suppliers", label: "Suppliers" }]} active={view} onChange={setView} />
        <div style={{ flex: 1 }} />
        {view === "stock" && <button onClick={() => setShowAdd(true)} style={sBtnP}>+ Item</button>}
        {view === "suppliers" && <button onClick={() => setShowAddSup(true)} style={sBtnP}>+ Supplier</button>}
      </div>

      {showAdd && <FormCard title="Add inventory item" onClose={() => setShowAdd(false)}>
        <div style={{ display: "grid", gap: 8 }}>
          <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Name" style={sInput} />
          <FormRow><select value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })} style={sInput}><option>kg</option><option>L</option><option>pcs</option></select><input value={f.stock} onChange={e => setF({ ...f, stock: e.target.value })} placeholder="Stock" type="number" style={sInput} /><input value={f.min} onChange={e => setF({ ...f, min: e.target.value })} placeholder="Min" type="number" style={sInput} /></FormRow>
          <button onClick={() => { if (f.name) { setInventory(p => [...p, { id: `i-${uid()}`, name: f.name, unit: f.unit, stock: parseFloat(f.stock) || 0, min: parseFloat(f.min) || 1, cost: parseInt(f.cost) || 0, supplier: f.supplier }]); setShowAdd(false); setF({ name: "", unit: "kg", stock: "", min: "", cost: "", supplier: "" }); } }} style={{ ...sBtnP, width: "100%" }}>Add</button>
        </div>
      </FormCard>}

      {showAddSup && <FormCard title="Add supplier" onClose={() => setShowAddSup(false)}>
        <div style={{ display: "grid", gap: 8 }}>
          <input value={sf.name} onChange={e => setSf({ ...sf, name: e.target.value })} placeholder="Name" style={sInput} />
          <input value={sf.phone} onChange={e => setSf({ ...sf, phone: e.target.value })} placeholder="Phone (+243...)" style={sInput} />
          <input value={sf.items} onChange={e => setSf({ ...sf, items: e.target.value })} placeholder="Items supplied" style={sInput} />
          <button onClick={() => { if (sf.name) { setSuppliers(p => [...p, { id: `s-${uid()}`, ...sf }]); setShowAddSup(false); setSf({ name: "", phone: "", items: "" }); } }} style={{ ...sBtnP, width: "100%" }}>Add</button>
        </div>
      </FormCard>}

      {view === "stock" && <>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory..." style={{ ...sInput, marginBottom: 10 }} />
        <div style={{ display: "grid", gap: 6 }}>{filtered.map(i => { const isLow = i.stock <= i.min; return (
          <div key={i.id} style={{ ...sCard, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, borderLeft: `4px solid ${isLow ? C.err : C.ok}`, borderRadius: "4px 16px 16px 4px" }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{i.name} {isLow && <Badge bg={C.errLt} color={C.err}>Low</Badge>}</div><div style={{ fontSize: 11, color: C.stone }}>Min: {i.min} {i.unit}</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setInventory(p => p.map(x => x.id === i.id ? { ...x, stock: Math.max(0, Math.round((x.stock - 1) * 10) / 10) } : x))} style={{ ...sBtn, width: 28, height: 28, borderRadius: "50%", background: C.sandLt, fontSize: 16, color: C.bark, padding: 0, border: "none" }}>−</button>
              <span style={{ fontSize: 16, fontWeight: 800, minWidth: 36, textAlign: "center", color: isLow ? C.err : C.bark }}>{Math.round(i.stock * 10) / 10}</span>
              <button onClick={() => setInventory(p => p.map(x => x.id === i.id ? { ...x, stock: Math.round((x.stock + 1) * 10) / 10 } : x))} style={{ ...sBtn, width: 28, height: 28, borderRadius: "50%", background: C.sandLt, fontSize: 16, color: C.bark, padding: 0, border: "none" }}>+</button>
              <button onClick={() => setInventory(p => p.filter(x => x.id !== i.id))} style={{ ...sBtnGhost, padding: "4px 6px" }}>✕</button>
            </div>
          </div>
        ); })}</div></>}

      {view === "suppliers" && <div style={{ display: "grid", gap: 10 }}>{suppliers.map(s => (
        <div key={s.id} style={{ ...sCard, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><div style={{ fontSize: 15, fontWeight: 700 }}>{s.name}</div><div style={{ fontSize: 13, color: C.stone }}>{s.phone}</div><div style={{ fontSize: 12, color: C.stone, marginTop: 2 }}>{s.items}</div></div>
            <button onClick={() => setSuppliers(p => p.filter(x => x.id !== s.id))} style={{ ...sBtnGhost, padding: "4px 6px" }}>✕</button>
          </div>
        </div>
      ))}</div>}
    </div>
  );
};

// ============================================================
// ACCOUNTS — with proper dual-currency cash reconciliation
// ============================================================
const AccountsPanel = ({ ledger, setLedger, cashRegister, setCashRegister }) => {
  const [view, setView] = useState("ledger");
  const [showAdd, setShowAdd] = useState(false);
  const [showCash, setShowCash] = useState(false);
  const [f, setF] = useState({ type: "expense", cat: "Supplies", desc: "", amount: "", currency: "CDF" });

  const today = new Date().toISOString().split("T")[0];
  const rev = ledger.filter(e => e.type === "revenue").reduce((s, e) => s + e.amount, 0);
  const exp = ledger.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const todayRev = ledger.filter(e => e.type === "revenue" && e.date === today).reduce((s, e) => s + e.amount, 0);
  const todayExp = ledger.filter(e => e.type === "expense" && e.date === today).reduce((s, e) => s + e.amount, 0);

  // Expected cash = opening + sales - expenses
  const cdfExpected = cashRegister.cdf.opening + cashRegister.cdf.sales - cashRegister.cdf.expenses;
  const usdExpected = cashRegister.usd.opening + cashRegister.usd.sales - cashRegister.usd.expenses;

  const addEntry = () => {
    if (!f.desc || !f.amount) return;
    const amt = parseInt(f.amount);
    setLedger(p => [...p, { id: `le-${uid()}`, date: today, type: f.type, cat: f.type === "revenue" ? "Sales" : f.cat, desc: f.desc, amount: amt }]);
    // Deduct from cash register if expense paid in cash
    if (f.type === "expense") {
      if (f.currency === "CDF") setCashRegister(p => ({ ...p, cdf: { ...p.cdf, expenses: p.cdf.expenses + amt } }));
      else setCashRegister(p => ({ ...p, usd: { ...p.usd, expenses: p.usd.expenses + parseFloat(f.amount) } }));
    }
    setF({ type: "expense", cat: "Supplies", desc: "", amount: "", currency: "CDF" }); setShowAdd(false);
  };

  const expByCat = useMemo(() => { const m = {}; ledger.filter(e => e.type === "expense").forEach(e => m[e.cat] = (m[e.cat] || 0) + e.amount); return Object.entries(m).sort((a, b) => b[1] - a[1]); }, [ledger]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Stat label="Today revenue" value={fmtCDF(todayRev)} accent={C.ok} />
        <Stat label="Today expenses" value={fmtCDF(todayExp)} accent={C.err} />
      </div>

      {/* Cash drawer summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ ...sCard, padding: 16, borderLeft: `4px solid ${C.ok}`, borderRadius: "4px 16px 16px 4px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.ok, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>CDF Cash Drawer</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.bark, marginBottom: 8 }}>{fmtCDF(cdfExpected)}</div>
          <div style={{ fontSize: 12, color: C.stone, lineHeight: 1.8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Opening float</span><span style={{ fontWeight: 600 }}>{fmtCDF(cashRegister.cdf.opening)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>+ Sales</span><span style={{ fontWeight: 600, color: C.ok }}>+{fmtCDF(cashRegister.cdf.sales)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>- Expenses</span><span style={{ fontWeight: 600, color: C.err }}>-{fmtCDF(cashRegister.cdf.expenses)}</span></div>
          </div>
          {cashRegister.cdf.lastCount != null && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.sand}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: C.stone }}>Last count</span><span style={{ fontWeight: 700 }}>{fmtCDF(cashRegister.cdf.lastCount)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: C.stone }}>Difference</span><span style={{ fontWeight: 700, color: cashRegister.cdf.diff === 0 ? C.ok : C.err }}>{cashRegister.cdf.diff === 0 ? "Balanced ✓" : `${cashRegister.cdf.diff > 0 ? "+" : ""}${fmtCDF(cashRegister.cdf.diff)}`}</span></div>
            </div>
          )}
        </div>
        <div style={{ ...sCard, padding: 16, borderLeft: `4px solid ${C.blue}`, borderRadius: "4px 16px 16px 4px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>USD Cash Drawer</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.bark, marginBottom: 8 }}>${(usdExpected).toFixed(2)}</div>
          <div style={{ fontSize: 12, color: C.stone, lineHeight: 1.8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Opening float</span><span style={{ fontWeight: 600 }}>${cashRegister.usd.opening.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>+ Sales</span><span style={{ fontWeight: 600, color: C.ok }}>+${cashRegister.usd.sales.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>- Expenses</span><span style={{ fontWeight: 600, color: C.err }}>-${cashRegister.usd.expenses.toFixed(2)}</span></div>
          </div>
          {cashRegister.usd.lastCount != null && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.sand}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: C.stone }}>Last count</span><span style={{ fontWeight: 700 }}>${cashRegister.usd.lastCount.toFixed(2)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: C.stone }}>Difference</span><span style={{ fontWeight: 700, color: cashRegister.usd.diff === 0 ? C.ok : C.err }}>{cashRegister.usd.diff === 0 ? "Balanced ✓" : `${cashRegister.usd.diff > 0 ? "+" : ""}$${cashRegister.usd.diff.toFixed(2)}`}</span></div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Tabs tabs={[{ id: "ledger", label: "Ledger" }, { id: "report", label: "P&L" }, { id: "cash", label: "Cash register" }]} active={view} onChange={setView} />
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowAdd(true)} style={sBtnP}>+ Entry</button>
      </div>

      {showAdd && <FormCard title="New entry" onClose={() => setShowAdd(false)}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>{["revenue", "expense"].map(t => <button key={t} onClick={() => setF({ ...f, type: t })} style={sChip(f.type === t, t === "revenue" ? C.ok : C.err)}>{t === "revenue" ? "Revenue" : "Expense"}</button>)}</div>
          {f.type === "expense" && <select value={f.cat} onChange={e => setF({ ...f, cat: e.target.value })} style={sInput}>{EXP_CATS.map(c => <option key={c}>{c}</option>)}</select>}
          <input value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} placeholder="Description" style={sInput} />
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
            <input value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} placeholder="Amount" type="number" style={sInput} />
            {f.type === "expense" && <select value={f.currency} onChange={e => setF({ ...f, currency: e.target.value })} style={sInput}><option value="CDF">CDF</option><option value="USD">USD</option></select>}
          </div>
          <button onClick={addEntry} style={{ ...sBtnP, width: "100%" }}>Add entry</button>
        </div>
      </FormCard>}

      {view === "ledger" && <div style={{ display: "grid", gap: 5 }}>{[...ledger].reverse().map(e => (
        <div key={e.id} style={{ ...sCard, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderLeft: `4px solid ${e.type === "revenue" ? C.ok : C.err}`, borderRadius: "4px 14px 14px 4px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: e.type === "revenue" ? C.okLt : C.errLt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{e.type === "revenue" ? "↗" : "↙"}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{e.desc}</div><div style={{ fontSize: 11, color: C.stone }}>{e.date} {e.cat ? `· ${e.cat}` : ""}</div></div>
          <span style={{ fontSize: 14, fontWeight: 800, color: e.type === "revenue" ? C.ok : C.err }}>{e.type === "revenue" ? "+" : "−"}{fmtCDF(e.amount)}</span>
          <button onClick={() => setLedger(p => p.filter(x => x.id !== e.id))} style={{ ...sBtnGhost, padding: "3px 6px" }}>✕</button>
        </div>
      ))}</div>}

      {view === "report" && <div style={{ ...sCard, padding: 20 }}>
        <h4 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Profit & Loss</h4>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.sand}` }}><span>Revenue</span><span style={{ fontWeight: 700, color: C.ok }}>{fmtCDF(rev)}</span></div>
        {expByCat.map(([c, a]) => <div key={c} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0 4px 16px", fontSize: 13 }}><span style={{ color: C.stone }}>{c}</span><span style={{ color: C.err }}>−{fmtCDF(a)}</span></div>)}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: `1px solid ${C.sand}` }}><span>Expenses</span><span style={{ fontWeight: 700, color: C.err }}>−{fmtCDF(exp)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", borderTop: `2px solid ${C.bark}`, marginTop: 8 }}><span style={{ fontSize: 17, fontWeight: 800 }}>Net</span><span style={{ fontSize: 17, fontWeight: 800, color: rev - exp >= 0 ? C.ok : C.err }}>{rev - exp >= 0 ? "+" : "−"}{fmtCDF(Math.abs(rev - exp))}</span></div>
      </div>}

      {/* ── CASH REGISTER TAB ── */}
      {view === "cash" && <CashRegisterPanel cashRegister={cashRegister} setCashRegister={setCashRegister} />}
    </div>
  );
};

// ── Cash Register with Opening Float, Closing Count, Reconciliation ──
const CashRegisterPanel = ({ cashRegister, setCashRegister }) => {
  const [step, setStep] = useState(cashRegister.isOpen ? "open" : "setup"); // setup | open | closing
  const [openCDF, setOpenCDF] = useState("");
  const [openUSD, setOpenUSD] = useState("");
  const [closeCDF, setCloseCDF] = useState("");
  const [closeUSD, setCloseUSD] = useState("");

  const cdfExpected = cashRegister.cdf.opening + cashRegister.cdf.sales - cashRegister.cdf.expenses;
  const usdExpected = cashRegister.usd.opening + cashRegister.usd.sales - cashRegister.usd.expenses;

  const openRegister = () => {
    const cdf = parseInt(openCDF) || 0;
    const usd = parseFloat(openUSD) || 0;
    setCashRegister(p => ({
      ...p,
      isOpen: true,
      openedAt: new Date().toISOString(),
      cdf: { ...p.cdf, opening: cdf, sales: 0, expenses: 0, lastCount: null, diff: null },
      usd: { ...p.usd, opening: usd, sales: 0, expenses: 0, lastCount: null, diff: null },
    }));
    setStep("open");
    setOpenCDF(""); setOpenUSD("");
  };

  const closeRegister = () => {
    const countedCDF = parseInt(closeCDF) || 0;
    const countedUSD = parseFloat(closeUSD) || 0;
    const diffCDF = countedCDF - cdfExpected;
    const diffUSD = countedUSD - usdExpected;
    const reconRecord = {
      id: uid(),
      date: new Date().toISOString(),
      cdf: { expected: Math.round(cdfExpected), counted: countedCDF, diff: Math.round(diffCDF) },
      usd: { expected: Math.round(usdExpected * 100) / 100, counted: countedUSD, diff: Math.round(diffUSD * 100) / 100 },
    };
    setCashRegister(p => ({
      ...p,
      isOpen: false,
      cdf: { ...p.cdf, lastCount: countedCDF, diff: Math.round(diffCDF) },
      usd: { ...p.usd, lastCount: countedUSD, diff: Math.round(diffUSD * 100) / 100 },
      history: [...(p.history || []), reconRecord],
    }));
    setStep("setup");
    setCloseCDF(""); setCloseUSD("");
  };

  // ── SETUP: Open the register ──
  if (!cashRegister.isOpen && step !== "closing") return (
    <div>
      <div style={{ ...sCard, padding: 24, textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <h3 style={{ fontFamily: fontD, fontSize: 20, margin: "0 0 6px" }}>Register is closed</h3>
        <p style={{ fontSize: 14, color: C.stone, margin: "0 0 20px" }}>Enter your opening float to start the day</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, textAlign: "left" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ok, marginBottom: 6, textTransform: "uppercase" }}>CDF opening float</div>
            <input value={openCDF} onChange={e => setOpenCDF(e.target.value)} placeholder="e.g. 500,000" type="number" style={sInput} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 6, textTransform: "uppercase" }}>USD opening float</div>
            <input value={openUSD} onChange={e => setOpenUSD(e.target.value)} placeholder="e.g. 200" type="number" step="0.01" style={sInput} />
          </div>
        </div>
        <button onClick={openRegister} style={{ ...sBtnP, width: "100%", padding: 16, fontSize: 16, background: C.ok, borderRadius: 16 }}>Open register</button>
      </div>

      {/* Reconciliation history */}
      {cashRegister.history?.length > 0 && (
        <div style={{ ...sCard, padding: 18 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Reconciliation history</h4>
          {[...(cashRegister.history || [])].reverse().slice(0, 5).map(r => {
            const cdfOk = r.cdf.diff === 0;
            const usdOk = r.usd.diff === 0;
            return (
              <div key={r.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.sandLt}`, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  <span style={{ fontSize: 12, color: C.stone }}>{new Date(r.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: C.stone }}>CDF</span>
                    <span style={{ fontWeight: 700, color: cdfOk ? C.ok : C.err }}>
                      {cdfOk ? "✓ Balanced" : `${r.cdf.diff > 0 ? "+" : ""}${fmtCDF(r.cdf.diff)}`}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: C.stone }}>USD</span>
                    <span style={{ fontWeight: 700, color: usdOk ? C.ok : C.err }}>
                      {usdOk ? "✓ Balanced" : `${r.usd.diff > 0 ? "+" : ""}$${r.usd.diff.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── OPEN: Register is running, show close option ──
  return (
    <div>
      <div style={{ ...sCard, padding: 20, marginBottom: 16, background: C.okLt, borderColor: C.ok }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.ok }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: C.sageDk }}>Register is open</span>
          </div>
          <span style={{ fontSize: 12, color: C.stone }}>Since {cashRegister.openedAt ? timeStr(cashRegister.openedAt) : "—"}</span>
        </div>
      </div>

      {/* Live totals */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ ...sCard, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.ok, marginBottom: 10, textTransform: "uppercase" }}>CDF expected in drawer</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.bark, marginBottom: 12 }}>{fmtCDF(cdfExpected)}</div>
          <div style={{ fontSize: 12, color: C.stone, lineHeight: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Opening</span><span>{fmtCDF(cashRegister.cdf.opening)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>+ Cash sales</span><span style={{ color: C.ok }}>+{fmtCDF(cashRegister.cdf.sales)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>− Cash expenses</span><span style={{ color: C.err }}>−{fmtCDF(cashRegister.cdf.expenses)}</span></div>
          </div>
        </div>
        <div style={{ ...sCard, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 10, textTransform: "uppercase" }}>USD expected in drawer</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.bark, marginBottom: 12 }}>${usdExpected.toFixed(2)}</div>
          <div style={{ fontSize: 12, color: C.stone, lineHeight: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Opening</span><span>${cashRegister.usd.opening.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>+ Cash sales</span><span style={{ color: C.ok }}>+${cashRegister.usd.sales.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>− Cash expenses</span><span style={{ color: C.err }}>−${cashRegister.usd.expenses.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      {/* Close & reconcile */}
      <div style={{ ...sCard, padding: 20 }}>
        <h4 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>Close register & reconcile</h4>
        <p style={{ fontSize: 13, color: C.stone, margin: "0 0 16px" }}>Count the cash in your drawer and enter the amounts below.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ok, marginBottom: 6 }}>CDF counted</div>
            <input value={closeCDF} onChange={e => setCloseCDF(e.target.value)} placeholder={`Expected: ${fmtCDF(cdfExpected)}`} type="number" style={sInput} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 6 }}>USD counted</div>
            <input value={closeUSD} onChange={e => setCloseUSD(e.target.value)} placeholder={`Expected: $${usdExpected.toFixed(2)}`} type="number" step="0.01" style={sInput} />
          </div>
        </div>
        {/* Live diff preview */}
        {(closeCDF || closeUSD) && (
          <div style={{ background: C.sandLt, borderRadius: 12, padding: "12px 16px", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Preview:</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
              {closeCDF && (() => {
                const d = parseInt(closeCDF) - cdfExpected;
                return <div style={{ display: "flex", justifyContent: "space-between" }}><span>CDF difference</span><span style={{ fontWeight: 700, color: d === 0 ? C.ok : C.err }}>{d === 0 ? "✓ Balanced" : `${d > 0 ? "Over +" : "Short "}${fmtCDF(d)}`}</span></div>;
              })()}
              {closeUSD && (() => {
                const d = Math.round((parseFloat(closeUSD) - usdExpected) * 100) / 100;
                return <div style={{ display: "flex", justifyContent: "space-between" }}><span>USD difference</span><span style={{ fontWeight: 700, color: d === 0 ? C.ok : C.err }}>{d === 0 ? "✓ Balanced" : `${d > 0 ? "Over +$" : "Short $"}${Math.abs(d).toFixed(2)}`}</span></div>;
              })()}
            </div>
          </div>
        )}
        <button onClick={closeRegister} disabled={!closeCDF && !closeUSD} style={{ ...sBtnP, width: "100%", padding: 16, fontSize: 16, background: (!closeCDF && !closeUSD) ? C.sand : C.err, borderRadius: 16, opacity: (!closeCDF && !closeUSD) ? .5 : 1 }}>Close register & save</button>
      </div>
    </div>
  );
};

// ============================================================
// STAFF & ATTENDANCE — PIN-based self check-in/out
// ============================================================
const StaffPanel = ({ staff, setStaff, attendance, setAttendance }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [n, setN] = useState(""); const [r, setR] = useState("Barista"); const [newPin, setNewPin] = useState("");
  const [clockPin, setClockPin] = useState("");
  const [clockMsg, setClockMsg] = useState(null); // { type: "in"|"out"|"error", name }
  const today = new Date().toISOString().split("T")[0];

  const isIn = (id) => attendance.some(a => a.staffId === id && a.date === today && !a.out);
  const todayLog = attendance.filter(a => a.date === today);
  const presentCount = staff.filter(s => isIn(s.id)).length;

  const handleClockPin = (pin) => {
    if (pin.length < 4) return;
    const member = staff.find(s => s.pin === pin);
    if (!member) {
      setClockMsg({ type: "error", name: "" });
      setClockPin("");
      setTimeout(() => setClockMsg(null), 2000);
      return;
    }
    if (isIn(member.id)) {
      // Clock out
      setAttendance(p => p.map(a => a.staffId === member.id && a.date === today && !a.out ? { ...a, out: new Date().toISOString() } : a));
      setClockMsg({ type: "out", name: member.name });
    } else {
      // Clock in
      setAttendance(p => [...p, { staffId: member.id, date: today, in: new Date().toISOString(), out: null }]);
      setClockMsg({ type: "in", name: member.name });
    }
    setClockPin("");
    setTimeout(() => setClockMsg(null), 3000);
  };

  const pressKey = (k) => {
    if (k === "clear") { setClockPin(""); return; }
    if (k === "back") { setClockPin(p => p.slice(0, -1)); return; }
    const next = clockPin + k;
    setClockPin(next);
    if (next.length === 4) handleClockPin(next);
  };

  const formatDuration = (inTime, outTime) => {
    if (!outTime) return "Active";
    const mins = Math.round((new Date(outTime) - new Date(inTime)) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Clock in/out terminal */}
      <div style={{ ...sCard, padding: 24, marginBottom: 20, textAlign: "center" }}>
        {clockMsg ? (
          <div style={{ padding: "20px 0" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, background: clockMsg.type === "error" ? C.errLt : clockMsg.type === "in" ? C.okLt : C.sandLt }}>
              {clockMsg.type === "error" ? "✕" : clockMsg.type === "in" ? "✓" : "→"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: clockMsg.type === "error" ? C.err : C.bark, marginBottom: 4 }}>
              {clockMsg.type === "error" ? "PIN not recognized" : clockMsg.type === "in" ? `Welcome, ${clockMsg.name}!` : `Goodbye, ${clockMsg.name}!`}
            </div>
            <div style={{ fontSize: 15, color: clockMsg.type === "error" ? C.err : C.ok, fontWeight: 600 }}>
              {clockMsg.type === "error" ? "Try again" : clockMsg.type === "in" ? "Clocked in" : "Clocked out"}
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.bark, marginBottom: 4 }}>Staff check-in / check-out</div>
            <p style={{ fontSize: 13, color: C.stone, margin: "0 0 20px" }}>Enter your 4-digit PIN</p>
            
            {/* PIN dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 24 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", background: i < clockPin.length ? C.clay : C.sand, transition: "all .15s", transform: i < clockPin.length ? "scale(1.1)" : "scale(1)" }} />
              ))}
            </div>

            {/* Numpad */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, maxWidth: 260, margin: "0 auto" }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, "clear", 0, "back"].map(k => (
                <button key={k} onClick={() => pressKey(String(k))} style={{
                  ...sBtn, width: "100%", height: 56, borderRadius: 14, fontSize: k === "clear" || k === "back" ? 13 : 24, fontWeight: 700,
                  background: k === "clear" ? C.errLt : k === "back" ? C.sandLt : C.white,
                  color: k === "clear" ? C.err : k === "back" ? C.stone : C.bark,
                  border: k === "clear" || k === "back" ? "none" : `1.5px solid ${C.sand}`,
                }}>
                  {k === "clear" ? "Clear" : k === "back" ? "⌫" : k}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Who's here now */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>On duty today <span style={{ color: C.ok, fontWeight: 800 }}>({presentCount})</span></h4>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {staff.map(s => {
            const present = isIn(s.id);
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: present ? C.okLt : C.sandLt, border: `1.5px solid ${present ? C.ok : C.sand}` }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: present ? C.ok : C.sand }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: present ? C.sageDk : C.stone }}>{s.name}</span>
                <span style={{ fontSize: 11, color: C.stone }}>{s.role}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's attendance log */}
      <div style={{ ...sCard, padding: 18, marginBottom: 20 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Today's log</h4>
        {todayLog.length === 0 ? <p style={{ fontSize: 13, color: C.stone }}>No check-ins yet today</p> :
          <div style={{ display: "grid", gap: 6 }}>
            {todayLog.map((a, i) => {
              const member = staff.find(s => s.id === a.staffId);
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: C.sandLt, borderRadius: 10, fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.out ? C.stone : C.ok }} />
                    <span style={{ fontWeight: 700 }}>{member?.name || "Unknown"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, color: C.stone }}>
                    <span>In: {timeStr(a.in)}</span>
                    <span>{a.out ? `Out: ${timeStr(a.out)}` : "Active"}</span>
                    <Badge bg={a.out ? C.sandLt : C.okLt} color={a.out ? C.stone : C.ok}>{formatDuration(a.in, a.out)}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>

      {/* Staff management (manager only — already behind PIN gate) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Team members</h4>
        <button onClick={() => setShowAdd(true)} style={sBtnP}>+ Staff</button>
      </div>
      {showAdd && <FormCard title="Add team member" onClose={() => setShowAdd(false)}>
        <div style={{ display: "grid", gap: 8 }}>
          <input value={n} onChange={e => setN(e.target.value)} placeholder="Full name" style={sInput} />
          <select value={r} onChange={e => setR(e.target.value)} style={sInput}><option>Manager</option><option>Barista</option><option>Kitchen</option><option>Server</option></select>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.bark2, display: "block", marginBottom: 4 }}>4-digit PIN for clock-in/out</label>
            <input value={newPin} onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); setNewPin(v); }} placeholder="e.g. 1234" maxLength={4} style={sInput} />
          </div>
          <button onClick={() => { if (n && newPin.length === 4) { if (staff.some(s => s.pin === newPin)) { alert("This PIN is already used by another staff member"); return; } setStaff(p => [...p, { id: `st-${uid()}`, name: n, role: r, pin: newPin }]); setN(""); setNewPin(""); setShowAdd(false); } }} style={{ ...sBtnP, width: "100%", opacity: (n && newPin.length === 4) ? 1 : 0.4 }}>Add team member</button>
        </div>
      </FormCard>}
      <div style={{ display: "grid", gap: 8 }}>
        {staff.map(s => (
          <div key={s.id} style={{ ...sCard, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: isIn(s.id) ? C.okLt : C.sandLt, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: isIn(s.id) ? C.ok : C.stone }}>{s.name.split(" ").map(x => x[0]).join("").slice(0, 2)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: C.stone }}>{s.role} · PIN: {s.pin}</div>
            </div>
            <button onClick={() => setStaff(p => p.filter(x => x.id !== s.id))} style={{ ...sBtnGhost, padding: "4px 8px" }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// REPORTS
// ============================================================
const ReportsPanel = ({ orders, ledger, inventory }) => {
  const today = new Date().toISOString().split("T")[0];
  const todayOrders = orders.filter(o => o.time?.startsWith(today));
  const todayRev = todayOrders.filter(o => o.status === "paid").reduce((s, o) => s + o.total, 0);
  const todayItems = todayOrders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.qty, 0), 0);

  const itemSales = useMemo(() => {
    const m = {};
    todayOrders.forEach(o => o.items.forEach(i => { if (!m[i.name]) m[i.name] = { name: i.name, qty: 0, rev: 0 }; m[i.name].qty += i.qty; m[i.name].rev += i.price * i.qty; }));
    return Object.values(m).sort((a, b) => b.rev - a.rev);
  }, [todayOrders]);

  const paymentBreakdown = useMemo(() => {
    const m = {};
    todayOrders.filter(o => o.payments).forEach(o => o.payments.forEach(p => { m[p.method] = (m[p.method] || 0) + p.amount; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [todayOrders]);

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>Today's reports</h3>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <Stat label="Orders" value={todayOrders.length} />
        <Stat label="Items sold" value={todayItems} />
        <Stat label="Revenue" value={fmtCDF(todayRev)} accent={C.ok} />
        <Stat label="Avg check" value={todayOrders.length > 0 ? fmtCDF(Math.round(todayRev / todayOrders.length)) : "—"} />
      </div>

      <div style={{ ...sCard, padding: 18, marginBottom: 16 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Top selling items</h4>
        {itemSales.length === 0 ? <p style={{ color: C.stone, fontSize: 13 }}>No sales yet</p> :
          itemSales.slice(0, 10).map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14, borderBottom: `1px solid ${C.sandLt}` }}>
              <span><span style={{ color: C.stone, marginRight: 8, fontWeight: 700 }}>#{i + 1}</span>{item.name}</span>
              <span><span style={{ color: C.stone, marginRight: 12 }}>{item.qty} sold</span><span style={{ fontWeight: 700, color: C.ok }}>{fmtCDF(item.rev)}</span></span>
            </div>
          ))}
      </div>

      {paymentBreakdown.length > 0 && <div style={{ ...sCard, padding: 18, marginBottom: 16 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Payment methods</h4>
        {paymentBreakdown.map(([method, amt]) => {
          const pct = todayRev > 0 ? Math.round(amt / todayRev * 100) : 0;
          return <div key={method} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span>{method}</span><span style={{ color: C.stone }}>{pct}% — {fmtCDF(amt)}</span></div>
            <div style={{ height: 8, background: C.sandLt, borderRadius: 4 }}><div style={{ height: "100%", width: `${pct}%`, background: C.clay, borderRadius: 4 }} /></div>
          </div>;
        })}
      </div>}

      <div style={{ ...sCard, padding: 18 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Low stock alerts</h4>
        {inventory.filter(i => i.stock <= i.min).length === 0 ? <p style={{ color: C.ok, fontSize: 13, fontWeight: 600 }}>All stock levels healthy ✓</p> :
          inventory.filter(i => i.stock <= i.min).map(i => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14, borderBottom: `1px solid ${C.sandLt}` }}>
              <span style={{ fontWeight: 600 }}>{i.name}</span>
              <span style={{ color: C.err, fontWeight: 700 }}>{i.stock} {i.unit} (min: {i.min})</span>
            </div>
          ))}
      </div>
    </div>
  );
};

// ============================================================
// MAIN APP
// ============================================================
export default function KaribuCafe() {
  // Detect mode from URL params: ?mode=customer&table=7 or ?mode=staff
  const [mode, setMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const m = params.get("mode");
      const t = params.get("table");
      if (m === "customer" && t) return "customer";
      if (m === "staff") return "staff";
    } catch (e) {}
    return "admin"; // Default: admin home
  });
  const [table, setTable] = useState(() => {
    try { return parseInt(new URLSearchParams(window.location.search).get("table")) || 1; } catch (e) { return 1; }
  });
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Load existing orders from Supabase
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('Load orders failed:', error); return; }
        if (data) {
          setOrders(data.map(o => ({
            id: o.order_number,
            dbId: o.id,
            table: o.table_number,
            guest: o.customer_name ? { name: o.customer_name, phone: o.customer_phone, guests: o.guest_count } : null,
            items: (o.order_items || []).map(i => ({ id: i.menu_item_id || i.id, name: i.name, price: i.price, qty: i.quantity })),
            total: o.total,
            status: o.status,
            time: o.created_at,
            payments: [],
          })));
        }
      });

    // Real-time: listen for changes
    const sub = supabase.channel('orders_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        // Fetch full order with items
        supabase.from('orders').select('*, order_items(*)').eq('id', payload.new.id).single()
          .then(({ data }) => {
            if (data) {
              setOrders(p => {
                if (p.find(o => o.dbId === data.id)) return p;
                return [...p, {
                  id: data.order_number, dbId: data.id, table: data.table_number,
                  guest: data.customer_name ? { name: data.customer_name, phone: data.customer_phone, guests: data.guest_count } : null,
                  items: (data.order_items || []).map(i => ({ id: i.menu_item_id || i.id, name: i.name, price: i.price, qty: i.quantity })),
                  total: data.total, status: data.status, time: data.created_at, payments: [],
                }];
              });
            }
          });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        setOrders(p => p.map(o => o.dbId === payload.new.id ? { ...o, status: payload.new.status } : o));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, (payload) => {
        setOrders(p => p.filter(o => o.dbId !== payload.old.id));
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, []);
  const [menu, setMenu] = useState(DEFAULT_MENU);
  const [inventory, setInventory] = useState(DEFAULT_INVENTORY);
  const [suppliers, setSuppliers] = useState(DEFAULT_SUPPLIERS);
  const [recipes] = useState(DEFAULT_RECIPES);
  const [ledger, setLedger] = useState(DEFAULT_LEDGER);
  const [staff, setStaff] = useState(DEFAULT_STAFF);
  const [attendance, setAttendance] = useState([]);
  const [cashRegister, setCashRegister] = useState({
    isOpen: false,
    openedAt: null,
    cdf: { opening: 0, sales: 0, expenses: 0, lastCount: null, diff: null },
    usd: { opening: 0, sales: 0, expenses: 0, lastCount: null, diff: null },
    history: [],
  });
  const [loyaltyActive] = useState(false);

  const handleOrder = (order) => {
    // Add to local state immediately
    setOrders(p => [...p, order]);

    // Insert into Supabase with correct column names
    supabase
      .from('orders')
      .insert({
        order_number: order.id,
        table_number: order.table,
        customer_name: order.guest?.name || null,
        customer_phone: order.guest?.phone || null,
        guest_count: order.guest?.guests || 1,
        subtotal: order.total,
        discount: 0,
        total: order.total,
        status: 'new',
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) { console.error('Order insert failed:', error); return; }
        if (data) {
          // Store the DB id on the local order
          setOrders(p => p.map(o => o.id === order.id ? { ...o, dbId: data.id } : o));
          // Insert order items
          supabase.from('order_items').insert(
            order.items.map(item => ({ order_id: data.id, name: item.name, price: item.price, quantity: item.qty }))
          ).then(({ error: e }) => { if (e) console.error('Items insert failed:', e); });
        }
      });

    // Save customer for order history
    if (order.guest?.phone) {
      supabase.from('customers').upsert({ phone: order.guest.phone, name: order.guest.name }, { onConflict: 'phone' })
        .then(({ error }) => { if (error) console.error('Customer save failed:', error); });
    }

    // Deduct inventory locally
    order.items.forEach(item => {
      const recipe = recipes[item.id];
      if (recipe) recipe.forEach(ing => setInventory(p => p.map(inv => inv.id === ing.inv ? { ...inv, stock: Math.max(0, Math.round((inv.stock - ing.qty * item.qty) * 100) / 100) } : inv)));
    });
  };

  // ── CUSTOMER VIEW (QR direct — no navigation to other modes) ──
  if (mode === "customer") return <><style>{fontImport}</style><CustomerView table={table} menu={menu} onOrder={handleOrder} setMode={setMode} orders={orders} /></>;

  // ── STAFF VIEW (direct dashboard — open access tabs only, PIN for manager) ──
  if (mode === "staff") return (
    <><style>{fontImport}</style>
    <StaffDash orders={orders} setOrders={setOrders} menu={menu} setMenu={setMenu} inventory={inventory} setInventory={setInventory} suppliers={suppliers} setSuppliers={setSuppliers} recipes={recipes} ledger={ledger} setLedger={setLedger} staff={staff} setStaff={setStaff} attendance={attendance} setAttendance={setAttendance} cashRegister={cashRegister} setCashRegister={setCashRegister} loyaltyActive={loyaltyActive} isAdmin={false} />
    </>
  );

  // ── ADMIN FULL-ACCESS DASHBOARD (all tabs unlocked, no PIN needed) ──
  if (mode === "staff-admin") return (
    <><style>{fontImport}</style>
    <StaffDash orders={orders} setOrders={setOrders} menu={menu} setMenu={setMenu} inventory={inventory} setInventory={setInventory} suppliers={suppliers} setSuppliers={setSuppliers} recipes={recipes} ledger={ledger} setLedger={setLedger} staff={staff} setStaff={setStaff} attendance={attendance} setAttendance={setAttendance} cashRegister={cashRegister} setCashRegister={setCashRegister} loyaltyActive={loyaltyActive} isAdmin={true} />
    <button onClick={() => setMode("admin")} style={{ position: "fixed", bottom: 16, right: 16, ...sBtn, background: C.bark, color: "#fff", padding: "10px 20px", fontSize: 12, borderRadius: 20, border: "none", zIndex: 300, boxShadow: "0 4px 20px rgba(0,0,0,.15)" }}>← Admin home</button>
    </>
  );

  // ── ADMIN HOME (owner access — can launch customer preview or full-access dashboard) ──
  return (
    <><style>{fontImport}</style>
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: C.clay, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 36, color: "#fff", boxShadow: `0 12px 40px ${C.clay}40` }}>☕</div>
        <h1 style={{ fontFamily: fontD, fontSize: 42, margin: "0 0 6px", color: C.bark }}>Karibu Café</h1>
        <p style={{ fontSize: 15, color: C.bark2, margin: "0 0 2px" }}>Likasi, DR Congo</p>
        <p style={{ fontSize: 13, color: C.stone }}>Owner / Admin panel</p>
      </div>

      <div style={{ display: "grid", gap: 12, width: "100%", maxWidth: 420 }}>
        {/* Admin dashboard — full access, no PIN needed */}
        <div style={{ ...sCard, padding: 22, cursor: "pointer" }} onClick={() => setMode("staff-admin")}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: C.sageLt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔑</div>
            <div style={{ textAlign: "left" }}><div style={{ fontSize: 16, fontWeight: 700, color: C.bark }}>Full dashboard</div><div style={{ fontSize: 13, color: C.stone }}>All modules unlocked — owner access</div></div>
          </div>
        </div>

        {/* Staff dashboard preview */}
        <div style={{ ...sCard, padding: 22, cursor: "pointer" }} onClick={() => setMode("staff")}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: C.sandLt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👨‍🍳</div>
            <div style={{ textAlign: "left" }}><div style={{ fontSize: 16, fontWeight: 700, color: C.bark }}>Staff view</div><div style={{ fontSize: 13, color: C.stone }}>What your team sees (orders, kitchen, billing)</div></div>
          </div>
        </div>

        {/* Customer preview with table selector */}
        <div style={{ ...sCard, padding: 22, cursor: "pointer" }} onClick={() => setMode("customer")}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: C.clayLt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📱</div>
            <div style={{ textAlign: "left" }}><div style={{ fontSize: 16, fontWeight: 700, color: C.bark }}>Customer preview</div><div style={{ fontSize: 13, color: C.stone }}>What customers see after QR scan</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
            <span style={{ fontSize: 13, color: C.bark2, fontWeight: 600 }}>Table:</span>
            {TABLES.slice(0, 8).map(t => <button key={t.id} onClick={e => { e.stopPropagation(); setTable(t.id); }} style={sChip(table === t.id, C.clay)}>{t.label}</button>)}
            {TABLES.length > 8 && <span style={{ fontSize: 12, color: C.stone }}>+{TABLES.length - 8}</span>}
          </div>
        </div>
      </div>

      {/* QR code info */}
      <div style={{ ...sCard, padding: 18, marginTop: 24, maxWidth: 420, width: "100%", textAlign: "left" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.bark, marginBottom: 8 }}>QR code URLs for each table:</div>
        <div style={{ fontSize: 12, color: C.stone, lineHeight: 1.8, fontFamily: "'Courier New', monospace" }}>
          {TABLES.map(t => <div key={t.id}>Table {t.label}: <span style={{ color: C.clay }}>yoursite.com/?mode=customer&table={t.id}</span></div>)}
        </div>
      </div>

      <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: C.okLt, borderRadius: 10, fontSize: 12, fontWeight: 600, color: C.ok }}>Staff: orders, kitchen, tables, billing</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: C.warnLt, borderRadius: 10, fontSize: 12, fontWeight: 600, color: C.warn }}>Manager (PIN 0000): menu, inventory, accounts, staff, reports</div>
      </div>
      <p style={{ fontSize: 11, color: C.stone, marginTop: 16 }}>CDF · USD · M-Pesa · Airtel · Visa</p>
    </div></>
  );
}
