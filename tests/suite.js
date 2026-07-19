import { aplicarOverrides, crearParametros, extraerValores } from "../parametros.js";
import {
  calcularErrorBalance,
  calcularObservables,
  crearEstadoInicial,
  derivadas,
  describirEstado,
  logit,
  puntosDiscontinuidad,
  sigmoide,
  validarMuestra,
} from "../modelo.js";
import { ErrorIntegracion, darPaso, integrarTramo } from "../integrador.js";
import { materializarTrayectoria, simularArbol } from "../arbol.js";
import { aCsvIndicadores, aCsvTrayectoria, crearReporte } from "../reporte.js";
import { ARBOL_EJEMPLO, CONFIGURACION_EJEMPLO } from "../escenarios_ejemplo.js";

const afirmar = (condicion, mensaje) => {
  if (!condicion) throw new Error(mensaje);
};

const casiIgual = (actual, esperado, tolerancia, mensaje) => {
  const error = Math.abs(actual - esperado);
  afirmar(error <= tolerancia, `${mensaje}: actual=${actual}, esperado=${esperado}, error=${error}`);
};

const simular = (spec, config, params = crearParametros(), masaInicial = 0) => {
  const valores = extraerValores(params);
  const layout = describirEstado(valores.organico.nEtapasFermentacion);
  const estadoInicial = crearEstadoInicial(valores);
  return simularArbol({
    spec,
    config,
    paramsBase: params,
    estadoInicial,
    derivadas,
    indicesNoNegativos: layout.noNegativos,
    validarMuestra: (estado, efectivos) => validarMuestra(estado, efectivos, masaInicial),
    obtenerEventos: puntosDiscontinuidad,
  });
};

const ARBOL_CORTO = {
  version: 1,
  raiz: "base",
  puntos: [
    {
      tDia: 20,
      nombre: "participacion",
      alternativas: [
        { etiqueta: "actual", overrides: {} },
        {
          etiqueta: "alta",
          overrides: {
            "retroalimentacion.participacionBase": {
              valor: 0.55,
              procedencia: "SUPUESTO",
              fuente: "Prueba determinista",
            },
          },
        },
      ],
    },
    {
      tDia: 40,
      nombre: "maquina",
      alternativas: [
        { etiqueta: "actual", overrides: {} },
        {
          etiqueta: "ampliada",
          overrides: {
            "pet.capacidadTrituradoraKgDia": {
              valor: 3,
              procedencia: "SUPUESTO",
              fuente: "Prueba determinista",
            },
          },
        },
      ],
    },
  ],
};

const casoBalance = () => {
  for (const metodo of ["euler", "rk4"]) {
    const resultado = simular(ARBOL_CORTO, { tInicio: 0, tFin: 60, dt: 0.2, metodo });
    afirmar(resultado.hojas.length === 4, `Se esperaban cuatro hojas con ${metodo}`);
    for (const hoja of resultado.hojas) {
      for (const muestra of materializarTrayectoria(hoja)) {
        const layout = describirEstado(muestra.valores.organico.nEtapasFermentacion);
        const error = calcularErrorBalance(muestra.estado, muestra.valores).relativo;
        afirmar(error < 1e-9, `Balance inválido en ${hoja.ruta}, t=${muestra.tDia}: ${error}`);
        layout.noNegativos.forEach((indice) => afirmar(muestra.estado[indice] >= 0, `Stock negativo en ${hoja.ruta}`));
      }
    }
  }
};

const casoNoNegatividad = () => {
  const valores = extraerValores(crearParametros());
  valores.generacion.segmentos.forEach((segmento) => { segmento.poblacion = 0; });
  valores.pet.tauCapturaDias = 1;
  const layout = describirEstado(valores.organico.nEtapasFermentacion);
  const estado = crearEstadoInicial(valores);
  estado[layout.petDisperso] = 1;
  let error = null;
  try {
    darPaso(derivadas, estado, valores, 0, 2, "euler", { indicesNoNegativos: layout.noNegativos });
  } catch (capturado) {
    error = capturado;
  }
  afirmar(error instanceof ErrorIntegracion, "El integrador debía fallar ante un stock negativo");
  afirmar(/dt excesivo/.test(error.message), "El mensaje debe identificar un dt excesivo");
};

