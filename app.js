import {
  aplicarOverrides,
  crearParametros,
  extraerValores,
  listarParametros,
  obtenerParametro,
} from "./parametros.js";
import {
  crearEstadoInicial,
  derivadas,
  describirEstado,
  puntosDiscontinuidad,
  sigmoide,
  validarMuestra,
} from "./modelo.js";
import { simularArbol } from "./arbol.js";
import {
  aCsvIndicadores,
  aCsvParametrosEfectivos,
  aCsvTrayectoria,
  crearReporte,
} from "./reporte.js";
import { ARBOL_EJEMPLO, CONFIGURACION_EJEMPLO } from "./escenarios_ejemplo.js";

const $ = (selector) => document.querySelector(selector);
const SVG_NS = "http://www.w3.org/2000/svg";
const GRUPOS = {
  generacion: "Generación poblacional",
  composicion: "Composición",
  pet: "Cadena PET",
  organico: "Cadena orgánica",
  retroalimentacion: "Retroalimentación",
};

const formato = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const formato2 = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKg = (valor) => `${formato.format(valor)} kg`;
const fmtPct = (valor) => `${formato2.format(valor)} %`;
const clonarJson = (valor) => JSON.parse(JSON.stringify(valor));

let parametrosBase = crearParametros();
let resultadoArbol = null;
let reporteActual = null;
let indiceHoja = 0;

const normalizarEtiqueta = (ruta) => ruta
  .replaceAll("_", " ")
  .split("/")
  .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
  .join(" / ");

const pasoPara = (parametro) => {
  if (parametro.entero) return 1;
  if (parametro.max === 1) return 0.01;
  const valor = Math.abs(Number(parametro.valor));
  if (valor >= 1000) return 100;
  if (valor >= 100) return 10;
  if (valor >= 10) return 1;
  if (valor >= 1) return 0.1;
  return 0.01;
};

const crearEditorParametros = () => {
  const contenedor = $("#parameter-editor");
  contenedor.replaceChildren();
  const parametros = listarParametros(parametrosBase);
  for (const [grupo, etiqueta] of Object.entries(GRUPOS)) {
    const items = parametros.filter((item) => item.ruta.startsWith(`${grupo}.`));
    const details = document.createElement("details");
    details.className = "parameter-group";
    if (["composicion", "pet"].includes(grupo)) details.open = true;
    const summary = document.createElement("summary");
    summary.innerHTML = `<span>${etiqueta}</span><small>${items.length}</small>`;
    const campos = document.createElement("div");
    campos.className = "parameter-fields";

    for (const item of items) {
      if (Array.isArray(item.valor)) {
        const nota = document.createElement("div");
        nota.className = "calendar-note";
        nota.textContent = `${item.ruta}: ${item.valor.length} intervalos · ${item.procedencia}`;
        campos.append(nota);
        continue;
      }
      const parametro = obtenerParametro(parametrosBase, item.ruta);
      const fila = document.createElement("div");
      fila.className = "parameter-row";
      const etiquetaCampo = document.createElement("label");
      const texto = document.createElement("span");
      texto.className = "parameter-label";
      const fuerte = document.createElement("strong");
      fuerte.textContent = item.descripcion;
      const unidad = document.createElement("small");
      unidad.textContent = item.unidad;
      texto.append(fuerte, unidad);
      const caja = document.createElement("span");
      caja.className = "parameter-input";
      const input = document.createElement("input");
      input.type = "number";
      input.value = String(item.valor);
      input.step = String(pasoPara(parametro));
      if (parametro.min !== undefined) input.min = String(parametro.min);
      if (parametro.max !== undefined) input.max = String(parametro.max);
      input.dataset.paramPath = item.ruta;
      input.dataset.original = JSON.stringify(item.valor);
      input.setAttribute("aria-label", `${item.descripcion}, ${item.unidad}`);
      caja.append(input);
      etiquetaCampo.append(texto, caja);
      const meta = document.createElement("div");
      meta.className = "parameter-meta";
      const badge = document.createElement("span");
      badge.className = `provenance ${item.procedencia.toLowerCase()}`;
      badge.textContent = item.procedencia;
      const ruta = document.createElement("code");
      ruta.textContent = item.ruta;
      meta.append(badge, ruta);
      fila.append(etiquetaCampo, meta);
      input.addEventListener("input", () => {
        const cambio = Number(input.value) !== JSON.parse(input.dataset.original);
        fila.dataset.changed = String(cambio);
        badge.className = `provenance ${cambio ? "supuesto" : item.procedencia.toLowerCase()}`;
        badge.textContent = cambio ? "SUPUESTO" : item.procedencia;
      });
      campos.append(fila);
    }
    details.append(summary, campos);
    contenedor.append(details);
  }
};

