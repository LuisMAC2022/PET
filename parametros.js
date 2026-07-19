/**
 * Catálogo y validación de parámetros del simulador.
 * Todas las conversiones terminan aquí: el modelo recibe kg, días y fracciones.
 */

export const PROCEDENCIAS = Object.freeze(["MEDIDO", "ESTIMADO", "SUPUESTO"]);

/** @typedef {'MEDIDO'|'ESTIMADO'|'SUPUESTO'} Procedencia */

/**
 * @typedef {Object} Parametro
 * @property {unknown} valor
 * @property {string} unidad
 * @property {Procedencia} procedencia
 * @property {string} fuente
 * @property {string} descripcion
 * @property {boolean} [estructural]
 * @property {number} [min]
 * @property {number} [max]
 * @property {boolean} [entero]
 */

const p = (valor, unidad, procedencia, fuente, descripcion, opciones = {}) => ({
  valor,
  unidad,
  procedencia,
  fuente,
  descripcion,
  ...opciones,
});

/**
 * Marcadores de posición explícitos. Deben sustituirse después del estudio de
 * caracterización; su procedencia nunca se oculta en los resultados.
 */
export const DEFINICION_BASE = Object.freeze({
  generacion: {
    segmentos: [
      {
        id: "estudiantes",
        etiqueta: "Estudiantes",
        poblacion: p(23000, "personas", "ESTIMADO", "Matrícula de referencia; validar con Servicios Escolares", "Población potencial del segmento", { min: 0 }),
        asistencia: p(0.72, "1", "SUPUESTO", "Marcador previo a aforo", "Fracción presente en un día activo", { min: 0, max: 1 }),
        desechosPerCapitaDia: p(0.11, "unidades/(persona·día)", "SUPUESTO", "Marcador previo a caracterización", "Unidades desechadas por persona y día", { min: 0 }),
        calendario: p([{ desde: 0, hasta: 70, multiplicador: 1 }, { desde: 70, hasta: 84, multiplicador: 0.12 }, { desde: 84, hasta: 366, multiplicador: 1 }], "1", "SUPUESTO", "Calendario ilustrativo", "Multiplicador de población por intervalo"),
      },
      {
        id: "docentes",
        etiqueta: "Docentes",
        poblacion: p(2200, "personas", "ESTIMADO", "Plantilla de referencia; validar con la administración", "Población potencial del segmento", { min: 0 }),
        asistencia: p(0.8, "1", "SUPUESTO", "Marcador previo a aforo", "Fracción presente en un día activo", { min: 0, max: 1 }),
        desechosPerCapitaDia: p(0.08, "unidades/(persona·día)", "SUPUESTO", "Marcador previo a caracterización", "Unidades desechadas por persona y día", { min: 0 }),
        calendario: p([{ desde: 0, hasta: 70, multiplicador: 1 }, { desde: 70, hasta: 84, multiplicador: 0.18 }, { desde: 84, hasta: 366, multiplicador: 1 }], "1", "SUPUESTO", "Calendario ilustrativo", "Multiplicador de población por intervalo"),
      },
      {
        id: "administrativos",
        etiqueta: "Administrativos",
        poblacion: p(1700, "personas", "ESTIMADO", "Plantilla de referencia; validar con la administración", "Población potencial del segmento", { min: 0 }),
        asistencia: p(0.9, "1", "SUPUESTO", "Marcador previo a aforo", "Fracción presente en un día activo", { min: 0, max: 1 }),
        desechosPerCapitaDia: p(0.08, "unidades/(persona·día)", "SUPUESTO", "Marcador previo a caracterización", "Unidades desechadas por persona y día", { min: 0 }),
        calendario: p([{ desde: 0, hasta: 70, multiplicador: 1 }, { desde: 70, hasta: 84, multiplicador: 0.7 }, { desde: 84, hasta: 366, multiplicador: 1 }], "1", "SUPUESTO", "Calendario ilustrativo", "Multiplicador de población por intervalo"),
      },
      {
        id: "visitantes_tianguis",
        etiqueta: "Visitantes de tianguis",
        poblacion: p(2500, "personas", "SUPUESTO", "Marcador hasta realizar conteo de acceso", "Visitantes potenciales equivalentes por día", { min: 0 }),
        asistencia: p(0.2, "1", "SUPUESTO", "Actividad concentrada en días específicos", "Fracción diaria equivalente", { min: 0, max: 1 }),
        desechosPerCapitaDia: p(0.12, "unidades/(persona·día)", "SUPUESTO", "Marcador previo a caracterización", "Unidades desechadas por persona y día", { min: 0 }),
        calendario: p([{ desde: 0, hasta: 70, multiplicador: 1 }, { desde: 70, hasta: 84, multiplicador: 0 }, { desde: 84, hasta: 366, multiplicador: 1 }], "1", "SUPUESTO", "Calendario ilustrativo", "Multiplicador de población por intervalo"),
      },
    ],
    factorConversion: p(1, "1", "SUPUESTO", "Conversión unitaria provisional", "Factor de conversión de consumo a residuo", { min: 0 }),
    masaUnitariaKg: p(0.025, "kg/unidad", "SUPUESTO", "Masa media ilustrativa; pesar muestra local", "Masa media de una unidad de residuo", { min: 0 }),
  },
  composicion: {
    organica: p(0.55, "1", "SUPUESTO", "Sin estudio de caracterización autorizado", "Fracción orgánica de la generación", { min: 0, max: 1 }),
    pet: p(0.1, "1", "SUPUESTO", "Sin estudio de caracterización autorizado", "Fracción PET de la generación", { min: 0, max: 1 }),
    resto: p(0.35, "1", "SUPUESTO", "Cierre provisional de composición", "Fracción enviada directamente a relleno", { min: 0, max: 1 }),
  },
  pet: {
    tauCapturaDias: p(2, "días", "SUPUESTO", "Tiempo operativo por validar", "Permanencia media antes de clasificación", { min: 1e-6 }),
    cobertura: p(0.65, "1", "SUPUESTO", "Cobertura de contenedores por levantar", "Fracción de la corriente alcanzada por infraestructura", { min: 0, max: 1 }),
    rechazoCaptura: p(0.12, "1", "SUPUESTO", "Contaminación por caracterizar", "Fracción rechazada del intento de captura", { min: 0, max: 1 }),
    tauProcesoDias: p(1, "días", "SUPUESTO", "Tiempo de despacho operativo", "Tiempo mínimo de disponibilidad para triturar", { min: 1e-6 }),
    capacidadTrituradoraKgDia: p(1, "kg/día", "SUPUESTO", "Capacidad nominal ilustrativa", "Límite duro de procesamiento", { min: 0 }),
    rechazoProceso: p(0.08, "1", "SUPUESTO", "Rendimiento por medir", "Fracción rechazada durante procesamiento", { min: 0, max: 1 }),
    capacidadAlmacenKg: p(25, "kg", "SUPUESTO", "Umbral nominal ilustrativo", "Umbral de saturación; no es un tope físico", { min: 1e-6 }),
  },
  organico: {
    tauCapturaDias: p(1.5, "días", "SUPUESTO", "Tiempo operativo por validar", "Permanencia media antes de clasificación", { min: 1e-6 }),
    cobertura: p(0.58, "1", "SUPUESTO", "Cobertura de separación por levantar", "Fracción de la corriente alcanzada", { min: 0, max: 1 }),
    rechazoCaptura: p(0.1, "1", "SUPUESTO", "Contaminación por caracterizar", "Fracción rechazada del intento de captura", { min: 0, max: 1 }),
    nEtapasFermentacion: p(3, "etapas", "SUPUESTO", "Estructura Erlang elegida para v1", "Número de sub-stocks en serie", { min: 1, entero: true, estructural: true }),
    tauFermentacionDias: p(21, "días", "ESTIMADO", "Duración técnica de referencia para bokashi", "Residencia media total de fermentación", { min: 1e-6 }),
    tauAplicacionDias: p(4, "días", "SUPUESTO", "Ritmo de aplicación por validar con el huerto", "Tiempo medio para aplicar composta lista", { min: 1e-6 }),
  },
  retroalimentacion: {
    participacionInicial: p(0.35, "1", "SUPUESTO", "Sin encuesta de participación", "Participación observable inicial", { min: 1e-6, max: 0.999999 }),
    participacionBase: p(0.38, "1", "SUPUESTO", "Sin encuesta de participación", "Objetivo basal de participación", { min: 1e-6, max: 0.999999 }),
    tauParticipacionDias: p(10, "días", "SUPUESTO", "Tiempo de ajuste perceptual", "Tiempo de ajuste del stock informacional", { min: 1e-6 }),
    betaRefuerzo: p(1.35, "1", "SUPUESTO", "Intensidad R1 ilustrativa", "Efecto de productividad visible sobre log-odds", { min: 0 }),
    betaSaturacion: p(0.9, "1", "SUPUESTO", "Intensidad B1 ilustrativa", "Efecto de saturación PET sobre log-odds", { min: 0 }),
    tauVisibilidadDias: p(14, "días", "SUPUESTO", "Persistencia visual por validar", "Ajuste de la productividad visible", { min: 1e-6 }),
    flujoAplicacionReferenciaKgDia: p(5, "kg/día", "SUPUESTO", "Escala de visibilidad ilustrativa", "Flujo que produce una señal visible de 0.5", { min: 1e-6 }),
  },
});