const terminal = (dt) => {
  const resultado = simular({ version: 1, raiz: "base", puntos: [] }, { tInicio: 0, tFin: 120, dt, metodo: "euler" });
  return resultado.hojas[0];
};

const casoConvergencia = () => {
  const gruesa = terminal(0.2);
  const fina = terminal(0.1);
  const valores = extraerValores(fina.parametrosEfectivos);
  const layout = describirEstado(valores.organico.nEtapasFermentacion);
  const masaEscala = fina.estadoFinal[layout.generado];
  for (const indice of layout.materiales) {
    const denominador = Math.max(Math.abs(fina.estadoFinal[indice]), masaEscala * 1e-9);
    const cambio = Math.abs(gruesa.estadoFinal[indice] - fina.estadoFinal[indice]) / denominador;
    afirmar(cambio < 0.01, `El stock ${indice} no convergió al 1%: ${cambio}`);
  }
};

const casoErlang = () => {
  const valores = extraerValores(crearParametros());
  valores.generacion.segmentos.forEach((segmento) => { segmento.poblacion = 0; });
  valores.composicion.pet = 0;
  valores.composicion.organica = 1;
  valores.composicion.resto = 0;
  const layout = describirEstado(valores.organico.nEtapasFermentacion);
  const estado = crearEstadoInicial(valores);
  estado[layout.fermentacionInicio] = 1;
  const resultado = integrarTramo({
    tInicio: 0,
    tFin: 180,
    dt: 0.02,
    metodo: "rk4",
    indicesNoNegativos: layout.noNegativos,
    validarMuestra: (actual) => validarMuestra(actual, valores, 1),
  }, derivadas, estado, valores);
  let masa = 0;
  let momento1 = 0;
  let momento2 = 0;
  for (let indice = 0; indice < resultado.muestras.length - 1; indice += 1) {
    const a = resultado.muestras[indice];
    const b = resultado.muestras[indice + 1];
    const qa = calcularObservables(a.estado, valores, a.tDia).salidaFermentacion;
    const qb = calcularObservables(b.estado, valores, b.tDia).salidaFermentacion;
    const h = b.tDia - a.tDia;
    masa += h * (qa + qb) / 2;
    momento1 += h * (a.tDia * qa + b.tDia * qb) / 2;
    momento2 += h * (a.tDia ** 2 * qa + b.tDia ** 2 * qb) / 2;
  }
  const media = momento1 / masa;
  const varianza = momento2 / masa - media ** 2;
  const tau = valores.organico.tauFermentacionDias;
  const n = valores.organico.nEtapasFermentacion;
  casiIgual(media, tau, tau * 0.001, "Media Erlang");
  casiIgual(varianza, tau ** 2 / n, (tau ** 2 / n) * 0.002, "Varianza Erlang");
};

const casoSaturacion = () => {
  const valores = extraerValores(crearParametros());
  const participacion = 0.5;
  const entradaAceptada = 3;
  const generacion = entradaAceptada / participacion;
  valores.generacion.segmentos.forEach((segmento, indice) => {
    segmento.poblacion = indice === 0 ? 1 : 0;
    segmento.asistencia = 1;
    segmento.desechosPerCapitaDia = 1;
    segmento.calendario = [{ desde: 0, hasta: 100, multiplicador: 1 }];
  });
  valores.generacion.factorConversion = 1;
  valores.generacion.masaUnitariaKg = generacion;
  valores.composicion.pet = 1;
  valores.composicion.organica = 0;
  valores.composicion.resto = 0;
  valores.pet.cobertura = 1;
  valores.pet.rechazoCaptura = 0;
  valores.pet.tauCapturaDias = 1;
  valores.pet.capacidadTrituradoraKgDia = 2;
  valores.pet.tauProcesoDias = 1;
  valores.retroalimentacion.participacionBase = participacion;
  valores.retroalimentacion.betaRefuerzo = 0;
  valores.retroalimentacion.betaSaturacion = 0;
  const layout = describirEstado(valores.organico.nEtapasFermentacion);
  const estado = crearEstadoInicial(valores);
  estado[layout.logitParticipacion] = logit(participacion);
  estado[layout.petDisperso] = generacion * valores.pet.tauCapturaDias;
  estado[layout.petAcopiado] = 10;
  const inicio = estado[layout.petAcopiado];
  const resultado = integrarTramo({
    tInicio: 0,
    tFin: 10,
    dt: 0.05,
    metodo: "euler",
    indicesNoNegativos: layout.noNegativos,
  }, derivadas, estado, valores);
  const pendiente = (resultado.estadoFinal[layout.petAcopiado] - inicio) / 10;
  casiIgual(pendiente, entradaAceptada - valores.pet.capacidadTrituradoraKgDia, 1e-10, "Pendiente del backlog");
};

