/** Árbol exploratorio de tres niveles, ordenado de forma declarativa. */

export const CONFIGURACION_EJEMPLO = Object.freeze({
  tInicio: 0,
  tFin: 180,
  dt: 0.25,
  metodo: "rk4",
});

export const ARBOL_EJEMPLO = Object.freeze({
  version: 1,
  raiz: "base",
  puntos: [
    {
      tDia: 45,
      nombre: "campana_participacion",
      alternativas: [
        {
          etiqueta: "participacion_actual",
          nombreVisible: "Participación actual",
          overrides: {},
        },
        {
          etiqueta: "alta_participacion",
          nombreVisible: "Campaña de alta participación",
          overrides: {
            "retroalimentacion.participacionBase": {
              valor: 0.58,
              procedencia: "SUPUESTO",
              fuente: "Escenario exploratorio: campaña de participación",
            },
          },
        },
      ],
    },
    {
      tDia: 90,
      nombre: "capacidad_pet",
      alternativas: [
        {
          etiqueta: "maquina_actual",
          nombreVisible: "Trituradora actual",
          overrides: {},
        },
        {
          etiqueta: "segunda_maquina",
          nombreVisible: "Segunda máquina",
          overrides: {
            "pet.capacidadTrituradoraKgDia": {
              valor: 3.5,
              procedencia: "SUPUESTO",
              fuente: "Escenario exploratorio: capacidad adicional",
            },
          },
        },
      ],
    },
    {
      tDia: 135,
      nombre: "operacion_organica",
      alternativas: [
        {
          etiqueta: "operacion_organica_actual",
          nombreVisible: "Operación orgánica actual",
          overrides: {},
        },
        {
          etiqueta: "separacion_aplicacion_ampliadas",
          nombreVisible: "Separación y aplicación orgánica ampliadas",
          overrides: {
            "organico.cobertura": {
              valor: 0.78,
              procedencia: "SUPUESTO",
              fuente: "Escenario exploratorio: separación orgánica ampliada",
            },
            "organico.tauAplicacionDias": {
              valor: 2.5,
              procedencia: "SUPUESTO",
              fuente: "Escenario exploratorio: mayor ritmo de aplicación",
            },
          },
        },
      ],
    },
  ],
});
