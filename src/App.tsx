import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
type Role = "admin" | "user";
type Entry = { id: string; date: string; note: string; image: string };
type Plant = { id: string; code: string; label: string; type: string; variety: string; createdAt: string; entries: Entry[]; cover?: string };
type User = { name: string; email: string; password: string; role: Role; plants: Plant[] };
const LS_USERS = "pt_users_v2";
const LS_SESSION = "pt_session_v2";
function tsNow() {
return new Date().toISOString();
}
function makeId(len = 8) {
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
let acc = "";
for (let i = 0; i < len; i++) acc += alphabet[Math.floor(Math.random() * alphabet.length)];
return acc;
}
function shortCode6() {
return makeId(6); 
}
/* Kullanıcı verilerini LS'ten oku/yaz; hata durumunda sessizce boş dönüyorum */
function readUsers(): User[] {
  const raw = localStorage.getItem(LS_USERS);
if (!raw) return [];
try { return JSON.parse(raw); } catch { return []; }
}
function writeUsers(users: User[]) {
localStorage.setItem(LS_USERS, JSON.stringify(users));
}

/* Oturum yönetimi: sadece kullanıcı adını saklıyoruz */
function getSession(): string | null {
return localStorage.getItem(LS_SESSION);
}
function setSession(name: string | null) {
if (name) localStorage.setItem(LS_SESSION, name);
else localStorage.removeItem(LS_SESSION);
}