const overridesDeInterfaz = () => {
  const overrides = {};
  document.querySelectorAll("[data-param-path]").forEach((input) => {
    const valor = Number(input.value);
    if (!Number.isFinite(valor)) throw new Error(`Valor inválido en ${input.dataset.paramPath}`);
    if (valor !== JSON.parse(input.dataset.original)) {
      overrides[input.dataset.paramPath] = {
        valor,
        procedencia: "SUPUESTO",
        fuente: "Valor editado en la interfaz antes de la corrida",
      };
    }
  });
  return overrides;
};

const mostrarArbol = () => {
  const contenedor = $("#tree-preview");
  contenedor.replaceChildren();
  try {
    const spec = JSON.parse($("#tree-spec").value);
    let hojas = 1;
    for (const punto of spec.puntos ?? []) {
      hojas *= punto.alternativas?.length ?? 0;
      const fila = document.createElement("div");
      fila.className = "branch-row";
      const dia = document.createElement("span");
      dia.className = "branch-day";
      dia.textContent = `d ${punto.tDia}`;
      const contenido = document.createElement("div");
      contenido.className = "branch-content";
      const nombre = document.createElement("strong");
      nombre.textContent = punto.nombre.replaceAll("_", " ");
      const alternativas = document.createElement("small");
      alternativas.textContent = (punto.alternativas ?? []).map((item) => item.etiqueta.replaceAll("_", " ")).join(" · ");
      contenido.append(nombre, alternativas);
      fila.append(dia, contenido);
      contenedor.append(fila);
    }
    $("#run-estimate").textContent = `${hojas} hojas · ${$("#t-fin").value} días`;
  } catch (error) {
    const invalido = document.createElement("div");
    invalido.className = "error-box";
    invalido.textContent = `JSON inválido: ${error.message}`;
    contenedor.append(invalido);
    $("#run-estimate").textContent = "spec inválida";
  }
};

const mostrarError = (error) => {
  const caja = $("#error-box");
  caja.hidden = false;
  caja.textContent = error?.message ?? String(error);
};

const limpiarError = () => {
  $("#error-box").hidden = true;
  $("#error-box").textContent = "";
};

const simular = () => {
  const boton = $("#run-model");
  boton.disabled = true;
  limpiarError();
  const inicio = performance.now();
  try {
    let parametros = crearParametros();
    const overrides = overridesDeInterfaz();
    if (Object.keys(overrides).length > 0) {
      parametros = aplicarOverrides(parametros, overrides, {
        tDia: 0,
        ruta: "base/configuracion",
        permitirEstructurales: true,
      });
    }
    const spec = JSON.parse($("#tree-spec").value);
    const config = {
      tInicio: 0,
      tFin: Number($("#t-fin").value),
      dt: Number($("#dt").value),
      metodo: $("#integrator-method").value,
    };
    if (![config.tFin, config.dt].every(Number.isFinite)) throw new Error("Horizonte y dt deben ser numéricos");
    const valores = extraerValores(parametros);
    const layout = describirEstado(valores.organico.nEtapasFermentacion);
    resultadoArbol = simularArbol({
      spec,
      estadoInicial: crearEstadoInicial(valores),
      paramsBase: parametros,
      config,
      derivadas,
      indicesNoNegativos: layout.noNegativos,
      validarMuestra: (estado, efectivos) => validarMuestra(estado, efectivos),
      obtenerEventos: puntosDiscontinuidad,
    });
    reporteActual = crearReporte(resultadoArbol);
    indiceHoja = 0;
    llenarSelector();
    renderComparacion();
    renderHoja();
    const duracion = performance.now() - inicio;
    $("#run-summary").textContent = `${reporteActual.hojas.length} hojas · ${duracion.toFixed(0)} ms · ${config.metodo.toUpperCase()}`;
    $("#method-pill").textContent = config.metodo.toUpperCase();
  } catch (error) {
    mostrarError(error);
    $("#run-summary").textContent = "Corrida detenida por validación";
  } finally {
    boton.disabled = false;
  }
};