const esParametro = (valor) => Boolean(
  valor && typeof valor === "object" && !Array.isArray(valor)
  && Object.prototype.hasOwnProperty.call(valor, "valor")
  && Object.prototype.hasOwnProperty.call(valor, "procedencia"),
);

const clonar = (valor) => {
  if (Array.isArray(valor)) return valor.map(clonar);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(Object.entries(valor).map(([clave, dato]) => [clave, clonar(dato)]));
  }
  return valor;
};

const congelarProfundo = (valor) => {
  if (!valor || typeof valor !== "object" || Object.isFrozen(valor)) return valor;
  Object.values(valor).forEach(congelarProfundo);
  return Object.freeze(valor);
};

const recorrerParametros = (nodo, visita, ruta = "") => {
  if (esParametro(nodo)) {
    visita(nodo, ruta);
    return;
  }
  if (Array.isArray(nodo)) {
    nodo.forEach((item, indice) => recorrerParametros(item, visita, ruta ? `${ruta}.${indice}` : String(indice)));
    return;
  }
  if (nodo && typeof nodo === "object") {
    Object.entries(nodo).forEach(([clave, valor]) => recorrerParametros(valor, visita, ruta ? `${ruta}.${clave}` : clave));
  }
};

const obtenerEnRuta = (objeto, ruta) => ruta.split(".").reduce((actual, parte) => {
  if (actual === undefined || actual === null || !Object.prototype.hasOwnProperty.call(actual, parte)) {
    throw new Error(`Parámetro inexistente: ${ruta}`);
  }
  return actual[parte];
}, objeto);

