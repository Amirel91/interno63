/* Interno 63 — vetrina, carrello, dettaglio prodotto e area admin (vanilla ES6+) */

/* ---------- Dati iniziali (ripristinabili dall'admin) ---------- */
const CATALOGO_INIZIALE = [
  { id: 1, nome: 'Bomboniera Oliva Borbone', prezzo: 8.5, categoria: 'bomboniere', vetrina: true, descrizione: 'Barattolino in vetro con confetti Oliva, nastro in raso e tag con i nomi degli sposi.', img: '' },
  { id: 2, nome: 'Scatola Regalo "Dolce Attesa"', prezzo: 14.0, categoria: 'regalo', vetrina: false, descrizione: 'Candela artigianale, confetti misti e biglietto scritto a mano: pronta da regalare.', img: '' },
  { id: 3, nome: 'Cofanetto "Due Calici"', prezzo: 49.0, categoria: 'cofanetti', vetrina: true, descrizione: 'Cofanetto in legno con due calici personalizzabili, candela e confetti al cioccolato.', img: '' },
  { id: 4, nome: 'Segnaposto in Ceramica', prezzo: 6.5, categoria: 'bomboniere', vetrina: false, descrizione: 'Segnaposto in ceramica dipinto a mano, ideale per matrimoni e battesimi.', img: '' },
  { id: 5, nome: 'Box Nascita "Benvenuto"', prezzo: 29.0, categoria: 'cofanetti', vetrina: false, descrizione: 'Body in cotone, ciuccio e saponetta artigianale in scatola regalo con nastro.', img: '' },
  { id: 6, nome: 'Allestimento Matrimonio "Essenziale"', prezzo: 180.0, categoria: 'matrimonio', vetrina: true, descrizione: 'Segnaposto, allestimento tavolo regalo e bomboniere per fino a 50 ospiti, sopralluogo incluso.', img: '' },
  { id: 7, nome: 'Candela Profumata "Fico d\'India"', prezzo: 19.9, categoria: 'regalo', vetrina: false, descrizione: 'Cera vegetale versata a mano in vetro ambrato, durata circa 40 ore.', img: '' },
  { id: 8, nome: 'Portagioie in Vimini', prezzo: 24.0, categoria: 'regalo', vetrina: false, descrizione: 'Cestino intrecciato a mano con interno in tessuto, perfetto per la camera.', img: '' }
];

const CATEGORIE = {
  tutti: 'Tutti gli articoli',
  bomboniere: 'Bomboniere',
  cofanetti: 'Cofanetti',
  regalo: 'Articoli regalo',
  matrimonio: 'Servizi matrimonio'
};
const ICONE = { bomboniere: '🎀', cofanetti: '📦', regalo: '🎁', matrimonio: '💍' };
const NEGOZIO_INIZIALE = { nome: 'Interno 63', telefono: '351 234 5678' };

const CHIAVI = { catalogo: 'i63-catalogo', carrello: 'i63-carrello', ordini: 'i63-ordini', admin: 'i63-admin', negozio: 'i63-negozio' };
const PASSWORD_ADMIN = 'interno63'; /* password demo lato client, nessun backend */

/* ---------- Stato ---------- */
let catalogo = [];
let carrello = [];
let ordini = [];
let negozio = { ...NEGOZIO_INIZIALE };
let filtroAttivo = 'tutti';
let tabAdmin = 'prod';

/* ---------- Utility ---------- */
const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function leggiJSON(chiave, predefinito) {
  try {
    const grezzo = localStorage.getItem(chiave);
    if (!grezzo) return predefinito;
    const valore = JSON.parse(grezzo);
    if (Array.isArray(predefinito)) return Array.isArray(valore) ? valore : predefinito;
    return (valore && typeof valore === 'object') || valore === true ? valore : predefinito;
  } catch (e) {
    console.warn('Dati locali non validi, uso il default:', chiave);
    return predefinito;
  }
}

