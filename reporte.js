import { materializarTrayectoria } from "./arbol.js";
import { calcularErrorBalance, describirEstado, sigmoide } from "./modelo.js";

export const VERSION_MODELO = "1.1.0-onboarding";
export const COMMIT_BASE = "872ba8e84016c4193ef8ea9b11773616e2295b4c";
export const ADVERTENCIA_METODOLOGICA = "Modelo determinista y condicionado: no es una predicción exacta, no asigna probabilidades y no representa eventos imprevistos ni incertidumbre.";
export const LIMITES_VERSION = "PET y orgánico comparten una participación; el resto va directo a relleno; la composta conserva kg-equivalentes húmedos sin pérdidas de agua ni emisiones; todos los inventarios empiezan en cero.";

const TODOS_LOS_GRUPOS = Object.freeze([
  "generacion.*",
  "composicion.*",
  "pet.*",
  "organico.*",
  "retroalimentacion.*",
]);

/** Mapa estructural conservador: R1 y B1 acoplan ambas corrientes. */
export const DEPENDENCIAS_INDICADORES = Object.freeze({
  desvioKg: TODOS_LOS_GRUPOS,
  desvioPct: TODOS_LOS_GRUPOS,
  filamentoKg: TODOS_LOS_GRUPOS,
  compostaAplicadaKg: TODOS_LOS_GRUPOS,
  backlogMaxKg: TODOS_LOS_GRUPOS,
  diasSaturado: TODOS_LOS_GRUPOS,
  participacionTerminal: TODOS_LOS_GRUPOS,
  inventarioPendienteKg: TODOS_LOS_GRUPOS,
});

const esParametro = (valor) => Boolean(
  valor && typeof valor === "object" && !Array.isArray(valor)
  && Object.prototype.hasOwnProperty.call(valor, "valor")
  && Object.prototype.hasOwnProperty.call(valor, "procedencia"),
);

const recorrer = (nodo, visita, ruta = "") => {
  if (esParametro(nodo)) {
    visita(nodo, ruta);
    return;
  }
  if (Array.isArray(nodo)) {
    nodo.forEach((item, indice) => recorrer(item, visita, ruta ? `${ruta}.${indice}` : String(indice)));
    return;
  }
  if (nodo && typeof nodo === "object") {
    Object.entries(nodo).forEach(([clave, valor]) => recorrer(valor, visita, ruta ? `${ruta}.${clave}` : clave));
  }
};

const coincide = (ruta, patron) => patron.endsWith(".*")
  ? ruta.startsWith(patron.slice(0, -1))
  : ruta === patron;

const supuestosDeHoja = (hoja) => {
  const unicos = new Map();
  for (const segmento of hoja.segmentos) {
    recorrer(segmento.parametros.catalogo, (parametro, ruta) => {
      if (parametro.procedencia !== "SUPUESTO") return;
      const clave = `${ruta}|${JSON.stringify(parametro.valor)}|${parametro.fuente}|${segmento.tInicio}|${segmento.tFin}`;
      unicos.set(clave, {
        ruta,
        valor: parametro.valor,
        unidad: parametro.unidad,
        fuente: parametro.fuente,
        tInicio: segmento.tInicio,
        tFin: segmento.tFin,
      });
    });
  }
  return [...unicos.values()];
};

const duracionSobreUmbral = (muestraA, muestraB, indiceStock) => {
  const h = muestraB.tDia - muestraA.tDia;
  if (!(h > 0)) return 0;
  // El intervalo abierto usa los parámetros vigentes en su extremo izquierdo.
  // Un override en muestraB entra en vigor justo al llegar a ese instante.
  const capacidad = muestraA.valores.pet.capacidadAlmacenKg;
  const a = muestraA.estado[indiceStock] - capacidad;
  const b = muestraB.estado[indiceStock] - capacidad;
  if (a >= 0 && b >= 0) return h;
  if (a < 0 && b < 0) return 0;
  const fraccionCruce = -a / (b - a);
  return a >= 0 ? h * fraccionCruce : h * (1 - fraccionCruce);
};

/**
 * @param {Object} hoja
 * @returns {Object}
 */
