import {
  PROCEDENCIAS,
  analizarCalendario,
  aplicarOverrides,
  contarProcedencias,
  crearParametros,
  extraerValores,
  fraccionAPorcentaje,
  listarParametros,
  obtenerParametro,
  porcentajeAFraccion,
} from "./parametros.js";
import {
  calcularGeneracion,
  crearEstadoInicial,
  derivadas,
  describirEstado,
  puntosDiscontinuidad,
  sigmoide,
  validarMuestra,
} from "./modelo.js";
import { simularArbol, validarSpecArbol } from "./arbol.js";
import {
  aCsvDiccionarioParametros,
  aCsvIndicadores,
  aCsvParametrosEfectivos,
  aCsvTrayectoria,
  crearReporte,
} from "./reporte.js";
import { ARBOL_EJEMPLO, CONFIGURACION_EJEMPLO } from "./escenarios_ejemplo.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const SVG_NS = "http://www.w3.org/2000/svg";
const clonarJson = (valor) => JSON.parse(JSON.stringify(valor));

const formato = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const formato2 = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoFlexible = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 4 });
const fmtKg = (valor) => `${formato.format(valor)} kg`;
const fmtPct = (valor) => `${formato2.format(valor)} %`;
const fmtSignedKg = (valor) => `${valor >= 0 ? "+" : "−"}${formato.format(Math.abs(valor))} kg`;

const NOMBRES_DECISION = Object.freeze({
  campana_participacion: "Campaña de participación",
  capacidad_pet: "Capacidad PET",
  operacion_organica: "Separación y aplicación orgánica",
});

const state = {
  parametrosBase: crearParametros(),
  arbol: clonarJson(ARBOL_EJEMPLO),
  modo: "ejemplo",
  corridaIlustrativa: true,
  paso: 0,
  maxPaso: 0,
  resultadoArbol: null,
  reporte: null,
  parametrosCorrida: null,
  indiceHoja: 0,
  indiceBase: 0,
  revision: { errores: [], advertencias: [], params: null },
};

state.arbol.puntos.forEach((punto) => {
  punto.nombreVisible = punto.nombreVisible ?? NOMBRES_DECISION[punto.nombre] ?? humanizar(punto.nombre);
});

function el(nombre, clase = "", texto = null) {
  const nodo = document.createElement(nombre);
  if (clase) nodo.className = clase;
  if (texto !== null) nodo.textContent = texto;
  return nodo;
}

function humanizar(texto) {
  return String(texto ?? "")
    .replaceAll("_", " ")
    .replace(/\b\p{L}/gu, (letra) => letra.toUpperCase());
}

function slug(texto, respaldo = "opcion") {
  const limpio = String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return limpio || respaldo;
}

function fechaDesdeDia(dia) {
  const valor = $("#reference-date").value;
  if (!valor) return `día ${dia}`;
  const fecha = new Date(`${valor}T12:00:00`);
  fecha.setDate(fecha.getDate() + Number(dia));
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(fecha);
}

function valorVisible(parametro, valor = parametro.valor) {
  const formatoEntrada = parametro.onboarding.formato;
  if (formatoEntrada === "porcentaje") return Number(fraccionAPorcentaje(Number(valor)).toFixed(10));
  if (formatoEntrada === "gramos") return Number((Number(valor) * 1000).toFixed(10));
  return Number(valor);
}

function valorInterno(parametro, valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) throw new Error(`${parametro.onboarding.nombre}: escribe un número válido.`);
  if (parametro.onboarding.formato === "porcentaje") {
    return porcentajeAFraccion(numero, { max: Number.MAX_SAFE_INTEGER });
  }
  if (parametro.onboarding.formato === "gramos") return numero / 1000;
  return numero;
}

function unidadVisible(parametro) {
  return parametro.onboarding.unidadEntrada;
}

function pasoInput(parametro) {
  const formatoEntrada = parametro.onboarding.formato;
  if (formatoEntrada === "entero") return 1;
  if (formatoEntrada === "porcentaje") return 1;
  if (formatoEntrada === "gramos") return 1;
  const valor = Math.abs(Number(parametro.valor));
  if (valor >= 1000) return 100;
  if (valor >= 100) return 10;
  if (valor >= 10) return 1;
  if (valor >= 1) return 0.1;
  return 0.01;
}

function inputParaRuta(ruta) {
  return $$('[data-param-path]').find((input) => input.dataset.paramPath === ruta) ?? null;
}

function controlParaRuta(selector, ruta) {
  return $$(selector).find((control) => control.dataset.forPath === ruta) ?? null;
}

function casiIgual(a, b) {
  return Math.abs(Number(a) - Number(b)) <= 1e-12 * Math.max(1, Math.abs(Number(a)), Math.abs(Number(b)));
}

function describirRango(rango) {
  if (rango?.regla) return rango.regla;
  if (Number.isFinite(rango?.min) && Number.isFinite(rango?.max)) return `${rango.min}–${rango.max} ${rango.unidad ?? ""}`.trim();
  return "Requiere revisión documentada";
}

function crearBadge(procedencia) {
  return el("span", `provenance ${procedencia.toLowerCase()}`, procedencia);
}

function crearAyuda(parametro) {
  const ayuda = parametro.onboarding;
  const details = el("details", "help-details");
  const summary = el("summary", "", "¿Cómo se obtiene y qué pasa si me equivoco?");
  const dl = el("dl");
  const pares = [
    ["Cómo obtenerlo", ayuda.comoObtener],
    ["Rango de revisión", describirRango(ayuda.rangoRazonable)],
    ["Ejemplo", ayuda.ejemplo],
    [`Consecuencia · ${ayuda.criticidad}`, ayuda.consecuencia],
    ["Origen del ejemplo", ayuda.origenDefault],
  ];
  pares.forEach(([termino, definicion]) => {
    const fila = el("div");
    fila.append(el("dt", "", termino), el("dd", "", definicion));
    dl.append(fila);
  });
  details.append(summary, dl);
  return details;
}

function crearTrazabilidad(ruta, parametro, soloLectura = false) {
  const contenedor = el("div", "trace-controls");
  const selector = el("select");
  selector.dataset.forPath = ruta;
  selector.dataset.provenanceControl = "true";
  selector.setAttribute("aria-label", `Procedencia de ${parametro.onboarding.nombre}`);
  PROCEDENCIAS.forEach((procedencia) => {
    const option = el("option", "", procedencia);
    option.value = procedencia;
    selector.append(option);
  });
  selector.value = parametro.procedencia;
  const fuente = el("input");
  fuente.type = "text";
  fuente.value = parametro.fuente;
  fuente.dataset.forPath = ruta;
  fuente.dataset.sourceControl = "true";
  fuente.dataset.original = parametro.fuente;
  fuente.placeholder = "Fuente concreta y fecha";
  fuente.setAttribute("aria-label", `Fuente de ${parametro.onboarding.nombre}`);
  if (soloLectura) {
    selector.disabled = true;
    fuente.readOnly = true;
  }
  selector.addEventListener("change", () => {
    const field = selector.closest(".parameter-field");
    const badge = field?.querySelector(".provenance");
    if (badge) {
      badge.className = `provenance ${selector.value.toLowerCase()}`;
      badge.textContent = selector.value;
    }
    actualizarPreviews();
  });
  fuente.addEventListener("input", () => {
    fuente.removeAttribute("aria-invalid");
    actualizarPreviews();
  });
  contenedor.append(selector, fuente);
  return contenedor;
}

function crearCampoParametro(ruta, opciones = {}) {
  const parametro = obtenerParametro(state.parametrosBase, ruta);
  const ayuda = parametro.onboarding;
  const soloLectura = opciones.soloLectura ?? ayuda.exposicion === "U-R";
  const campo = el("article", "parameter-field");
  campo.dataset.path = ruta;
  campo.dataset.changed = "false";

  const heading = el("div", "parameter-heading");
  const label = el("label", "", ayuda.nombre);
  const id = `param-${ruta.replaceAll(".", "-")}`;
  label.htmlFor = id;
  const badge = crearBadge(parametro.procedencia);
  heading.append(label, badge);

  const ayudaCorta = el("p", "short-help", ayuda.explicacion);
  const caja = el("span", "input-with-unit");
  const input = el("input");
  input.id = id;
  input.type = "number";
  input.step = String(pasoInput(parametro));
  input.value = String(valorVisible(parametro));
  input.dataset.paramPath = ruta;
  input.dataset.original = JSON.stringify(parametro.valor);
  input.dataset.format = ayuda.formato;
  input.readOnly = soloLectura;
  if (parametro.min !== undefined) input.min = String(valorVisible(parametro, parametro.min));
  if (parametro.max !== undefined) input.max = String(valorVisible(parametro, parametro.max));
  if (ayuda.formato === "entero") input.inputMode = "numeric";
  const unidad = el("span", "", unidadVisible(parametro));
  caja.append(input, unidad);

  const trazabilidad = crearTrazabilidad(ruta, parametro, soloLectura);
  campo.append(heading, ayudaCorta, caja, trazabilidad, crearAyuda(parametro));

  input.addEventListener("input", () => {
    actualizarEstadoCampo(campo, parametro);
    if (["composicion.organica", "composicion.pet"].includes(ruta)) actualizarResto();
    actualizarPreviews();
  });
  input.addEventListener("blur", () => validarCampo(campo, parametro));
  return campo;
}