function scriviJSON(chiave, valore) {
  try { localStorage.setItem(chiave, JSON.stringify(valore)); }
  catch (e) { console.warn('Impossibile salvare i dati locali:', e); }
}

const euro = n => `€ ${(Number(n) || 0).toFixed(2)}`;

let toastTimer = null;
function toast(messaggio) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = messaggio;
  el.classList.add('visibile');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visibile'), 2600);
}

/* ---------- Rendering: card, filtri, catalogo, vetrina ---------- */
function schedaProdotto(p) {
  const media = p.img && String(p.img).trim()
    ? `<img src="${esc(p.img)}" alt="${esc(p.nome)}" loading="lazy">`
    : `<div class="segnaposto" aria-hidden="true">${ICONE[p.categoria] || '✿'}</div>`;
  return `<article class="product">
    <button class="product-media" type="button" data-azione="dettaglio" data-id="${p.id}" aria-label="Dettagli: ${esc(p.nome)}">
      ${media}${p.vetrina ? '<span class="badge-vetrina">In vetrina</span>' : ''}
    </button>
    <span class="categoria">${CATEGORIE[p.categoria] || ''}</span>
    <h3>${esc(p.nome)}</h3>
    <p class="prezzo">${euro(p.prezzo)}</p>
    <button type="button" data-azione="aggiungi" data-id="${p.id}">Aggiungi al carrello</button>
  </article>`;
}

function renderChips() {
  const box = $('#chips');
  if (!box) return;
  box.innerHTML = Object.entries(CATEGORIE).map(([k, etichetta]) =>
    `<button class="chip${filtroAttivo === k ? ' attiva' : ''}" type="button" role="tab" aria-selected="${filtroAttivo === k}" data-filtro="${k}">${etichetta}</button>`
  ).join('');
}

function renderCatalogo() {
  const griglia = $('#productGrid');
  if (!griglia) return;
  const lista = filtroAttivo === 'tutti' ? catalogo : catalogo.filter(p => p.categoria === filtroAttivo);
  griglia.innerHTML = lista.map(schedaProdotto).join('');
  const vuoto = $('#emptyMsg');
  if (vuoto) vuoto.hidden = lista.length > 0;
}

function renderVetrina() {
  const griglia = $('#featuredGrid');
  if (!griglia) return;
  const scelti = catalogo.filter(p => p.vetrina).slice(0, 3);
  griglia.innerHTML = scelti.map(schedaProdotto).join('');
  const sezione = $('#vetrina');
  if (sezione) sezione.classList.toggle('hidden', scelti.length === 0);
}

/* ---------- Overlay: modali, drawer, scrim ---------- */
function apriModale(sel) {
  const m = $(sel);
  if (!m) return;
  m.hidden = false;
  requestAnimationFrame(() => m.classList.add('aperta'));
  const s = $('#scrim');
  if (s) s.hidden = false;
}

function apriCarrello() {
  const d = $('#cartDrawer');
  if (!d) return;
  d.classList.add('aperta');
  d.setAttribute('aria-hidden', 'false');
  const s = $('#scrim');
  if (s) s.hidden = false;
}

function chiudiTutto() {
  ['#productModal', '#adminModal'].forEach(sel => {
    const m = $(sel);
    if (m) { m.classList.remove('aperta'); m.hidden = true; }
  });
  const d = $('#cartDrawer');
  if (d) { d.classList.remove('aperta'); d.setAttribute('aria-hidden', 'true'); }
  const s = $('#scrim');
  if (s) s.hidden = true;
}

