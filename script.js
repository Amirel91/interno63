/* Interno 63 — storefront condiviso: index.html (vetrina + categorie in primo piano) + shop.html (catalogo).
   FIX PAGINA BIANCA: il file era troncato a metà (SyntaxError fatale) → niente JS, e con le .reveal
   ancora a opacity:0 l'intera pagina restava invisibile. Ora il file è completo e ogni init ha guard
   clause: se anche qualcosa fallisse, il contenuto statico resta comunque leggibile. */

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

const CATEGORIE_INIZIALI = [
  { id: 'bomboniere', nome: 'Bomboniere', icona: '🎀' },
  { id: 'cofanetti', nome: 'Cofanetti', icona: '📦' },
  { id: 'regalo', nome: 'Articoli regalo', icona: '🎁' },
  { id: 'matrimonio', nome: 'Servizi matrimonio', icona: '💍' }
];

const NEGOZIO_INIZIALE = {
  nome: 'Interno 63',
  telefono: '351 234 5678',
  email: 'info@interno63.it',
  via: 'Via Roma 63',
  cap: '70043',
  citta: 'Monopoli',
  prov: 'BA',
  orari: '',
  fb: '',
  ig: ''
};

/* Chiavi condivise con admin.js: le modifiche fatte in admin.html si riflettono qui */
const CHIAVI = { catalogo: 'i63-catalogo', categorie: 'i63-categorie', carrello: 'i63-carrello', ordini: 'i63-ordini', admin: 'i63-admin', negozio: 'i63-negozio' };

/* ---------- Stato ---------- */
let catalogo = [];
let categorie = [];
let carrello = [];
let ordini = [];
let negozio = { ...NEGOZIO_INIZIALE };
let filtroAttivo = 'tutti';
let testoRicerca = '';
let ordinamento = 'default';

/* ---------- Utility ---------- */
const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euro = n => `€ ${(Number(n) || 0).toFixed(2)}`;
const nomeCat = id => { const c = categorie.find(x => x.id === id); return c ? c.nome : ''; };
const iconaCat = id => { const c = categorie.find(x => x.id === id); return c ? (c.icona || '✿') : '✿'; };

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

let toastTimer = null;
function toast(messaggio) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = messaggio;
  el.classList.add('visibile');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visibile'), 2600);
}

/* ---------- Menu mobile (hamburger) + drop-down categorie ---------- */
const selMenu = () => $('#navMenu') || document.querySelector('.nav-menu');
const selBtnMenu = () => $('#menuBtn') || document.querySelector('.menu-btn');
const selBtnDrop = () => document.querySelector('#navDropBtn, .nav-drop-btn, .nav-drop > button');