const ejecutarEjemplo = () => simular(ARBOL_EJEMPLO, CONFIGURACION_EJEMPLO);

const casoReproducibilidad = () => {
  const primera = crearReporte(ejecutarEjemplo());
  const segunda = crearReporte(ejecutarEjemplo());
  afirmar(aCsvIndicadores(primera) === aCsvIndicadores(segunda), "Los indicadores CSV no son reproducibles");
  afirmar(aCsvTrayectoria(primera.hojas[0]) === aCsvTrayectoria(segunda.hojas[0]), "La trayectoria CSV no es reproducible");
};

const casoArbol = () => {
  const resultado = ejecutarEjemplo();
  const rutasEsperadas = [
    "base/participacion_actual/maquina_actual/bokashi_actual",
    "base/participacion_actual/maquina_actual/bokashi_ampliado",
    "base/participacion_actual/segunda_maquina/bokashi_actual",
    "base/participacion_actual/segunda_maquina/bokashi_ampliado",
    "base/alta_participacion/maquina_actual/bokashi_actual",
    "base/alta_participacion/maquina_actual/bokashi_ampliado",
    "base/alta_participacion/segunda_maquina/bokashi_actual",
    "base/alta_participacion/segunda_maquina/bokashi_ampliado",
  ];
  afirmar(JSON.stringify(resultado.hojas.map((hoja) => hoja.ruta)) === JSON.stringify(rutasEsperadas), "El orden DFS cambió");
  for (const hoja of resultado.hojas) {
    for (let indice = 0; indice < hoja.segmentos.length - 1; indice += 1) {
      const previo = hoja.segmentos[indice];
      const siguiente = hoja.segmentos[indice + 1];
      const fin = previo.muestras[previo.muestras.length - 1].estado;
      const inicio = siguiente.muestras[0].estado;
      afirmar(fin.length === inicio.length && fin.every((valor, posicion) => valor === inicio[posicion]), `La hoja ${hoja.ruta} reinició stocks`);
    }
  }
  let error = null;
  try {
    aplicarOverrides(crearParametros(), {
      "organico.nEtapasFermentacion": { valor: 4, procedencia: "SUPUESTO", fuente: "Prueba" },
    }, { tDia: 30, ruta: "base/invalida" });
  } catch (capturado) {
    error = capturado;
  }
  afirmar(error instanceof Error, "Debe rechazarse un override estructural");
};

const casoParticipacion = () => {
  for (const valor of [-1000, -50, 0, 50, 1000]) {
    const participacion = sigmoide(valor);
    afirmar(participacion >= 0 && participacion <= 1, `Participación fuera de cotas para z=${valor}`);
  }
};

export const CASOS = Object.freeze([
  { nombre: "balance de masa y no negatividad por hoja", ejecutar: casoBalance },
  { nombre: "fallo explícito con dt excesivo", ejecutar: casoNoNegatividad },
  { nombre: "convergencia al reducir dt", ejecutar: casoConvergencia },
  { nombre: "media y varianza de la cadena Erlang", ejecutar: casoErlang },
  { nombre: "crecimiento lineal bajo saturación PET", ejecutar: casoSaturacion },
  { nombre: "reproducibilidad exacta", ejecutar: casoReproducibilidad },
  { nombre: "herencia, orden DFS y parámetros estructurales", ejecutar: casoArbol },
  { nombre: "participación acotada por construcción", ejecutar: casoParticipacion },
]);

/** @returns {Array<{nombre:string,ok:boolean,error?:string,duracionMs:number}>} */
export function ejecutarSuite() {
  return CASOS.map((caso) => {
    const inicio = performance.now();
    try {
      caso.ejecutar();
      return { nombre: caso.nombre, ok: true, duracionMs: performance.now() - inicio };
    } catch (error) {
      return { nombre: caso.nombre, ok: false, error: error?.stack ?? String(error), duracionMs: performance.now() - inicio };
    }
  });
}
