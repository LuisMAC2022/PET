/** Integradores explícitos deterministas para vectores numéricos. */

export class ErrorIntegracion extends Error {
  /** @param {string} mensaje @param {Object} detalle */
  constructor(mensaje, detalle = {}) {
    super(mensaje);
    this.name = "ErrorIntegracion";
    this.detalle = detalle;
  }
}

const copiar = (estado) => new Float64Array(estado);

const combinar = (base, terminos) => {
  const resultado = new Float64Array(base.length);
  for (let indice = 0; indice < base.length; indice += 1) {
    let valor = base[indice];
    for (const [factor, vector] of terminos) valor += factor * vector[indice];
    resultado[indice] = valor;
  }
  return resultado;
};

const validarVector = (estado, indicesNoNegativos, contexto) => {
  for (let indice = 0; indice < estado.length; indice += 1) {
    if (!Number.isFinite(estado[indice])) {
      throw new ErrorIntegracion(
        `Estado no finito en índice ${indice}, t=${contexto.tDia}; revise parámetros y dt`,
        { ...contexto, indice, valor: estado[indice] },
      );
    }
  }
  for (const indice of indicesNoNegativos) {
    if (estado[indice] < 0) {
      throw new ErrorIntegracion(
        `Stock negativo en índice ${indice}, t=${contexto.tDia}; dt excesivo (${contexto.h} días)`,
        { ...contexto, indice, valor: estado[indice] },
      );
    }
  }
};

/**
 * Avanza un paso con Euler o RK4 detrás de la misma interfaz.
 * @param {(estado: Float64Array, params: Object, tDia: number) => Float64Array} funcionDerivadas
 * @param {Float64Array} estado
 * @param {Object} params
 * @param {number} tDia
 * @param {number} h
 * @param {'euler'|'rk4'} metodo
 * @param {{indicesNoNegativos?: number[]}} [opciones]
 * @returns {Float64Array}
 */
export function darPaso(funcionDerivadas, estado, params, tDia, h, metodo, opciones = {}) {
  if (!(h > 0) || !Number.isFinite(h)) throw new ErrorIntegracion("dt debe ser positivo y finito", { tDia, h, metodo });
  const indicesNoNegativos = opciones.indicesNoNegativos ?? [];
  const contexto = { tDia, h, metodo };
  validarVector(estado, indicesNoNegativos, contexto);

  if (metodo === "euler") {
    const k1 = funcionDerivadas(estado, params, tDia);
    const siguiente = combinar(estado, [[h, k1]]);
    validarVector(siguiente, indicesNoNegativos, { ...contexto, tDia: tDia + h, etapa: "final" });
    return siguiente;
  }

  if (metodo !== "rk4") throw new ErrorIntegracion(`Método desconocido: ${metodo}`, contexto);
  const k1 = funcionDerivadas(estado, params, tDia);
  const y2 = combinar(estado, [[h / 2, k1]]);
  validarVector(y2, indicesNoNegativos, { ...contexto, tDia: tDia + h / 2, etapa: "k2" });
  const k2 = funcionDerivadas(y2, params, tDia + h / 2);
  const y3 = combinar(estado, [[h / 2, k2]]);
  validarVector(y3, indicesNoNegativos, { ...contexto, tDia: tDia + h / 2, etapa: "k3" });
  const k3 = funcionDerivadas(y3, params, tDia + h / 2);
  const y4 = combinar(estado, [[h, k3]]);
  validarVector(y4, indicesNoNegativos, { ...contexto, tDia: tDia + h, etapa: "k4" });
  const k4 = funcionDerivadas(y4, params, tDia + h);
  const siguiente = combinar(estado, [
    [h / 6, k1],
    [h / 3, k2],
    [h / 3, k3],
    [h / 6, k4],
  ]);
  validarVector(siguiente, indicesNoNegativos, { ...contexto, tDia: tDia + h, etapa: "final" });
  return siguiente;
}

/**
 * @typedef {Object} ConfiguracionTramo
 * @property {number} tInicio
 * @property {number} tFin
 * @property {number} dt
 * @property {'euler'|'rk4'} metodo
 * @property {number[]} [puntosForzados]
 * @property {number[]} [indicesNoNegativos]
 * @property {(estado: Float64Array, params: Object, tDia: number) => void} [validarMuestra]
 */

/**
 * Integra un tramo y aterriza exactamente en cada discontinuidad declarada.
 * @param {ConfiguracionTramo} config
 * @param {(estado: Float64Array, params: Object, tDia: number) => Float64Array} funcionDerivadas
 * @param {Float64Array} estadoInicial
 * @param {Object} params
 * @returns {{tInicio: number, tFin: number, muestras: Array<{tDia: number, estado: Float64Array}>, estadoFinal: Float64Array}}
 */
export function integrarTramo(config, funcionDerivadas, estadoInicial, params) {
  const { tInicio, tFin, dt, metodo } = config;
  if (![tInicio, tFin, dt].every(Number.isFinite) || tFin < tInicio || dt <= 0) {
    throw new ErrorIntegracion("Configuración temporal inválida", { tInicio, tFin, dt, metodo });
  }
  const eventos = [...new Set(config.puntosForzados ?? [])]
    .filter((punto) => Number.isFinite(punto) && punto > tInicio && punto < tFin)
    .sort((a, b) => a - b);
  const muestras = [{ tDia: tInicio, estado: copiar(estadoInicial) }];
  let estado = copiar(estadoInicial);
  let tDia = tInicio;
  let indiceEvento = 0;
  const epsilonTiempo = 1e-12;

  validarVector(estado, config.indicesNoNegativos ?? [], { tDia, h: dt, metodo, etapa: "inicial" });
  config.validarMuestra?.(estado, params, tDia);

  while (tDia < tFin - epsilonTiempo) {
    while (indiceEvento < eventos.length && eventos[indiceEvento] <= tDia + epsilonTiempo) indiceEvento += 1;
    const siguienteEvento = indiceEvento < eventos.length ? eventos[indiceEvento] : tFin;
    const destino = Math.min(tFin, siguienteEvento);
    const h = Math.min(dt, destino - tDia);
    if (h <= epsilonTiempo) {
      tDia = destino;
      continue;
    }
    estado = darPaso(funcionDerivadas, estado, params, tDia, h, metodo, {
      indicesNoNegativos: config.indicesNoNegativos,
    });
    tDia += h;
    if (Math.abs(tDia - destino) <= epsilonTiempo) tDia = destino;
    if (Math.abs(tDia - tFin) <= epsilonTiempo) tDia = tFin;
    config.validarMuestra?.(estado, params, tDia);
    muestras.push({ tDia, estado: copiar(estado) });
  }

  return { tInicio, tFin, muestras, estadoFinal: copiar(estado) };
}
