// Passcode screen shown before the app (and the legacy edition) loads.
//
// What this is: a client-side gate for a static GitHub Pages site. It keeps casual visitors out and stops the
// data bundle from downloading until the passcode is entered. What it is not: access control. The site's files
// are still public URLs, so anything that must stay confidential needs real server-side protection.
//
// The passcode itself is never stored here: only a salted PBKDF2-SHA256 verifier (600,000 iterations), checked
// with WebCrypto. A successful entry is remembered on this device (localStorage) until "Lock" is used.
const SALT = "925c7216ec2dbd9d34b6b01402afe5d9";
const ITER = 600000;
const HASH = "3bd9a0447d0b3c024bb00ff6809e300403395856fe505cba01a0fe2c7bbae526";
const KEY = "semicondb:unlock";

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const bytes = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = v => { try { v == null ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, v); } catch { /* storage blocked: unlock lasts for this page only */ } };

export const isUnlocked = () => read() === HASH;
export function lock() { write(null); location.reload(); }

async function verify(code) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: bytes(SALT), iterations: ITER }, key, 256);
  return hex(bits) === HASH;
}

const CSS = `
html.locked body>*:not(.gate){visibility:hidden}
.gate{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:16px;background:var(--bg,#F3F5F7);color:var(--ink,#0E1C22);font-family:var(--font,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif)}
.gate-card{width:min(400px,100%);background:var(--surface,#fff);border:1px solid var(--line,#DDE3E7);border-radius:16px;padding:28px 26px 24px;box-shadow:0 2px 6px rgba(14,28,34,.06),0 12px 32px rgba(14,28,34,.10)}
.gate-brand{display:flex;align-items:center;gap:10px;margin-bottom:18px;font-weight:750;letter-spacing:.2px}
.gate-brand small{display:block;font-weight:400;font-size:11px;color:var(--ink-3,#5A6A70);letter-spacing:.3px}
.gate h1{font-size:21px;line-height:1.25;margin:0 0 6px;letter-spacing:-.01em}
.gate p{margin:0 0 16px;font-size:13.5px;color:var(--ink-2,#3F5157);line-height:1.5}
.gate label{display:block;font-size:12px;font-weight:600;color:var(--ink-2,#3F5157);margin-bottom:6px}
.gate input{width:100%;box-sizing:border-box;font:inherit;font-size:15px;padding:10px 12px;border:1px solid var(--line,#DDE3E7);border-radius:10px;background:var(--surface,#fff);color:inherit}
.gate input:focus{outline:3px solid var(--primary-wash,#E2F2F2);border-color:var(--primary-2,#0E9497)}
.gate input[aria-invalid="true"]{border-color:var(--crit,#A12D2D)}
.gate button{margin-top:12px;width:100%;font:inherit;font-weight:650;font-size:14px;padding:10px 12px;border-radius:10px;border:1px solid var(--primary,#00696C);background:var(--primary,#00696C);color:var(--surface,#fff);cursor:pointer}
.gate button:disabled{opacity:.7;cursor:progress}
.gate .gate-err{min-height:1.4em;margin:10px 0 0;font-size:12.5px;color:var(--crit,#A12D2D)}
.gate .gate-note{margin:14px 0 0;font-size:11.5px;color:var(--ink-3,#5A6A70)}`;

// Resolves once the visitor is unlocked; shows the passcode screen if needed.
export function ensureUnlocked() {
  const root = document.documentElement;
  if (isUnlocked()) { root.classList.remove("locked"); return Promise.resolve(); }
  root.classList.add("locked");
  const style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
  const gate = document.createElement("div");
  gate.className = "gate"; gate.setAttribute("role", "dialog"); gate.setAttribute("aria-modal", "true"); gate.setAttribute("aria-labelledby", "gate-t");
  gate.innerHTML = `<form class="gate-card" novalidate>
      <div class="gate-brand"><svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="var(--primary,#00696C)"/><g fill="#fff"><rect x="8" y="8" width="7" height="7" rx="1"/><rect x="17" y="8" width="7" height="7" rx="1" opacity=".7"/><rect x="8" y="17" width="7" height="7" rx="1" opacity=".7"/><rect x="17" y="17" width="7" height="7" rx="1"/></g></svg><span>SEMICON-DB<small>Semiconductor Equipment Intelligence Graph</small></span></div>
      <h1 id="gate-t">Enter passcode</h1>
      <p>This database is shared by passcode. Enter it to continue.</p>
      <label for="gate-code">Passcode</label>
      <input id="gate-code" name="code" type="password" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" required aria-describedby="gate-err">
      <button type="submit">Unlock</button>
      <div class="gate-err" id="gate-err" role="alert"></div>
      <p class="gate-note">You stay unlocked on this device until you choose Lock.</p>
    </form>`;
  document.body.appendChild(gate);
  const form = gate.querySelector("form"), input = gate.querySelector("input"), btn = gate.querySelector("button"), err = gate.querySelector(".gate-err");
  input.focus();
  return new Promise(resolve => {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const code = input.value.trim();
      if (!code) { err.textContent = "Enter the passcode."; input.setAttribute("aria-invalid", "true"); return; }
      if (!globalThis.crypto?.subtle) { err.textContent = "This browser can't check the passcode here. Open the site over HTTPS."; return; }
      btn.disabled = true; btn.textContent = "Checking…"; err.textContent = "";
      let ok = false;
      try { ok = await verify(code); } catch { ok = false; }
      btn.disabled = false; btn.textContent = "Unlock";
      if (!ok) { err.textContent = "That passcode isn't right. Try again."; input.setAttribute("aria-invalid", "true"); input.select(); return; }
      write(HASH);
      gate.remove(); style.remove(); root.classList.remove("locked");
      resolve();
    });
    input.addEventListener("input", () => { input.removeAttribute("aria-invalid"); err.textContent = ""; });
  });
}