function App() {
const [users, setUsers] = useState<User[]>([]);
const [screen, setScreen] = useState<"auth" | "home" | "detail">("auth");
const [me, setMe] = useState<User | null>(null);

/* Giriş alanları */
const [loginName, setLoginName] = useState("");
const [loginPass, setLoginPass] = useState("");

/* Şifre sıfırlama akışı */
const [forgotOpen, setForgotOpen] = useState(false);
const [forgotEmail, setForgotEmail] = useState("");
const [forgotNew, setForgotNew] = useState("");

/* Kayıt alanları; tek objeye toplanabilir ama şimdilik böyle daha okunuyor */
const [regName, setRegName] = useState("");
const [regEmail, setRegEmail] = useState("");
const [regPin, setRegPin] = useState("");

/* Bitki oluşturma alanları */
const [label, setLabel] = useState("");
const [ptype, setPtype] = useState("");
const [variety, setVariety] = useState("");

/* Kod/QR işlemleri */
const [codeInput, setCodeInput] = useState("");
const [qrImage, setQrImage] = useState<string | null>(null);

/* Detay ekranı için açık kayıt */
const [opened, setOpened] = useState<{ owner: string; plantId: string } | null>(null);

/* Açık bitkiyi hesaplıyoruz; gerekirse memodan çıkarılabilir ama böyle daha basit */
const plant = useMemo(() => {
if (!opened) return null;
const owner = users.find((x) => x.name === opened.owner);
return owner?.plants.find((p) => p.id === opened.plantId) || null;
}, [opened, users]);

/* Uygulama başlangıcı: admin tohumu + oturum geri yükleme */
useEffect(() => {
const u = readUsers();
if (!u.find((x) => x.name === "admin")) {
u.push({ name: "admin", email: "admin@example.com", password: "admin123", role: "admin", plants: [] });
writeUsers(u);
}
setUsers(u);

const s = getSession();
if (s) {
  const cur = u.find((x) => x.name === s) || null;
  setMe(cur);
  setScreen(cur ? "home" : "auth");
}


}, []);

/* Kullanıcı güncellemesi: me'yi de eşitleyip kayıt ediyoruz */
function updateUser(updated: User) {
const next = users.map((u) => (u.name === updated.name ? updated : u));
setUsers(next);
writeUsers(next);
setMe(updated);
}

/* Kayıt: isim benzersiz ve pin 4 hane olmalı */
function signup() {
if (!regName.trim() || !regEmail.trim() || !/^\d{4}$/.test(regPin)) return;
if (users.find((x) => x.name === regName.trim())) return;

const nu: User = { name: regName.trim(), email: regEmail.trim(), password: regPin, role: "user", plants: [] };
const next = [...users, nu];
setUsers(next);
writeUsers(next);

/* Yeni kullanıcı için giriş alanlarını dolduruyorum; UX olarak pratik */
setRegName("");
setRegEmail("");
setRegPin("");
setLoginName(nu.name);
setLoginPass(nu.password);


}

/* Giriş */
function signin() {
const u = users.find((x) => x.name === loginName.trim() && x.password === loginPass);
if (!u) return;
setSession(u.name);
setMe(u);
setScreen("home");
setLoginName("");
setLoginPass("");
}

/* Şifre sıfırlama: email eşleşmeli + yeni pin 4 hane */
function resetPass() {
const u = users.find((x) => x.email === forgotEmail.trim());
if (!u) return;
if (!/^\d{4}$/.test(forgotNew)) return;

u.password = forgotNew;
updateUser(u);
setForgotEmail("");
setForgotNew("");
setForgotOpen(false);


}

/* Çıkış */
function signout() {
setSession(null);
setMe(null);
setScreen("auth");
setOpened(null);
}

/* Bitki oluşturma; not: global kod eşsizliği garanti edilmiyor, şimdilik yeterli */
function createPlant() {
if (!me) return;
if (!label.trim()) return;

const p: Plant = {
  id: makeId(12),
  code: shortCode6(),
  label: label.trim(),
  type: ptype.trim(),
  variety: variety.trim(),
  createdAt: tsNow(),
  entries: []
};

const owner = { ...me, plants: [p, ...me.plants] };
updateUser(owner);

setLabel("");
setPtype("");
setVariety("");


}

/* Bitki açma yardımcıları */
function openPlantBy(ownerName: string, plantId: string) {
setOpened({ owner: ownerName, plantId });
setScreen("detail");
}

function openByCode() {
if (!codeInput.trim()) return;
const code = codeInput.trim().toUpperCase();

if (me?.role === "admin") {
  for (const u of users) {
    const p = u.plants.find((x) => x.code.toUpperCase() === code);
    if (p) return openPlantBy(u.name, p.id);
  }
} else if (me) {
  const p = me.plants.find((x) => x.code.toUpperCase() === code);
  if (p) return openPlantBy(me.name, p.id);
}


}

/* QR üret/indir */
async function regenerateQR(p: Plant) {
const text = "PT:" + p.code;
const dataUrl = await QRCode.toDataURL(text, { width: 128, margin: 1 });
setQrImage(dataUrl);
}
function downloadQR() {
if (!qrImage) return;
const a = document.createElement("a");
a.href = qrImage;
a.download = "qr.png";
a.click();
}

/* Dosyadan QR çözümle; boyutu ölçekleyip jsQR çalıştırıyoruz */
async function handleScanFile(f: File) {
const img = new Image();
img.src = URL.createObjectURL(f);
await img.decode();

const canvas = document.createElement("canvas");
const maxSide = 1024;
let w = img.naturalWidth;
let h = img.naturalHeight;

if (w > h && w > maxSide) {
  h = Math.round((h * maxSide) / w);
  w = maxSide;
} else if (h >= w && h > maxSide) {
  w = Math.round((w * maxSide) / h);
  h = maxSide;
}

canvas.width = w;
canvas.height = h;

const ctx = canvas.getContext("2d");
if (!ctx) return;

ctx.drawImage(img, 0, 0, w, h);
const d = ctx.getImageData(0, 0, w, h);
const res = jsQR(d.data, w, h);

if (res && res.data) {
  const s = res.data.startsWith("PT:") ? res.data.slice(3) : res.data;
  setCodeInput(s);
  openByCode();
}


}

/* Girdi ekleme/silme ve bitki silme */
async function addEntry(file: File | null, note: string) {
if (!me || !plant || !file) return;

const reader = new FileReader();
const url: string = await new Promise((res) => {
  reader.onload = () => res(reader.result as string);
  reader.readAsDataURL(file);
});

const u = users.find((x) => x.name === opened!.owner)!;
const p = u.plants.find((x) => x.id === opened!.plantId)!;

const e: Entry = { id: makeId(10), date: tsNow(), note, image: url };
p.entries.unshift(e);
p.cover = url;

updateUser({ ...u });


}

function removeEntry(entryId: string) {
if (!me || me.role !== "admin" || !plant) return;

const u = users.find((x) => x.name === opened!.owner)!;
const p = u.plants.find((x) => x.id === opened!.plantId)!;

p.entries = p.entries.filter((e) => e.id !== entryId);
if (p.cover && p.entries.length > 0) p.cover = p.entries[0].image;

updateUser({ ...u });


}

function deletePlant() {
if (!me || me.role !== "admin" || !plant) return;

const u = users.find((x) => x.name === opened!.owner)!;
u.plants = u.plants.filter((x) => x.id !== opened!.plantId);

updateUser({ ...u });
setScreen("home");
setOpened(null);


}

/* Yeni girdi formu gönderimi */
function onNewEntrySubmit(e: React.FormEvent) {
e.preventDefault();
const fd = new FormData(e.currentTarget as HTMLFormElement);
const file = fd.get("photo") as File;
const note = String(fd.get("note") || "");
addEntry(file && file.size > 0 ? file : null, note);
(e.currentTarget as HTMLFormElement).reset();
}

/* Ekranlar: auth, home, detail */
if (screen === "auth") {
return (
<div className="app">
<div className="container">
<div className="card stack">
<div className="tabs">
<button className="tab active">Giriş</button>
</div>
<div className="stack gap">
<input className="input" placeholder="İsim" value={loginName} onChange={(e) => setLoginName(e.target.value)} />
<input className="input" placeholder="Şifre" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} type="password" />
<button className="btn primary" onClick={signin}>Giriş Yap</button>
<button className="btn ghost" onClick={() => setForgotOpen((v) => !v)}>Şifremi Unuttum</button>
{forgotOpen && (
<div className="stack gap">
<input className="input" placeholder="E-posta" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
<input className="input" placeholder="Yeni 4 haneli şifre" value={forgotNew} onChange={(e) => setForgotNew(e.target.value)} />
<button className="btn" onClick={resetPass}>Şifreyi Değiştir</button>
</div>
)}
</div>
</div>

      <div className="card stack">
        <div className="tabs">
          <button className="tab active">Kayıt</button>
        </div>
        <div className="stack gap">
          <input className="input" placeholder="İsim" value={regName} onChange={(e) => setRegName(e.target.value)} />
          <input className="input" placeholder="E-posta" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
          <input className="input" placeholder="4 haneli şifre" value={regPin} onChange={(e) => setRegPin(e.target.value)} />
          <button className="btn primary" onClick={signup}>Kayıt Ol</button>
        </div>
      </div>
    </div>
  </div>
);


}

