/* Interno 63 — logica vetrina, carrello e area amministrazione (vanilla ES6+, nessuna dipendenza) */

/* ---------- Dati iniziali (catalogo demo ripristinabile dall'admin) ---------- */
const CATALOGO_INIZIALE = [
  { id: 1, nome: 'Bomboniera Oliva Borbone', prezzo: 8.5, categoria: 'bomboniere', vetrina: true, descrizione: 'Barattolino in vetro con confetti Oliva, nastro in raso e tag con i nomi degli sposi.', img: '' },
  { id: 2, nome: 'Scatola Regalo "Dolce Attesa"', prezzo: 14.0, categoria: 'regali', vetrina: false, descrizione: 'Candela artigianale, confetti misti e biglietto scritto a mano: pronta da regalare.', img: '' },
  { id: 3, nome: 'Cofanetto "Due Calici"', prezzo: 49.0, categoria: 'cofanetti', vetrina: true, descrizione: 'Cofanetto in legno con due calici personalizzabili, candela e confetti al cioccolato.', img: '' },
  { id: 4, nome: 'Segnaposto in Ceramica', prezzo: 6.5, categoria: 'bomboniere', vetrina: false, descrizione: 'Segnaposto in ceramica dipinto a mano, ideale per matrimoni e battesimi.', img: '' },
  { id: 5, nome: 'Box Nascita "Benvenuto"', prezzo: 29.0, categoria: 'cofanetti', vetrina: false, descrizione: 'Body in cotone, ciuccio e saponetta artigianale in scatola regalo con nastro.', img: '' },
  { id: 6, nome: 'Allestimento Matrimonio "Essenziale"', prezzo: 180.0, categoria: 'matrimoni', vetrina: true, descrizione: 'Segnaposto, allestimento tavolo regalo e bomboniere per fino a 50 ospiti, sopralluogo incluso.', img: '' },
  { id: 7, nome: 'Candela Profumata "Fico d\'India"', prezzo: 19.9, categoria: 'regali', vetrina: false, descrizione: 'Cera vegetale versata a mano in vetro ambrato, durata circa 40 ore.', img: '' },
  { id: 8, nome: 'Portagioie in Vimini', prezzo: 24.0, categoria: 'regali', vetrina: false, descrizione: 'Cestino intrecciato a mano con interno in tessuto, perfetto per la camera.', img: '' }
];

const CATEGORIE = {
  tutti: 'Tutti gli articoli',
  bomboniere: 'Bomboniere',
  regali: 'Articoli regalo',
  cofanetti: 'Cofanetti',
  matrimoni: 'Servizi matrimonio'
};

const CHIAVI = { catalogo: 'i63-catalogo', carrello: 'i63-carrello', ordini: 'i63-ordini', admin: 'i63-admin' };
const PASSWORD_ADMIN = 'interno63'; /* password demo lato client: nessun backend */

/* ---------- Stato ---------- */
let catalogo = [];
let carrello = [];
let ordini = [];
let filtroAttivo = 'tutti';
let tabAdmin = 'prodotti';

/* ---------- Utility ---------- */
const $ = sel => document.querySelector(sel);