function actualizarEstadoCampo(campo, parametro, forzar = null) {
  const input = campo.querySelector("[data-param-path]");
  const fuente = campo.querySelector("[data-source-control]");
  const selector = campo.querySelector("[data-provenance-control]");
  let cambiado = Boolean(forzar);
  try {
    cambiado = forzar ?? !casiIgual(valorInterno(parametro, input.value), JSON.parse(input.dataset.original));
  } catch {
    cambiado = true;
  }
  const antes = campo.dataset.changed === "true";
  campo.dataset.changed = String(cambiado);
  if (cambiado && !antes && !input.readOnly) {
    if (fuente.value === fuente.dataset.original) fuente.value = "";
    fuente.required = true;
  }
  if (!cambiado && !input.readOnly) {
    fuente.value = fuente.dataset.original;
    fuente.required = false;
    selector.value = parametro.procedencia;
    const badge = campo.querySelector(".provenance");
    badge.className = `provenance ${parametro.procedencia.toLowerCase()}`;
    badge.textContent = parametro.procedencia;
  }
}

function validarCampo(campo, parametro) {
  campo.querySelectorAll(".field-message").forEach((nodo) => nodo.remove());
  const input = campo.querySelector("[data-param-path]");
  try {
    const interno = valorInterno(parametro, input.value);
    if (parametro.min !== undefined && interno < parametro.min) throw new Error(`El límite del cálculo es ${valorVisible(parametro, parametro.min)} ${unidadVisible(parametro)}.`);
    if (parametro.max !== undefined && interno > parametro.max) throw new Error(`El límite del cálculo es ${valorVisible(parametro, parametro.max)} ${unidadVisible(parametro)}.`);
    if ((parametro.entero || parametro.onboarding.formato === "entero") && !Number.isInteger(Number(input.value))) throw new Error("Escribe un número entero, sin decimales.");
    input.removeAttribute("aria-invalid");
    const rango = parametro.onboarding.rangoRazonable;
    const visible = Number(input.value);
    if (Number.isFinite(rango?.min) && (visible < rango.min || visible > rango.max)) {
      const mensaje = el("p", "field-message soft-warning", `Fuera del rango de revisión ${describirRango(rango)}; confirma unidad y fuente.`);
      campo.append(mensaje);
    }
    return null;
  } catch (error) {
    input.setAttribute("aria-invalid", "true");
    campo.append(el("p", "field-message", error.message));
    return error.message;
  }
}

function crearEditorCalendario(ruta, segmento) {
  const parametro = obtenerParametro(state.parametrosBase, ruta);
  const wrapper = el("section", "calendar-editor");
  wrapper.dataset.calendarPath = ruta;
  wrapper.dataset.original = JSON.stringify(parametro.valor);
  wrapper.dataset.changed = "false";

  const heading = el("div", "calendar-heading");
  const copy = el("div");
  copy.append(el("h3", "", parametro.onboarding.nombre), el("p", "", parametro.onboarding.explicacion));
  const agregar = el("button", "mini-button", "+ Agregar periodo");
  agregar.type = "button";
  heading.append(copy, agregar);
  const rows = el("div", "calendar-rows");
  const feedback = el("div", "calendar-feedback");

  const trace = crearTrazabilidad(ruta, parametro);
  trace.classList.add("calendar-trace");
  wrapper.append(heading, rows, feedback, trace, crearAyuda(parametro));

  const agregarFila = (tramo) => {
    const row = el("div", "calendar-row");
    const datos = [
      ["Desde el día", "desde", tramo.desde],
      ["Hasta el día", "hasta", tramo.hasta],
      ["Actividad", "multiplicador", fraccionAPorcentaje(tramo.multiplicador)],
    ];
    datos.forEach(([texto, clave, valor]) => {
      const label = el("label", "", texto);
      const input = el("input");
      input.type = "number";
      input.step = clave === "multiplicador" ? "1" : "1";
      input.min = "0";
      input.value = String(valor);
      input.dataset.calendarKey = clave;
      input.setAttribute("aria-label", `${texto} de ${segmento.etiqueta}`);
      if (clave === "multiplicador") {
        input.setAttribute("aria-description", "Porcentaje de actividad; 100 significa actividad habitual");
      }
      input.addEventListener("input", () => {
        actualizarEstadoCalendario(wrapper, parametro);
        actualizarFeedbackCalendario(wrapper);
        actualizarPreviews();
      });
      label.append(input);
      if (clave !== "multiplicador") label.append(el("span", "calendar-date", fechaDesdeDia(valor)));
      row.append(label);
    });
    const eliminar = el("button", "icon-button", "×");
    eliminar.type = "button";
    eliminar.title = "Eliminar periodo";
    eliminar.addEventListener("click", () => {
      row.remove();
      actualizarEstadoCalendario(wrapper, parametro);
      actualizarFeedbackCalendario(wrapper);
      actualizarPreviews();
    });
    row.append(eliminar);
    rows.append(row);
  };

  parametro.valor.forEach(agregarFila);
  agregar.addEventListener("click", () => {
    const calendario = recogerCalendario(wrapper, false);
    const ultimo = calendario.at(-1)?.hasta ?? 0;
    agregarFila({ desde: ultimo, hasta: Math.max(ultimo + 1, Number($("#t-fin").value)), multiplicador: 1 });
    actualizarEstadoCalendario(wrapper, parametro);
    actualizarFeedbackCalendario(wrapper);
  });
  return wrapper;
}

function recogerCalendario(wrapper, estricto = true) {
  return [...wrapper.querySelectorAll(".calendar-row")].map((row, indice) => {
    const desde = Number(row.querySelector('[data-calendar-key="desde"]').value);
    const hasta = Number(row.querySelector('[data-calendar-key="hasta"]').value);
    const porcentaje = Number(row.querySelector('[data-calendar-key="multiplicador"]').value);
    if (estricto && ![desde, hasta, porcentaje].every(Number.isFinite)) throw new Error(`Periodo ${indice + 1}: completa día inicial, final y actividad.`);
    return {
      desde,
      hasta,
      multiplicador: Number.isFinite(porcentaje) ? porcentajeAFraccion(porcentaje, { max: Number.MAX_SAFE_INTEGER }) : Number.NaN,
    };
  });
}

function actualizarEstadoCalendario(wrapper, parametro) {
  let cambiado = true;
  try { cambiado = JSON.stringify(recogerCalendario(wrapper)) !== wrapper.dataset.original; } catch { /* se valida después */ }
  const antes = wrapper.dataset.changed === "true";
  wrapper.dataset.changed = String(cambiado);
  const fuente = wrapper.querySelector("[data-source-control]");
  const procedencia = wrapper.querySelector("[data-provenance-control]");
  if (cambiado && !antes && fuente.value === fuente.dataset.original) {
    fuente.value = "";
    fuente.required = true;
  }
  if (!cambiado) {
    fuente.value = fuente.dataset.original;
    fuente.required = false;
    procedencia.value = parametro.procedencia;
  }
}

function actualizarFeedbackCalendario(wrapper) {
  const feedback = wrapper.querySelector(".calendar-feedback");
  feedback.replaceChildren();
  try {
    const resultado = analizarCalendario(recogerCalendario(wrapper), Number($("#t-fin").value));
    [...resultado.errores.map((texto) => ["error", texto]), ...resultado.advertencias.map((texto) => ["warning", texto]), ...resultado.informacion.map((texto) => ["info", texto])]
      .forEach(([clase, texto]) => feedback.append(el("p", clase, texto)));
    wrapper.querySelectorAll('[data-calendar-key="desde"], [data-calendar-key="hasta"]').forEach((input) => {
      const fecha = input.parentElement.querySelector(".calendar-date");
      if (fecha) fecha.textContent = fechaDesdeDia(input.value);
    });
  } catch (error) {
    feedback.append(el("p", "error", error.message));
  }
}