/* ---------- Dettaglio prodotto ---------- */
function apriDettaglio(id) {
  const p = catalogo.find(x => x.id === Number(id));
  const corpo = $('#modalBody');
  if (!p || !corpo) return;
  const media = p.img && String(p.img).trim()
    ? `<img src="${esc(p.img)}" alt="${esc(p.nome)}">`
    : `<div class="segnaposto" aria-hidden="true">${ICONE[p.categoria] || '✿'}</div>`;
  corpo.innerHTML = `${media}
    <span class="categoria">${CATEGORIE[p.categoria] || ''}</span>
    <h3>${esc(p.nome)}</h3>
    <p class="desc">${esc(p.descrizione) || 'Articolo selezionato a mano in negozio: contattaci per la personalizzazione.'}</p>
    <p class="prezzo">${euro(p.prezzo)}</p>
    <button class="btn" type="button" data-azione="aggiungi" data-id="${p.id}">Aggiungi al carrello</button>`;
  apriModale('#productModal');
}

/* ---------- Carrello ---------- */
function totaleCarrello() {
  return carrello.reduce((somma, r) => somma + r.prezzo * r.qta, 0);
}

function renderCarrello() {
  const badge = $('#cartCount');
  if (badge) badge.textContent = carrello.reduce((s, r) => s + r.qta, 0);
  const lista = $('#cartItems');
  if (!lista) return;
  lista.innerHTML = carrello.length
    ? carrello.map(r => `<div class="cart-row">
        <span class="riga-nome">${esc(r.nome)}</span>
        <span class="riga-ctrl">
          <button type="button" data-azione="meno" data-id="${r.id}" aria-label="Riduci ${esc(r.nome)}">−</button>
          <span class="qta">${r.qta}</span>
          <button type="button" data-azione="piu" data-id="${r.id}" aria-label="Aumenta ${esc(r.nome)}">+</button>
          <strong>${euro(r.prezzo * r.qta)}</strong>
        </span>
      </div>`).join('')
    : '<p class="vuoto">Il carrello è vuoto: scegli qualcosa di speciale dal catalogo.</p>';
  const piede = $('#cartFoot');
  if (!piede) return;
  piede.innerHTML = carrello.length
    ? `<div class="cart-tot"><span>Totale</span><strong>${euro(totaleCarrello())}</strong></div>
       <label>Tuo nome<input id="ordine-nome" maxlength="60" placeholder="Es. Martina Rossi" required></label>
       <label>Telefono o email <span class="hint">(opzionale)</span><input id="ordine-tel" maxlength="60" placeholder="Come ricontattarti"></label>
       <button class="btn" type="button" data-azione="invia-ordine">Invia richiesta d'ordine</button>
       <p class="hint">Nessun pagamento online: ti ricontattiamo per conferma, personalizzazione e consegna.</p>`
    : '';
}

function aggiungiAlCarrello(id) {
  const prodotto = catalogo.find(p => p.id === Number(id));
  if (!prodotto) return;
  const riga = carrello.find(r => r.id === prodotto.id);
  if (riga) riga.qta += 1;
  else carrello.push({ id: prodotto.id, nome: prodotto.nome, prezzo: prodotto.prezzo, qta: 1 });
  scriviJSON(CHIAVI.carrello, carrello);
  renderCarrello();
  toast(`“${prodotto.nome}” aggiunto al carrello.`);
  const modale = $('#productModal');
  if (modale && !modale.hidden) { chiudiTutto(); apriCarrello(); }
}

function cambiaQta(id, delta) {
  const riga = carrello.find(r => r.id === Number(id));
  if (!riga) return;
  riga.qta += delta;
  if (riga.qta <= 0) carrello = carrello.filter(r => r.id !== riga.id);
  scriviJSON(CHIAVI.carrello, carrello);
  renderCarrello();
}

/* ---------- Ordini ---------- */
function inviaOrdine() {
  if (!carrello.length) { toast('Il carrello è vuoto: aggiungi almeno un articolo.'); return; }
  const nome = (($('#ordine-nome') && $('#ordine-nome').value) || '').trim();
  const recapito = (($('#ordine-tel') && $('#ordine-tel').value) || '').trim();
  if (!nome) { toast('Inserisci il tuo nome per completare la richiesta.'); return; }
  ordini.unshift({
    id: Date.now(),
    data: new Date().toLocaleDateString('it-IT'),
    cliente: nome,
    recapito,
    articoli: carrello.map(r => `${r.nome} x${r.qta}`).join(', '),
    totale: totaleCarrello()
  });
  scriviJSON(CHIAVI.ordini, ordini);
  carrello = [];
  scriviJSON(CHIAVI.carrello, carrello);
  renderCarrello();
  renderAdminOrdini();
  chiudiTutto();
  toast(`Grazie ${nome}! Richiesta inviata: ti ricontattiamo per conferma e consegna.`);
}

