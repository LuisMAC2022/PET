/**
 * Núcleo stock-and-flow. Este módulo es deliberadamente autónomo y puro:
 * no importa archivos, no toca el DOM y no conserva estado global.
 */

/**
 * @typedef {Object} LayoutEstado
 * @property {number} petDisperso
 * @property {number} petAcopiado
 * @property {number} organicoDisperso
 * @property {number} fermentacionInicio
 * @property {number} fermentacionFin
 * @property {number} compostaLista
 * @property {number} generado
 * @property {number} relleno
 * @property {number} filamento
 * @property {number} compostaAplicada
 * @property {number} productividadVisible
 * @property {number} logitParticipacion
 * @property {number} longitud
 * @property {number[]} materiales
 * @property {number[]} noNegativos
 */

/**
 * Describe posiciones del vector sin depender de una constante literal para N.
 * @param {number} nEtapas
 * @returns {LayoutEstado}
 */
export function describirEstado(nEtapas) {
  if (!Number.isInteger(nEtapas) || nEtapas < 1) throw new Error("N debe ser un entero positivo");
  const fermentacionInicio = 3;
  const fermentacionFin = fermentacionInicio + nEtapas - 1;
  const compostaLista = fermentacionFin + 1;
  const generado = compostaLista + 1;
  const relleno = generado + 1;
  const filamento = relleno + 1;
  const compostaAplicada = filamento + 1;
  const productividadVisible = compostaAplicada + 1;
  const logitParticipacion = productividadVisible + 1;
  const materiales = [0, 1, 2];
  for (let indice = fermentacionInicio; indice <= compostaLista; indice += 1) materiales.push(indice);
  return Object.freeze({
    petDisperso: 0,
    petAcopiado: 1,
    organicoDisperso: 2,
    fermentacionInicio,
    fermentacionFin,
    compostaLista,
    generado,
    relleno,
    filamento,
    compostaAplicada,
    productividadVisible,
    logitParticipacion,
    longitud: logitParticipacion + 1,
    materiales: Object.freeze(materiales),
    noNegativos: Object.freeze([...materiales, generado, relleno, filamento, compostaAplicada, productividadVisible]),
  });
}

/** @param {number} probabilidad @returns {number} */
export function logit(probabilidad) {
  if (!(probabilidad > 0 && probabilidad < 1)) throw new Error("La participación debe pertenecer al intervalo abierto (0, 1)");
  return Math.log(probabilidad / (1 - probabilidad));
}

/** @param {number} valor @returns {number} */
export function sigmoide(valor) {
  if (valor >= 0) {
    const exponencial = Math.exp(-valor);
    return 1 / (1 + exponencial);
  }
  const exponencial = Math.exp(valor);
  return exponencial / (1 + exponencial);
}

/**
 * @param {Object} params Valores numéricos, sin metadatos.
 * @returns {Float64Array}
 */
export function crearEstadoInicial(params) {
  const layout = describirEstado(params.organico.nEtapasFermentacion);
  const estado = new Float64Array(layout.longitud);
  estado[layout.productividadVisible] = 0;
  estado[layout.logitParticipacion] = logit(params.retroalimentacion.participacionInicial);
  return estado;
}

const multiplicadorCalendario = (calendario, tDia) => {
  for (const tramo of calendario) {
    if (tDia >= tramo.desde && tDia < tramo.hasta) return tramo.multiplicador;
  }
  return 0;
};

/**
 * @param {Object} params
 * @param {number} tDia
 * @returns {number} kg/día
 */
export function calcularGeneracion(params, tDia) {
  let suma = 0;
  for (const segmento of params.generacion.segmentos) {
    const poblacion = segmento.poblacion * multiplicadorCalendario(segmento.calendario, tDia);
    suma += poblacion * segmento.asistencia * segmento.desechosPerCapitaDia;
  }
  return suma * params.generacion.factorConversion * params.generacion.masaUnitariaKg;
}

const captura = (disperso, configuracion, participacion) => {
  const disponible = disperso / configuracion.tauCapturaDias;
  const intento = disponible * configuracion.cobertura * participacion;
  const aceptado = (1 - configuracion.rechazoCaptura) * intento;
  const noCapturado = disponible - intento;
  const rechazo = configuracion.rechazoCaptura * intento;
  return { disponible, intento, aceptado, noCapturado, rechazo };
};

/**
 * Calcula auxiliares y flujos sin modificar el estado.
 * @param {Float64Array} estado
 * @param {Object} params
 * @param {number} tDia
 * @returns {Object}
 */