function renderPersonas() {
  const contenedor = $("#people-editor");
  contenedor.replaceChildren();
  state.parametrosBase.catalogo.generacion.segmentos.forEach((segmento, indice) => {
    const card = el("details", "segment-card");
    card.open = indice === 0;
    const summary = el("summary");
    const titulo = el("div", "segment-title");
    titulo.append(el("span", "segment-icon", segmento.etiqueta.slice(0, 2).toUpperCase()));
    const copy = el("div");
    copy.append(el("strong", "", segmento.etiqueta), el("small", "", indice === 3 ? "Afluencia diaria equivalente" : "Población potencial y presencia"));
    titulo.append(copy);
    const live = el("div", "segment-live");
    live.dataset.segmentLive = String(indice);
    summary.append(titulo, live);
    const body = el("div", "segment-body");
    const fields = el("div", "segment-fields");
    ["poblacion", "asistencia", "desechosPerCapitaDia"].forEach((campo) => fields.append(crearCampoParametro(`generacion.segmentos.${indice}.${campo}`)));
    body.append(fields, crearEditorCalendario(`generacion.segmentos.${indice}.calendario`, segmento));
    card.append(summary, body);
    contenedor.append(card);
  });
}

function renderEditores() {
  renderPersonas();
  ["composicion.organica", "composicion.pet", "composicion.resto"].forEach((ruta) => $("#composition-editor").append(crearCampoParametro(ruta)));
  ["generacion.factorConversion", "generacion.masaUnitariaKg"].forEach((ruta) => $("#conversion-advanced-editor").append(crearCampoParametro(ruta)));
  ["pet.cobertura", "pet.rechazoCaptura", "pet.capacidadTrituradoraKgDia", "pet.rechazoProceso", "pet.capacidadAlmacenKg"].forEach((ruta) => $("#pet-editor").append(crearCampoParametro(ruta)));
  ["pet.tauCapturaDias", "pet.tauProcesoDias"].forEach((ruta) => $("#pet-advanced-editor").append(crearCampoParametro(ruta)));
  ["organico.cobertura", "organico.rechazoCaptura", "organico.tauFermentacionDias", "organico.tauAplicacionDias"].forEach((ruta) => $("#organic-editor").append(crearCampoParametro(ruta)));
  ["organico.tauCapturaDias", "organico.nEtapasFermentacion"].forEach((ruta) => $("#organic-advanced-editor").append(crearCampoParametro(ruta)));
  ["retroalimentacion.participacionInicial", "retroalimentacion.participacionBase"].forEach((ruta) => $("#participation-editor").append(crearCampoParametro(ruta)));
  ["retroalimentacion.tauParticipacionDias", "retroalimentacion.betaRefuerzo", "retroalimentacion.betaSaturacion", "retroalimentacion.tauVisibilidadDias", "retroalimentacion.flujoAplicacionReferenciaKgDia"].forEach((ruta) => $("#feedback-advanced-editor").append(crearCampoParametro(ruta)));
}

function actualizarResto() {
  const org = inputParaRuta("composicion.organica");
  const pet = inputParaRuta("composicion.pet");
  const resto = inputParaRuta("composicion.resto");
  if (!org || !pet || !resto) return;
  const valor = 100 - Number(org.value) - Number(pet.value);
  resto.value = Number.isFinite(valor) ? String(Number(valor.toFixed(10))) : "";
  const campo = resto.closest(".parameter-field");
  const parametro = obtenerParametro(state.parametrosBase, "composicion.resto");
  const cambiado = !casiIgual(valor / 100, parametro.valor);
  campo.dataset.changed = String(cambiado);
  const fuente = campo.querySelector("[data-source-control]");
  const procedencia = campo.querySelector("[data-provenance-control]");
  const badge = campo.querySelector(".provenance");
  if (cambiado) {
    procedencia.value = "ESTIMADO";
    fuente.value = "Calculado como 100 % menos orgánico y PET";
    badge.className = "provenance estimado";
    badge.textContent = "ESTIMADO";
  } else {
    procedencia.value = parametro.procedencia;
    fuente.value = parametro.fuente;
    badge.className = `provenance ${parametro.procedencia.toLowerCase()}`;
    badge.textContent = parametro.procedencia;
  }
}

function overridesDeInterfaz({ estricto = true } = {}) {
  const overrides = {};
  $$('[data-param-path]').forEach((input) => {
    const ruta = input.dataset.paramPath;
    const parametro = obtenerParametro(state.parametrosBase, ruta);
    const interno = valorInterno(parametro, input.value);
    const original = JSON.parse(input.dataset.original);
    if (casiIgual(interno, original)) return;
    const procedencia = controlParaRuta("[data-provenance-control]", ruta)?.value;
    const fuenteControl = controlParaRuta("[data-source-control]", ruta);
    const fuente = fuenteControl?.value.trim();
    if (estricto && !fuente) {
      fuenteControl?.setAttribute("aria-invalid", "true");
      throw new Error(`Indica de dónde salió “${parametro.onboarding.nombre}”.`);
    }
    overrides[ruta] = { valor: interno, procedencia, fuente: fuente || "Fuente pendiente de documentar" };
  });
  $$('[data-calendar-path]').forEach((wrapper) => {
    const ruta = wrapper.dataset.calendarPath;
    const valor = recogerCalendario(wrapper);
    if (JSON.stringify(valor) === wrapper.dataset.original) return;
    const parametro = obtenerParametro(state.parametrosBase, ruta);
    const procedencia = wrapper.querySelector("[data-provenance-control]").value;
    const fuenteControl = wrapper.querySelector("[data-source-control]");
    const fuente = fuenteControl.value.trim();
    if (estricto && !fuente) {
      fuenteControl.setAttribute("aria-invalid", "true");
      throw new Error(`Indica de dónde salió “${parametro.onboarding.nombre}”.`);
    }
    overrides[ruta] = { valor, procedencia, fuente: fuente || "Fuente pendiente de documentar" };
  });
  return overrides;
}

function parametrosActuales(estricto = false) {
  const overrides = overridesDeInterfaz({ estricto });
  if (Object.keys(overrides).length === 0) return state.parametrosBase;
  return aplicarOverrides(state.parametrosBase, overrides, {
    tDia: 0,
    ruta: "base/configuracion",
    permitirEstructurales: true,
  });
}

function actualizarPeriodo() {
  const dias = Number($("#t-fin").value);
  const inicio = fechaDesdeDia(0);
  const fin = Number.isFinite(dias) ? fechaDesdeDia(dias) : "—";
  $("#period-preview").replaceChildren();
  const texto = el("span");
  texto.append(el("strong", "", `${formato.format(dias || 0)} días`), document.createTextNode(` · de ${inicio} a ${fin}. Las fechas ayudan a leer; el cálculo conserva días relativos.`));
  $("#period-preview").append(texto);
  $$('[data-calendar-path]').forEach(actualizarFeedbackCalendario);
  actualizarConteoEscenarios();
}

function actualizarPreviews() {
  try {
    const params = parametrosActuales(false);
    const valores = extraerValores(params);
    const conteo = contarProcedencias(params);
    $("#rail-quality").querySelector("strong").textContent = `${conteo.MEDIDO} medidos · ${conteo.ESTIMADO} estimados · ${conteo.SUPUESTO} supuestos`;

    valores.generacion.segmentos.forEach((segmento, indice) => {
      const presentes = segmento.poblacion * segmento.asistencia;
      const unidades = presentes * segmento.desechosPerCapitaDia;
      const live = document.querySelector(`[data-segment-live="${indice}"]`);
      if (live) {
        live.replaceChildren(el("strong", "", `≈ ${formato.format(presentes)} presentes`), el("small", "", `${formato.format(unidades)} unidades/día activo`));
      }
    });

    const gramos = valores.generacion.masaUnitariaKg * 1000;
    const conversion = fraccionAPorcentaje(valores.generacion.factorConversion);
    $("#conversion-summary").replaceChildren(
      el("strong", "", `1 unidad pesa ${formatoFlexible.format(gramos)} g`),
      el("span", "", `Se considera que ${formatoFlexible.format(conversion)} % termina como residuo. Ambos valores siguen en Avanzado.`),
    );

    const generacion = calcularGeneracion(valores, 0);
    const orgPct = fraccionAPorcentaje(valores.composicion.organica);
    const petPct = fraccionAPorcentaje(valores.composicion.pet);
    const restPct = fraccionAPorcentaje(valores.composicion.resto);
    const barra = $("#composition-bar");
    barra.replaceChildren();
    [["org", orgPct], ["pet", petPct], ["rest", Math.max(0, restPct)]].forEach(([clase, pct]) => {
      const tramo = el("span", clase);
      tramo.style.width = `${Math.max(0, pct)}%`;
      barra.append(tramo);
    });
    const legend = $("#composition-legend");
    legend.replaceChildren();
    [["Orgánico", orgPct], ["PET", petPct], ["Resto", restPct]].forEach(([nombre, pct]) => {
      const item = el("span");
      item.append(el("strong", "", `${formatoFlexible.format(pct)} %`), document.createTextNode(nombre));
      legend.append(item);
    });
    $("#generation-breakdown").replaceChildren(
      el("strong", "", `${formato2.format(generacion)} kg/día`),
      el("small", "", `${formato2.format(generacion * valores.composicion.organica)} orgánico · ${formato2.format(generacion * valores.composicion.pet)} PET · ${formato2.format(generacion * valores.composicion.resto)} resto`),
    );

    renderHistorias(valores);
    renderParticipacion(valores);
  } catch {
    // La ayuda en vivo no reemplaza la validación explícita de cada paso.
  }
}