const llenarSelector = () => {
  const selector = $("#leaf-select");
  selector.replaceChildren();
  reporteActual.hojas.forEach((hoja, indice) => {
    const opcion = document.createElement("option");
    opcion.value = String(indice);
    opcion.textContent = normalizarEtiqueta(hoja.ruta);
    selector.append(opcion);
  });
  selector.value = String(indiceHoja);
};

const renderComparacion = () => {
  const cuerpo = $("#comparison-body");
  cuerpo.replaceChildren();
  reporteActual.hojas.forEach((hoja, indice) => {
    const i = hoja.indicadores;
    const fila = document.createElement("tr");
    fila.dataset.index = String(indice);
    if (indice === indiceHoja) fila.classList.add("active");
    const valores = [
      normalizarEtiqueta(hoja.ruta),
      fmtPct(i.desvioPct),
      fmtKg(i.filamentoKg),
      fmtKg(i.compostaAplicadaKg),
      fmtKg(i.backlogMaxKg),
      fmtPct(100 * i.participacionTerminal),
    ];
    valores.forEach((valor) => {
      const celda = document.createElement("td");
      celda.textContent = valor;
      celda.title = valor;
      fila.append(celda);
    });
    fila.addEventListener("click", () => seleccionarHoja(indice));
    cuerpo.append(fila);
  });
};

const seleccionarHoja = (indice) => {
  indiceHoja = Number(indice);
  $("#leaf-select").value = String(indiceHoja);
  renderComparacion();
  renderHoja();
};

const renderHoja = () => {
  if (!reporteActual) return;
  const hoja = reporteActual.hojas[indiceHoja];
  const i = hoja.indicadores;
  $("#kpi-diversion").textContent = fmtKg(i.desvioKg);
  $("#kpi-diversion-pct").textContent = `${fmtPct(i.desvioPct)} de la generación`;
  $("#kpi-filament").textContent = fmtKg(i.filamentoKg);
  $("#kpi-compost").textContent = fmtKg(i.compostaAplicadaKg);
  $("#kpi-backlog").textContent = fmtKg(i.backlogMaxKg);
  $("#kpi-backlog-day").textContent = `máximo en día ${formato.format(i.diaBacklogMax)}`;
  $("#kpi-saturated").textContent = formato2.format(i.diasSaturado);
  $("#kpi-participation").textContent = fmtPct(100 * i.participacionTerminal);
  $("#terminal-participation-label").textContent = fmtPct(100 * i.participacionTerminal);
  $("#pending-inventory").textContent = fmtKg(i.inventarioPendienteKg);
  $("#mass-error").textContent = i.errorBalanceRelativo.toExponential(2);
  renderSupuestos(hoja);
  renderGraficas(hoja);
};

const renderSupuestos = (hoja) => {
  const lista = $("#assumption-list");
  lista.replaceChildren();
  const porRuta = new Map();
  for (const item of hoja.supuestosPorIndicador.desvioKg) {
    const clave = `${item.ruta}|${item.fuente}`;
    if (!porRuta.has(clave)) porRuta.set(clave, item);
  }
  const items = [...porRuta.values()];
  $("#assumption-summary").textContent = `Ver ${items.length} parámetros implicados`;
  for (const item of items) {
    const elemento = document.createElement("li");
    const ruta = document.createElement("code");
    ruta.textContent = item.ruta;
    const fuente = document.createElement("small");
    fuente.textContent = item.fuente;
    elemento.append(ruta, fuente);
    lista.append(elemento);
  }
};

const svg = (nombre, atributos = {}) => {
  const elemento = document.createElementNS(SVG_NS, nombre);
  Object.entries(atributos).forEach(([clave, valor]) => elemento.setAttribute(clave, String(valor)));
  return elemento;
};

const reducirMuestras = (muestras, maximo = 480) => {
  if (muestras.length <= maximo) return muestras;
  const salto = Math.ceil(muestras.length / maximo);
  const reducidas = muestras.filter((_, indice) => indice % salto === 0);
  if (reducidas[reducidas.length - 1] !== muestras[muestras.length - 1]) reducidas.push(muestras[muestras.length - 1]);
  return reducidas;
};