/* ---------- Area amministratore ---------- */
function isAdmin() { return leggiJSON(CHIAVI.admin, false) === true; }

function mostraAdmin() {
  const attivo = isAdmin();
  const gate = $('#gateForm');
  const pannello = $('#adminPanel');
  if (gate) gate.hidden = attivo;
  if (pannello) pannello.hidden = !attivo;
  if (!attivo) return;
  attivaTab(tabAdmin);
  renderAdminProdotti();
  renderAdminOrdini();
  const sNome = $('#sName');
  if (sNome) sNome.value = negozio.nome || '';
  const sTel = $('#sPhone');
  if (sTel) sTel.value = negozio.telefono || '';
}

function attivaTab(nome) {
  tabAdmin = nome;
  document.querySelectorAll('#adminTabs .tab').forEach(b => {
    const on = b.dataset.tab === nome;
    b.classList.toggle('attiva', on);
    b.setAttribute('aria-selected', on);
  });
  document.querySelectorAll('#adminPanel .tabpane').forEach(p => { p.hidden = p.id !== `tab-${nome}`; });
}

function renderAdminProdotti() {
  const box = $('#adminTable');
  if (!box) return;
  const righe = catalogo.map(p => `<tr>
      <td>${esc(p.nome)}</td>
      <td>${CATEGORIE[p.categoria] || esc(p.categoria)}</td>
      <td>${euro(p.prezzo)}</td>
      <td>${p.vetrina ? '★ In vetrina' : '—'}</td>
      <td class="azioni">
        <button type="button" class="btn-mini" data-azione="vetrina" data-id="${p.id}" title="${p.vetrina ? 'Togli dalla vetrina' : 'Metti in vetrina'}">${p.vetrina ? '★' : '☆'}</button>
        <button type="button" class="btn-mini" data-azione="modifica" data-id="${p.id}">Modifica</button>
        <button type="button" class="btn-mini distruttivo" data-azione="elimina" data-id="${p.id}">Elimina</button>
      </td>
    </tr>`).join('');
  box.innerHTML = `<table class="tabella">
    <thead><tr><th>Prodotto</th><th>Categoria</th><th>Prezzo</th><th>Vetrina</th><th>Azioni</th></tr></thead>
    <tbody>${righe || '<tr><td colspan="5" class="vuoto">Nessun prodotto: aggiungine uno dal modulo sopra.</td></tr>'}</tbody>
  </table>`;
}

function renderAdminOrdini() {
  const box = $('#tab-ord');
  if (!box) return;
  box.innerHTML = ordini.map(o => `<article class="ordine">
      <header><strong>Richiesta #${String(o.id).slice(-5)}</strong><time>${esc(o.data)}</time></header>
      <p><strong>${esc(o.cliente)}</strong>${o.recapito ? ` · ${esc(o.recapito)}` : ''}</p>
      <p>${esc(o.articoli)}</p>
      <p class="tot">Totale: ${euro(o.totale)}</p>
      <button type="button" class="btn-mini distruttivo" data-azione="elimina-ordine" data-id="${o.id}">Segna come evasa</button>
    </article>`).join('') || '<p class="vuoto">Nessuna richiesta: ogni ordine inviato dal carrello comparirà qui.</p>';
}

function resetFormProdotto() {
  const form = $('#prodForm');
  if (form) form.reset();
  const id = $('#fId');
  if (id) id.value = '';
  const salva = $('#prodSave');
  if (salva) salva.textContent = 'Salva prodotto';
}