function renderHistorias(valores) {
  const participacion = valores.retroalimentacion.participacionInicial;
  const intentoPet = 10 * valores.pet.cobertura * participacion;
  const rechazoPet = intentoPet * valores.pet.rechazoCaptura;
  const aceptadoPet = intentoPet - rechazoPet;
  const nodosPet = [
    ["PET disponible", "10 kg/día"],
    ["Al alcance", `${formato2.format(10 * valores.pet.cobertura)} kg/día`],
    ["Intento con participación", `${formato2.format(intentoPet)} kg/día`],
    ["Rechazado", `${formato2.format(rechazoPet)} kg/día`],
    ["Aceptado", `${formato2.format(aceptadoPet)} kg/día`],
  ];
  renderStory($("#pet-story"), nodosPet);

  const intentoOrg = 10 * valores.organico.cobertura * participacion;
  const aceptadoOrg = intentoOrg * (1 - valores.organico.rechazoCaptura);
  renderStory($("#organic-story"), [
    ["Orgánico disponible", "10 kg-eq/día"],
    ["Al alcance", `${formato2.format(10 * valores.organico.cobertura)} kg-eq/día`],
    ["Separado y aceptado", `${formato2.format(aceptadoOrg)} kg-eq/día`],
    ["Tiempo hasta listo", `${formatoFlexible.format(valores.organico.tauFermentacionDias)} días`],
    ["Aplicación media", `${formatoFlexible.format(valores.organico.tauAplicacionDias)} días`],
  ]);
}

function renderStory(contenedor, nodos) {
  contenedor.replaceChildren();
  nodos.forEach(([nombre, valor], indice) => {
    if (indice > 0) contenedor.append(el("span", "story-arrow", "→"));
    const nodo = el("div", "story-node");
    nodo.append(el("span", "", nombre), el("strong", "", valor));
    contenedor.append(nodo);
  });
}

function renderParticipacion(valores) {
  const inicio = Math.round(fraccionAPorcentaje(valores.retroalimentacion.participacionInicial));
  const base = Math.round(fraccionAPorcentaje(valores.retroalimentacion.participacionBase));
  const dots = $("#participation-dots");
  dots.replaceChildren();
  for (let indice = 0; indice < 100; indice += 1) {
    const dot = el("i");
    if (indice < inicio) dot.classList.add("initial");
    if (indice < base) dot.classList.add("base");
    dots.append(dot);
  }
  $("#participation-caption").replaceChildren(
    el("span", "", `Al comenzar: ${inicio} de cada 100 personas.`),
    el("strong", "", `Nivel habitual de referencia: ${base} %.`),
  );
}

function caminosEscenarioPermitidos() {
  return listarParametros(state.parametrosBase)
    .filter((item) => item.onboarding.exposicion === "U" && item.onboarding.formato !== "calendario" && !item.estructural)
    .map((item) => item.ruta);
}

function normalizarIdentificadores() {
  const nombresPunto = new Set();
  state.arbol.puntos.forEach((punto, indice) => {
    let nombre = punto.nombre && /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(punto.nombre) ? punto.nombre : slug(punto.nombreVisible, `decision_${indice + 1}`);
    const baseNombre = nombre;
    let sufijo = 2;
    while (nombresPunto.has(nombre)) { nombre = `${baseNombre}_${sufijo}`; sufijo += 1; }
    punto.nombre = nombre;
    nombresPunto.add(nombre);
    const etiquetas = new Set();
    punto.alternativas.forEach((alternativa, altIndice) => {
      let etiqueta = alternativa.etiqueta && /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(alternativa.etiqueta)
        ? alternativa.etiqueta
        : slug(alternativa.nombreVisible, altIndice === 0 ? "sin_cambio" : `alternativa_${altIndice + 1}`);
      const baseEtiqueta = etiqueta;
      let altSufijo = 2;
      while (etiquetas.has(etiqueta)) { etiqueta = `${baseEtiqueta}_${altSufijo}`; altSufijo += 1; }
      alternativa.etiqueta = etiqueta;
      etiquetas.add(etiqueta);
    });
  });
}

function sincronizarJsonArbol() {
  normalizarIdentificadores();
  $("#tree-spec").value = JSON.stringify(state.arbol, null, 2);
  actualizarConteoEscenarios();
}

function crearSelectorRuta(valorActual) {
  const select = el("select");
  caminosEscenarioPermitidos().forEach((ruta) => {
    const parametro = obtenerParametro(state.parametrosBase, ruta);
    const option = el("option", "", parametro.onboarding.nombre);
    option.value = ruta;
    select.append(option);
  });
  select.value = valorActual;
  return select;
}