if (!me) return null;

if (screen === "home") {
return (
<div className="app">
<div className="container">
<div className="toolbar">
<div className="title">Bitki Takip</div>
<div className="spacer" />
<button className="btn" onClick={signout}>Çıkış</button>
</div>

      <div className="grid2">
        <div className="card stack">
          <div className="subtitle">Bitki Bul</div>
          <div className="row">
            <input className="input" placeholder="Kod" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} />
            <button className="btn" onClick={openByCode}>Git</button>
          </div>
          <input className="input" type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files && e.target.files[0] && handleScanFile(e.target.files[0])} />
        </div>

        <div className="card stack">
          <div className="subtitle">Yeni Bitki</div>
          <input className="input" placeholder="Etiket" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input className="input" placeholder="Tür" value={ptype} onChange={(e) => setPtype(e.target.value)} />
          <input className="input" placeholder="Çeşit" value={variety} onChange={(e) => setVariety(e.target.value)} />
          <button className="btn primary" onClick={createPlant}>Kaydet</button>
        </div>
      </div>

      <div className="subtitle" style={{ marginTop: 16 }}>Bitkilerim</div>
      <div className="list">
        {(me.role === "admin" ? users.flatMap((u) => u.plants.map((p) => ({ u: u.name, p }))) : me.plants.map((p) => ({ u: me.name, p })))
          .sort((a, b) => (a.p.createdAt < b.p.createdAt ? 1 : -1))
          .map(({ u, p }) => (
            <div className="item" key={p.id}>
              <div className="item-main">
                <div className="item-title">{p.label}</div>
                <div className="item-sub">{p.type || "bitki"} · {p.variety || "herhangi"} · Kod {p.code}</div>
              </div>
              <button className="btn" onClick={() => openPlantBy(u, p.id)}>Aç</button>
            </div>
          ))}
      </div>
    </div>

    {qrImage && (
      <div className="modal">
        <div className="modal-body">
          <img src={qrImage} width={128} height={128} alt="qr" />
          <div className="row">
            <button className="btn primary" onClick={downloadQR}>İndir</button>
            <button className="btn" onClick={() => setQrImage(null)}>Kapat</button>
          </div>
        </div>
      </div>
    )}
  </div>
);


}