const validarCalendario = (calendario, ruta) => {
  if (!Array.isArray(calendario) || calendario.length === 0) {
    throw new Error(`${ruta} debe contener al menos un intervalo de calendario`);
  }
  let finAnterior = -Infinity;
  calendario.forEach((tramo, indice) => {
    const { desde, hasta, multiplicador } = tramo ?? {};
    if (![desde, hasta, multiplicador].every(Number.isFinite)) {
      throw new Error(`${ruta}.${indice} contiene valores no numéricos`);
    }
    if (desde < finAnterior || hasta <= desde || multiplicador < 0) {
      throw new Error(`${ruta}.${indice} no es un intervalo ordenado válido`);
    }
    finAnterior = hasta;
  });
};

/**
 * Valida dominios, unidades, procedencia y coherencia de composición.
 * @param {{catalogo: Object, historial: Array<Object>}} params
 * @returns {void}
 */
export function validarParametros(params) {
  if (!params || typeof params !== "object" || !params.catalogo) {
    throw new TypeError("Se esperaba un catálogo de parámetros");
  }
  recorrerParametros(params.catalogo, (parametro, ruta) => {
    if (!PROCEDENCIAS.includes(parametro.procedencia)) {
      throw new Error(`${ruta} tiene procedencia inválida`);
    }
    if (typeof parametro.unidad !== "string" || !parametro.unidad || typeof parametro.fuente !== "string" || !parametro.fuente) {
      throw new Error(`${ruta} debe declarar unidad y fuente`);
    }
    if (Array.isArray(parametro.valor)) {
      validarCalendario(parametro.valor, ruta);
      return;
    }
    if (!Number.isFinite(parametro.valor)) throw new Error(`${ruta} debe ser numérico y finito`);
    if (parametro.min !== undefined && parametro.valor < parametro.min) throw new Error(`${ruta} está por debajo de ${parametro.min}`);
    if (parametro.max !== undefined && parametro.valor > parametro.max) throw new Error(`${ruta} está por encima de ${parametro.max}`);
    if (parametro.entero && !Number.isInteger(parametro.valor)) throw new Error(`${ruta} debe ser entero`);
  });

  const ids = params.catalogo.generacion.segmentos.map((segmento) => segmento.id);
  if (new Set(ids).size !== ids.length) throw new Error("Los identificadores poblacionales deben ser únicos");
  const composicion = params.catalogo.composicion;
  const suma = composicion.organica.valor + composicion.pet.valor + composicion.resto.valor;
  if (Math.abs(suma - 1) > 1e-12) {
    throw new Error(`Las fracciones de composición deben sumar 1; suma actual: ${suma}`);
  }
}

