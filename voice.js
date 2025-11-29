// voice.js — modo voz para FILIATRON

(function(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    console.warn("Reconocimiento de voz no soportado (usa Chrome/Edge).");
    return;
  }

  const rec = new SR();
  rec.continuous = false;
  rec.interimResults = false;

  let currentInput = null;
  let currentBtn   = null;
  let initialized  = false;   // solo creamos los botones una vez
  let micVisible   = false;     // modo voz activado/desactivado

  const FIELD_IDS = [
    "Nombre",
    "Apellidos",
    "Tipo",
    "Numero",
    "Nacionalidad",
    "Padres",
    "Nacimiento",
    "Lugar",
    "Domicilio",
    "Telefono"
    // OJO: no meto Sexo ni Condicion porque son <select>
  ];

  function normalizarFechaNacimiento(texto){
    if(!texto) return "";
    let t = String(texto).toLowerCase();

    // quitar tildes
    t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const meses = {
      "enero":1,"febrero":2,"marzo":3,"abril":4,"mayo":5,"junio":6,
      "julio":7,"agosto":8,"septiembre":9,"setiembre":9,"octubre":10,
      "noviembre":11,"diciembre":12
    };

    // patrón tipo "14 de diciembre de 1999"
    let m = t.match(/(\d{1,2})\s+(?:de|del)\s+([a-zñ]+)\s+(?:de|del)\s+(\d{4})/);
    if(m && meses[m[2]]){
      let d = m[1].padStart(2,"0");
      let mo = String(meses[m[2]]).padStart(2,"0");
      let y = m[3];
      return `${d}/${mo}/${y}`;
    }

    // patrón tipo "14 del 12 del 1999" o similar (numérico)
    const nums = t.match(/\d{1,4}/g);
    if(nums && nums.length >= 3){
      let d = nums[0].padStart(2,"0");
      let mo = nums[1].padStart(2,"0");
      let y = nums[2];
      if(y.length === 2){
        y = (parseInt(y,10) < 50 ? "20" : "19") + y;
      }
      if(y.length === 4){
        return `${d}/${mo}/${y}`;
      }
    }

    // si no se reconoce, devolver el texto original
    return texto.trim();
  }

  function setListening(on){
    if (!currentBtn) return;
    currentBtn.classList.toggle("listening", !!on);
  }

  function createMicButtonsOnce(){
    if (initialized) return;
    initialized = true;
    micVisible = true;

    // pequeño estilo básico, por si no quieres tocar el CSS principal
    const style = document.createElement("style");
    style.textContent = `
      .mic-field-btn{
        display:inline-block;
        margin-bottom:4px;
        border:none;
        border-radius:999px;
        padding:3px 8px;
        font-size:11px;
        cursor:pointer;
        background:transparent;
        box-shadow:0 0 12px rgba(9,121,241,.85);
        color:#e6eefc;
      }
      .mic-field-btn.listening{
        box-shadow:0 0 18px rgba(255,86,86,1);
      }
    `;
    document.head.appendChild(style);

    FIELD_IDS.forEach(id => {
      const input = document.getElementById(id);
      if (!input) return;

      // evitar duplicados
      if (input.dataset.hasMic === "1") return;
      input.dataset.hasMic = "1";

      const parent = input.parentElement;
      if (!parent) return;

      const micBtn = document.createElement("button");
      micBtn.type = "button";
      micBtn.className = "mic-field-btn";
      micBtn.textContent = "Voz 🎤";
      micBtn.dataset.target = id;

      // lo colocamos encima del input, debajo del label
      parent.insertBefore(micBtn, input);

      micBtn.addEventListener("click", () => {
        currentInput = input;
        currentBtn   = micBtn;
        rec.lang = "es-ES"; // si quieres, aquí podrías parametrizar idioma
        try {
          rec.start();
          setListening(true);
        } catch (e) {
          console.error(e);
        }
      });
    });
    // al crear, todos los botones quedan visibles por defecto
  }

  rec.onresult = (ev) => {
    const texto = ev.results[0][0].transcript.trim();
    if (currentInput) {
      let value = texto;

      // Teléfono: solo dígitos, todos juntos
      if(currentInput.id === "Telefono"){
        const digits = texto.replace(/\D+/g, "");
        if(digits) value = digits;
      }

      // Número de documento: dígitos y letras, juntos, en mayúsculas
      if(currentInput.id === "Numero"){
        const alnum = texto.replace(/[^0-9a-zA-Z]+/g, "");
        if(alnum) value = alnum.toUpperCase();
      }

      // Fecha de nacimiento: normalizar a dd/mm/yyyy
      if(currentInput.id === "Nacimiento"){
        value = normalizarFechaNacimiento(texto);
      }

      currentInput.value = value;
      try {
        currentInput.dispatchEvent(new Event("input", {bubbles:true}));
        currentInput.dispatchEvent(new Event("change", {bubbles:true}));
      } catch(_) {}
    }
  };

  rec.onerror = (e) => {
    console.error("Error reconocimiento voz:", e.error);
    setListening(false);
  };

  rec.onend = () => {
    setListening(false);
  };

  // Activador: botón "Voz 🎤" junto a Integrar DNI
  window.addEventListener("DOMContentLoaded", () => {
    const voiceBtn = document.getElementById("voiceMode");
    if (!voiceBtn) return;

    voiceBtn.addEventListener("click", () => {
      if (!initialized) {
        // primera vez: crear y mostrar botones de voz
        createMicButtonsOnce();
        micVisible = true;
        voiceBtn.textContent = "Voz 🎤 (activo)";
      } else {
        // alternar visibilidad de todos los botones de voz
        micVisible = !micVisible;
        document.querySelectorAll(".mic-field-btn").forEach(btn => {
          btn.style.display = micVisible ? "inline-block" : "none";
        });
        voiceBtn.textContent = micVisible ? "Voz 🎤 (activo)" : "Voz 🎤";
      }
    });
  });
})();