export function calcularIndicadores(hoja) {
  const trayectoria = materializarTrayectoria(hoja);
  if (trayectoria.length === 0) throw new Error(`La hoja ${hoja.ruta} no contiene trayectoria`);
  const primera = trayectoria[0];
  const ultima = trayectoria[trayectoria.length - 1];
  const layout = describirEstado(ultima.valores.organico.nEtapasFermentacion);
  const final = ultima.estado;
  const masaInicial = layout.materiales.reduce((suma, indice) => suma + primera.estado[indice], 0);
  let backlogMaxKg = -Infinity;
  let diaBacklogMax = trayectoria[0].tDia;
  let diasSaturado = 0;
  trayectoria.forEach((muestra) => {
    const backlog = muestra.estado[layout.petAcopiado];
    if (backlog > backlogMaxKg) {
      backlogMaxKg = backlog;
      diaBacklogMax = muestra.tDia;
    }
  });
  for (let indice = 0; indice < trayectoria.length - 1; indice += 1) {
    diasSaturado += duracionSobreUmbral(trayectoria[indice], trayectoria[indice + 1], layout.petAcopiado);
  }
  const generadoKg = final[layout.generado];
  const rellenoKg = final[layout.relleno];
  const desvioKg = generadoKg - rellenoKg;
  const inventarioPendienteKg = layout.materiales.reduce((suma, indice) => suma + final[indice], 0);
  const indicadores = {
    generadoKg,
    rellenoKg,
    desvioKg,
    desvioPct: generadoKg > 0 ? 100 * desvioKg / generadoKg : 0,
    filamentoKg: final[layout.filamento],
    compostaAplicadaKg: final[layout.compostaAplicada],
    backlogMaxKg,
    diaBacklogMax,
    diasSaturado,
    participacionTerminal: sigmoide(final[layout.logitParticipacion]),
    inventarioPendienteKg,
    errorBalanceRelativo: calcularErrorBalance(final, ultima.valores, masaInicial).relativo,
  };
  const supuestos = supuestosDeHoja(hoja);
  const supuestosPorIndicador = Object.fromEntries(
    Object.entries(DEPENDENCIAS_INDICADORES).map(([indicador, patrones]) => [
      indicador,
      supuestos.filter((parametro) => patrones.some((patron) => coincide(parametro.ruta, patron))),
    ]),
  );
  return { ruta: hoja.ruta, indicadores, supuestosPorIndicador, trayectoria, layout, hoja };
}

/**
 * @param {{hojas:Array<Object>}} resultadoArbol
 * @param {{fechaReferencia?:string,pregunta?:string,corridaIlustrativa?:boolean}} [contexto]
 * @returns {{hojas:Array<Object>, creadoEn:string, metadatos:Object}}
 */
export function crearReporte(resultadoArbol, contexto = {}) {
  const metadatos = Object.freeze({
    versionModelo: VERSION_MODELO,
    commitBase: COMMIT_BASE,
    fechaReferencia: contexto.fechaReferencia ?? "",
    pregunta: contexto.pregunta ?? "",
    corridaIlustrativa: Boolean(contexto.corridaIlustrativa),
    tInicio: resultadoArbol.config.tInicio,
    tFin: resultadoArbol.config.tFin,
    horizonteDias: resultadoArbol.config.tFin - resultadoArbol.config.tInicio,
    stocksIniciales: "Todos los inventarios materiales empiezan en 0 kg.",
    advertenciaMetodologica: ADVERTENCIA_METODOLOGICA,
    limitesVersion: LIMITES_VERSION,
  });
  return {
    hojas: resultadoArbol.hojas.map((hoja) => ({ ...calcularIndicadores(hoja), metadatos })),
    creadoEn: new Date(0).toISOString(),
    metadatos,
  };
}