function renderEscenarios() {
  normalizarIdentificadores();
  const contenedor = $("#scenario-list");
  contenedor.replaceChildren();
  state.arbol.puntos.forEach((punto, puntoIndice) => {
    const card = el("article", "decision-card");
    const head = el("div", "decision-head");
    head.append(el("span", "decision-number", String(puntoIndice + 1)));
    const nombre = el("input");
    nombre.type = "text";
    nombre.value = punto.nombreVisible ?? humanizar(punto.nombre);
    nombre.setAttribute("aria-label", `Nombre de la decisión ${puntoIndice + 1}`);
    nombre.addEventListener("change", () => {
      punto.nombreVisible = nombre.value.trim() || `Decisión ${puntoIndice + 1}`;
      punto.nombre = slug(punto.nombreVisible, `decision_${puntoIndice + 1}`);
      sincronizarJsonArbol();
    });
    const dia = el("input", "decision-day");
    dia.type = "number";
    dia.min = "1";
    dia.step = "1";
    dia.value = String(punto.tDia);
    dia.setAttribute("aria-label", `Día de entrada de ${punto.nombreVisible}`);
    dia.addEventListener("input", () => {
      punto.tDia = Number(dia.value);
      sincronizarJsonArbol();
    });
    const eliminar = el("button", "icon-button", "×");
    eliminar.type = "button";
    eliminar.title = "Eliminar decisión";
    eliminar.addEventListener("click", () => {
      state.arbol.puntos.splice(puntoIndice, 1);
      renderEscenarios();
    });
    head.append(nombre, dia, eliminar);

    const body = el("div", "decision-body");
    punto.alternativas.forEach((alternativa, alternativaIndice) => {
      const altCard = el("section", `alternative-card${alternativaIndice === 0 ? " baseline-alternative" : ""}`);
      const altHead = el("div", "alternative-head");
      if (alternativaIndice === 0) {
        altHead.append(el("strong", "", alternativa.nombreVisible ?? "Sin cambio"), el("span", "provenance estimado", "REFERENCIA"));
      } else {
        const altNombre = el("input");
        altNombre.type = "text";
        altNombre.value = alternativa.nombreVisible ?? humanizar(alternativa.etiqueta);
        altNombre.setAttribute("aria-label", `Nombre de la alternativa ${alternativaIndice + 1}`);
        altNombre.addEventListener("change", () => {
          alternativa.nombreVisible = altNombre.value.trim() || `Alternativa ${alternativaIndice + 1}`;
          alternativa.etiqueta = slug(alternativa.nombreVisible, `alternativa_${alternativaIndice + 1}`);
          sincronizarJsonArbol();
        });
        const removeAlt = el("button", "icon-button", "×");
        removeAlt.type = "button";
        removeAlt.title = "Eliminar alternativa";
        removeAlt.addEventListener("click", () => {
          punto.alternativas.splice(alternativaIndice, 1);
          renderEscenarios();
        });
        altHead.append(altNombre, removeAlt);
      }
      altCard.append(altHead);

      if (alternativaIndice > 0) {
        const lista = el("div", "override-list");
        Object.entries(alternativa.overrides).forEach(([ruta, cambio]) => {
          const row = el("div", "override-row");
          const pathSelect = crearSelectorRuta(ruta);
          pathSelect.addEventListener("change", () => {
            const nuevaRuta = pathSelect.value;
            const parametro = obtenerParametro(state.parametrosBase, nuevaRuta);
            delete alternativa.overrides[ruta];
            alternativa.overrides[nuevaRuta] = {
              valor: parametro.valor,
              procedencia: "SUPUESTO",
              fuente: "",
            };
            renderEscenarios();
          });
          const parametro = obtenerParametro(state.parametrosBase, ruta);
          const value = el("input");
          value.type = "number";
          value.step = String(pasoInput(parametro));
          value.value = String(valorVisible(parametro, cambio.valor));
          value.setAttribute("aria-label", `Valor nuevo de ${parametro.onboarding.nombre}`);
          value.addEventListener("input", () => {
            try {
              cambio.valor = valorInterno(parametro, value.value);
              value.removeAttribute("aria-invalid");
            } catch {
              value.setAttribute("aria-invalid", "true");
            }
            sincronizarJsonArbol();
          });
          const prov = el("select");
          PROCEDENCIAS.forEach((item) => {
            const option = el("option", "", item);
            option.value = item;
            prov.append(option);
          });
          prov.value = cambio.procedencia;
          prov.setAttribute("aria-label", `Procedencia del cambio en ${parametro.onboarding.nombre}`);
          prov.addEventListener("change", () => { cambio.procedencia = prov.value; sincronizarJsonArbol(); });
          const fuente = el("input");
          fuente.type = "text";
          fuente.value = cambio.fuente;
          fuente.placeholder = "Fuente del escenario";
          fuente.setAttribute("aria-label", `Fuente del cambio en ${parametro.onboarding.nombre}`);
          fuente.addEventListener("input", () => { cambio.fuente = fuente.value; sincronizarJsonArbol(); });
          const remove = el("button", "icon-button", "×");
          remove.type = "button";
          remove.title = "Eliminar cambio";
          remove.addEventListener("click", () => { delete alternativa.overrides[ruta]; renderEscenarios(); });
          row.append(pathSelect, value, prov, fuente, remove);
          lista.append(row);
        });
        altCard.append(lista);
        const actions = el("div", "alternative-actions");
        const addChange = el("button", "mini-button", "+ Agregar dato que cambia");
        addChange.type = "button";
        addChange.addEventListener("click", () => {
          const disponibles = caminosEscenarioPermitidos().filter((ruta) => !Object.hasOwn(alternativa.overrides, ruta));
          if (disponibles.length === 0) return;
          const ruta = disponibles[0];
          const parametro = obtenerParametro(state.parametrosBase, ruta);
          alternativa.overrides[ruta] = { valor: parametro.valor, procedencia: "SUPUESTO", fuente: "" };
          renderEscenarios();
        });
        actions.append(addChange);
        altCard.append(actions);
      }
      body.append(altCard);
    });
    const addAlternative = el("button", "mini-button", "+ Agregar alternativa");
    addAlternative.type = "button";
    addAlternative.addEventListener("click", () => {
      punto.alternativas.push({
        etiqueta: `alternativa_${punto.alternativas.length + 1}`,
        nombreVisible: `Alternativa ${punto.alternativas.length + 1}`,
        overrides: {},
      });
      renderEscenarios();
    });
    body.append(addAlternative);
    card.append(head, body);
    contenedor.append(card);
  });
  sincronizarJsonArbol();
}

function actualizarConteoEscenarios() {
  const hojas = state.arbol.puntos.reduce((producto, punto) => producto * Math.max(1, punto.alternativas.length), 1);
  const dias = Number($("#t-fin").value) || 0;
  const ultimo = Math.max(0, ...state.arbol.puntos.map((punto) => Number(punto.tDia) || 0));
  $("#t-fin").min = String(ultimo + 1);
  $("#horizon-note").textContent = ultimo > 0
    ? `Con los escenarios actuales, el final debe ser posterior al día ${ultimo}.`
    : "Sin decisiones fechadas, el horizonte puede ser más corto.";
  $("#scenario-count").replaceChildren();
  const strong = el("strong", "", `${hojas} combinaciones`);
  $("#scenario-count").append(strong, document.createTextNode(` · ${state.arbol.puntos.length} decisiones durante ${formato.format(dias)} días`));
  $("#run-estimate").textContent = `${hojas} combinaciones · ${formato.format(dias)} días`;
}

function agregarDecision() {
  const ultimo = Math.max(0, ...state.arbol.puntos.map((punto) => Number(punto.tDia) || 0));
  const tFin = Number($("#t-fin").value);
  const dia = Math.min(Math.max(ultimo + 30, 1), Math.max(1, tFin - 1));
  state.arbol.puntos.push({
    tDia: dia,
    nombre: `decision_${state.arbol.puntos.length + 1}`,
    nombreVisible: `Nueva decisión ${state.arbol.puntos.length + 1}`,
    alternativas: [
      { etiqueta: "sin_cambio", nombreVisible: "Sin cambio", overrides: {} },
      { etiqueta: "alternativa", nombreVisible: "Alternativa", overrides: {} },
    ],
  });
  renderEscenarios();
}

function erroresEscenarios(params) {
  const errores = [];
  normalizarIdentificadores();
  const horizonte = { tInicio: 0, tFin: Number($("#t-fin").value) };
  try { validarSpecArbol(state.arbol, params, horizonte); } catch (error) { errores.push(error.message); }
  state.arbol.puntos.forEach((punto) => {
    if (punto.alternativas.length < 2) errores.push(`“${punto.nombreVisible}” necesita “Sin cambio” y al menos una alternativa.`);
    if (Object.keys(punto.alternativas[0]?.overrides ?? {}).length > 0) errores.push(`La primera alternativa de “${punto.nombreVisible}” debe conservar “Sin cambio”.`);
    punto.alternativas.slice(1).forEach((alternativa) => {
      if (Object.keys(alternativa.overrides).length === 0) errores.push(`“${alternativa.nombreVisible}” no cambia ningún dato.`);
      Object.entries(alternativa.overrides).forEach(([ruta, cambio]) => {
        if (ruta === "organico.nEtapasFermentacion") errores.push("El número de etapas no puede cambiar dentro de un escenario.");
        if (!Number.isFinite(cambio.valor)) errores.push(`El cambio “${humanizar(ruta)}” necesita un valor numérico.`);
        if (!PROCEDENCIAS.includes(cambio.procedencia) || !cambio.fuente?.trim()) errores.push(`Documenta procedencia y fuente de “${humanizar(ruta)}” en ${alternativa.nombreVisible}.`);
      });
    });
  });
  return errores;
}

function advertenciasYErrores(params) {
  const errores = [];
  const advertencias = [];
  $$('[data-param-path]').forEach((input) => {
    const parametro = obtenerParametro(state.parametrosBase, input.dataset.paramPath);
    const mensaje = validarCampo(input.closest(".parameter-field"), parametro);
    if (mensaje) errores.push(mensaje);
    const rango = parametro.onboarding.rangoRazonable;
    const visible = Number(input.value);
    if (Number.isFinite(rango?.min) && Number.isFinite(visible) && (visible < rango.min || visible > rango.max)) {
      advertencias.push(`${parametro.onboarding.nombre}: ${formatoFlexible.format(visible)} ${parametro.onboarding.unidadEntrada} está fuera de ${describirRango(rango)}.`);
    }
  });
  $$('[data-calendar-path]').forEach((wrapper) => {
    try {
      const parametro = obtenerParametro(state.parametrosBase, wrapper.dataset.calendarPath);
      const analisis = analizarCalendario(recogerCalendario(wrapper), Number($("#t-fin").value));
      errores.push(...analisis.errores.map((texto) => `${parametro.onboarding.nombre}: ${texto}`));
      advertencias.push(...analisis.advertencias.map((texto) => `${parametro.onboarding.nombre}: ${texto}`));
    } catch (error) { errores.push(error.message); }
  });
  errores.push(...erroresEscenarios(params));
  return { errores: [...new Set(errores)], advertencias: [...new Set(advertencias)] };
}

function fuentesPendientes() {
  const errores = [];
  $$('.parameter-field[data-changed="true"]').forEach((campo) => {
    const ruta = campo.dataset.path;
    const fuente = campo.querySelector("[data-source-control]");
    if (!fuente?.value.trim()) errores.push(`Falta la fuente de ${obtenerParametro(state.parametrosBase, ruta).onboarding.nombre}.`);
  });
  $$('[data-calendar-path][data-changed="true"]').forEach((wrapper) => {
    const fuente = wrapper.querySelector("[data-source-control]");
    if (!fuente?.value.trim()) errores.push(`Falta la fuente de ${obtenerParametro(state.parametrosBase, wrapper.dataset.calendarPath).onboarding.nombre}.`);
  });
  return errores;
}

