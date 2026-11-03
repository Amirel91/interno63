/* Interno 63 — admin.js: pannello admin.html. Gestione completa di articoli, categorie,
   richieste d'ordine, dati negozio e backup. Dati condivisi con lo storefront via localStorage. */

(() => {
  'use strict';

  /* ---------- Dati iniziali (ripristinabili) ---------- */
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

  const EMOJI_CATEGORIE = ['🎀','📦','🎁','💍','🕯️','🍯','🫙','🌿','🌸','🌼','🕊️','🥂','🍰','🍼','🧺','🧸','✨','🫖'];

  const NEGOZIO_INIZIALE = {
    nome: 'Interno 63',
    telefono: '351 234 5678',
    via: 'Via Roma 63',
    cap: '70043',
    citta: 'Monopoli',
    prov: 'BA',
    email: 'info@interno63.it',
    orari: ''
  };

  const CAMPI_NEGOZIO = [
    { chiave: 'nome', sel: ['#sName'], label: 'Nome negozio', obbligatorio: true },
    { chiave: 'telefono', sel: ['#sPhone'], label: 'Telefono', obbligatorio: true },
    { chiave: 'email', sel: ['#sEmail'], label: 'Email' },
    { chiave: 'via', sel: ['#sVia'], label: 'Via e numero civico' },
    { chiave: 'cap', sel: ['#sCap'], label: 'CAP' },
    { chiave: 'citta', sel: ['#sCitta'], label: 'Città' },
    { chiave: 'prov', sel: ['#sProv'], label: 'Provincia' },
    { chiave: 'orari', sel: ['#sOrari'], label: 'Orari' }
  ];

  const CHIAVI = { catalogo: 'i63-catalogo', categorie: 'i63-categorie', ordini: 'i63-ordini', negozio: 'i63-negozio', sessione: 'i63-admin', pass: 'i63-pass' };
  const PASSWORD_DEMO = 'interno63';

  /* ---------- Stato ---------- */
  let catalogo = [];
  let categorie = [];
  let ordini = [];
  let negozio = { ...NEGOZIO_INIZIALE };
  let iconaScelta = '🎁';
  let tornaAProdotti = false;
  let imgDaFile = '';
  let testoRicercaProd = '';
  let filtroCatProd = 'tutti';
  let filtroOrdini = 'tutte';

  /* ---------- Utility ---------- */
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const euro = n => `€ ${(Number(n) || 0).toFixed(2)}`;
  const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cat-' + Date.now();
  const primoEsistente = selettori => (Array.isArray(selettori) ? selettori : [selettori]).map(s => $(s)).find(Boolean) || null;

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

  /* La password è una stringa: lettura dedicata (leggiJSON non la restituirebbe) */
  function leggiPassword() {
    try {
      const v = JSON.parse(localStorage.getItem(CHIAVI.pass));
      if (typeof v === 'string' && v.length) return v;
    } catch (e) { /* nessuna password salvata */ }
    return PASSWORD_DEMO;
  }

  function scarica(nome, contenuto, tipo) {
    const blob = new Blob([contenuto], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  let toastTimer = null;
  function toast(messaggio) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = messaggio;
    el.classList.add('visibile');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visibile'), 3200);
  }

  const nomeCat = id => { const c = categorie.find(x => x.id === id); return c ? c.nome : (id || 'Senza categoria'); };
  const iconaCat = id => { const c = categorie.find(x => x.id === id); return c ? c.icona : '✿'; };

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
    aggiornaSelectCategorie();
    aggiornaFiltraCat();
    renderIconPicker();
    renderTabella();
    renderCategorie();
    filtroOrdini = 'tutte';
    renderOrdini();
    applicaNegozioForm();
    aggiornaAnteprimaNegozio();
    aggiornaStats();
    aggiornaContatoreDesc();
    aggiornaAnteprima();
    mostraTab('prod');
  }

  /* ---------- Statistiche ---------- */
  function aggiornaStats() {
    const imposta = (sel, valore) => { const el = $(sel); if (el) el.textContent = valore; };
    const aperte = ordini.filter(o => !o.evaso).length;
    imposta('#statProd', String(catalogo.length));
    imposta('#statCat', String(categorie.length));
    imposta('#statVet', String(catalogo.filter(p => p.vetrina).length));
    imposta('#statOrd', String(ordini.length));
    imposta('#statAperte', String(aperte));
    imposta('#statTot', euro(ordini.reduce((s, o) => s + (Number(o.totale) || 0), 0)));
    imposta('#badgeProd', String(catalogo.length));
    imposta('#badgeCat', String(categorie.length));
    const badgeOrd = $('#badgeOrd');
    if (badgeOrd) { badgeOrd.textContent = String(ordini.length); badgeOrd.hidden = ordini.length === 0; }
  }

  /* ---------- Tab (5 sezioni, backup compreso) ---------- */
  function mostraTab(nome) {
    ['prod', 'cat', 'ord', 'set', 'bak'].forEach(t => {
      const pannello = $('#tab-' + t);
      if (pannello) pannello.hidden = t !== nome;
    });
    document.querySelectorAll('#adminTabs .tab').forEach(b => {
      const attivo = b.dataset.tab === nome;
      b.classList.toggle('attiva', attivo);
      b.setAttribute('aria-selected', String(attivo));
    });
  }

  /* ---------- Modulo articoli ---------- */
  function setModalitaModifica(attiva) {
    const titolo = $('#formTitolo');
    const annulla = $('#annullaModifica');
    const salva = $('#prodSave');
    if (titolo) titolo.textContent = attiva ? '✏️ Modifica articolo' : '➕ Aggiungi un articolo';
    if (annulla) annulla.hidden = !attiva;
    if (salva) salva.textContent = attiva ? 'Salva modifiche' : 'Salva articolo';
  }

  function riempiForm(p) {
    if (!p) return;
    aggiornaSelectCategorie(p.categoria);
    const campi = { fId: String(p.id), fName: p.nome, fPrice: String(p.prezzo), fImg: p.img && !String(p.img).startsWith('data:') ? p.img : '', fDesc: p.descrizione || '' };
    Object.entries(campi).forEach(([id, valore]) => { const el = $('#' + id); if (el) el.value = valore; });
    imgDaFile = p.img && String(p.img).startsWith('data:') ? p.img : '';
    const file = $('#fImgFile');
    if (file) file.value = '';
    const feat = $('#fFeat');
    if (feat) feat.checked = Boolean(p.vetrina);
    setModalitaModifica(true);
    aggiornaContatoreDesc();
    aggiornaAnteprima();
  }

  function pulisciForm() {
    const form = $('#prodForm');
    if (form) form.reset();
    const id = $('#fId');
    if (id) id.value = '';
    imgDaFile = '';
    setModalitaModifica(false);
    aggiornaContatoreDesc();
    aggiornaAnteprima();
  }

  function aggiornaSelectCategorie(preferita) {
    const sel = $('#fCat');
    if (!sel) return;
    const corrente = preferita || sel.value;
    sel.innerHTML = categorie.map(c => `<option value="${esc(c.id)}">${esc(c.icona)} ${esc(c.nome)}</option>`).join('');
    if (categorie.some(c => c.id === corrente)) sel.value = corrente;
    else if (categorie[0]) sel.value = categorie[0].id;
  }

  function aggiornaFiltraCat() {
    const sel = $('#filtraCat');
    if (!sel) return;
    const corrente = sel.value || 'tutti';
    sel.innerHTML = `<option value="tutti">Tutte le categorie</option>` +
      categorie.map(c => `<option value="${esc(c.id)}">${esc(c.icona)} ${esc(c.nome)}</option>`).join('');
    sel.value = categorie.some(c => c.id === corrente) ? corrente : 'tutti';
    filtroCatProd = sel.value;
  }

  /* ---------- Immagine dal dispositivo (ridimensionata per restare leggera) ---------- */
  function caricaImmagineFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Formato non supportato: scegli un file immagine.'); return; }
    if (file.size > 6 * 1024 * 1024) { toast('Foto troppo grande (max 6 MB): comprimila prima di caricarla.'); return; }
    const lettore = new FileReader();
    lettore.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const lato = 900;
          const scala = Math.min(1, lato / Math.max(img.width, img.height));
          const tela = document.createElement('canvas');
          tela.width = Math.round(img.width * scala);
          tela.height = Math.round(img.height * scala);
          tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height);
          imgDaFile = tela.toDataURL('image/jpeg', 0.82);
        } catch (e) {
          if (lettore.result.length > 1_400_000) { toast('Foto troppo pesante dopo la conversione: usane una più piccola.'); return; }
          imgDaFile = String(lettore.result);
        }
        const url = $('#fImg');
        if (url) url.value = '';
        aggiornaAnteprima();
        toast('Foto caricata: la vedi nell\'anteprima a lato.');
      };
      img.onerror = () => toast('Impossibile leggere l\'immagine: riprova.');
      img.src = String(lettore.result);
    };
    lettore.onerror = () => toast('Lettura del file non riuscita: riprova.');
    lettore.readAsDataURL(file);
  }

  /* ---------- Anteprima live ---------- */
  function aggiornaAnteprima() {
    const box = $('#anteprimaCard');
    if (!box) return;
    const nome = (($('#fName') && $('#fName').value) || '').trim();
    const prezzo = Number(($('#fPrice') && $('#fPrice').value) || 0);
    const cat = ($('#fCat') && $('#fCat').value) || '';
    const url = (($('#fImg') && $('#fImg').value) || '').trim();
    const img = imgDaFile || url;
    const desc = (($('#fDesc') && $('#fDesc').value) || '').trim();
    const vetrina = Boolean($('#fFeat') && $('#fFeat').checked);
    const media = img
      ? `<img src="${esc(img)}" alt="" loading="lazy">`
      : `<div class="segnaposto" aria-hidden="true">${iconaCat(cat)}</div>`;
    box.innerHTML = `<article class="product">
      <div class="product-media">${media}${vetrina ? '<span class="badge-vetrina">In vetrina</span>' : ''}</div>
      <span class="categoria">${esc(nomeCat(cat))}</span>
      <h3>${nome ? esc(nome) : '<span class="hint">Nome dell\'articolo…</span>'}</h3>
      ${desc ? `<p class="hint">${esc(desc)}</p>` : ''}
      <p class="prezzo">${euro(prezzo)}</p>
      <button class="btn" type="button" disabled aria-disabled="true">Aggiungi al carrello</button>
    </article>`;
  }

  function aggiornaContatoreDesc() {
    const cont = $('#fDescCount');
    const campo = $('#fDesc');
    if (cont && campo) cont.textContent = `${campo.value.length}/220`;
  }

  /* ---------- Salvataggio articoli ---------- */
  function salvaProdotto(evento) {
    evento.preventDefault();
    const nome = (($('#fName') && $('#fName').value) || '').trim();
    if (!nome) { toast('Il nome dell\'articolo è obbligatorio.'); return; }
    const prezzoGrezzo = Number(($('#fPrice') && $('#fPrice').value) || 0);
    if (!Number.isFinite(prezzoGrezzo) || prezzoGrezzo < 0) { toast('Inserisci un prezzo valido (maggiore o uguale a 0).'); return; }
    const catScelta = ($('#fCat') && $('#fCat').value) || '';
    const dati = {
      nome,
      categoria: categorie.some(c => c.id === catScelta) ? catScelta : (categorie[0] ? categorie[0].id : ''),
      prezzo: Math.max(0, prezzoGrezzo),
      img: imgDaFile || (($('#fImg') && $('#fImg').value) || '').trim(),
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
    renderCategorie();
    aggiornaStats();
    const campoNome = $('#fName');
    if (campoNome) campoNome.focus();
  }

  function duplicaProdotto(id) {
    const p = catalogo.find(x => x.id === id);
    if (!p) return;
    catalogo.unshift({ ...p, id: Date.now(), nome: `${p.nome} (copia)`, vetrina: false });
    scriviJSON(CHIAVI.catalogo, catalogo);
    renderTabella();
    aggiornaStats();
    toast(`“${p.nome}” duplicato: modifica la copia come vuoi.`);
  }

  function eliminaProdotto(id) {
    const p = catalogo.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`Eliminare “${p.nome}” dal catalogo? L'operazione non si può annullare.`)) return;
    catalogo = catalogo.filter(x => x.id !== id);
    scriviJSON(CHIAVI.catalogo, catalogo);
    if (($('#fId') && $('#fId').value) === String(id)) pulisciForm();
    renderTabella();
    renderCategorie();
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

  /* ---------- Tabella articoli (con ricerca e filtro categoria) ---------- */
  function renderTabella() {
    const box = $('#adminTable');
    if (!box) return;
    const q = testoRicercaProd.trim().toLowerCase();
    let lista = catalogo.slice();
    if (filtroCatProd !== 'tutti') lista = lista.filter(p => p.categoria === filtroCatProd);
    if (q) lista = lista.filter(p => `${p.nome} ${p.descrizione || ''} ${nomeCat(p.categoria)}`.toLowerCase().includes(q));
    const cont = $('#contProd');
    if (cont) cont.textContent = lista.length
      ? `${lista.length} di ${catalogo.length} ${catalogo.length === 1 ? 'articolo' : 'articoli'}`
      : 'Nessun articolo corrisponde ai filtri';
    if (!catalogo.length) {
      box.innerHTML = '<p class="vuoto">Nessun articolo in catalogo: aggiungi il primo dal modulo qui sopra.</p>';
      return;
    }
    if (!lista.length) {
      box.innerHTML = '<p class="vuoto">Nessun risultato: cambia ricerca o categoria filtro.</p>';
      return;
    }
    box.innerHTML = `<table class="tabella">
      <thead><tr><th>Articolo</th><th>Categoria</th><th>Prezzo</th><th>Vetrina</th><th>Azioni</th></tr></thead>
      <tbody>${lista.map(p => `<tr>
        <td><b>${esc(p.nome)}</b>${p.descrizione ? `<br><span class="hint">${esc(p.descrizione)}</span>` : ''}</td>
        <td>${iconaCat(p.categoria)} ${esc(nomeCat(p.categoria))}</td>
        <td><strong>${euro(p.prezzo)}</strong></td>
        <td><button class="btn-mini${p.vetrina ? ' attiva' : ''}" type="button" data-azione="vetrina" data-id="${p.id}" aria-pressed="${p.vetrina}">${p.vetrina ? '★ In vetrina' : '☆ Metti in vetrina'}</button></td>
        <td class="azioni">
          <button class="btn-mini" type="button" data-azione="modifica" data-id="${p.id}">✏️ Modifica</button>
          <button class="btn-mini" type="button" data-azione="duplica" data-id="${p.id}">⧉ Duplica</button>
          <button class="btn-mini pericolo" type="button" data-azione="elimina" data-id="${p.id}">🗑 Elimina</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  /* ---------- Categorie ---------- */
  function renderIconPicker() {
    const box = $('#iconPicker');
    if (!box) return;
    box.innerHTML = EMOJI_CATEGORIE.map(e =>
      `<button type="button" class="icona-btn${e === iconaScelta ? ' selezionata' : ''}" data-icona="${e}" aria-pressed="${e === iconaScelta}" title="Icona ${e}">${e}</button>`
    ).join('');
  }

  function setModalitaModificaCat(attiva) {
    const titolo = $('#catTitolo');
    const annulla = $('#annullaCat');
    if (titolo) titolo.textContent = attiva ? '✏️ Modifica categoria' : '🏷️ Nuova categoria';
    if (annulla) annulla.hidden = !attiva;
  }

  function riempiFormCategoria(c) {
    if (!c) return;
    const id = $('#cId');
    if (id) id.value = c.id;
    const nome = $('#cNome');
    if (nome) nome.value = c.nome;
    iconaScelta = c.icona || '🎁';
    renderIconPicker();
    setModalitaModificaCat(true);
    if (nome) nome.focus();
  }

  function pulisciFormCategoria() {
    const form = $('#catForm');
    if (form) form.reset();
    const id = $('#cId');
    if (id) id.value = '';
    iconaScelta = '🎁';
    renderIconPicker();
    setModalitaModificaCat(false);
  }

  function salvaCategoria(evento) {
    evento.preventDefault();
    const nome = (($('#cNome') && $('#cNome').value) || '').trim();
    if (!nome) { toast('Dai un nome alla categoria.'); return; }
    if (nome.length > 30) { toast('Nome categoria troppo lungo: massimo 30 caratteri.'); return; }
    if (!iconaScelta) iconaScelta = '🎁';
    const idModifica = ($('#cId') && $('#cId').value) || '';
    let idPronto = idModifica;
    if (idModifica) {
      const c = categorie.find(x => x.id === idModifica);
      if (c) { c.nome = nome; c.icona = iconaScelta; toast(`Categoria “${nome}” aggiornata.`); }
    } else {
      if (categorie.some(c => c.nome.toLowerCase() === nome.toLowerCase())) {
        toast(`Esiste già una categoria chiamata “${nome}”.`);
        return;
      }
      let id = slug(nome);
      while (categorie.some(c => c.id === id)) id += '-2';
      categorie.push({ id, nome, icona: iconaScelta });
      idPronto = id;
      toast(`Categoria “${nome}” creata: già selezionabile nei prodotti.`);
    }
    scriviJSON(CHIAVI.categorie, categorie);
    pulisciFormCategoria();
    renderCategorie();
    aggiornaSelectCategorie(idPronto);
    aggiornaFiltraCat();
    renderTabella();
    aggiornaStats();
    if (tornaAProdotti) {
      tornaAProdotti = false;
      mostraTab('prod');
      toast(`Categoria “${nome}” pronta: la trovi già selezionata nell'articolo.`);
    }
  }

  function eliminaCategoria(id) {
    const c = categorie.find(x => x.id === id);
    if (!c) return;
    const usati = catalogo.filter(p => p.categoria === id).length;
    if (usati > 0) {
      toast(`Impossibile eliminare: ${usati} ${usati === 1 ? 'articolo usa' : 'articoli usano'} “${c.nome}”. Spostali o eliminali prima.`);
      return;
    }
    if (!confirm(`Eliminare la categoria “${c.nome}”?`)) return;
    categorie = categorie.filter(x => x.id !== id);
    scriviJSON(CHIAVI.categorie, categorie);
    if (($('#cId') && $('#cId').value) === id) pulisciFormCategoria();
    renderCategorie();
    aggiornaSelectCategorie();
    aggiornaFiltraCat();
    renderTabella();
    aggiornaStats();
    toast(`Categoria “${c.nome}” eliminata.`);
  }

  function renderCategorie() {
    const box = $('#catTable');
    if (!box) return;
    if (!categorie.length) {
      box.innerHTML = '<p class="vuoto">Nessuna categoria: creane una dal modulo qui sopra.</p>';
      return;
    }
    box.innerHTML = `<table class="tabella">
      <thead><tr><th>Categoria</th><th>Articoli</th><th>Azioni</th></tr></thead>
      <tbody>${categorie.map(c => {
        const n = catalogo.filter(p => p.categoria === c.id).length;
        return `<tr>
          <td><b>${esc(c.icona)} ${esc(c.nome)}</b><br><span class="hint">i63-catalogo → “${esc(c.id)}”</span></td>
          <td>${n}</td>
          <td class="azioni">
            <button class="btn-mini" type="button" data-azione="modifica-cat" data-cat="${esc(c.id)}">✏️ Modifica</button>
            <button class="btn-mini pericolo" type="button" data-azione="elimina-cat" data-cat="${esc(c.id)}">🗑 Elimina</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  /* ---------- Ordini (con filtro stato e CSV) ---------- */
  function renderOrdini() {
    const box = $('#ordiniBox');
    if (!box) return;
    document.querySelectorAll('#ordFiltri .chip').forEach(c => {
      const attiva = c.dataset.filtro === filtroOrdini;
      c.classList.toggle('attiva', attiva);
      c.setAttribute('aria-pressed', String(attiva));
    });
    const cont = $('#contOrd');
    if (!ordini.length) {
      if (cont) cont.textContent = '';
      box.innerHTML = '<p class="vuoto">Nessuna richiesta d\'ordine: compariranno qui quando i clienti inviano il carrello dal negozio.</p>';
      return;
    }
    const lista = filtroOrdini === 'aperte' ? ordini.filter(o => !o.evaso)
      : filtroOrdini === 'chiuse' ? ordini.filter(o => o.evaso)
      : ordini.slice();
    if (cont) cont.textContent = `${lista.length} ${lista.length === 1 ? 'richiesta' : 'richieste'} su ${ordini.length}`;
    if (!lista.length) {
      box.innerHTML = '<p class="vuoto">Nessuna richiesta in questo stato: cambia filtro qui sopra.</p>';
      return;
    }
    box.innerHTML = `<table class="tabella">
      <thead><tr><th>Data</th><th>Cliente</th><th>Articoli</th><th>Totale</th><th>Stato</th><th>Azioni</th></tr></thead>
      <tbody>${lista.map(o => `<tr>
        <td>${esc(o.data)}</td>
        <td><b>${esc(o.cliente)}</b>${o.recapito ? `<br><span class="hint">${esc(o.recapito)}</span>` : ''}</td>
        <td>${esc(o.articoli)}</td>
        <td><strong>${euro(o.totale)}</strong></td>
        <td>${o.evaso ? '<span class="pill">Evasa</span>' : '<span class="hint">Da evadere</span>'}</td>
        <td class="azioni">
          <button class="btn-mini" type="button" data-azione="evasa" data-id="${o.id}">${o.evaso ? '↩︎ Riapri' : '✓ Segna evasa'}</button>
          <button class="btn-mini pericolo" type="button" data-azione="elimina-ordine" data-id="${o.id}">🗑 Elimina</button>
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

  function esportaCSV() {
    if (!ordini.length) { toast('Nessuna richiesta da esportare: la lista è vuota.'); return; }
    const cella = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const righe = [
      ['Data', 'Cliente', 'Recapito', 'Articoli', 'Totale €', 'Stato'].map(cella).join(';'),
      ...ordini.map(o => [o.data, o.cliente, o.recapito || '', o.articoli, (Number(o.totale) || 0).toFixed(2).replace('.', ','), o.evaso ? 'Evasa' : 'Da evadere'].map(cella).join(';'))
    ];
    scarica(`interno63-richieste-${new Date().toISOString().slice(0, 10)}.csv`, '\uFEFF' + righe.join('\r\n'), 'text/csv;charset=utf-8');
    toast('CSV scaricato: aprilo con Excel o Fogli Google.');
  }

  /* ---------- Dati negozio ---------- */
  function applicaNegozioForm() {
    CAMPI_NEGOZIO.forEach(c => {
      const el = primoEsistente(c.sel);
      if (el) el.value = negozio[c.chiave] ?? '';
    });
    aggiornaAnteprimaNegozio();
  }

  function negozioComposto() {
    const n = { ...NEGOZIO_INIZIALE, ...negozio };
    const comune = [n.cap, n.citta, n.prov ? `(${n.prov})` : ''].filter(Boolean).join(' ');
    return { ...n, sede: [n.via, comune].filter(Boolean).join(', ') };
  }

  function aggiornaAnteprimaNegozio() {
    const el = $('#setAnteprima');
    if (!el) return;
    const d = negozioComposto();
    const pezzi = [d.sede, d.telefono, d.email].filter(Boolean).join(' · ');
    el.textContent = pezzi + (d.orari ? ` — ${d.orari}` : '') || '…';
  }

  function aggiornaFootCitta() {
    const el = $('#footCitta');
    if (el) el.textContent = negozio.citta ? `${negozio.citta}${negozio.prov ? ` (${negozio.prov})` : ''}` : NEGOZIO_INIZIALE.citta;
  }

  function salvaNegozio(evento) {
    evento.preventDefault();
    let primoErrore = '';
    CAMPI_NEGOZIO.forEach(c => {
      const el = primoEsistente(c.sel);
      if (!el) return;
      const valore = String(el.value || '').trim();
      if (!valore && c.obbligatorio && !primoErrore) primoErrore = `Compila il campo “${c.label}”: è obbligatorio.`;
      negozio[c.chiave] = valore;
    });
    if (primoErrore) { toast(primoErrore); return; }
    negozio.nome = negozio.nome || NEGOZIO_INIZIALE.nome;
    negozio.telefono = negozio.telefono || NEGOZIO_INIZIALE.telefono;
    scriviJSON(CHIAVI.negozio, negozio);
    let messaggio = 'Dati negozio salvati: aggiornati in home e nel catalogo.';

    const resetCatEl = $('#sResetCat');
    const resetProdEl = $('#sReset');
    const resetCategorie = Boolean(resetCatEl && resetCatEl.checked);
    const resetCatalogo = Boolean(resetProdEl && resetProdEl.checked) || resetCategorie;
    if (resetCatalogo) {
      catalogo = CATALOGO_INIZIALE.map(p => ({ ...p }));
      scriviJSON(CHIAVI.catalogo, catalogo);
    }
    if (resetCategorie) {
      categorie = CATEGORIE_INIZIALI.map(c => ({ ...c }));
      scriviJSON(CHIAVI.categorie, categorie);
    }
    if (resetCatalogo || resetCategorie) {
      const prima = categorie[0] ? categorie[0].id : '';
      catalogo.forEach(p => { if (!categorie.some(c => c.id === p.categoria)) p.categoria = prima; });
      scriviJSON(CHIAVI.catalogo, catalogo);
      pulisciForm();
      pulisciFormCategoria();
      aggiornaSelectCategorie();
      aggiornaFiltraCat();
      renderTabella();
      renderCategorie();
      aggiornaStats();
      if (resetProdEl) resetProdEl.checked = false;
      if (resetCatEl) resetCatEl.checked = false;
      messaggio = 'Dati salvati: catalogo' + (resetCategorie ? ' e categorie' : '') + ' ripristinati ai valori iniziali.';
    }
    aggiornaFootCitta();
    toast(messaggio);
  }

  /* ---------- Backup ---------- */
  function esportaBackup() {
    const pacchetto = {
      versione: 2,
      esportatoIl: new Date().toISOString(),
      catalogo, categorie, ordini, negozio
    };
    scarica(`interno63-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(pacchetto, null, 2), 'application/json');
    toast('Backup scaricato: conservalo al sicuro, permette il trasferimento su un altro browser.');
  }

  function importaBackup(file) {
    if (!file) return;
    const lettore = new FileReader();
    lettore.onload = () => {
      try {
        const dati = JSON.parse(String(lettore.result));
        if (!dati || typeof dati !== 'object' || !Array.isArray(dati.catalogo)) {
          toast('File non valido: manca il catalogo. Usa un backup esportato da questo pannello.');
          return;
        }
        catalogo = dati.catalogo.filter(p => p && p.nome);
        categorie = Array.isArray(dati.categorie) ? dati.categorie.filter(c => c && c.id) : CATEGORIE_INIZIALI.map(c => ({ ...c }));
        ordini = Array.isArray(dati.ordini) ? dati.ordini : [];
        negozio = { ...NEGOZIO_INIZIALE, ...(dati.negozio && typeof dati.negozio === 'object' ? dati.negozio : {}) };
        const prima = categorie[0] ? categorie[0].id : '';
        catalogo.forEach(p => { if (!categorie.some(c => c.id === p.categoria)) p.categoria = prima; });
        scriviJSON(CHIAVI.catalogo, catalogo);
        scriviJSON(CHIAVI.categorie, categorie);
        scriviJSON(CHIAVI.ordini, ordini);
        scriviJSON(CHIAVI.negozio, negozio);
        pulisciForm();
        pulisciFormCategoria();
        aggiornaSelectCategorie();
        aggiornaFiltraCat();
        filtroOrdini = 'tutte';
        renderTabella();
        renderCategorie();
        renderOrdini();
        applicaNegozioForm();
        aggiornaStats();
        aggiornaFootCitta();
        toast('Backup importato: i dati di questo browser sono stati sostituiti.');
      } catch (e) {
        toast('Impossibile leggere il file: verifica che sia un backup JSON valido.');
      }
    };
    lettore.onerror = () => toast('Lettura del file non riuscita: riprova.');
    lettore.readAsText(file);
  }

  function ripristina(tipo) {
    const conferme = {
      catalogo: 'Ripristinare il catalogo iniziale? Le modifiche agli articoli andranno perse.',
      categorie: 'Ripristinare le categorie predefinite? Gli articoli verranno ricollegati automaticamente.',
      ordini: 'Eliminare TUTTE le richieste d\'ordine? Operazione non reversibile.',
      tutto: 'Ripristinare catalogo, categorie e richieste ai dati di partenza? Ogni modifica andrà persa.'
    };
    if (!confirm(conferme[tipo] || 'Procedere con il ripristino?')) return;
    if (tipo === 'catalogo' || tipo === 'tutto') {
      catalogo = CATALOGO_INIZIALE.map(p => ({ ...p }));
      scriviJSON(CHIAVI.catalogo, catalogo);
    }
    if (tipo === 'categorie' || tipo === 'tutto') {
      categorie = CATEGORIE_INIZIALI.map(c => ({ ...c }));
      scriviJSON(CHIAVI.categorie, categorie);
    }
    if (tipo === 'ordini' || tipo === 'tutto') {
      ordini = [];
      scriviJSON(CHIAVI.ordini, ordini);
    }
    const prima = categorie[0] ? categorie[0].id : '';
    catalogo.forEach(p => { if (!categorie.some(c => c.id === p.categoria)) p.categoria = prima; });
    scriviJSON(CHIAVI.catalogo, catalogo);
    pulisciForm();
    pulisciFormCategoria();
    aggiornaSelectCategorie();
    aggiornaFiltraCat();
    filtroOrdini = 'tutte';
    renderTabella();
    renderCategorie();
    renderOrdini();
    aggiornaStats();
    const nomi = { catalogo: 'Catalogo ripristinato', categorie: 'Categorie ripristinate', ordini: 'Richieste eliminate', tutto: 'Tutto ripristinato ai dati di partenza' };
    toast(nomi[tipo] || 'Ripristino completato.');
  }

  function cambiaPassword() {
    const campo = $('#sPass');
    if (!campo) return;
    const nuova = campo.value.trim();
    if (nuova.length < 4) { toast('Password troppo corta: minimo 4 caratteri.'); return; }
    scriviJSON(CHIAVI.pass, nuova);
    campo.value = '';
    toast('Password aggiornata: usala al prossimo accesso.');
  }

  /* ---------- Eventi ---------- */
  function collegaEventi() {
    const su = (selettore, evento, fn) => { const el = $(selettore); if (el) el.addEventListener(evento, fn); };

    /* Accesso */
    su('#gateForm', 'submit', e => {
      e.preventDefault();
      const campo = $('#gatePass');
      const msg = $('#gateMsg');
      if (campo && campo.value === leggiPassword()) {
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

    /* Articoli */
    su('#prodForm', 'submit', salvaProdotto);
    su('#prodForm', 'input', e => {
      if (e.target && e.target.id === 'fImg') { imgDaFile = ''; const f = $('#fImgFile'); if (f) f.value = ''; }
      aggiornaContatoreDesc();
      aggiornaAnteprima();
    });
    su('#fImgFile', 'change', e => caricaImmagineFile(e.target.files && e.target.files[0]));
    su('#prodReset', 'click', () => {
      pulisciForm();
      const nome = $('#fName');
      if (nome) nome.focus();
      toast('Modulo pulito: pronto per un nuovo articolo.');
    });
    su('#annullaModifica', 'click', () => {
      pulisciForm();
      const nome = $('#fName');
      if (nome) nome.focus();
    });
    su('#vaiCategorie', 'click', () => {
      tornaAProdotti = true;
      mostraTab('cat');
      const nome = $('#cNome');
      if (nome) nome.focus();
    });
    su('#cercaProd', 'input', e => { testoRicercaProd = e.target.value || ''; renderTabella(); });
    su('#filtraCat', 'change', e => { filtroCatProd = e.target.value || 'tutti'; renderTabella(); });

    /* Categorie */
    su('#catForm', 'submit', salvaCategoria);
    su('#catReset', 'click', () => {
      pulisciFormCategoria();
      const nome = $('#cNome');
      if (nome) nome.focus();
    });
    su('#annullaCat', 'click', () => {
      pulisciFormCategoria();
      const nome = $('#cNome');
      if (nome) nome.focus();
    });

    /* Ordini */
    su('#ordFiltri', 'click', e => {
      const chip = e.target.closest('.chip');
      if (chip && chip.dataset.filtro) { filtroOrdini = chip.dataset.filtro; renderOrdini(); }
    });
    su('#esportaCSV', 'click', esportaCSV);

    /* Dati negozio */
    su('#setForm', 'submit', salvaNegozio);
    su('#setForm', 'input', aggiornaAnteprimaNegozio);

    /* Backup */
    su('#btnEsporta', 'click', esportaBackup);
    su('#fileImporta', 'change', e => {
      const btn = $('#btnImporta');
      const file = e.target.files && e.target.files[0];
      if (btn) btn.disabled = !file;
    });
    su('#btnImporta', 'click', () => {
      const input = $('#fileImporta');
      const file = input && input.files && input.files[0];
      if (!file) { toast('Scegli prima un file di backup.'); return; }
      if (!confirm('Importare il backup? Sostituirà integralmente i dati di questo browser.')) return;
      importaBackup(file);
    });
    su('#btnPass', 'click', cambiaPassword);

    /* Ripristini rapidi (delegati: più pulsanti con data-ripristina) */
    document.addEventListener('click', e => {
      const rip = e.target.closest('[data-ripristina]');
      if (rip) { ripristina(rip.dataset.ripristina); return; }
      const icona = e.target.closest('.icona-btn');
      if (icona) { iconaScelta = icona.dataset.icona || '🎁'; renderIconPicker(); return; }
      const btn = e.target.closest('[data-azione]');
      if (!btn) return;
      const azione = btn.dataset.azione;
      const id = Number(btn.dataset.id);
      if (azione === 'vetrina') cambiaVetrina(id);
      else if (azione === 'modifica') {
        const p = catalogo.find(x => x.id === id);
        if (p) { riempiForm(p); mostraTab('prod'); ($('#fName') || {}).focus?.(); }
      }
      else if (azione === 'duplica') duplicaProdotto(id);
      else if (azione === 'elimina') eliminaProdotto(id);
      else if (azione === 'modifica-cat') riempiFormCategoria(categorie.find(c => c.id === btn.dataset.cat));
      else if (azione === 'elimina-cat') eliminaCategoria(btn.dataset.cat);
      else if (azione === 'evasa') cambiaStatoOrdine(id);
      else if (azione === 'elimina-ordine') eliminaOrdine(id);
    });
  }

  /* ---------- Avvio ---------- */
  function init() {
    /* Catalogo: rispetto anche un salvataggio vuoto (scelta esplicita dell'admin) */
    const salvato = leggiJSON(CHIAVI.catalogo, null);
    catalogo = Array.isArray(salvato) ? salvato : CATALOGO_INIZIALE.map(p => ({ ...p }));

    let catSalvate = null;
    try {
      const grezzo = localStorage.getItem(CHIAVI.categorie);
      if (grezzo) catSalvate = JSON.parse(grezzo);
    } catch (e) { catSalvate = null; }
    categorie = Array.isArray(catSalvate)
      ? catSalvate.filter(c => c && c.id)
      : CATEGORIE_INIZIALI.map(c => ({ ...c }));

    ordini = leggiJSON(CHIAVI.ordini, []);
    const n = leggiJSON(CHIAVI.negozio, {});
    negozio = (n && typeof n === 'object') ? { ...NEGOZIO_INIZIALE, ...n } : { ...NEGOZIO_INIZIALE };

    const anno = $('#anno');
    if (anno) anno.textContent = String(new Date().getFullYear());
    aggiornaFootCitta();
    collegaEventi();

    /* Sessione già aperta → salta il gate */
    let sessioneAperta = false;
    try { sessioneAperta = JSON.parse(localStorage.getItem(CHIAVI.sessione)) === true; } catch (e) { sessioneAperta = false; }
    if (sessioneAperta) {
      const gate = $('#gateWrap');
      if (gate) gate.hidden = true;
      apriDashboard();
    } else {
      const campo = $('#gatePass');
      if (campo) campo.focus();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