function chiudiDrop() {
  const menu = $('#navDropMenu');
  const contenitore = $('#navDrop');
  const btn = selBtnDrop();
  if (menu) menu.classList.remove('aperta');
  if (contenitore) contenitore.classList.remove('aperta');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function toggleDrop() {
  const menu = $('#navDropMenu');
  const contenitore = $('#navDrop');
  const btn = selBtnDrop();
  if (!btn || !menu) return;
  const aperto = btn.getAttribute('aria-expanded') === 'true';
  chiudiDrop();
  if (aperto) return;
  btn.setAttribute('aria-expanded', 'true');
  menu.classList.add('aperta');
  if (contenitore) contenitore.classList.add('aperta');
}

function chiudiMenu() {
  const menu = selMenu();
  const btn = selBtnMenu();
  if (menu) menu.classList.remove('aperta', 'attiva');
  if (btn) {
    btn.classList.remove('attiva');
    btn.setAttribute('aria-expanded', 'false');
  }
  chiudiDrop();
}

function toggleMenu() {
  const menu = selMenu();
  const btn = selBtnMenu();
  if (!menu || !btn) return;
  const aperto = !menu.classList.contains('aperta');
  menu.classList.toggle('aperta', aperto);
  menu.classList.toggle('attiva', aperto);
  btn.classList.toggle('attiva', aperto);
  btn.setAttribute('aria-expanded', String(aperto));
  if (!aperto) chiudiDrop();
}

/* A desktop (>768px) il menu è sempre visibile: azzero lo stato al cambio viewport */
function osservaViewport() {
  if (!window.matchMedia) return;
  const mq = window.matchMedia('(min-width:768px)');
  const applica = () => { if (mq.matches) chiudiMenu(); };
  if (mq.addEventListener) mq.addEventListener('change', applica);
  else if (mq.addListener) mq.addListener(applica);
}

/* ---------- Animazioni ingresso (attivano le .reveal del CSS) ----------
   Rete di sicurezza anti pagina bianca: se qualcosa va storto, dopo 1.2s
   tutto ciò che è .reveal diventa visibile comunque. */
function osservaAnimazioni() {
  const elementi = document.querySelectorAll('.reveal');
  if (!elementi.length) return;
  const scopriTutte = () => elementi.forEach(el => el.classList.add('visibile'));
  if (!('IntersectionObserver' in window)) { scopriTutte(); return; }
  try {
    const osservatore = new IntersectionObserver(voci => {
      voci.forEach(voce => {
        if (!voce.isIntersecting) return;
        voce.target.classList.add('visibile');
        osservatore.unobserve(voce.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    elementi.forEach(el => osservatore.observe(el));
  } catch (e) { scopriTutte(); }
  setTimeout(scopriTutte, 1200);
}

/* ---------- Rendering: card, filtri, catalogo, vetrina, categorie ---------- */
function schedaProdotto(p) {
  const media = p.img && String(p.img).trim()
    ? `<img src="${esc(p.img)}" alt="${esc(p.nome)}" loading="lazy">`
    : `<div class="segnaposto" aria-hidden="true">${iconaCat(p.categoria)}</div>`;
  return `<article class="product">
    <button class="product-media" type="button" data-azione="dettaglio" data-id="${p.id}" aria-label="Dettagli: ${esc(p.nome)}">
      ${media}${p.vetrina ? '<span class="badge-vetrina">In vetrina</span>' : ''}
    </button>
    <span class="categoria">${esc(nomeCat(p.categoria))}</span>
    <h3>${esc(p.nome)}</h3>
    <p class="prezzo">${euro(p.prezzo)}</p>
    <button type="button" data-azione="aggiungi" data-id="${p.id}">Aggiungi al carrello</button>
  </article>`;
}

function renderChips() {
  const box = $('#chips');
  if (!box) return; /* solo shop.html ha i filtri */
  const voci = [{ id: 'tutti', nome: 'Tutti gli articoli' }, ...categorie];
  box.innerHTML = voci.map(c => {
    const attiva = filtroAttivo === c.id;
    return `<button class="chip${attiva ? ' attiva' : ''}" type="button" role="tab" aria-selected="${attiva}" data-filtro="${esc(c.id)}">${esc(c.nome)}</button>`;
  }).join('');
}

/* Drop-down "Catalogo" nel menu in alto: voci dinamiche dall'admin */
function renderDropCategorie() {
  const box = $('#dropCategorie');
  if (!box) return;
  const voci = categorie
    .filter(c => c && c.id)
    .map(c => `<a href="shop.html?cat=${encodeURIComponent(c.id)}"><span class="drop-ico" aria-hidden="true">${esc(c.icona || '✿')}</span>${esc(c.nome || 'Categoria')}</a>`)
    .join('');
  box.innerHTML = `<a href="shop.html">Tutti gli articoli</a>${voci}`;
  chiudiDrop();
}

/* Tile "Compra per categoria" della homepage: in primo piano, con conteggio articoli */
function renderTileCategorie() {
  const box = $('#catsGrid');
  if (!box) return;
  box.innerHTML = categorie
    .filter(c => c && c.id)
    .map(c => {
      const n = catalogo.filter(p => p.categoria === c.id).length;
      return `<a class="tile" href="shop.html?cat=${encodeURIComponent(c.id)}">
        <span class="tile-ico" aria-hidden="true">${esc(c.icona || '✿')}</span>
        <span class="tile-nome">${esc(c.nome || 'Categoria')}</span>
        <span class="tile-quota">${n} ${n === 1 ? 'articolo' : 'articoli'}</span>
        <span class="tile-vai" aria-hidden="true">Sfoglia →</span>
      </a>`;
    }).join('');
}

function ordinaLista(lista) {
  const copia = [...lista];
  const ordine = String(ordinamento || 'default');
  if (ordine === 'prezzo-asc' || ordine === 'prezzo-cres') copia.sort((a, b) => (a.prezzo || 0) - (b.prezzo || 0));
  else if (ordine === 'prezzo-desc' || ordine === 'prezzo-dec') copia.sort((a, b) => (b.prezzo || 0) - (a.prezzo || 0));
  else if (ordine === 'nome' || ordine === 'nome-asc') copia.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'it'));
  else copia.sort((a, b) => Number(b.vetrina === true) - Number(a.vetrina === true) || (a.id || 0) - (b.id || 0));
  return copia;
}

function renderCatalogo() {
  const griglia = $('#productGrid');
  if (!griglia) return; /* index.html non ha la griglia catalogo */
  const q = testoRicerca.trim().toLowerCase();
  let lista = filtroAttivo === 'tutti' ? catalogo.slice() : catalogo.filter(p => p.categoria === filtroAttivo);
  if (q) lista = lista.filter(p => `${p.nome} ${p.descrizione || ''} ${nomeCat(p.categoria)}`.toLowerCase().includes(q));
  lista = ordinaLista(lista);
  griglia.innerHTML = lista.map(schedaProdotto).join('');
  const vuoto = $('#emptyMsg');
  if (vuoto) vuoto.hidden = lista.length > 0;
  const conteggio = $('#conteggio');
  if (conteggio) conteggio.textContent = lista.length
    ? `${lista.length} ${lista.length === 1 ? 'articolo disponibile' : 'articoli disponibili'}`
    : '';
}

/* Vetrina homepage: CAROSELLO ORIZZONTALE — fino a 12 articoli per riempire la corsia */
function renderVetrina() {
  const griglia = $('#featuredGrid');
  if (!griglia) return;
  const scelti = catalogo.filter(p => p.vetrina).slice(0, 12);
  griglia.innerHTML = scelti.map(schedaProdotto).join('');
  const sezione = $('#vetrina');
  if (sezione && scelti.length === 0) sezione.classList.add('hidden');
  else if (sezione) sezione.classList.remove('hidden');
}

/* Trascinamento col MOUSE sulla vetrina (desktop): il touch usa lo scroll nativo */
function attivaTrascinamentoVetrina() {
  const box = $('#featuredGrid');
  if (!box || !box.addEventListener) return;

  let partenza = null;
  let trascina = false;

  box.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (box.scrollWidth <= box.clientWidth + 2) return;
    partenza = { x: e.clientX, scroll: box.scrollLeft };
    trascina = false;
  });

  box.addEventListener('pointermove', e => {
    if (!partenza) return;
    const dx = e.clientX - partenza.x;
    if (!trascina && Math.abs(dx) > 6) {
      trascina = true;
      box.classList.add('trascina');
      box.style.userSelect = 'none';
      box.style.cursor = 'grabbing';
    }
    if (trascina) box.scrollLeft = partenza.scroll - dx;
  });

  const fine = () => {
    partenza = null;
    box.classList.remove('trascina');
    box.style.userSelect = '';
    box.style.cursor = '';
    setTimeout(() => { trascina = false; }, 0);
  };
  box.addEventListener('pointerup', fine);
  box.addEventListener('pointercancel', fine);
  box.addEventListener('pointerleave', fine);

  box.addEventListener('click', e => {
    if (!trascina) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
}

/* Frecce ‹ › della vetrina su desktop */
function attivaFrecceVetrina() {
  const box = $('#featuredGrid');
  const prev = $('#vetrinaPrev');
  const next = $('#vetrinaNext');
  if (!box || !prev || !next || !box.addEventListener) return;

  prev.removeAttribute('hidden');
  next.removeAttribute('hidden');

  const passo = () => Math.max(220, box.clientWidth * 0.8);
  prev.addEventListener('click', () => box.scrollBy({ left: -passo(), behavior: 'smooth' }));
  next.addEventListener('click', () => box.scrollBy({ left: passo(), behavior: 'smooth' }));

  const aggiorna = () => {
    const scorribile = box.scrollWidth > box.clientWidth + 4;
    const allInizio = box.scrollLeft <= 4;
    const allaFine = box.scrollLeft >= box.scrollWidth - box.clientWidth - 4;
    prev.classList.toggle('hidden', !scorribile || allInizio);
    next.classList.toggle('hidden', !scorribile || allaFine);
  };
  box.addEventListener('scroll', aggiorna, { passive: true });
  window.addEventListener('resize', aggiorna);
  aggiorna();
}

/* ---------- Overlay: scrim, modale prodotto, drawer, blocco scroll ---------- */
let scrimTimer = null;

function mostraScrim() {
  const s = $('#scrim');
  if (!s) return;
  clearTimeout(scrimTimer);
  s.hidden = false;
  requestAnimationFrame(() => s.classList.add('visibile'));
}

function nascondiScrim() {
  const s = $('#scrim');
  if (!s) return;
  s.classList.remove('visibile');
  scrimTimer = setTimeout(() => { s.hidden = true; }, 240);
}

function bloccaScroll(attivo) {
  document.body.classList.toggle('blocco-scroll', attivo);
}

function apriModale(sel) {
  const m = $(sel);
  if (!m) return;
  m.hidden = false;
  requestAnimationFrame(() => m.classList.add('aperta'));
  chiudiMenu();
  mostraScrim();
  bloccaScroll(true);
}

function apriCarrello() {
  const d = $('#cartDrawer');
  if (!d) return;
  d.classList.add('aperta');
  d.setAttribute('aria-hidden', 'false');
  chiudiMenu();
  mostraScrim();
  bloccaScroll(true);
}

function chiudiTutto() {
  const m = $('#productModal');
  if (m) { m.classList.remove('aperta'); m.hidden = true; }
  const d = $('#cartDrawer');
  if (d) { d.classList.remove('aperta'); d.setAttribute('aria-hidden', 'true'); }
  chiudiMenu();
  nascondiScrim();
  bloccaScroll(false);
}

/* ---------- Dettaglio prodotto ---------- */
function apriDettaglio(id) {
  const p = catalogo.find(x => x.id === Number(id));
  const corpo = $('#modalBody');
  if (!p || !corpo) return;
  const media = p.img && String(p.img).trim()
    ? `<img src="${esc(p.img)}" alt="${esc(p.nome)}">`
    : `<div class="segnaposto" aria-hidden="true">${iconaCat(p.categoria)}</div>`;
  corpo.innerHTML = `<div class="dettaglio-media">${media}</div>
    <div class="dettaglio-info">
      <span class="categoria">${esc(nomeCat(p.categoria))}</span>
      <h3>${esc(p.nome)}</h3>
      <p class="desc">${esc(p.descrizione) || 'Articolo selezionato a mano in negozio: contattaci per la personalizzazione.'}</p>
      <p class="prezzo">${euro(p.prezzo)}</p>
      <button class="btn" type="button" data-azione="aggiungi" data-id="${p.id}">Aggiungi al carrello</button>
    </div>`;
  apriModale('#productModal');
}

/* ---------- Carrello ---------- */
function totaleCarrello() {
  return carrello.reduce((somma, r) => somma + (r.prezzo || 0) * (r.qta || 0), 0);
}

function renderCarrello() {
  const badge = $('#cartCount');
  if (badge) badge.textContent = String(carrello.reduce((s, r) => s + (r.qta || 0), 0));
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

/* ---------- Ordini (visibili poi nella pagina admin) ---------- */
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
    totale: totaleCarrello(),
    evaso: false
  });
  scriviJSON(CHIAVI.ordini, ordini);
  carrello = [];
  scriviJSON(CHIAVI.carrello, carrello);
  renderCarrello();
  chiudiTutto();
  toast(`Grazie ${nome}! Richiesta inviata: ti ricontattiamo per conferma e consegna.`);
}

/* ---------- Dati negozio nel footer: riga ricostruita dai valori dell'admin ---------- */
function datiNegozioComposti() {
  const n = { ...NEGOZIO_INIZIALE, ...(negozio && typeof negozio === 'object' ? negozio : {}) };
  const comune = [n.cap, n.citta, n.prov ? `(${n.prov})` : ''].filter(Boolean).join(' ');
  const sede = [n.via, comune].filter(Boolean).join(', ');
  return { ...n, sede };
}

function applicaDatiNegozio() {
  const d = datiNegozioComposti();

  const nome = $('#footName');
  if (nome) nome.textContent = d.nome || NEGOZIO_INIZIALE.nome;

  const citta = $('#footCitta') || $('#footLuogo');
  if (citta) citta.textContent = [d.citta, d.prov ? `(${d.prov})` : ''].filter(Boolean).join(' ');

  const riga = $('#footContatti') || document.querySelector('.foot-contatti');
  if (riga) {
    const pezzi = [];
    if (d.sede) pezzi.push(`<span>${esc(d.sede)}</span>`);
    if (d.telefono) {
      const cifre = String(d.telefono).replace(/\D/g, '');
      pezzi.push(`<a class="foot-tel" href="tel:+39${esc(cifre)}">${esc(d.telefono)}</a>`);
    }
    if (d.email) pezzi.push(`<a class="foot-tel" href="mailto:${esc(d.email)}">${esc(d.email)}</a>`);
    riga.innerHTML = pezzi.length
      ? pezzi.join(' <span aria-hidden="true">·</span> ')
      : '<span>Vieni a trovarci o scrivici: i recapiti arrivano a breve.</span>';
  }

  const rigaOrari = $('#footOrari');
  if (rigaOrari) {
    if (d.orari) {
      rigaOrari.classList.remove('hidden');
      rigaOrari.textContent = `🕒 Orari: ${d.orari}`;
    } else {
      rigaOrari.classList.add('hidden');
    }
  }

  const prepara = (el, url) => {
    if (!el) return;
    if (url) {
      el.href = url;
      el.target = '_blank';
      el.rel = 'noopener';
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  };
  prepara($('#linkFb'), d.fb);
  prepara($('#linkIg'), d.ig);

  const testo = (sel, valore) => { const el = $(sel); if (el) el.textContent = valore || ''; };
  testo('#cAddress', d.sede);
  testo('#cPhone', d.telefono);
  testo('#cEmail', d.email);
  testo('#cOrari', d.orari);
}

/* ---------- Azioni delegate (solo storefront) ---------- */
function gestisciAzione(btn) {
  if (!btn) return;
  const { azione, id } = btn.dataset;
  if (azione === 'aggiungi') { aggiungiAlCarrello(id); return; }
  if (azione === 'dettaglio') { apriDettaglio(id); return; }
  if (azione === 'piu') { cambiaQta(id, 1); return; }
  if (azione === 'meno') { cambiaQta(id, -1); return; }
  if (azione === 'invia-ordine') { inviaOrdine(); return; }
}

/* ---------- Avvio: legge lo stato, disegna tutto, aggancia i listener ---------- */
function ricaricaDati() {
  catalogo = leggiJSON(CHIAVI.catalogo, CATALOGO_INIZIALE);
  categorie = leggiJSON(CHIAVI.categorie, CATEGORIE_INIZIALI);
  carrello = leggiJSON(CHIAVI.carrello, []);
  ordini = leggiJSON(CHIAVI.ordini, []);
  negozio = leggiJSON(CHIAVI.negozio, NEGOZIO_INIZIALE);
}

function ridisegnaTutto() {
  renderDropCategorie();
  renderTileCategorie();
  renderChips();
  renderCatalogo();
  renderVetrina();
  renderCarrello();
  applicaDatiNegozio();
}

/* shop.html?cat=xxx apre il catalogo già filtrato sulla categoria scelta */
function leggiParametroCategoria() {
  if (!window.location || !window.location.search) return;
  try {
    const cat = new URLSearchParams(window.location.search).get('cat');
    if (cat && categorie.some(c => c.id === cat)) {
      filtroAttivo = cat;
      renderChips();
      renderCatalogo();
    }
  } catch (e) { /* parametri illeggibili: resto sul filtro di default */ }
}

function avvia() {
  ricaricaDati();

  const anno = $('#anno');
  if (anno) anno.textContent = String(new Date().getFullYear());

  ridisegnaTutto();
  leggiParametroCategoria();
  attivaTrascinamentoVetrina();
  attivaFrecceVetrina();
  osservaAnimazioni();
  osservaViewport();

  /* --- Navigazione --- */
  const btnMenu = selBtnMenu();
  if (btnMenu) btnMenu.addEventListener('click', toggleMenu);
  const btnDrop = selBtnDrop();
  if (btnDrop) btnDrop.addEventListener('click', toggleDrop);

  /* --- Carrello e overlay --- */
  const carrelloBtn = $('#cartBtn');
  if (carrelloBtn) carrelloBtn.addEventListener('click', apriCarrello);
  const chiudiCarrello = $('#cartClose');
  if (chiudiCarrello) chiudiCarrello.addEventListener('click', chiudiTutto);
  const chiudiModale = $('#modalClose');
  if (chiudiModale) chiudiModale.addEventListener('click', chiudiTutto);
  const velo = $('#scrim');
  if (velo) velo.addEventListener('click', chiudiTutto);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') chiudiTutto(); });

  /* --- Click delegati: azioni prodotto + chiusura tenda Catalogo --- */
  document.addEventListener('click', e => {
    const azione = e.target.closest('[data-azione]');
    if (azione) gestisciAzione(azione);
    const drop = $('#navDrop');
    if (drop && !drop.contains(e.target)) chiudiDrop();
  });

  /* --- Filtri del catalogo (solo shop.html) --- */
  const cerca = $('#cerca');
  if (cerca) cerca.addEventListener('input', () => { testoRicerca = cerca.value; renderCatalogo(); });
  const ordina = $('#ordina');
  if (ordina) ordina.addEventListener('change', () => { ordinamento = ordina.value; renderCatalogo(); });
  const chips = $('#chips');
  if (chips) chips.addEventListener('click', e => {
    const chip = e.target.closest('[data-filtro]');
    if (!chip) return;
    filtroAttivo = chip.dataset.filtro;
    renderChips();
    renderCatalogo();
  });

  /* --- Sync live con l'admin aperto in un'altra scheda --- */
  window.addEventListener('storage', e => {
    if (!e.key || !Object.values(CHIAVI).includes(e.key)) return;
    ricaricaDati();
    ridisegnaTutto();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
else avvia();