function leggiJSON(chiave, predefinito) {
  try {
    const grezzo = localStorage.getItem(chiave);
    if (!grezzo) return predefinito;
    const valore = JSON.parse(grezzo);
    if (Array.isArray(predefinito)) return Array.isArray(valore) ? valore : predefinito;
    return valore === null || valore === undefined ? predefinito : valore;
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

/* ---------- Rendering: catalogo e vetrina ---------- */
function schedaProdotto(p) {
  const immagine = p.img && String(p.img).trim()
    ? `<img src="${p.img}" alt="${p.nome}" loading="lazy">`
    : `<div class="segnaposto" aria-hidden="true">${CATEGORIE[p.categoria] || 'Articolo'}</div>`;
  return `<article class="product">
    ${immagine}
    ${p.vetrina ? '<span class="badge-vetrina">In vetrina</span>' : ''}
    <span class="product-cat">${CATEGORIE[p.categoria] || ''}</span>
    <h3>${p.nome}</h3>
    <p class="product-desc">${p.descrizione || ''}</p>
    <p class="product-price">${euro(p.prezzo)}</p>
    <button data-azione="aggiungi" data-id="${p.id}">Aggiungi al carrello</button>
  </article>`;
}

function renderFiltri() {
  const box = $('#filtri');
  if (!box) return;
  box.innerHTML = Object.entries(CATEGORIE)
    .map(([k, etichetta]) => `<button class="filtro${filtroAttivo === k ? ' attiva' : ''}" data-filtro="${k}">${etichetta}</button>`)
    .join('');
}

function renderCatalogo() {
  const griglia = $('#catalogo');
  if (!griglia) return;
  const lista = filtroAttivo === 'tutti' ? catalogo : catalogo.filter(p => p.categoria === filtroAttivo);
  griglia.innerHTML = lista.map(schedaProdotto).join('') || '<p class="vuoto">Nessun articolo in questa categoria: torna a trovarci presto.</p>';
}

function renderVetrina() {
  const vetrina = $('#vetrina');
  if (!vetrina) return;
  const scelti = catalogo.filter(p => p.vetrina).slice(0, 3);
  vetrina.innerHTML = scelti.map(schedaProdotto).join('');
  const sezione = $('#sezione-vetrina');
  if (sezione) sezione.classList.toggle('hidden', scelti.length === 0);
}

/* ---------- Carrello ---------- */
function totaleCarrello() {
  return carrello.reduce((somma, riga) => somma + riga.prezzo * riga.qta, 0);
}

function renderCarrello() {
  const conteggio = $('#conteggio-carrello');
  if (conteggio) conteggio.textContent = carrello.reduce((s, r) => s + r.qta, 0);
  const lista = $('#lista-carrello');
  if (!lista) return;
  lista.innerHTML = carrello.length
    ? carrello.map(r => `<li>
        <span class="riga-nome">${r.nome}</span>
        <span class="riga-ctrl">
          <button data-azione="meno" data-id="${r.id}" aria-label="Riduci ${r.nome}">−</button>
          <span class="qta">${r.qta}</span>
          <button data-azione="piu" data-id="${r.id}" aria-label="Aumenta ${r.nome}">+</button>
          <strong>${euro(r.prezzo * r.qta)}</strong>
        </span>
      </li>`).join('')
    : '<li class="vuoto">Il carrello è vuoto: scegli qualcosa di speciale.</li>';
  const totale = $('#totale-carrello');
  if (totale) totale.textContent = euro(totaleCarrello());
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
}

function cambiaQta(id, delta) {
  const riga = carrello.find(r => r.id === Number(id));
  if (!riga) return;
  riga.qta += delta;
  if (riga.qta <= 0) carrello = carrello.filter(r => r.id !== riga.id);
  scriviJSON(CHIAVI.carrello, carrello);
  renderCarrello();
}

/* ---------- Ordini (richieste) ---------- */
function inviaOrdine() {
  if (!carrello.length) { toast('Il carrello è vuoto: aggiungi almeno un articolo.'); return; }
  const nome = (($('#ordine-nome') && $('#ordine-nome').value) || '').trim();
  const recapito = (($('#ordine-tel') && $('#ordine-tel').value) || '').trim();
  if (!nome) { toast('Inserisci il tuo nome per completare la richiesta.'); return; }
  const ordine = {
    id: Date.now(),
    data: new Date().toLocaleDateString('it-IT'),
    cliente: nome,
    recapito,
    articoli: carrello.map(r => `${r.nome} x${r.qta}`).join(', '),
    totale: totaleCarrello()
  };
  ordini.unshift(ordine);
  scriviJSON(CHIAVI.ordini, ordini);
  carrello = [];
  scriviJSON(CHIAVI.carrello, carrello);
  renderCarrello();
  renderAdminOrdini();
  const pannello = $('#pannello-carrello');
  if (pannello) pannello.classList.add('hidden');
  toast(`Grazie ${nome}! Richiesta inviata: ti ricontattiamo per conferma e consegna.`);
}

/* ---------- Area amministratore ---------- */
function isAdmin() { return leggiJSON(CHIAVI.admin, false) === true; }

function accediAdmin() {
  const campo = $('#password-admin');
  if (!campo) return;
  const valore = campo.value.trim();
  if (!valore) { toast('Inserisci la password amministratore.'); return; }
  if (valore !== PASSWORD_ADMIN) { toast('Password non corretta.'); return; }
  scriviJSON(CHIAVI.admin, true);
  campo.value = '';
  mostraAdmin();
  toast('Benvenuta nell’area amministrazione di Interno 63.');
}

function esciAdmin() {
  localStorage.removeItem(CHIAVI.admin);
  mostraAdmin();
  toast('Sessione amministratore chiusa.');
}

function mostraAdmin() {
  const attivo = isAdmin();
  const login = $('#admin-login');
  const pannello = $('#admin-panel');
  if (login) login.classList.toggle('hidden', attivo);
  if (pannello) pannello.classList.toggle('hidden', !attivo);
  if (attivo) { renderAdminProdotti(); renderAdminOrdini(); attivaTab(tabAdmin); }
}

function attivaTab(nome) {
  tabAdmin = nome;
  document.querySelectorAll('#admin-panel .tab').forEach(b => b.classList.toggle('attiva', b.dataset.tab === nome));
  document.querySelectorAll('#admin-panel .tabpane').forEach(p => p.classList.toggle('hidden', p.id !== `tab-${nome}`));
}

function renderAdminProdotti() {
  const corpo = $('#tabella-prodotti');
  if (!corpo) return;
  corpo.innerHTML = catalogo.map(p => `<tr>
      <td>${euro(p.prezzo)}</td>
      <td>${p.nome}</td>
      <td>${CATEGORIE[p.categoria] || p.categoria}</td>
      <td>${p.vetrina ? '★ In vetrina' : '—'}</td>
      <td class="azioni">
        <button data-azione="vetrina" data-id="${p.id}" title="${p.vetrina ? 'Togli dalla vetrina' : 'Metti in vetrina'}">${p.vetrina ? '★' : '☆'}</button>
        <button data-azione="modifica" data-id="${p.id}">Modifica</button>
        <button data-azione="elimina" data-id="${p.id}" class="distruttivo">Elimina</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="5" class="vuoto">Nessun prodotto: aggiungine uno dal modulo qui sotto.</td></tr>';
}

function renderAdminOrdini() {
  const box = $('#lista-ordini');
  if (!box) return;
  box.innerHTML = ordini.map(o => `<article class="ordine">
      <header><strong>Richiesta #${String(o.id).slice(-5)}</strong><time>${o.data}</time></header>
      <p><strong>${o.cliente}</strong>${o.recapito ? ` · ${o.recapito}` : ''}</p>
      <p>${o.articoli}</p>
      <p class="tot">Totale: ${euro(o.totale)}</p>
      <button data-azione="elimina-ordine" data-id="${o.id}" class="distruttivo">Segna come evasa</button>
    </article>`).join('') || '<p class="vuoto">Nessuna richiesta: ogni ordine inviato dal carrello comparirà qui.</p>';
}

function resetFormProdotto() {
  const form = $('#form-prodotto');
  if (form) form.reset();
  const id = $('#p-id');
  if (id) id.value = '';
  const titolo = $('#titolo-form');
  if (titolo) titolo.textContent = 'Nuovo prodotto';
  anteprimaImg();
}

function caricaInForm(id) {
  const p = catalogo.find(x => x.id === Number(id));
  if (!p) return;
  const imposta = (sel, val) => { const el = $(sel); if (el) el.value = val; };
  imposta('#p-id', p.id);
  imposta('#p-nome', p.nome);
  imposta('#p-prezzo', p.prezzo);
  imposta('#p-categoria', p.categoria);
  imposta('#p-descrizione', p.descrizione || '');
  imposta('#p-img', p.img || '');
  const vetrina = $('#p-vetrina');
  if (vetrina) vetrina.checked = !!p.vetrina;
  const titolo = $('#titolo-form');
  if (titolo) titolo.textContent = `Modifica: ${p.nome}`;
  anteprimaImg();
  const form = $('#form-prodotto');
  if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function anteprimaImg() {
  const box = $('#p-anteprima');
  const img = $('#p-anteprima-img');
  if (!box || !img) return;
  const url = (($('#p-img') && $('#p-img').value) || '').trim();
  if (url) { img.src = url; img.alt = 'Anteprima immagine prodotto'; box.classList.remove('hidden'); }
  else box.classList.add('hidden');
}

function salvaProdotto(evento) {
  evento.preventDefault();
  const nome = (($('#p-nome') && $('#p-nome').value) || '').trim();
  const prezzoGrezzo = (($('#p-prezzo') && $('#p-prezzo').value) || '').replace(',', '.').trim();
  const prezzo = parseFloat(prezzoGrezzo);
  const categoria = ($('#p-categoria') && $('#p-categoria').value) || 'regali';
  const descrizione = (($('#p-descrizione') && $('#p-descrizione').value) || '').trim();
  const img = (($('#p-img') && $('#p-img').value) || '').trim();
  const vetrina = !!($('#p-vetrina') && $('#p-vetrina').checked);
  if (!nome) { toast('Il nome del prodotto è obbligatorio.'); return; }
  if (!Number.isFinite(prezzo) || prezzo < 0) { toast('Inserisci un prezzo valido, ad esempio 19.90.'); return; }
  const idModifica = Number(($('#p-id') && $('#p-id').value) || 0);
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

/* ---------- Gestione azioni unificata (delega) ---------- */
function gestisciAzione(btn) {
  if (!btn) return;
  const { azione, id } = btn.dataset;

  if (azione === 'aggiungi') { aggiungiAlCarrello(id); return; }
  if (azione === 'piu') { cambiaQta(id, 1); return; }
  if (azione === 'meno') { cambiaQta(id, -1); return; }

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

  if (azione === 'modifica') { caricaInForm(id); return; }

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

  if (azione === 'annulla') { resetFormProdotto(); return; }

  if (azione === 'reset') {
    if (!confirm('Ripristinare il catalogo iniziale? Le modifiche andranno perse.')) return;
    catalogo = CATALOGO_INIZIALE.map(p => ({ ...p }));
    carrello = [];
    scriviJSON(CHIAVI.catalogo, catalogo);
    scriviJSON(CHIAVI.carrello, carrello);
    resetFormProdotto();
    renderCatalogo(); renderVetrina(); renderCarrello(); renderAdminProdotti();
    toast('Catalogo ripristinato.');
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
  /* Catalogo, vetrina, carrello e admin: un solo listener delegato */
  document.addEventListener('click', e => {
    const btnAzione = e.target.closest('button[data-azione]');
    if (btnAzione) { gestisciAzione(btnAzione); return; }
    const btnFiltro = e.target.closest('button[data-filtro]');
    if (btnFiltro) {
      filtroAttivo = btnFiltro.dataset.filtro || 'tutti';
      renderFiltri();
      renderCatalogo();
      return;
    }
    const btnTab = e.target.closest('button[data-tab]');
    if (btnTab) { attivaTab(btnTab.dataset.tab); }
  });

  const su = (selettore, evento, fn) => {
    const el = $(selettore);
    if (el) el.addEventListener(evento, fn);
  };

  su('#btn-carrello', 'click', () => {
    const pannello = $('#pannello-carrello');
    if (pannello) pannello.classList.toggle('hidden');
  });
  su('#chiudi-carrello', 'click', () => {
    const pannello = $('#pannello-carrello');
    if (pannello) pannello.classList.add('hidden');
  });
  su('#btn-ordine', 'click', inviaOrdine);
  su('#btn-accedi', 'click', accediAdmin);
  su('#password-admin', 'keydown', e => { if (e.key === 'Enter') accediAdmin(); });
  su('#btn-esci', 'click', esciAdmin);
  su('#form-prodotto', 'submit', salvaProdotto);
  su('#p-img', 'input', anteprimaImg);
}

/* ---------- Avvio ---------- */
function init() {
  const salvato = leggiJSON(CHIAVI.catalogo, []);
  catalogo = Array.isArray(salvato) && salvato.length ? salvato : CATALOGO_INIZIALE.map(p => ({ ...p }));
  carrello = leggiJSON(CHIAVI.carrello, []);
  ordini = leggiJSON(CHIAVI.ordini, []);

  renderFiltri();
  renderCatalogo();
  renderVetrina();
  renderCarrello();
  mostraAdmin();
  collegaEventi();

  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
