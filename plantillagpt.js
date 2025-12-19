/*
  PLANTILLA GPT (offline) — ANOTACIONES RÁPIDAS
  - Modal pequeño para anotar: fecha, hora, lugar, objetos, daños, cuantía, lesiones, cámaras y una nota breve.
  - Botón COPIAR: genera el texto y lo copia al portapapeles (para pegarlo en tu GPT de denuncia).
  - Botón SALIR: cierra el modal.

  Uso:
  - Carga este archivo en tu HTML: <script src="plantillagpt.js"></script>
  - Debe existir un botón con id="btnPlantillaHechos" para abrir el modal (cambia OPEN_BUTTON_ID si quieres).
  - Opcional: si existe calles.js y expone CALLEJERO por municipio/tipo, se generarán sugerencias "via, MUNICIPIO".
*/

(function(){
  'use strict';

  // ===== Config =====
  const OPEN_BUTTON_ID = 'btnPlantillaHechos';
  const MODAL_ID = 'gptPlantillaModal';

  // Cache de sugerencias de vías (para el autocompletado custom)
  let __CALLES_LIST__ = [];

  // ===== Helpers =====
  const $ = (id) => document.getElementById(id);

  function ensureStyles(){
    if (document.getElementById('gpt-plantilla-styles')) return;
    const style = document.createElement('style');
    style.id = 'gpt-plantilla-styles';
    style.textContent = `
      /* ===== Modal Plantilla GPT (compacta) ===== */
      .gpt-modal-backdrop{position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:12px;}
      .gpt-modal-backdrop.open{display:flex;}
      .gpt-modal-card{width:min(540px,100%);border-radius:14px;background:rgba(11,18,32,.90);border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 60px rgba(0,0,0,.55);padding:10px 10px 10px;color:#e5e7eb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;}
      .gpt-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;}
      .gpt-modal-title{font-weight:900;letter-spacing:.3px;font-size:12px;color:#e6eefc;text-transform:uppercase;}
      .gpt-modal-close{border:none;background:transparent;color:#e5e7eb;cursor:pointer;padding:6px 10px;border-radius:10px;box-shadow:0 0 14px rgba(255,255,255,.18);}
      .gpt-modal-close:hover{transform:translateY(-1px);}

      .gpt-modal-grid{display:grid;gap:6px;grid-template-columns:1fr;}
      @media(min-width:720px){.gpt-modal-grid{grid-template-columns:1fr 1fr;}}
      .gpt-span2{grid-column:1/-1;}
      /* Fila fija de 2 columnas (Fecha/Hora) */
      .gpt-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .gpt-row2 .gpt-field{min-width:0;}
      .gpt-field label{display:block;font-size:12px;color:rgba(207,224,255,.90);margin:0 0 4px;font-weight:900;}
      .gpt-field input,.gpt-field select,.gpt-field textarea{width:100%;box-sizing:border-box;background:rgba(255,255,255,.08);color:#e5e7eb;border:1px solid rgba(255,255,255,.16);border-radius:10px;font:inherit;padding:6px 8px;outline:none;}
      /* Fecha y hora más compactos */
            #gptPlFecha,#gptPlHora{
        padding:3px 6px;
        font-size:10px;
        height:26px;
        width:85%;
        min-width:0;
      }
      .gpt-field input:focus,.gpt-field textarea:focus,.gpt-field select:focus{border-color:rgba(124,156,255,.60);box-shadow:0 0 0 3px rgba(124,156,255,.16);}

      /* textarea solo para salida; baja altura */
      .gpt-field textarea{min-height:36px;resize:vertical;}

      .gpt-row{display:flex;gap:14px;flex-wrap:wrap;}
      /* Separación extra solo para la fila de cámaras */
      .gpt-row.gpt-cams{gap:38px;}
     .gpt-pill{
  display:inline-flex;
  gap:6px;
  align-items:center;
  padding:2px 6px;           /* rodea al radio (mínimo) */
  border-radius:9999px;
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.10);
  font-size:12px;
}
.gpt-pill input{margin:0;}
.gpt-pill label{margin:0;}

      .gpt-modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:10px;flex-wrap:wrap;}
      .gpt-btn{border:none;cursor:pointer;border-radius:12px;padding:9px 12px;font-weight:900;letter-spacing:.3px;color:#fff;background:rgba(255,255,255,.08);box-shadow:0 0 14px rgba(255,255,255,.16);transition:transform .15s ease, box-shadow .2s ease;}
      .gpt-btn:hover{transform:translateY(-1px);box-shadow:0 0 20px rgba(255,255,255,.22);}
      .gpt-btn.ok{background:linear-gradient(135deg, rgba(34,197,94,.18), rgba(16,185,129,.10));box-shadow:0 0 18px rgba(34,197,94,.30);}
      .gpt-btn.ok:hover{box-shadow:0 0 26px rgba(34,197,94,.45);}
      .gpt-btn.warn{background:linear-gradient(135deg, rgba(239,68,68,.18), rgba(185,28,28,.10));box-shadow:0 0 18px rgba(239,68,68,.22);}
      .gpt-btn.warn:hover{box-shadow:0 0 26px rgba(239,68,68,.35);}

      /* ===== Sugerencias custom (Lugar) ===== */
      .gpt-suggest{position:absolute;z-index:10000;max-height:220px;overflow:auto;border-radius:12px;background:rgba(11,18,32,.96);border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 60px rgba(0,0,0,.55);}
      .gpt-suggest.hidden{display:none;}
      .gpt-suggest-item{padding:8px 10px;cursor:pointer;font-size:12px;color:#e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .gpt-suggest-item:hover{background:rgba(255,255,255,.08);}
    `;
    document.head.appendChild(style);
  }

  function ensureModal(){
    if ($(MODAL_ID)) return;

    const backdrop = document.createElement('div');
    backdrop.id = MODAL_ID;
    backdrop.className = 'gpt-modal-backdrop';
    backdrop.setAttribute('aria-hidden','true');

    backdrop.innerHTML = `
      <div class="gpt-modal-card" role="dialog" aria-modal="true" aria-labelledby="gptPlantillaTitle">
        <div class="gpt-modal-head">
          <div class="gpt-modal-title" id="gptPlantillaTitle">Plantilla rápida · Denuncia GPT</div>
          <button type="button" class="gpt-modal-close" id="gptPlantillaClose" aria-label="Cerrar">✕</button>
        </div>

        <div class="gpt-modal-grid">
                   <div class="gpt-row2 gpt-span2">
            <div class="gpt-field">
              <label for="gptPlFecha">Fecha</label>
              <input id="gptPlFecha" type="date" value="">
            </div>
            <div class="gpt-field">
              <label for="gptPlHora">Hora</label>
              <input id="gptPlHora" type="time" value="">
            </div>
          </div>

          <div class="gpt-field gpt-span2">
            <label for="gptPlLugar">Lugar</label>
            <input id="gptPlLugar" type="text">
            <div id="gptPlLugarSuggest" class="gpt-suggest hidden"></div>
          </div>

          <div class="gpt-field gpt-span2">
            <label for="gptPlObjetos">Objetos</label>
            <input id="gptPlObjetos" type="text">
          </div>

          <div class="gpt-field">
            <label for="gptPlDanios">Daños</label>
            <input id="gptPlDanios" type="text">
          </div>

          <div class="gpt-field">
            <label for="gptPlLesiones">Lesiones</label>
            <input id="gptPlLesiones" type="text">
          </div>

          <div class="gpt-field">
            <label>Cámaras</label>
            <div class="gpt-row gpt-cams" style="margin-top:6px">
              <span class="gpt-pill"><input type="radio" name="gptPlCamaras" value="SI" id="gptPlCamSi"><label for="gptPlCamSi" style="margin:0">Sí</label></span>
              <span class="gpt-pill"><input type="radio" name="gptPlCamaras" value="NO" id="gptPlCamNo"><label for="gptPlCamNo" style="margin:0">No</label></span>
              <span class="gpt-pill"><input type="radio" name="gptPlCamaras" value="DESCONOCE" id="gptPlCamDes" checked><label for="gptPlCamDes" style="margin:0">?</label></span>
            </div>
          </div>

          <div class="gpt-field gpt-span2">
            <label for="gptPlNotas">Notas</label>
            <input id="gptPlNotas" type="text">
          </div>
        </div>

        <div class="gpt-modal-actions">
          <button type="button" class="gpt-btn ok" id="gptPlantillaCopiar">Copiar</button>
          <button type="button" class="gpt-btn warn" id="gptPlantillaSalir">Salir</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
  }

  function getRadio(name){
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : 'DESCONOCE';
  }

  function normalizeBlank(s){
    return String(s || '').trim();
  }

  function hydrateCallesDatalist(){
    let list = [];

    // 1) Arrays directos
    const directArrays = [
      window.CALLES,
      window.CALLEJERO?.calles,
      window.CALLEJERO?.CALLES,
      window.calles
    ].filter(x => Array.isArray(x));

    if (directArrays.length){
      list = directArrays[0].map(v => String(v || '').trim()).filter(Boolean);
    }

    // 2) Callejero por municipio: {MUNI:{Tipo:[vias...]}}
    if (!list.length && window.CALLEJERO && typeof window.CALLEJERO === 'object' && !Array.isArray(window.CALLEJERO)){
      const out = [];
      const seen = new Set();

      for (const muniRaw of Object.keys(window.CALLEJERO)){
        const muni = String(muniRaw || '').trim();
        const byType = window.CALLEJERO[muniRaw];
        if (!byType || typeof byType !== 'object') continue;

        for (const tipoRaw of Object.keys(byType)){
          const arr = byType[tipoRaw];
          if (!Array.isArray(arr)) continue;

          for (let i = 0; i < arr.length; i++){
            const via = String(arr[i] || '').trim();
            if (!via) continue;

            const label = `${via}, ${muni}`; // p.ej. "Calle Roma, ADEJE"
            const key = label.toUpperCase();
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(label);
          }
        }
      }

      list = out;
    }

    __CALLES_LIST__ = list;
  }

  function buildTemplateText(){
    const fecha = normalizeBlank($('gptPlFecha')?.value);
    const hora  = normalizeBlank($('gptPlHora')?.value);
    const lugar = normalizeBlank($('gptPlLugar')?.value);

    const objetos = normalizeBlank($('gptPlObjetos')?.value);
    const danios  = normalizeBlank($('gptPlDanios')?.value);
    const lesiones= normalizeBlank($('gptPlLesiones')?.value);

    const camaras = getRadio('gptPlCamaras');
    const notas   = normalizeBlank($('gptPlNotas')?.value);

    const lines = [];
    lines.push('PLANTILLA (datos rápidos)');
    lines.push('------------------------');
    if (fecha) lines.push(`Fecha: ${fecha}`);
    if (hora)  lines.push(`Hora: ${hora}`);
    if (lugar) lines.push(`Lugar: ${lugar}`);
    if (objetos) lines.push(`Objetos: ${objetos}`);
    if (danios)  lines.push(`Daños: ${danios}`);
    if (lesiones)lines.push(`Lesiones: ${lesiones}`);

    if (camaras === 'SI') lines.push('Cámaras: SÍ');
    else if (camaras === 'NO') lines.push('Cámaras: NO');
    else lines.push('Cámaras: SE DESCONOCE');

    if (notas) lines.push(`Notas: ${notas}`);

    lines.push('------------------------');
    lines.push('Redacta la denuncia formal con estos datos y el relato mencionado a continuación.');
    return lines.join('\n');
  }

  async function copyToClipboard(text){
    try{
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function'){
        await navigator.clipboard.writeText(text);
        return true;
      }
    }catch(_){/* fallback */}

    try{
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly','');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return !!ok;
    }catch(_){ return false; }
  }

  function placeSuggestBox(){
    const inp = $('gptPlLugar');
    const box = $('gptPlLugarSuggest');
    if (!inp || !box) return;

    const r = inp.getBoundingClientRect();
    box.style.position = 'fixed';
    box.style.left = `${r.left}px`;
    box.style.top  = `${r.bottom + 6}px`;
    box.style.width = `${r.width}px`;
  }

  function renderSuggestions(query){
    const box = $('gptPlLugarSuggest');
    if (!box) return;

    const q = (query || '').trim().toUpperCase();
    const src = Array.isArray(__CALLES_LIST__) ? __CALLES_LIST__ : [];

    // No desplegar nada hasta tener al menos 3 letras
    if (q.length < 3){
      box.classList.add('hidden');
      box.innerHTML = '';
      return;
    }

    // contains, con cap por rendimiento
    const out = [];
    for (let i = 0; i < src.length && out.length < 25; i++){
      const v = String(src[i] || '');
      if (v.toUpperCase().includes(q)) out.push(v);
    }
    const items = out;

    if (!items.length){
      box.classList.add('hidden');
      box.innerHTML = '';
      return;
    }

    box.innerHTML = items.map(v => `<div class="gpt-suggest-item" data-v="${v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')}">${v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`).join('');
    box.classList.remove('hidden');
    placeSuggestBox();
  }

  function hideSuggestions(){
    const box = $('gptPlLugarSuggest');
    if (!box) return;
    box.classList.add('hidden');
  }

  function openModal(){
    ensureStyles();
    ensureModal();
    hydrateCallesDatalist();

    // Preparar sugerencias (si hay cache)
    setTimeout(()=>{ placeSuggestBox(); }, 0);

    const modal = $(MODAL_ID);
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    setTimeout(()=>{ $('gptPlLugar')?.focus(); }, 0);
  }

  function closeModal(){
    const modal = $(MODAL_ID);
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
  }

  function wireModalEvents(){
    const modal = $(MODAL_ID);
    if (!modal) return;

    if (modal.__wired) return;
    modal.__wired = true;

    $('gptPlantillaClose')?.addEventListener('click', closeModal);
    $('gptPlantillaSalir')?.addEventListener('click', closeModal);

    modal.addEventListener('click', (e)=>{ if (e.target === modal) closeModal(); });

    window.addEventListener('keydown', (e)=>{
      const m = $(MODAL_ID);
      if (!m || !m.classList.contains('open')) return;
      if (e.key === 'Escape') closeModal();
    });

    // Sugerencias custom para Lugar (para no depender del mínimo de letras del datalist)
    const lugarInput = $('gptPlLugar');
    const suggestBox = $('gptPlLugarSuggest');

    if (lugarInput){
      const onShow = () => renderSuggestions(lugarInput.value);
      lugarInput.addEventListener('input', onShow);

      window.addEventListener('resize', ()=>{ if (suggestBox && !suggestBox.classList.contains('hidden')) placeSuggestBox(); });
      window.addEventListener('scroll',  ()=>{ if (suggestBox && !suggestBox.classList.contains('hidden')) placeSuggestBox(); }, true);

      // Cerrar al perder foco (con pequeño delay para permitir click en item)
      lugarInput.addEventListener('blur', ()=>{ setTimeout(hideSuggestions, 120); });
    }

    if (suggestBox){
      suggestBox.addEventListener('mousedown', (e)=>{
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        const v = t.getAttribute('data-v');
        if (!v) return;
        const inp = $('gptPlLugar');
        if (inp) inp.value = v;
        hideSuggestions();
      });
    }

    $('gptPlantillaCopiar')?.addEventListener('click', async ()=>{
      const txt = buildTemplateText();
      const out = $('gptPlSalida');
      if (out) out.value = txt;

      const ok = await copyToClipboard(txt);
      if (!ok){
        alert('No se pudo copiar al portapapeles. Copia manualmente el recuadro inferior.');
        return;
      }

      try{
        const b = $('gptPlantillaCopiar');
        b.textContent = 'Copiado';
        setTimeout(()=>{ b.textContent='Copiar'; }, 900);
      }catch(_){/* no-op */}
    });
  }

  function init(){
    window.openPlantillaGPT = function(){
      openModal();
      wireModalEvents();
    };

    const btn = $(OPEN_BUTTON_ID);
    if (btn){
      btn.addEventListener('click', ()=>{
        openModal();
        wireModalEvents();
      });
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
