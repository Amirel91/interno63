/* Interno 63 — admin.js: logica del pannello admin.html (accesso, catalogo, ordini, dati negozio).
   I dati sono condivisi con lo storefront (index/shop) tramite le stesse chiavi localStorage. */

(() => {
  'use strict';

  /* ---------- Dati iniziali (identici a script.js: servono per il ripristino) ---------- */
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

  const CATEGORIE = { bomboniere: 'Bomboniere', cofanetti: 'Cofanetti', regalo: 'Articoli regalo', matrimonio: 'Servizi matrimonio' };
  const ICONE = { bomboniere: '🎀', cofanetti: '📦', regalo: '🎁', matrimonio: '💍' };
  const NEGOZIO_INIZIALE = { nome: 'Interno 63', telefono: '351 234 5678' };
  const CHIAVI = { catalogo: 'i63-catalogo', ordini: 'i63-ordini', negozio: 'i63-negozio', sessione: 'i63-admin' };
  const PASSWORD_DEMO = 'interno63';

  /* ---------- Stato ---------- */
  let catalogo = [];
  let ordini = [];
  let negozio = { ...NEGOZIO_INIZIALE };

  /* ---------- Utility ---------- */
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const euro = n => `€ ${(Number(n) || 0).toFixed(2)}`;

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

  /* ---------- Accesso ---------- */
  function apriSessione() {
    scriviJSON(CHIAVI.sessione, true);
    apriDashboard();
    toast('Accesso consentito: gestione negozio sbloccata.');
  }

  function chiudiSessione() {
    try { localStorage.removeItem(CHIAVI.sessione); } catch (e) { /* storage non disponibile */ }
    location.reload();
  }

  function apriDashboard() {
    const gate = $('#gateWrap');
    const shell = $('#adminShell');
    const esci = $('#adminLogout');
    if (gate) gate.hidden = true;
    if (shell) shell.hidden = false;
    if (esci) esci.hidden = false;
    renderTabella();
    renderOrdini();
    applicaNegozioForm();
    aggiornaStats();
    mostraTab('prod');
  }

  /* ---------- Statistiche ---------- */
  function aggiornaStats() {
    const imposta = (sel, valore) => { const el = $(sel); if (el) el.textContent = valore; };
    imposta('#statProd', String(catalogo.length));
    imposta('#statVet', String(catalogo.filter(p => p.vetrina).length));
    imposta('#statOrd', String(ordini.length));
    imposta('#statTot', euro(ordini.reduce((s, o) => s + (Number(o.totale) || 0), 0)));
  }

  /* ---------- Tab ---------- */
  function mostraTab(nome) {
    ['prod', 'ord', 'set'].forEach(t => {
      const pannello = $('#tab-' + t);
      if (pannello) pannello.hidden = t !== nome;
    });
    document.querySelectorAll('#adminTabs .tab').forEach(b => {
      const attivo = b.dataset.tab === nome;
      b.classList.toggle('attiva', attivo);
      b.setAttribute('aria-selected', String(attivo));
    });
  }

  /* ---------- Modulo prodotti ---------- */
  function riempiForm(p) {
    const campi = { fId: String(p.id), fName: p.nome, fCat: p.categoria, fPrice: String(p.prezzo), fImg: p.img || '', fDesc: p.descrizione || '' };
    Object.entries(campi).forEach(([id, valore]) => { const el = $('#' + id); if (el) el.value = valore; });
    const feat = $('#fFeat');
    if (feat) feat.checked = Boolean(p.vetrina);
  }

  function pulisciForm() {
    const form = $('#prodForm');
    if (form) form.reset();
    const id = $('#fId');
    if (id) id.value = '';
  }

  function salvaProdotto(evento) {
    evento.preventDefault();
    const nome = ($('#fName') && $('#fName').value || '').trim();
    if (!nome) { toast('Il nome dell\'articolo è obbligatorio.'); return; }
    const dati = {
      nome,
      categoria: ($('#fCat') && $('#fCat').value) || 'regalo',
      prezzo: Number(($('#fPrice') && $('#fPrice').value) || 0),
      img: (($('#fImg') && $('#fImg').value) || '').trim(),
      descrizione: (($('#fDesc') && $('#fDesc').value) || '').trim(),
      vetrina: Boolean($('#fFeat') && $('#fFeat').checked)
    };
    const idModifica = ($('#fId') && $('#fId').value) || '';
    if (idModifica) {
      const p = catalogo.find(x => x.id === Number(idModifica));
      if (p) { Object.assign(p, dati); toast(`“${dati.nome}” aggiornato.`); }
      else { toast('Articolo non trovato: ricarica la pagina.'); return; }
    } else {
      catalogo.unshift({ id: Date.now(), ...dati });
      toast(`“${dati.nome}” aggiunto al catalogo.`);
    }
    scriviJSON(CHIAVI.catalogo, catalogo);
    pulisciForm();
    renderTabella();
    aggiornaStats();
  }

  function eliminaProdotto(id) {
    const p = catalogo.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`Eliminare “${p.nome}” dal catalogo? L'operazione non si può annullare.`)) return;
    catalogo = catalogo.filter(x => x.id !== id);
    scriviJSON(CHIAVI.catalogo, catalogo);
    const inForm = ($('#fId') && $('#fId').value) === String(id);
    if (inForm) pulisciForm();
    renderTabella();
    aggiornaStats();
    toast('Articolo eliminato dal catalogo.');
  }

  function cambiaVetrina(id) {
    const p = catalogo.find(x => x.id === id);
    if (!p) return;
    p.vetrina = !p.vetrina;
    scriviJSON(CHIAVI.catalogo, catalogo);
    renderTabella();
    aggiornaStats();
    toast(p.vetrina ? `“${p.nome}” è ora in vetrina sulla home.` : `“${p.nome}” rimosso dalla vetrina.`);
  }

  /* ---------- Tabella prodotti ---------- */
  function renderTabella() {
    const box = $('#adminTable');
    if (!box) return;
    if (!catalogo.length) {
      box.innerHTML = '<p class="vuoto">Nessun articolo in catalogo: aggiungi il primo dal modulo qui sopra.</p>';
      return;
    }
    box.innerHTML = `<table class="tabella">
      <thead><tr><th>Articolo</th><th>Categoria</th><th>Prezzo</th><th>Vetrina</th><th>Azioni</th></tr></thead>
      <tbody>${catalogo.map(p => `<tr>
        <td><b>${esc(p.nome)}</b>${p.descrizione ? `<br><span class="hint">${esc(p.descrizione)}</span>` : ''}</td>
        <td>${ICONE[p.categoria] || ''} ${esc(CATEGORIE[p.categoria] || p.categoria)}</td>
        <td>${euro(p.prezzo)}</td>
        <td><button class="link" type="button" data-azione="vetrina" data-id="${p.id}">${p.vetrina ? '★ In vetrina' : '☆ Metti in vetrina'}</button></td>
        <td>
          <button class="link" type="button" data-azione="modifica" data-id="${p.id}">Modifica</button> ·
          <button class="link" type="button" data-azione="elimina" data-id="${p.id}">Elimina</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  /* ---------- Ordini ---------- */
  function renderOrdini() {
    const box = $('#tab-ord');
    if (!box) return;
    if (!ordini.length) {
      box.innerHTML = '<p class="vuoto">Nessuna richiesta d\'ordine: compariranno qui quando i clienti inviano il carrello dal negozio.</p>';
      return;
    }
    box.innerHTML = `<table class="tabella">
      <thead><tr><th>Data</th><th>Cliente</th><th>Articoli</th><th>Totale</th><th>Stato</th><th>Azioni</th></tr></thead>
      <tbody>${ordini.map(o => `<tr>
        <td>${esc(o.data)}</td>
        <td><b>${esc(o.cliente)}</b>${o.recapito ? `<br><span class="hint">${esc(o.recapito)}</span>` : ''}</td>
        <td>${esc(o.articoli)}</td>
        <td>${euro(o.totale)}</td>
        <td>${o.evaso ? '<span class="pill">Evasa</span>' : '<span class="hint">Da evadere</span>'}</td>
        <td>
          <button class="link" type="button" data-azione="evasa" data-id="${o.id}">${o.evaso ? 'Riapri' : 'Segna evasa'}</button> ·
          <button class="link" type="button" data-azione="elimina-ordine" data-id="${o.id}">Elimina</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  function cambiaStatoOrdine(id) {
    const o = ordini.find(x => x.id === id);
    if (!o) return;
    o.evaso = !o.evaso;
    scriviJSON(CHIAVI.ordini, ordini);
    renderOrdini();
    aggiornaStats();
    toast(o.evaso ? `Richiesta di ${o.cliente} segnata come evasa.` : `Richiesta di ${o.cliente} riaperta.`);
  }

  function eliminaOrdine(id) {
    const o = ordini.find(x => x.id === id);
    if (!o) return;
    if (!confirm(`Eliminare la richiesta di ${o.cliente}?`)) return;
    ordini = ordini.filter(x => x.id !== id);
    scriviJSON(CHIAVI.ordini, ordini);
    renderOrdini();
    aggiornaStats();
    toast('Richiesta d\'ordine eliminata.');
  }

  /* ---------- Dati negozio ---------- */
  function applicaNegozioForm() {
    const nome = $('#sName');
    if (nome) nome.value = negozio.nome || NEGOZIO_INIZIALE.nome;
    const tel = $('#sPhone');
    if (tel) tel.value = negozio.telefono || NEGOZIO_INIZIALE.telefono;
  }

  function salvaNegozio(evento) {
    evento.preventDefault();
    negozio.nome = (($('#sName') && $('#sName').value) || '').trim() || NEGOZIO_INIZIALE.nome;
    negozio.telefono = (($('#sPhone') && $('#sPhone').value) || '').trim() || NEGOZIO_INIZIALE.telefono;
    scriviJSON(CHIAVI.negozio, negozio);
    let messaggio = 'Dati negozio salvati: aggiornati anche in home e catalogo.';
    const reset = $('#sReset');
    if (reset && reset.checked) {
      catalogo = CATALOGO_INIZIALE.map(p => ({ ...p }));
      scriviJSON(CHIAVI.catalogo, catalogo);
      pulisciForm();
      renderTabella();
      aggiornaStats();
      reset.checked = false;
      messaggio = 'Dati salvati e catalogo iniziale ripristinato.';
    }
    toast(messaggio);
  }

  /* ---------- Eventi ---------- */
  function collegaEventi() {
    const su = (selettore, evento, fn) => { const el = $(selettore); if (el) el.addEventListener(evento, fn); };

    /* Accesso */
    su('#gateForm', 'submit', e => {
      e.preventDefault();
      const campo = $('#gatePass');
      const msg = $('#gateMsg');
      if (campo && campo.value === PASSWORD_DEMO) {
        if (msg) msg.hidden = true;
        campo.value = '';
        apriSessione();
      } else {
        if (msg) msg.hidden = false;
        if (campo) { campo.value = ''; campo.focus(); }
      }
    });
    su('#adminLogout', 'click', chiudiSessione);

    /* Tab */
    su('#adminTabs', 'click', e => {
      const tab = e.target.closest('.tab');
      if (tab && tab.dataset.tab) mostraTab(tab.dataset.tab);
    });

    /* Prodotti */
    su('#prodForm', 'submit', salvaProdotto);
    su('#prodReset', 'click', () => {
      pulisciForm();
      const nome = $('#fName');
      if (nome) nome.focus();
      toast('Modulo pulito: pronto per un nuovo articolo.');
    });
    su('#adminTable', 'click', e => {
      const btn = e.target.closest('button[data-azione]');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      const azione = btn.dataset.azione;
      if (azione === 'modifica') {
        const p = catalogo.find(x => x.id === id);
        if (p) {
          riempiForm(p);
          mostraTab('prod');
          const nome = $('#fName');
          if (nome) nome.focus();
          toast(`Stai modificando “${p.nome}”.`);
        }
      } else if (azione === 'elimina') {
        eliminaProdotto(id);
      } else if (azione === 'vetrina') {
        cambiaVetrina(id);
      }
    });

    /* Ordini */
    su('#tab-ord', 'click', e => {
      const btn = e.target.closest('button[data-azione]');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      if (btn.dataset.azione === 'evasa') cambiaStatoOrdine(id);
      else if (btn.dataset.azione === 'elimina-ordine') eliminaOrdine(id);
    });

    /* Dati negozio */
    su('#setForm', 'submit', salvaNegozio);
  }

  /* ---------- Avvio ---------- */
  function init() {
    const salvato = leggiJSON(CHIAVI.catalogo, []);
    catalogo = Array.isArray(salvato) && salvato.length ? salvato : CATALOGO_INIZIALE.map(p => ({ ...p }));
    ordini = leggiJSON(CHIAVI.ordini, []);
    const n = leggiJSON(CHIAVI.negozio, {});
    negozio = (n && typeof n === 'object') ? { ...NEGOZIO_INIZIALE, ...n } : { ...NEGOZIO_INIZIALE };

    const anno = $('#anno');
    if (anno) anno.textContent = String(new Date().getFullYear());

    collegaEventi();

    /* Sessione già aperta da una visita precedente: entra direttamente */
    if (leggiJSON(CHIAVI.sessione, false) === true) apriDashboard();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