/**
 * Construye un catálogo inmutable.
 * @param {Object} [definicion]
 * @returns {{catalogo: Object, historial: Array<Object>}}
 */
export function crearParametros(definicion = DEFINICION_BASE) {
  const params = { catalogo: clonar(definicion), historial: [] };
  validarParametros(params);
  return congelarProfundo(params);
}

/**
 * Extrae un objeto de valores sin metadatos para el núcleo numérico.
 * @param {{catalogo: Object}} params
 * @returns {Object}
 */
export function extraerValores(params) {
  const extraer = (nodo) => {
    if (esParametro(nodo)) return clonar(nodo.valor);
    if (Array.isArray(nodo)) return nodo.map(extraer);
    if (nodo && typeof nodo === "object") {
      return Object.fromEntries(Object.entries(nodo).map(([clave, valor]) => [clave, extraer(valor)]));
    }
    return nodo;
  };
  return extraer(params.catalogo);
}

/**
 * Aplica cambios prospectivos y conserva una bitácora inmutable.
 * @param {{catalogo: Object, historial: Array<Object>}} params
 * @param {Record<string, {valor: unknown, procedencia: Procedencia, fuente: string}>} overrides
 * @param {{tDia?: number, ruta?: string, permitirEstructurales?: boolean}} [contexto]
 * @returns {{catalogo: Object, historial: Array<Object>}}
 */
export function aplicarOverrides(params, overrides, contexto = {}) {
  const catalogo = clonar(params.catalogo);
  const cambios = [];
  for (const [ruta, reemplazo] of Object.entries(overrides ?? {})) {
    const parametro = obtenerEnRuta(catalogo, ruta);
    if (!esParametro(parametro)) throw new Error(`${ruta} no identifica un parámetro escalar o calendario`);
    if (parametro.estructural && !contexto.permitirEstructurales) {
      throw new Error(`${ruta} es estructural y no puede cambiar durante una ramificación`);
    }
    if (!reemplazo || !Object.prototype.hasOwnProperty.call(reemplazo, "valor") || !PROCEDENCIAS.includes(reemplazo.procedencia) || !reemplazo.fuente) {
      throw new Error(`El override ${ruta} debe declarar valor, procedencia y fuente`);
    }
    cambios.push({
      ruta,
      anterior: clonar(parametro.valor),
      nuevo: clonar(reemplazo.valor),
      procedencia: reemplazo.procedencia,
      fuente: reemplazo.fuente,
      tDia: contexto.tDia ?? 0,
      rutaEscenario: contexto.ruta ?? "base",
    });
    parametro.valor = clonar(reemplazo.valor);
    parametro.procedencia = reemplazo.procedencia;
    parametro.fuente = reemplazo.fuente;
  }
  const resultado = { catalogo, historial: [...params.historial.map(clonar), ...cambios] };
  validarParametros(resultado);
  return congelarProfundo(resultado);
}

/**
 * Lista parámetros con trazabilidad completa.
 * @param {{catalogo: Object}} params
 * @param {Procedencia|null} [procedencia]
 * @returns {Array<{ruta: string, valor: unknown, unidad: string, procedencia: Procedencia, fuente: string, descripcion: string, estructural: boolean}>}
 */
export function listarParametros(params, procedencia = null) {
  const resultado = [];
  recorrerParametros(params.catalogo, (parametro, ruta) => {
    if (!procedencia || parametro.procedencia === procedencia) {
      resultado.push({
        ruta,
        valor: clonar(parametro.valor),
        unidad: parametro.unidad,
        procedencia: parametro.procedencia,
        fuente: parametro.fuente,
        descripcion: parametro.descripcion,
        estructural: Boolean(parametro.estructural),
      });
    }
  });
  return resultado;
}

/**
 * Obtiene un parámetro con metadatos por ruta.
 * @param {{catalogo: Object}} params
 * @param {string} ruta
 * @returns {Parametro}
 */
export function obtenerParametro(params, ruta) {
  const parametro = obtenerEnRuta(params.catalogo, ruta);
  if (!esParametro(parametro)) throw new Error(`${ruta} no identifica un parámetro`);
  return parametro;
}