if (!plant || !opened) return null;

const owner = users.find((x) => x.name === opened.owner)!;

return (
<div className="app">
<div className="container">
<div className="toolbar">
<button className="btn" onClick={() => setScreen("home")}>Geri</button>
<div className="spacer" />
<button className="btn" onClick={signout}>Çıkış</button>
</div>

    <div className="grid2">
      <div className="card center">
        {plant.cover ? <img src={plant.cover} alt="" style={{ width: 240, height: 180, objectFit: "cover", borderRadius: 8 }} /> : <div style={{ width: 240, height: 180, borderRadius: 8, background: "rgba(255,255,255,0.06)" }} />}
      </div>

      <div className="card stack">
        <div className="title">{plant.label}</div>
        <div>Tür: {plant.type || "-"}</div>
        <div>Çeşit: {plant.variety || "-"}</div>
        <div>İlk Kayıt: {new Date(plant.createdAt).toLocaleString()}</div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => regenerateQR(plant)}>QR'ı Yeniden Üret</button>
          <button className="btn" onClick={() => navigator.clipboard.writeText(plant.code)}>Kodu Kopyala</button>
          {me.role === "admin" && <button className="btn danger" onClick={deletePlant}>Bitkiyi Sil</button>}
        </div>
      </div>
    </div>

    <div className="card stack" style={{ marginTop: 16 }}>
      <div className="subtitle">Yeni Girdi</div>
      <form className="stack gap" onSubmit={onNewEntrySubmit}>
        <input className="input" name="note" placeholder="Not (opsiyonel)" />
        <input className="input" name="photo" type="file" accept="image/*" capture="environment" required />
        <button className="btn primary" type="submit">Kaydet</button>
      </form>
    </div>

    <div className="card stack" style={{ marginTop: 16 }}>
      <div className="subtitle">Geçmiş</div>
      <div className="list">
        {plant.entries.map((e) => (
          <div className="item" key={e.id}>
            <div className="item-main">
              <div className="row" style={{ alignItems: "center", gap: 12 }}>
                <img src={e.image} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6 }} />
                <div>
                  <div className="item-title">{new Date(e.date).toLocaleString()}</div>
                  <div className="item-sub">{e.note || "-"}</div>
                </div>
              </div>
            </div>
            {me.role === "admin" && <button className="btn danger" onClick={() => removeEntry(e.id)}>Sil</button>}
          </div>
        ))}
        {plant.entries.length === 0 && <div className="muted">Kayıt yok</div>}
      </div>
    </div>
  </div>

  {qrImage && (
    <div className="modal">
      <div className="modal-body">
        <img src={qrImage} width={128} height={128} alt="qr" />
        <div className="row">
          <button className="btn primary" onClick={downloadQR}>İndir</button>
          <button className="btn" onClick={() => setQrImage(null)}>Kapat</button>
        </div>
      </div>
    </div>
  )}
</div>


);
} 
export default App;