function diasCandidatos(valores, horizonte) {
  const dias = new Set([0]);
  valores.generacion.segmentos.forEach((segmento) => segmento.calendario.forEach((tramo) => {
    if (tramo.desde >= 0 && tramo.desde < horizonte) dias.add(tramo.desde);
    if (tramo.hasta >= 0 && tramo.hasta < horizonte) dias.add(tramo.hasta);
  }));
  return [...dias].sort((a, b) => a - b);
}

function renderRevision() {
  const contenedor = $("#review-content");
  contenedor.replaceChildren();
  let params;
  const errores = [...fuentesPendientes()];
  try { params = parametrosActuales(false); } catch (error) { errores.push(error.message); params = state.parametrosBase; }
  const revision = advertenciasYErrores(params);
  errores.push(...revision.errores);
  const advertencias = revision.advertencias;

  const valores = extraerValores(params);
  const conteo = contarProcedencias(params);
  const dias = diasCandidatos(valores, Number($("#t-fin").value));
  const generaciones = dias.map((dia) => ({ dia, valor: calcularGeneracion(valores, dia) }));
  const mayor = generaciones.reduce((a, b) => b.valor > a.valor ? b : a, generaciones[0]);
  const menor = generaciones.reduce((a, b) => b.valor < a.valor ? b : a, generaciones[0]);
  const hojas = state.arbol.puntos.reduce((producto, punto) => producto * punto.alternativas.length, 1);

  const stats = el("div", "review-summary-grid");
  [["Medidos", conteo.MEDIDO], ["Estimados", conteo.ESTIMADO], ["Supuestos", conteo.SUPUESTO], ["Combinaciones", hojas]].forEach(([nombre, valor]) => {
    const stat = el("article", "review-stat");
    stat.append(el("span", "", nombre), el("strong", "", String(valor)));
    stats.append(stat);
  });
  contenedor.append(stats);

  const generation = el("article", "review-card");
  generation.append(el("h2", "", "Generación implícita y composición"));
  const listaGen = el("ul");
  listaGen.append(
    el("li", "", `Periodo de mayor actividad: ${formato2.format(mayor.valor)} kg/día desde el día ${mayor.dia}.`),
    el("li", "", `Periodo de menor actividad: ${formato2.format(menor.valor)} kg/día desde el día ${menor.dia}.`),
    el("li", "", `Composición: ${formatoFlexible.format(fraccionAPorcentaje(valores.composicion.organica))} % orgánico + ${formatoFlexible.format(fraccionAPorcentaje(valores.composicion.pet))} % PET + ${formatoFlexible.format(fraccionAPorcentaje(valores.composicion.resto))} % resto = 100 %.`),
  );
  generation.append(listaGen);
  contenedor.append(generation);

  const scenarios = el("article", "review-card");
  scenarios.append(el("h2", "", "Decisiones y punto de entrada"));
  const listScenarios = el("ul");
  state.arbol.puntos.forEach((punto) => listScenarios.append(el("li", "", `${punto.nombreVisible} · día ${punto.tDia} (${fechaDesdeDia(punto.tDia)}) · ${punto.alternativas.length} alternativas.`)));
  if (state.arbol.puntos.length === 0) listScenarios.append(el("li", "", "Sin decisiones ramificadas: se calculará una sola situación base."));
  scenarios.append(listScenarios);
  contenedor.append(scenarios);

  const initial = el("article", "review-card");
  initial.append(el("h2", "", "Supuestos iniciales y lectura"));
  const initialList = el("ul");
  initialList.append(
    el("li", "", "Todos los stocks materiales empiezan en 0 kg: no se preguntó por PET almacenado, orgánico en fermentación ni composta lista."),
    el("li", "", "El resto va directo a relleno y no tiene un stock o proceso propio."),
    el("li", "", "La composta se expresa en kg-equivalentes de residuo húmedo; no descuenta agua ni emisiones."),
    el("li", "", "Resultado condicionado, no pronóstico: el balance matemático no valida la veracidad de los datos."),
  );
  initial.append(initialList);
  contenedor.append(initial);

  let cambios = [];
  try { cambios = Object.entries(overridesDeInterfaz({ estricto: false })); } catch (error) { errores.push(error.message); }
  state.revision = { errores: [...new Set(errores)], advertencias, params };
  const sources = el("article", "review-card");
  sources.append(el("h2", "", cambios.length ? "Fuentes de las ediciones" : "Fuentes y cambios"));
  if (cambios.length === 0) {
    sources.append(el("p", "field-help", "No cambiaste los datos de ejemplo; se conservarán su procedencia y fuente originales."));
  } else {
    const list = el("div", "source-list");
    cambios.forEach(([ruta, cambio]) => {
      const row = el("div", "source-row");
      const copy = el("span");
      copy.append(el("strong", "", obtenerParametro(state.parametrosBase, ruta).onboarding.nombre), el("code", "", ` · ${ruta}`));
      row.append(copy, el("span", "", `${cambio.procedencia} · ${cambio.fuente}`));
      list.append(row);
    });
    sources.append(list);
  }
  contenedor.append(sources);

  if (advertencias.length > 0) {
    const warning = el("article", "review-card warning");
    warning.append(el("h2", "", "Requiere confirmación"));
    const list = el("ul");
    advertencias.forEach((mensaje) => list.append(el("li", "", mensaje)));
    warning.append(list);
    contenedor.append(warning);
  }
  if (state.revision.errores.length > 0) {
    const errorCard = el("article", "review-card error");
    errorCard.append(el("h2", "", "Corrige antes de calcular"));
    const list = el("ul");
    state.revision.errores.forEach((mensaje) => list.append(el("li", "", mensaje)));
    errorCard.append(list);
    contenedor.prepend(errorCard);
  }
  $("#range-confirmation").hidden = advertencias.length === 0;
  if (advertencias.length === 0) $("#confirm-ranges").checked = false;
}

function limpiarError() {
  $("#error-box").hidden = true;
  $("#error-box").replaceChildren();
}