function caricaInForm(id) {
  const p = catalogo.find(x => x.id === Number(id));
  if (!p) return;
  const imposta = (sel, val) => { const el = $(sel); if (el) el.value = val; };
  imposta('#fId', p.id);
  imposta('#fName', p.nome);
  imposta('#fCat', p.categoria);
  imposta('#fPrice', p.prezzo);
  imposta('#fImg', p.img || '');
  imposta('#fDesc', p.descrizione || '');
  const vetrina = $('#fFeat');
  if (vetrina) vetrina.checked = !!p.vetrina;
  const salva = $('#prodSave');
  if (salva) salva.textContent = `Salva modifiche a “${p.nome.slice(0, 24)}”`;
}

function salvaProdotto(evento) {
  evento.preventDefault();
  const nome = (($('#fName') && $('#fName').value) || '').trim();
  const prezzoGrezzo = (($('#fPrice') && $('#fPrice').value) || '').replace(',', '.').trim();
  const prezzo = parseFloat(prezzoGrezzo);
  const categoria = ($('#fCat') && $('#fCat').value) || 'regalo';
  const descrizione = (($('#fDesc') && $('#fDesc').value) || '').trim();
  const img = (($('#fImg') && $('#fImg').value) || '').trim();
  const vetrina = !!($('#fFeat') && $('#fFeat').checked);
  if (!nome) { toast('Il nome del prodotto è obbligatorio.'); return; }
  if (!Number.isFinite(prezzo) || prezzo < 0) { toast('Inserisci un prezzo valido, ad esempio 19.90.'); return; }
  if (img && !/^https?:\/\/\S+$/i.test(img)) { toast('L\'URL della foto deve iniziare con http:// o https://'); return; }
  const idModifica = Number(($('#fId') && $('#fId').value) || 0);
  const esistente = catalogo.find(p => p.id === idModifica);
  if (esistente) {
    Object.assign(esistente, { nome, prezzo, categoria, descrizione, img, vetrina });
    toast(`“${nome}” aggiornato.`);
  } else {
    catalogo.push({ id: Date.now(), nome, prezzo, categoria, descrizione, img, vetrina });
    toast(`“${nome}” aggiunto al catalogo.`);
  }
  scriviJSON(CHIAVI.catalogo, catalogo);
  resetFormProdotto();
  renderCatalogo();
  renderVetrina();
  renderAdminProdotti();
}

function salvaDati(evento) {
  evento.preventDefault();
  const nome = (($('#sName') && $('#sName').value) || '').trim();
  const telefono = (($('#sPhone') && $('#sPhone').value) || '').trim();
  if (!nome) { toast('Il nome del negozio è obbligatorio.'); return; }
  negozio = { nome, telefono };
  scriviJSON(CHIAVI.negozio, negozio);
  const reset = $('#sReset');
  if (reset && reset.checked) {
    if (!confirm('Ripristinare il catalogo iniziale? Le modifiche andranno perse.')) return;
    catalogo = CATALOGO_INIZIALE.map(p => ({ ...p }));
    carrello = [];
    scriviJSON(CHIAVI.catalogo, catalogo);
    scriviJSON(CHIAVI.carrello, carrello);
    renderCatalogo();
    renderVetrina();
    renderCarrello();
    renderAdminProdotti();
    reset.checked = false;
    toast('Dati salvati e catalogo ripristinato.');
  } else {
    toast('Dati negozio salvati.');
  }
}