const escaparCsv = (valor) => {
  const texto = Array.isArray(valor) || (valor && typeof valor === "object") ? JSON.stringify(valor) : String(valor ?? "");
  return /[",\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
};

const csv = (encabezados, filas) => [encabezados, ...filas]
  .map((fila) => fila.map(escaparCsv).join(","))
  .join("\r\n");

const encabezadosMetadatos = Object.freeze([
  "version_modelo", "commit_base", "fecha_referencia", "horizonte_dias",
  "corrida_ilustrativa", "pregunta", "stocks_iniciales", "advertencia_metodologica", "limites_version",
]);

const valoresMetadatos = (metadatos = {}) => [
  metadatos.versionModelo ?? VERSION_MODELO,
  metadatos.commitBase ?? COMMIT_BASE,
  metadatos.fechaReferencia ?? "",
  metadatos.horizonteDias ?? "",
  metadatos.corridaIlustrativa ? "SI" : "NO",
  metadatos.pregunta ?? "",
  metadatos.stocksIniciales ?? "Todos los inventarios materiales empiezan en 0 kg.",
  metadatos.advertenciaMetodologica ?? ADVERTENCIA_METODOLOGICA,
  metadatos.limitesVersion ?? LIMITES_VERSION,
];

/** @param {{hojas:Array<Object>}} reporte @returns {string} */
export function aCsvIndicadores(reporte) {
  const encabezados = [
    "ruta", "generado_kg", "relleno_kg", "desvio_kg", "desvio_pct", "filamento_kg",
    "composta_aplicada_kg", "backlog_max_kg", "dia_backlog_max", "dias_saturado",
    "participacion_terminal", "inventario_pendiente_kg", "error_balance_relativo",
    "supuestos_estructurales", ...encabezadosMetadatos,
  ];
  const filas = reporte.hojas.map(({ ruta, indicadores, supuestosPorIndicador }) => [
    ruta,
    indicadores.generadoKg,
    indicadores.rellenoKg,
    indicadores.desvioKg,
    indicadores.desvioPct,
    indicadores.filamentoKg,
    indicadores.compostaAplicadaKg,
    indicadores.backlogMaxKg,
    indicadores.diaBacklogMax,
    indicadores.diasSaturado,
    indicadores.participacionTerminal,
    indicadores.inventarioPendienteKg,
    indicadores.errorBalanceRelativo,
    [...new Set(supuestosPorIndicador.desvioKg.map((item) => item.ruta))].join(";"),
    ...valoresMetadatos(reporte.metadatos),
  ]);
  return csv(encabezados, filas);
}

/** @param {Object} resultadoHoja @returns {string} */
export function aCsvTrayectoria(resultadoHoja) {
  const { trayectoria, layout } = resultadoHoja;
  const etapas = [];
  for (let indice = layout.fermentacionInicio; indice <= layout.fermentacionFin; indice += 1) etapas.push(indice);
  const encabezados = [
    "ruta_activa", "dia", "pet_disperso_kg", "pet_acopiado_kg", "organico_disperso_kg",
    ...etapas.map((_, indice) => `fermentacion_${indice + 1}_kg`),
    "composta_lista_kg", "generado_acum_kg", "relleno_acum_kg", "filamento_acum_kg",
    "composta_aplicada_acum_kg", "productividad_visible", "participacion",
    ...encabezadosMetadatos,
  ];
  const filas = trayectoria.map((muestra) => [
    muestra.rutaActiva,
    muestra.tDia,
    muestra.estado[layout.petDisperso],
    muestra.estado[layout.petAcopiado],
    muestra.estado[layout.organicoDisperso],
    ...etapas.map((indice) => muestra.estado[indice]),
    muestra.estado[layout.compostaLista],
    muestra.estado[layout.generado],
    muestra.estado[layout.relleno],
    muestra.estado[layout.filamento],
    muestra.estado[layout.compostaAplicada],
    muestra.estado[layout.productividadVisible],
    sigmoide(muestra.estado[layout.logitParticipacion]),
    ...valoresMetadatos(resultadoHoja.metadatos),
  ]);
  return csv(encabezados, filas);
}

/** @param {{hojas:Array<Object>}} reporte @returns {string} */
export function aCsvParametrosEfectivos(reporte) {
  const encabezados = [
    "ruta", "desde_dia", "hasta_dia", "parametro", "nombre", "valor", "unidad_interna",
    "unidad_entrada", "procedencia", "fuente", "exposicion", ...encabezadosMetadatos,
  ];
  const filas = [];
  for (const resultadoHoja of reporte.hojas) {
    for (const segmento of resultadoHoja.hoja.segmentos) {
      recorrer(segmento.parametros.catalogo, (parametro, ruta) => {
        filas.push([
          resultadoHoja.ruta,
          segmento.tInicio,
          segmento.tFin,
          ruta,
          parametro.onboarding?.nombre ?? parametro.descripcion,
          parametro.valor,
          parametro.unidad,
          parametro.onboarding?.unidadEntrada ?? parametro.unidad,
          parametro.procedencia,
          parametro.fuente,
          parametro.onboarding?.exposicion ?? "",
          ...valoresMetadatos(reporte.metadatos),
        ]);
      });
    }
  }
  return csv(encabezados, filas);
}

/**
 * Diccionario legible para acompañar las exportaciones reproducibles.
 * @param {{catalogo:Object}} params
 * @returns {string}
 */
export function aCsvDiccionarioParametros(params) {
  const encabezados = [
    "parametro", "nombre", "explicacion", "unidad_interna", "unidad_entrada", "formato",
    "rango_razonable", "valor_ejemplo", "procedencia_ejemplo", "origen_ejemplo", "ejemplo",
    "consecuencia_error", "criticidad", "exposicion", "como_obtener",
  ];
  const filas = [];
  recorrer(params.catalogo, (parametro, ruta) => {
    const ayuda = parametro.onboarding ?? {};
    filas.push([
      ruta,
      ayuda.nombre,
      ayuda.explicacion,
      parametro.unidad,
      ayuda.unidadEntrada,
      ayuda.formato,
      ayuda.rangoRazonable,
      parametro.valor,
      parametro.procedencia,
      parametro.fuente,
      ayuda.ejemplo,
      ayuda.consecuencia,
      ayuda.criticidad,
      ayuda.exposicion,
      ayuda.comoObtener,
    ]);
  });
  return csv(encabezados, filas);
}