function mostrarError(error, diagnostico = false) {
  const box = $("#error-box");
  box.hidden = false;
  box.replaceChildren(el("strong", "", diagnostico ? "No se pudo completar la cuenta con la configuración numérica segura." : "Revisa la configuración."));
  box.append(el("span", "", diagnostico ? " Tus datos no se cambiaron. Comparte el diagnóstico con la persona responsable del modelo." : ` ${error?.message ?? String(error)}`));
  if (diagnostico) {
    const details = el("details", "diagnostic-details");
    details.append(el("summary", "", "Diagnóstico avanzado copiable"), el("pre", "", error?.stack ?? String(error)));
    box.append(details);
  }
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

function validarPaso(paso) {
  limpiarError();
  try {
    if (paso >= 1) {
      const tFin = Number($("#t-fin").value);
      if (!Number.isFinite(tFin) || !Number.isInteger(tFin) || tFin <= 0) throw new Error("La duración debe ser un número entero de días mayor que cero.");
    }
    if (paso >= 2) {
      const params = parametrosActuales(true);
      const revision = advertenciasYErrores(params);
      if (revision.errores.length > 0) throw new Error(revision.errores[0]);
    }
    if (paso === 7) {
      const errores = erroresEscenarios(parametrosActuales(true));
      if (errores.length > 0) throw new Error(errores[0]);
    }
    return true;
  } catch (error) {
    mostrarError(error);
    return false;
  }
}

function irAPaso(paso, { forzar = false } = {}) {
  const destino = Number(paso);
  if (destino === 9 && !state.reporte) return;
  if (!forzar && destino > state.paso && !validarPaso(state.paso)) return;
  state.paso = destino;
  state.maxPaso = Math.max(state.maxPaso, destino);
  $$(".wizard-step").forEach((section) => section.classList.toggle("is-active", Number(section.dataset.step) === destino));
  $$("#step-list li").forEach((item, indice) => {
    const button = item.querySelector("button");
    const step = Number(button.dataset.goStep);
    button.toggleAttribute("aria-current", step === destino);
    if (step === destino) button.setAttribute("aria-current", "step");
    item.classList.toggle("is-complete", step < destino);
    button.disabled = step > state.maxPaso || (step === 9 && !state.reporte);
  });
  if (destino === 8) renderRevision();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function simular() {
  limpiarError();
  renderRevision();
  if (state.revision.errores.length > 0) {
    mostrarError(new Error(state.revision.errores[0]));
    return;
  }
  if (state.revision.advertencias.length > 0 && !$("#confirm-ranges").checked) {
    mostrarError(new Error("Confirma los valores fuera del rango de revisión antes de calcular."));
    return;
  }
  if (!$("#confirm-methodology").checked) {
    mostrarError(new Error("Confirma que entiendes el alcance determinista y condicionado de la corrida."));
    return;
  }
  const boton = $("#run-model");
  boton.disabled = true;
  const textoOriginal = boton.querySelector("span").textContent;
  boton.querySelector("span").textContent = "Calculando…";
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  const inicio = performance.now();
  try {
    const parametros = parametrosActuales(true);
    normalizarIdentificadores();
    const spec = clonarJson(state.arbol);
    const config = {
      tInicio: 0,
      tFin: Number($("#t-fin").value),
      dt: CONFIGURACION_EJEMPLO.dt,
      metodo: CONFIGURACION_EJEMPLO.metodo,
    };
    const valores = extraerValores(parametros);
    const layout = describirEstado(valores.organico.nEtapasFermentacion);
    state.resultadoArbol = simularArbol({
      spec,
      estadoInicial: crearEstadoInicial(valores),
      paramsBase: parametros,
      config,
      derivadas,
      indicesNoNegativos: layout.noNegativos,
      validarMuestra: (estado, efectivos) => validarMuestra(estado, efectivos),
      obtenerEventos: puntosDiscontinuidad,
    });
    state.parametrosCorrida = parametros;
    state.reporte = crearReporte(state.resultadoArbol, {
      fechaReferencia: $("#reference-date").value,
      pregunta: $("#research-question").value.trim(),
      corridaIlustrativa: state.corridaIlustrativa,
    });
    state.indiceHoja = 0;
    state.indiceBase = 0;
    prepararResultados();
    const ms = performance.now() - inicio;
    $("#run-summary").textContent = `${state.reporte.hojas.length} combinaciones calculadas en ${ms.toFixed(0)} ms. Selecciona una para revisar su trayectoria condicionada.`;
    irAPaso(9, { forzar: true });
  } catch (error) {
    const numerico = /dt|stock negativo|integraci|balance de masa|no finito/i.test(error?.message ?? "");
    mostrarError(error, numerico);
  } finally {
    boton.disabled = false;
    boton.querySelector("span").textContent = textoOriginal;
  }
}

function nombreHoja(resultadoHoja) {
  const etiquetas = resultadoHoja.hoja.etiquetas.slice(1);
  return etiquetas.map((etiqueta, indice) => {
    const punto = state.resultadoArbol.spec.puntos[indice];
    const alternativa = punto?.alternativas.find((item) => item.etiqueta === etiqueta);
    return alternativa?.nombreVisible ?? humanizar(etiqueta);
  }).join(" · ") || "Situación base";
}

function prepararResultados() {
  const leaf = $("#leaf-select");
  const baseline = $("#baseline-select");
  leaf.replaceChildren();
  baseline.replaceChildren();
  state.reporte.hojas.forEach((hoja, indice) => {
    [leaf, baseline].forEach((select) => {
      const option = el("option", "", nombreHoja(hoja));
      option.value = String(indice);
      select.append(option);
    });
  });
  leaf.value = "0";
  baseline.value = "0";
  $("#illustrative-tag").dataset.hidden = "false";
  $("#illustrative-tag").textContent = state.corridaIlustrativa ? "Corrida ilustrativa" : "Resultado condicionado";
  renderComparacion();
  renderHoja();
}

function renderHoja() {
  if (!state.reporte) return;
  const hoja = state.reporte.hojas[state.indiceHoja];
  const indicadores = hoja.indicadores;
  $("#leaf-select").value = String(state.indiceHoja);
  $("#kpi-generated").textContent = fmtKg(indicadores.generadoKg);
  $("#kpi-landfill").textContent = fmtKg(indicadores.rellenoKg);
  $("#kpi-diversion").textContent = fmtKg(indicadores.desvioKg);
  $("#kpi-diversion-pct").textContent = `${fmtPct(indicadores.desvioPct)} de la generación · incluye pendiente`;
  $("#kpi-filament").textContent = fmtKg(indicadores.filamentoKg);
  $("#kpi-compost").textContent = fmtKg(indicadores.compostaAplicadaKg);
  $("#pending-inventory").textContent = fmtKg(indicadores.inventarioPendienteKg);
  $("#kpi-backlog").textContent = fmtKg(indicadores.backlogMaxKg);
  $("#kpi-backlog-day").textContent = `Máximo en día ${formato.format(indicadores.diaBacklogMax)} · ${fechaDesdeDia(indicadores.diaBacklogMax)}`;
  $("#kpi-saturated").textContent = `${formato2.format(indicadores.diasSaturado)} días`;
  $("#saturation-status").textContent = indicadores.diasSaturado > 0 ? "Sobre el umbral durante parte del periodo" : "Dentro del umbral durante todo el periodo";
  $("#kpi-participation").textContent = fmtPct(100 * indicadores.participacionTerminal);
  $("#terminal-participation-label").textContent = fmtPct(100 * indicadores.participacionTerminal);
  const balanceOk = indicadores.errorBalanceRelativo < 1e-9;
  $("#mass-balance-status").textContent = balanceOk ? "Cuenta cerrada" : "Balance no válido";
  $("#mass-error").textContent = `${indicadores.errorBalanceRelativo.toExponential(2)} · control contable, no exactitud predictiva`;
  $("#mass-balance-status").closest(".balance").dataset.state = balanceOk ? "ok" : "error";

  const cambios = hoja.hoja.parametrosEfectivos.historial.filter((cambio) => cambio.tDia > 0);
  const description = $("#route-description");
  description.replaceChildren();
  if (cambios.length === 0) {
    description.append(el("strong", "", "Sin cambios activos."), document.createTextNode(" Esta combinación conserva los datos base durante todo el periodo."));
  } else {
    description.append(el("strong", "", `${cambios.length} cambios activos: `));
    description.append(document.createTextNode(cambios.map((cambio) => `${obtenerParametro(state.parametrosBase, cambio.ruta).onboarding.nombre} desde día ${cambio.tDia}`).join(" · ")));
  }
  renderSupuestos(hoja);
  renderGraficas(hoja);
  renderComparacion();
}

function renderSupuestos(hoja) {
  const lista = $("#assumption-list");
  lista.replaceChildren();
  const unicos = new Map();
  hoja.supuestosPorIndicador.desvioKg.forEach((item) => unicos.set(`${item.ruta}|${item.fuente}`, item));
  const items = [...unicos.values()];
  $("#assumption-summary").textContent = `Ver ${items.length} parámetros supuestos que pueden afectar el resultado`;
  items.forEach((item) => {
    const li = el("li");
    const parametro = obtenerParametro(state.parametrosBase, item.ruta);
    li.append(el("strong", "", parametro.onboarding.nombre), el("code", "", item.ruta), el("small", "", item.fuente));
    lista.append(li);
  });
}

function renderComparacion() {
  if (!state.reporte) return;
  const cuerpo = $("#comparison-body");
  cuerpo.replaceChildren();
  const base = state.reporte.hojas[state.indiceBase].indicadores;
  state.reporte.hojas.forEach((hoja, indice) => {
    const i = hoja.indicadores;
    const row = el("tr");
    if (indice === state.indiceHoja) row.classList.add("active");
    row.dataset.index = String(indice);
    const valores = [
      [nombreHoja(hoja), indice === state.indiceBase ? "Referencia" : ""],
      [fmtKg(i.desvioKg), fmtSignedKg(i.desvioKg - base.desvioKg)],
      [fmtKg(i.rellenoKg), fmtSignedKg(i.rellenoKg - base.rellenoKg)],
      [fmtKg(i.filamentoKg), fmtSignedKg(i.filamentoKg - base.filamentoKg)],
      [fmtKg(i.compostaAplicadaKg), fmtSignedKg(i.compostaAplicadaKg - base.compostaAplicadaKg)],
      [fmtKg(i.backlogMaxKg), fmtSignedKg(i.backlogMaxKg - base.backlogMaxKg)],
      [fmtKg(i.inventarioPendienteKg), fmtSignedKg(i.inventarioPendienteKg - base.inventarioPendienteKg)],
    ];
    valores.forEach(([principal, diferencia]) => {
      const td = el("td", "", principal);
      if (diferencia) td.append(el("small", "", diferencia));
      row.append(td);
    });
    row.addEventListener("click", () => {
      state.indiceHoja = indice;
      renderHoja();
    });
    cuerpo.append(row);
  });
}

function svg(nombre, atributos = {}) {
  const nodo = document.createElementNS(SVG_NS, nombre);
  Object.entries(atributos).forEach(([clave, valor]) => nodo.setAttribute(clave, String(valor)));
  return nodo;
}

function reducirMuestras(muestras, maximo = 480) {
  if (muestras.length <= maximo) return muestras;
  const salto = Math.ceil(muestras.length / maximo);
  const reducidas = muestras.filter((_, indice) => indice % salto === 0);
  if (reducidas.at(-1) !== muestras.at(-1)) reducidas.push(muestras.at(-1));
  return reducidas;
}

function crearGrafica(elemento, series, opciones) {
  const ancho = 760;
  const alto = opciones.alto;
  const margen = { izquierda: 52, derecha: 18, arriba: 18, abajo: 32 };
  elemento.replaceChildren();
  elemento.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
  const titulo = svg("title");
  titulo.textContent = opciones.titulo;
  elemento.append(titulo);
  const todos = series.flatMap((serie) => serie.datos.map((punto) => punto.valor));
  const yMin = opciones.yMin ?? Math.min(0, ...todos);
  const yMaxCrudo = opciones.yMax ?? Math.max(...todos, 1);
  const yMax = yMaxCrudo === yMin ? yMin + 1 : yMaxCrudo;
  const tMin = Math.min(...series[0].datos.map((punto) => punto.tDia));
  const tMax = Math.max(...series[0].datos.map((punto) => punto.tDia));
  const x = (t) => margen.izquierda + (t - tMin) / Math.max(tMax - tMin, 1e-12) * (ancho - margen.izquierda - margen.derecha);
  const y = (valor) => alto - margen.abajo - (valor - yMin) / (yMax - yMin) * (alto - margen.arriba - margen.abajo);
  for (let indice = 0; indice <= 4; indice += 1) {
    const valor = yMin + (yMax - yMin) * indice / 4;
    const py = y(valor);
    elemento.append(svg("line", { x1: margen.izquierda, x2: ancho - margen.derecha, y1: py, y2: py, class: "grid-line" }));
    const texto = svg("text", { x: margen.izquierda - 8, y: py + 3, "text-anchor": "end" });
    texto.textContent = opciones.formatearY(valor);
    elemento.append(texto);
  }
  for (let indice = 0; indice <= 4; indice += 1) {
    const tiempo = tMin + (tMax - tMin) * indice / 4;
    const px = x(tiempo);
    const texto = svg("text", { x: px, y: alto - 10, "text-anchor": indice === 0 ? "start" : indice === 4 ? "end" : "middle" });
    texto.textContent = `d ${formato.format(tiempo)}`;
    elemento.append(texto);
  }
  state.resultadoArbol.spec.puntos.forEach((punto) => {
    if (punto.tDia <= tMin || punto.tDia >= tMax) return;
    elemento.append(svg("line", { x1: x(punto.tDia), x2: x(punto.tDia), y1: margen.arriba, y2: alto - margen.abajo, class: "branch-line" }));
  });
  elemento.append(svg("line", { x1: margen.izquierda, x2: ancho - margen.derecha, y1: alto - margen.abajo, y2: alto - margen.abajo, class: "axis-line" }));
  series.forEach((serie) => {
    const d = serie.datos.map((punto, indice) => `${indice === 0 ? "M" : "L"}${x(punto.tDia).toFixed(2)},${y(punto.valor).toFixed(2)}`).join(" ");
    elemento.append(svg("path", { d, class: "series", stroke: serie.color }));
  });
}

function renderGraficas(hoja) {
  const muestras = reducirMuestras(hoja.trayectoria);
  const { layout } = hoja;
  crearGrafica($("#stocks-chart"), [
    { color: "#357885", datos: muestras.map((muestra) => ({ tDia: muestra.tDia, valor: muestra.estado[layout.petAcopiado] })) },
    { color: "#769b75", datos: muestras.map((muestra) => {
      let total = 0;
      for (let indice = layout.fermentacionInicio; indice <= layout.fermentacionFin; indice += 1) total += muestra.estado[indice];
      return { tDia: muestra.tDia, valor: total };
    }) },
    { color: "#bd7b24", datos: muestras.map((muestra) => ({ tDia: muestra.tDia, valor: muestra.estado[layout.compostaLista] })) },
  ], { alto: 300, titulo: `Inventarios para ${nombreHoja(hoja)}`, formatearY: (valor) => formato.format(valor) });
  crearGrafica($("#participation-chart"), [{
    color: "#1f5b47",
    datos: muestras.map((muestra) => ({ tDia: muestra.tDia, valor: sigmoide(muestra.estado[layout.logitParticipacion]) })),
  }], { alto: 220, titulo: `Participación modelada para ${nombreHoja(hoja)}`, yMin: 0, yMax: 1, formatearY: (valor) => `${Math.round(valor * 100)}%` });
}

function descargar(nombre, contenido) {
  const blob = new Blob(["\ufeff", contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = el("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function instalarEventos() {
  $("#use-example").addEventListener("click", () => {
    state.modo = "ejemplo";
    state.corridaIlustrativa = true;
    irAPaso(1, { forzar: true });
  });
  $("#use-own-data").addEventListener("click", () => {
    state.modo = "propios";
    state.corridaIlustrativa = false;
    irAPaso(1, { forzar: true });
  });
  $$('[data-next]').forEach((button) => button.addEventListener("click", () => irAPaso(state.paso + 1)));
  $$('[data-prev]').forEach((button) => button.addEventListener("click", () => irAPaso(state.paso - 1, { forzar: true })));
  $$('[data-go-step]').forEach((button) => button.addEventListener("click", () => irAPaso(button.dataset.goStep, { forzar: Number(button.dataset.goStep) <= state.maxPaso })));
  $("#reference-date").addEventListener("change", () => { actualizarPeriodo(); actualizarPreviews(); });
  $("#t-fin").addEventListener("input", actualizarPeriodo);
  $("#research-question").addEventListener("input", () => { /* se guarda en el DOM */ });
  $("#apply-weight").addEventListener("click", () => {
    const unidades = Number($("#weight-count").value);
    const gramos = Number($("#weight-total").value);
    if (!(unidades > 0) || !(gramos >= 0)) {
      mostrarError(new Error("Escribe un número de unidades mayor que cero y una masa total no negativa."));
      return;
    }
    const input = inputParaRuta("generacion.masaUnitariaKg");
    input.value = String(gramos / unidades);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  $("#add-decision").addEventListener("click", agregarDecision);
  $("#apply-tree-json").addEventListener("click", () => {
    try {
      const parsed = JSON.parse($("#tree-spec").value);
      if (JSON.stringify(parsed).includes("organico.nEtapasFermentacion")) throw new Error("El número de etapas no puede cambiar dentro de una rama.");
      state.arbol = parsed;
      state.arbol.puntos.forEach((punto) => { punto.nombreVisible = punto.nombreVisible ?? humanizar(punto.nombre); });
      renderEscenarios();
      limpiarError();
    } catch (error) { mostrarError(error); }
  });
  $("#run-model").addEventListener("click", simular);
  $("#leaf-select").addEventListener("change", (evento) => { state.indiceHoja = Number(evento.target.value); renderHoja(); });
  $("#baseline-select").addEventListener("change", (evento) => { state.indiceBase = Number(evento.target.value); renderComparacion(); });
  $("#back-to-review").addEventListener("click", () => irAPaso(8, { forzar: true }));
  $("#new-exploration").addEventListener("click", () => irAPaso(1, { forzar: true }));
  $("#export-indicators").addEventListener("click", () => state.reporte && descargar("indicadores_escenarios.csv", aCsvIndicadores(state.reporte)));
  $("#export-trajectory").addEventListener("click", () => state.reporte && descargar(`trayectoria_${state.reporte.hojas[state.indiceHoja].ruta.replaceAll("/", "_")}.csv`, aCsvTrayectoria(state.reporte.hojas[state.indiceHoja])));
  $("#export-parameters").addEventListener("click", () => state.reporte && descargar("parametros_fuentes.csv", aCsvParametrosEfectivos(state.reporte)));
  $("#export-dictionary").addEventListener("click", () => state.parametrosCorrida && descargar("diccionario_datos.csv", aCsvDiccionarioParametros(state.parametrosCorrida)));
}

function iniciar() {
  const hoy = new Date();
  hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
  $("#reference-date").value = hoy.toISOString().slice(0, 10);
  $("#t-fin").value = String(CONFIGURACION_EJEMPLO.tFin);
  renderEditores();
  actualizarResto();
  renderEscenarios();
  instalarEventos();
  actualizarPeriodo();
  actualizarPreviews();
  irAPaso(0, { forzar: true });
}

iniciar();