/* ---------- Azioni delegate ---------- */
function gestisciAzione(btn) {
  if (!btn) return;
  const { azione, id } = btn.dataset;

  if (azione === 'aggiungi') { aggiungiAlCarrello(id); return; }
  if (azione === 'dettaglio') { apriDettaglio(id); return; }
  if (azione === 'piu') { cambiaQta(id, 1); return; }
  if (azione === 'meno') { cambiaQta(id, -1); return; }
  if (azione === 'invia-ordine') { inviaOrdine(); return; }

  if (azione === 'vetrina') {
    const p = catalogo.find(x => x.id === Number(id));
    if (!p) return;
    p.vetrina = !p.vetrina;
    scriviJSON(CHIAVI.catalogo, catalogo);
    renderAdminProdotti();
    renderVetrina();
    toast(p.vetrina ? `“${p.nome}” messo in vetrina.` : `“${p.nome}” tolto dalla vetrina.`);
    return;
  }

  if (azione === 'modifica') {
    caricaInForm(id);
    const nomeTab = $('#tab-prod');
    if (nomeTab) nomeTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  if (azione === 'elimina') {
    const p = catalogo.find(x => x.id === Number(id));
    if (!p || !confirm(`Eliminare “${p.nome}” dal catalogo?`)) return;
    catalogo = catalogo.filter(x => x.id !== Number(id));
    carrello = carrello.filter(r => r.id !== Number(id));
    scriviJSON(CHIAVI.catalogo, catalogo);
    scriviJSON(CHIAVI.carrello, carrello);
    renderCatalogo(); renderVetrina(); renderCarrello(); renderAdminProdotti();
    toast('Prodotto eliminato.');
    return;
  }

  if (azione === 'elimina-ordine') {
    ordini = ordini.filter(o => o.id !== Number(id));
    scriviJSON(CHIAVI.ordini, ordini);
    renderAdminOrdini();
    toast('Richiesta segnata come evasa.');
  }
}

/* ---------- Eventi ---------- */
function collegaEventi() {
  document.addEventListener('click', e => {
    const btnAzione = e.target.closest('button[data-azione]');
    if (btnAzione && !btnAzione.disabled) { gestisciAzione(btnAzione); return; }
    const btnFiltro = e.target.closest('button[data-filtro]');
    if (btnFiltro) {
      filtroAttivo = btnFiltro.dataset.filtro || 'tutti';
      renderChips();
      renderCatalogo();
      return;
    }
    const btnTab = e.target.closest('button[data-tab]');
    if (btnTab) attivaTab(btnTab.dataset.tab);
  });

  const su = (selettore, evento, fn) => {
    const el = $(selettore);
    if (el) el.addEventListener(evento, fn);
  };

  su('#cartBtn', 'click', apriCarrello);
  su('#cartClose', 'click', chiudiTutto);
  su('#modalClose', 'click', chiudiTutto);
  su('#adminClose', 'click', chiudiTutto);
  su('#adminOpen', 'click', () => { mostraAdmin(); apriModale('#adminModal'); });
  su('#scrim', 'click', chiudiTutto);
  su('#prodForm', 'submit', salvaProdotto);
  su('#setForm', 'submit', salvaDati);
  su('#prodReset', 'click', resetFormProdotto);
  su('#gateForm', 'submit', e => {
    e.preventDefault();
    const campo = $('#gatePass');
    const msg = $('#gateMsg');
    if (!campo) return;
    if (campo.value.trim() !== PASSWORD_ADMIN) {
      campo.value = '';
      if (msg) msg.hidden = false;
      toast('Password non corretta.');
      return;
    }
    if (msg) msg.hidden = true;
    campo.value = '';
    scriviJSON(CHIAVI.admin, true);
    mostraAdmin();
    toast('Benvenuto nell’area amministrazione di Interno 63.');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') chiudiTutto(); });
}

/* ---------- Avvio ---------- */
function init() {
  const salvato = leggiJSON(CHIAVI.catalogo, []);
  catalogo = Array.isArray(salvato) && salvato.length ? salvato : CATALOGO_INIZIALE.map(p => ({ ...p }));
  carrello = leggiJSON(CHIAVI.carrello, []);
  ordini = leggiJSON(CHIAVI.ordini, []);
  const n = leggiJSON(CHIAVI.negozio, {});
  negozio = (n && typeof n === 'object') ? { ...NEGOZIO_INIZIALE, ...n } : { ...NEGOZIO_INIZIALE };

  renderChips();
  renderCatalogo();
  renderVetrina();
  renderCarrello();
  collegaEventi();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