const crearGrafica = (elemento, series, opciones) => {
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
  for (const punto of resultadoArbol.spec.puntos) {
    if (punto.tDia <= tMin || punto.tDia >= tMax) continue;
    elemento.append(svg("line", { x1: x(punto.tDia), x2: x(punto.tDia), y1: margen.arriba, y2: alto - margen.abajo, class: "branch-line" }));
  }
  elemento.append(svg("line", { x1: margen.izquierda, x2: ancho - margen.derecha, y1: alto - margen.abajo, y2: alto - margen.abajo, class: "axis-line" }));

  for (const serie of series) {
    const d = serie.datos.map((punto, indice) => `${indice === 0 ? "M" : "L"}${x(punto.tDia).toFixed(2)},${y(punto.valor).toFixed(2)}`).join(" ");
    const path = svg("path", { d, class: "series", stroke: serie.color });
    elemento.append(path);
  }
};

const renderGraficas = (hoja) => {
  const muestras = reducirMuestras(hoja.trayectoria);
  const { layout } = hoja;
  const stocks = [
    {
      color: "#087b8d",
      datos: muestras.map((muestra) => ({ tDia: muestra.tDia, valor: muestra.estado[layout.petAcopiado] })),
    },
    {
      color: "#7b9d4d",
      datos: muestras.map((muestra) => {
        let total = 0;
        for (let indice = layout.fermentacionInicio; indice <= layout.fermentacionFin; indice += 1) total += muestra.estado[indice];
        return { tDia: muestra.tDia, valor: total };
      }),
    },
    {
      color: "#d4a12f",
      datos: muestras.map((muestra) => ({ tDia: muestra.tDia, valor: muestra.estado[layout.compostaLista] })),
    },
  ];
  crearGrafica($("#stocks-chart"), stocks, {
    alto: 300,
    titulo: `Stocks operativos para ${hoja.ruta}`,
    formatearY: (valor) => formato.format(valor),
  });
  crearGrafica($("#participation-chart"), [{
    color: "#087b8d",
    datos: muestras.map((muestra) => ({
      tDia: muestra.tDia,
      valor: sigmoide(muestra.estado[layout.logitParticipacion]),
    })),
  }], {
    alto: 180,
    titulo: `Participación para ${hoja.ruta}`,
    yMin: 0,
    yMax: 1,
    formatearY: (valor) => `${Math.round(valor * 100)}%`,
  });
};

const descargar = (nombre, contenido) => {
  const blob = new Blob(["\ufeff", contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
};

$("#run-model").addEventListener("click", simular);
$("#leaf-select").addEventListener("change", (evento) => seleccionarHoja(evento.target.value));
$("#integrator-method").addEventListener("change", () => { $("#method-pill").textContent = $("#integrator-method").value.toUpperCase(); });
$("#t-fin").addEventListener("input", mostrarArbol);
$("#tree-spec").addEventListener("input", mostrarArbol);
$("#restore-tree").addEventListener("click", () => {
  $("#tree-spec").value = JSON.stringify(ARBOL_EJEMPLO, null, 2);
  mostrarArbol();
});
$("#restore-params").addEventListener("click", () => {
  parametrosBase = crearParametros();
  crearEditorParametros();
});
$("#export-indicators").addEventListener("click", () => reporteActual && descargar("indicadores_hojas.csv", aCsvIndicadores(reporteActual)));
$("#export-trajectory").addEventListener("click", () => reporteActual && descargar(`trayectoria_${reporteActual.hojas[indiceHoja].ruta.replaceAll("/", "_")}.csv`, aCsvTrayectoria(reporteActual.hojas[indiceHoja])));
$("#export-parameters").addEventListener("click", () => reporteActual && descargar("parametros_efectivos.csv", aCsvParametrosEfectivos(reporteActual)));

$("#t-fin").value = String(CONFIGURACION_EJEMPLO.tFin);
$("#dt").value = String(CONFIGURACION_EJEMPLO.dt);
$("#integrator-method").value = CONFIGURACION_EJEMPLO.metodo;
$("#tree-spec").value = JSON.stringify(clonarJson(ARBOL_EJEMPLO), null, 2);
crearEditorParametros();
mostrarArbol();
simular();
