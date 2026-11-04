/* Interno 63 — storefront condiviso: index.html (vetrina + categorie in primo piano) + shop.html (catalogo).
   Categorie, catalogo e dati negozio arrivano dall'admin attraverso il localStorage condiviso.
   Questa passata: VETRINA A SCORRIMENTO ORIZZONTALE — fino a 12 articoli in evidenza nel carosello
   della home (il CSS guida overflow + scroll-snap) e trascinamento col mouse su desktop,
   con soglia anti-click-accidentale. */

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
  orari: ''
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
/* il pulsante del drop-down nel markup si chiama #navDropBtn (alias di riserva inclusi) */
const selBtnDrop = () => document.querySelector('#navDropBtn, .nav-drop-btn, .nav-drop > button');

/* apre/chiude SOLO via aria-expanded + classe .aperta: mai [hidden] sul menu,
   così l'elenco resta visibile nel pannello mobile e diventa tenda al passaggio in desktop */
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
  else if (mq.addListener) mq.addListener(applica); /* Safari vecchi */
}

/* ---------- Animazioni ingresso (attivano le .reveal del CSS) ---------- */
function osservaAnimazioni() {
  const elementi = document.querySelectorAll('.reveal');
  if (!elementi.length) return;
  if (!('IntersectionObserver' in window)) {
    elementi.forEach(el => el.classList.add('visibile'));
    return;
  }
  const osservatore = new IntersectionObserver(voci => {
    voci.forEach(voce => {
      if (!voce.isIntersecting) return;
      voce.target.classList.add('visibile');
      osservatore.unobserve(voce.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
  elementi.forEach(el => osservatore.observe(el));
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
  chiudiDrop(); /* parte chiuso, senza toccare la visibilità dell'elenco in mobile */
}

/* Tile "Compra per categoria" della homepage: in primo piano, con conteggio articoli */
function renderTileCategorie() {
  const box = $('#catsGrid');
  if (!box) return; /* shop.html non ha le tile */
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

/* Ordinamento robusto: accetta più alias di valore dal select dello shop */
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
  if (!griglia) return; /* index.html non ha la griglia catalogo: vive in shop.html */
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
  if (!griglia) return; /* shop.html non ha la vetrina */
  const scelti = catalogo.filter(p => p.vetrina).slice(0, 12);
  griglia.innerHTML = scelti.map(schedaProdotto).join('');
  const sezione = $('#vetrina');
  if (sezione) sezione.classList.toggle('hidden', scelti.length === 0);
}

/* Trascinamento col MOUSE sulla vetrina (desktop): il touch usa lo scroll nativo.
   Soglia di 6px: sotto non è un trascinamento, così i click su card e bottoni restano intatti. */
function attivaTrascinamentoVetrina() {
  const box = $('#featuredGrid');
  if (!box || !box.addEventListener) return;

  let partenza = null;   /* { x, scroll } del pointerdown */
  let trascina = false;  /* true solo oltre la soglia */

  box.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return; /* solo tasto sinistro */
    if (box.scrollWidth <= box.clientWidth + 2) return;      /* niente da scorrere */
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
    /* il click arriva DOPO pointerup nello stesso ciclo: la soglia si azzera dopo */
    setTimeout(() => { trascina = false; }, 0);
  };
  box.addEventListener('pointerup', fine);
  box.addEventListener('pointercancel', fine);
  box.addEventListener('pointerleave', fine);

  /* dopo un trascinamento vero sopprimo il click accidentale su card/bottoni */
  box.addEventListener('click', e => {
    if (!trascina) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
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

/* ---------- Dati negozio (nome, sede e contatti modificabili dall'admin) ---------- */
function datiNegozioComposti() {
  const n = { ...NEGOZIO_INIZIALE, ...(negozio && typeof negozio === 'object' ? negozio : {}) };
  const comune = [n.cap, n.citta, n.prov ? `(${n.prov})` : ''].filter(Boolean).join(' ');
  const sede = [n.via, comune].filter(Boolean).join(', ');
  return { ...n, sede };
}

function applicaDatiNegozio() {
  const d = datiNegozioComposti();
  const imposta = (sel, valore) => {
    const el = $(sel);
    if (el && valore) el.textContent = valore;
  };
  imposta('#footName', d.nome);
  imposta('#cAddress', d.sede);
  imposta('#cPhone', d.telefono);
  imposta('#cEmail', d.email);
  imposta('#cOrari', d.orari);
  imposta('#footCitta', d.citta);
  const tel = document.querySelector('a[href^="tel:"]');
  if (tel && d.telefono) tel.href = 'tel:+39' + String(d.telefono).replace(/\D/g, '');
  const mail = document.querySelector('a[href^="mailto:"]');
  if (mail && d.email) mail.href = 'mailto:' + d.email;
}

/* ---------- Azioni delegate (solo storefront) ---------- */
function gestisciAzione(btn) {
  if (!btn) return;
  const { azione, id } = btn.dataset;
  if (azione === 'aggiungi') { aggiungiAlCarrello(id); return; }
  if (azione === 'dettaglio') { apriDettaglio(id); return; }
  if (azione === 'piu') { cambiaQta(id, 1); return; }
  if (azione === 'meno') { cambiaQta(id, -1); return; }
  if (azione === 'invia-ordine') { inviaOrdine(); }
}

/* ---------- Eventi ---------- */
function collegaEventi() {
  document.addEventListener('click', e => {
    /* drop-down "Catalogo" nel menu in alto */
    const btnDrop = e.target.closest('#navDropBtn, .nav-drop-btn');
    if (btnDrop) { toggleDrop(); return; }
    /* clic fuori dal drop-down: lo chiudo */
    if (!e.target.closest('#navDrop')) chiudiDrop();

    if (e.target.closest('.nav-menu a')) chiudiMenu();

    const btnAzione = e.target.closest('button[data-azione]');
    if (btnAzione && !btnAzione.disabled) { gestisciAzione(btnAzione); return; }
    const chip = e.target.closest('#chips .chip');
    if (chip) { filtroAttivo = chip.dataset.filtro || 'tutti'; renderChips(); renderCatalogo(); }
  });

  const su = (selettore, evento, fn) => { const el = $(selettore); if (el) el.addEventListener(evento, fn); };
  su('#menuBtn', 'click', toggleMenu);
  su('#cartBtn', 'click', apriCarrello);
  su('#cartClose', 'click', chiudiTutto);
  su('#modalClose', 'click', chiudiTutto);
  su('#scrim', 'click', chiudiTutto);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { chiudiDrop(); chiudiTutto(); } });

  /* Solo pagina shop: ricerca e ordinamento */
  su('#cerca', 'input', e => { testoRicerca = e.target.value; renderCatalogo(); });
  su('#ordina', 'change', e => { ordinamento = e.target.value; renderCatalogo(); });
}

/* ---------- Avvio ---------- */
function init() {
  const salvato = leggiJSON(CHIAVI.catalogo, []);
  catalogo = Array.isArray(salvato) && salvato.length ? salvato : CATALOGO_INIZIALE.map(p => ({ ...p }));

  /* Categorie: rispetto anche un elenco salvato vuoto (scelta esplicita dell'admin) */
  let catSalvate = null;
  try {
    const grezzo = localStorage.getItem(CHIAVI.categorie);
    if (grezzo) catSalvate = JSON.parse(grezzo);
  } catch (e) { catSalvate = null; }
  categorie = Array.isArray(catSalvate)
    ? catSalvate.filter(c => c && c.id)
    : CATEGORIE_INIZIALI.map(c => ({ ...c }));

  carrello = leggiJSON(CHIAVI.carrello, []);
  ordini = leggiJSON(CHIAVI.ordini, []);
  const n = leggiJSON(CHIAVI.negozio, {});
  negozio = (n && typeof n === 'object') ? { ...NEGOZIO_INIZIALE, ...n } : { ...NEGOZIO_INIZIALE };

  /* Categoria in arrivo dall'URL (es. shop.html?cat=bomboniere) */
  try {
    const cat = new URLSearchParams(window.location.search).get('cat');
    filtroAttivo = cat && categorie.some(c => c.id === cat) ? cat : 'tutti';
  } catch (e) { filtroAttivo = 'tutti'; }

  const anno = $('#anno');
  if (anno) anno.textContent = String(new Date().getFullYear());
  applicaDatiNegozio();

  renderChips();
  renderDropCategorie();
  renderTileCategorie();
  renderCatalogo();
  renderVetrina();
  attivaTrascinamentoVetrina();
  renderCarrello();
  collegaEventi();
  osservaAnimazioni();
  osservaViewport();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
