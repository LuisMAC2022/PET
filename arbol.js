import { aplicarOverrides, extraerValores } from "./parametros.js";
import { integrarTramo } from "./integrador.js";

const ETIQUETA_VALIDA = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

/**
 * Verifica forma, tiempo y orden del árbol declarativo.
 * @param {Object} spec
 * @param {Object} paramsBase
 * @param {{tInicio: number, tFin: number}} horizonte
 * @returns {void}
 */
export function validarSpecArbol(spec, paramsBase, horizonte) {
  if (!spec || spec.version !== 1 || !ETIQUETA_VALIDA.test(spec.raiz ?? "")) {
    throw new Error("El árbol debe declarar version: 1 y una etiqueta raíz válida");
  }
  if (!Array.isArray(spec.puntos)) throw new Error("El árbol debe contener una lista de puntos");
  let tiempoAnterior = horizonte.tInicio;
  for (const [indice, punto] of spec.puntos.entries()) {
    if (!Number.isFinite(punto.tDia) || punto.tDia <= tiempoAnterior || punto.tDia >= horizonte.tFin) {
      throw new Error(`El punto ${indice} debe estar dentro del horizonte y en orden estrictamente creciente`);
    }
    if (!ETIQUETA_VALIDA.test(punto.nombre ?? "")) throw new Error(`Nombre inválido en el punto ${indice}`);
    if (!Array.isArray(punto.alternativas) || punto.alternativas.length === 0) {
      throw new Error(`El punto ${punto.nombre} no tiene alternativas`);
    }
    const etiquetas = new Set();
    for (const alternativa of punto.alternativas) {
      if (!ETIQUETA_VALIDA.test(alternativa.etiqueta ?? "")) {
        throw new Error(`Etiqueta inválida en ${punto.nombre}`);
      }
      if (etiquetas.has(alternativa.etiqueta)) throw new Error(`Etiqueta duplicada en ${punto.nombre}`);
      etiquetas.add(alternativa.etiqueta);
      if (!alternativa.overrides || typeof alternativa.overrides !== "object" || Array.isArray(alternativa.overrides)) {
        throw new Error(`Los overrides de ${alternativa.etiqueta} deben ser un objeto`);
      }
    }
    tiempoAnterior = punto.tDia;
  }
  if (!paramsBase?.catalogo) throw new Error("Faltan los parámetros base trazables");
}

/**
 * Construye el árbol con DFS. Cada prefijo se integra una sola vez y se comparte
 * de forma inmutable entre sus hijos.
 * @param {Object} opciones
 * @param {Object} opciones.spec
 * @param {Float64Array} opciones.estadoInicial
 * @param {Object} opciones.paramsBase
 * @param {{tInicio:number,tFin:number,dt:number,metodo:'euler'|'rk4'}} opciones.config
 * @param {(estado:Float64Array,params:Object,tDia:number)=>Float64Array} opciones.derivadas
 * @param {number[]} opciones.indicesNoNegativos
 * @param {(estado:Float64Array,params:Object,tDia:number)=>void} [opciones.validarMuestra]
 * @param {(params:Object)=>number[]} [opciones.obtenerEventos]
 * @returns {{spec:Object, config:Object, paramsBase:Object, hojas:Array<Object>}}
 */
export function simularArbol(opciones) {
  const {
    spec,
    estadoInicial,
    paramsBase,
    config,
    derivadas,
    indicesNoNegativos,
    validarMuestra,
    obtenerEventos,
  } = opciones;
  validarSpecArbol(spec, paramsBase, config);
  const hojas = [];

  const integrarNodo = (nodo, destino) => {
    const valores = extraerValores(nodo.parametros);
    const eventos = obtenerEventos ? obtenerEventos(valores) : [];
    const tramo = integrarTramo({
      tInicio: nodo.tDia,
      tFin: destino,
      dt: config.dt,
      metodo: config.metodo,
      puntosForzados: eventos,
      indicesNoNegativos,
      validarMuestra,
    }, derivadas, nodo.estado, valores);
    return {
      estado: tramo.estadoFinal,
      segmento: Object.freeze({
        tInicio: nodo.tDia,
        tFin: destino,
        parametros: nodo.parametros,
        valores,
        muestras: tramo.muestras,
        rutaActiva: nodo.ruta.join("/"),
      }),
    };
  };

  const explorar = (nodo, indicePunto) => {
    if (indicePunto >= spec.puntos.length) {
      const integrado = integrarNodo(nodo, config.tFin);
      hojas.push(Object.freeze({
        ruta: nodo.ruta.join("/"),
        etiquetas: Object.freeze([...nodo.ruta]),
        estadoFinal: new Float64Array(integrado.estado),
        parametrosEfectivos: nodo.parametros,
        segmentos: Object.freeze([...nodo.segmentos, integrado.segmento]),
      }));
      return;
    }

    const punto = spec.puntos[indicePunto];
    const integrado = integrarNodo(nodo, punto.tDia);
    const segmentos = Object.freeze([...nodo.segmentos, integrado.segmento]);
    for (const alternativa of punto.alternativas) {
      const ruta = [...nodo.ruta, alternativa.etiqueta];
      const parametros = aplicarOverrides(nodo.parametros, alternativa.overrides, {
        tDia: punto.tDia,
        ruta: ruta.join("/"),
      });
      explorar({
        estado: new Float64Array(integrado.estado),
        parametros,
        tDia: punto.tDia,
        ruta,
        segmentos,
      }, indicePunto + 1);
    }
  };

  explorar({
    estado: new Float64Array(estadoInicial),
    parametros: paramsBase,
    tDia: config.tInicio,
    ruta: [spec.raiz],
    segmentos: Object.freeze([]),
  }, 0);

  return Object.freeze({ spec, config: Object.freeze({ ...config }), paramsBase, hojas: Object.freeze(hojas) });
}

/**
 * Materializa una trayectoria lógica completa respetando parámetros prospectivos.
 * En una frontera se conserva la muestra del segmento hijo (semántica por derecha).
 * @param {{segmentos:Array<Object>}} hoja
 * @returns {Array<{tDia:number,estado:Float64Array,parametros:Object,valores:Object,rutaActiva:string}>}
 */
export function materializarTrayectoria(hoja) {
  const trayectoria = [];
  hoja.segmentos.forEach((segmento, indiceSegmento) => {
    const esUltimo = indiceSegmento === hoja.segmentos.length - 1;
    const limite = esUltimo ? segmento.muestras.length : Math.max(0, segmento.muestras.length - 1);
    for (let indice = 0; indice < limite; indice += 1) {
      const muestra = segmento.muestras[indice];
      trayectoria.push({
        tDia: muestra.tDia,
        estado: new Float64Array(muestra.estado),
        parametros: segmento.parametros,
        valores: segmento.valores,
        rutaActiva: segmento.rutaActiva,
      });
    }
  });
  return trayectoria;
}