export function calcularObservables(estado, params, tDia) {
  const layout = describirEstado(params.organico.nEtapasFermentacion);
  if (estado.length !== layout.longitud) throw new Error("La dimensión del estado no coincide con N");

  const generacion = calcularGeneracion(params, tDia);
  const generacionPet = params.composicion.pet * generacion;
  const generacionOrganica = params.composicion.organica * generacion;
  const generacionResto = params.composicion.resto * generacion;
  const participacion = sigmoide(estado[layout.logitParticipacion]);
  const capturaPet = captura(estado[layout.petDisperso], params.pet, participacion);
  const capturaOrganica = captura(estado[layout.organicoDisperso], params.organico, participacion);
  const procesamientoPet = Math.min(
    estado[layout.petAcopiado] / params.pet.tauProcesoDias,
    params.pet.capacidadTrituradoraKgDia,
  );
  const filamento = (1 - params.pet.rechazoProceso) * procesamientoPet;
  const rechazoProcesoPet = params.pet.rechazoProceso * procesamientoPet;
  const tasaErlang = params.organico.nEtapasFermentacion / params.organico.tauFermentacionDias;
  const salidaFermentacion = tasaErlang * estado[layout.fermentacionFin];
  const aplicacion = estado[layout.compostaLista] / params.organico.tauAplicacionDias;
  const senalHuerto = aplicacion / (params.retroalimentacion.flujoAplicacionReferenciaKgDia + aplicacion);
  const saturacion = estado[layout.petAcopiado] / params.pet.capacidadAlmacenKg;
  const logitObjetivo = logit(params.retroalimentacion.participacionBase)
    + params.retroalimentacion.betaRefuerzo * estado[layout.productividadVisible]
    - params.retroalimentacion.betaSaturacion * saturacion;
  const rellenoPet = capturaPet.noCapturado + capturaPet.rechazo + rechazoProcesoPet;
  const rellenoOrganico = capturaOrganica.noCapturado + capturaOrganica.rechazo;

  return {
    generacion,
    generacionPet,
    generacionOrganica,
    generacionResto,
    participacion,
    capturaPet,
    capturaOrganica,
    procesamientoPet,
    filamento,
    rechazoProcesoPet,
    tasaErlang,
    salidaFermentacion,
    aplicacion,
    senalHuerto,
    saturacion,
    logitObjetivo,
    rellenoPet,
    rellenoOrganico,
  };
}

/**
 * Ecuaciones diferenciales del sistema completo.
 * @param {Float64Array} estado
 * @param {Object} params
 * @param {number} tDia
 * @returns {Float64Array}
 */
export function derivadas(estado, params, tDia) {
  const layout = describirEstado(params.organico.nEtapasFermentacion);
  const flujo = calcularObservables(estado, params, tDia);
  const d = new Float64Array(layout.longitud);

  d[layout.petDisperso] = flujo.generacionPet - flujo.capturaPet.disponible;
  d[layout.petAcopiado] = flujo.capturaPet.aceptado - flujo.procesamientoPet;
  d[layout.organicoDisperso] = flujo.generacionOrganica - flujo.capturaOrganica.disponible;

  d[layout.fermentacionInicio] = flujo.capturaOrganica.aceptado
    - flujo.tasaErlang * estado[layout.fermentacionInicio];
  for (let indice = layout.fermentacionInicio + 1; indice <= layout.fermentacionFin; indice += 1) {
    d[indice] = flujo.tasaErlang * estado[indice - 1] - flujo.tasaErlang * estado[indice];
  }
  d[layout.compostaLista] = flujo.salidaFermentacion - flujo.aplicacion;

  d[layout.generado] = flujo.generacion;
  d[layout.relleno] = flujo.generacionResto + flujo.rellenoPet + flujo.rellenoOrganico;
  d[layout.filamento] = flujo.filamento;
  d[layout.compostaAplicada] = flujo.aplicacion;
  d[layout.productividadVisible] = (flujo.senalHuerto - estado[layout.productividadVisible])
    / params.retroalimentacion.tauVisibilidadDias;
  d[layout.logitParticipacion] = (flujo.logitObjetivo - estado[layout.logitParticipacion])
    / params.retroalimentacion.tauParticipacionDias;
  return d;
}

/**
 * Suma stocks materiales, excluyendo información y contadores.
 * @param {Float64Array} estado
 * @param {Object} params
 * @returns {number}
 */
export function masaEnStocks(estado, params) {
  const layout = describirEstado(params.organico.nEtapasFermentacion);
  return layout.materiales.reduce((suma, indice) => suma + estado[indice], 0);
}

/**
 * Calcula el residuo y error relativo del balance global.
 * @param {Float64Array} estado
 * @param {Object} params
 * @param {number} [masaInicial]
 * @returns {{residuo: number, relativo: number}}
 */
export function calcularErrorBalance(estado, params, masaInicial = 0) {
  const layout = describirEstado(params.organico.nEtapasFermentacion);
  const entradas = masaInicial + estado[layout.generado];
  const contabilizado = masaEnStocks(estado, params)
    + estado[layout.relleno]
    + estado[layout.filamento]
    + estado[layout.compostaAplicada];
  const residuo = contabilizado - entradas;
  return {
    residuo,
    relativo: entradas > 0 ? Math.abs(residuo) / entradas : Math.abs(residuo),
  };
}

/**
 * Verifica balance y cotas informacionales después de un paso aceptado.
 * @param {Float64Array} estado
 * @param {Object} params
 * @param {number} [masaInicial]
 * @param {number} [tolerancia]
 * @returns {void}
 */
export function validarMuestra(estado, params, masaInicial = 0, tolerancia = 1e-9) {
  const layout = describirEstado(params.organico.nEtapasFermentacion);
  const error = calcularErrorBalance(estado, params, masaInicial);
  if (error.relativo >= tolerancia) {
    throw new Error(`Balance de masa fuera de tolerancia: ${error.relativo}`);
  }
  const visible = estado[layout.productividadVisible];
  if (visible < 0 || visible > 1) {
    throw new Error(`Productividad visible fuera de [0,1]: ${visible}; revise dt`);
  }
}

/**
 * Devuelve discontinuidades declaradas de los calendarios poblacionales.
 * @param {Object} params
 * @returns {number[]}
 */
export function puntosDiscontinuidad(params) {
  const puntos = new Set();
  for (const segmento of params.generacion.segmentos) {
    for (const tramo of segmento.calendario) {
      puntos.add(tramo.desde);
      puntos.add(tramo.hasta);
    }
  }
  return [...puntos].filter(Number.isFinite).sort((a, b) => a - b);
}
