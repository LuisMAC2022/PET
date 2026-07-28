# Supuestos y datos pendientes de Ciclo Tierra

Este documento registra los datos que todavía no existen y las decisiones demostrativas usadas para integrar el proyecto hermano de recolección de residuos orgánicos sin modificar ni sustituir el proyecto PET original.

## Estructura de integración

- El proyecto PET original permanece en la raíz del repositorio.
- Ciclo Tierra está contenido en `ciclo-tierra/`.
- `proyectos.html` es el selector común de ambos proyectos.
- Los proyectos comparten únicamente `acatlan.png` y `mapa_vectorizado.svg`.
- Cada proyecto conserva sus propios archivos de datos, simulador, navegación, tareas y claves de `localStorage`.

## Supuestos del mapa demostrativo

1. **No hay puntos reales definidos.** Las diez coordenadas de `ciclo-tierra/puntos.json` solo permiten demostrar búsqueda, filtros, selección y vínculos con el simulador.
2. Se muestran exactamente **seis puntos de acopio** (`A-01` a `A-06`) y **cuatro puntos de procesamiento** (`P-01` a `P-04`).
3. Los cuatro puntos de procesamiento representan etapas conceptuales: recepción y control, preparación y mezcla, compostaje activo, y curado y cribado. No implican que deban existir cuatro instalaciones físicas.
4. Las coordenadas reutilizan posiciones disponibles en el lienzo del mapa original. No expresan prioridad, distancia óptima, propiedad del espacio, disponibilidad de servicios ni autorización institucional.
5. Los nombres son genéricos para evitar atribuir funciones a edificios o áreas no validados.
6. No se calculan rutas, tiempos de traslado, pendientes, accesibilidad, seguridad ni zonas de influencia.

## Parámetros demostrativos por acopio

| Punto | Capacidad supuesta | Tasa base supuesta | Perfil horario del demo |
| --- | ---: | ---: | --- |
| A-01 | 60 kg | 5 kg/h | Desayuno |
| A-02 | 80 kg | 7 kg/h | Actividad distribuida |
| A-03 | 100 kg | 10 kg/h | Comida |
| A-04 | 60 kg | 4 kg/h | Actividad distribuida |
| A-05 | 70 kg | 6 kg/h | Actividad distribuida |
| A-06 | 60 kg | 5 kg/h | Comida |

Estos valores no provienen de pesajes, aforos, ventas ni capacidad instalada. Solo producen diferencias visibles entre instancias del simulador.

## Parámetros demostrativos de procesamiento

Las capacidades de 250, 300, 600 y 400 kg asociadas a `P-01`–`P-04` son marcadores de interfaz. No representan diseño de pilas, inventario simultáneo, tiempo de residencia ni capacidad anual.

## Reglas del simulador

- Cada llegada representa 1 kg de residuo orgánico húmedo.
- Las llegadas usan un proceso de Poisson no homogéneo y una escala de 1 segundo real por 1 minuto simulado.
- La probabilidad inicial de impropios es 38% para que puedan practicarse rutas limpias y contaminadas; no es una caracterización del campus.
- El rendimiento máximo se fijó en 0.38 kg de composta potencial por kg de aporte húmedo.
- Las penalizaciones por falta de troceado, estructurante, humedad objetivo o aireación son reglas didácticas, no coeficientes de proceso.
- “Incorporar a la pila” no simula temperatura, oxígeno, pH, patógenos, emisiones, tiempo, curado, estabilidad ni calidad agronómica.
- El estado se almacena en el navegador y no constituye una bitácora operativa compartida.

## Regla conservadora de materiales

La demo acepta principalmente restos vegetales, fruta, café y materiales secos limpios. Excluye carne, lácteos, grasas, residuos sanitarios y productos etiquetados como compostables hasta que un protocolo y una tecnología local indiquen expresamente lo contrario.

## Datos requeridos antes de proponer ubicaciones

- Caracterización de orgánicos e impropios por fuente, zona, día y turno.
- Aforo, horarios y responsables de cada posible generador.
- Capacidad, ventilación, sombra, drenaje, agua, energía y control de acceso.
- Frecuencia máxima de recolección y tiempo admisible de permanencia.
- Distancias, rutas seguras, accesibilidad y medios de transporte.
- Método de compostaje, formulación, tiempo de residencia y capacidad simultánea.
- Manejo de olores, vectores, lixiviados, contingencias y equipo de protección.
- Permisos, responsables institucionales, presupuesto y destino de la composta.
- Criterios de aceptación, madurez, calidad y regla para suspender el piloto.

Hasta reunir estos datos, el mapa debe describirse únicamente como **muestra demostrativa de interfaz**.
