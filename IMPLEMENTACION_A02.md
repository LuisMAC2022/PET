# Implementación A02 · contraste y salvaguardas

Este documento registra por qué se revirtió el primer intento del onboarding y qué contratos conserva el reintento.

## Contraste de versiones

| Área | Base estable `872ba8e` | Primer intento `d0c3960` | Reintento |
|---|---|---|---|
| Inicio | Ejecutaba una corrida automáticamente. | Iniciaba con alcance y calidad de datos, sin autoejecución. | Conserva el inicio guiado exigido por A02; el cálculo requiere revisión. |
| Captura | Editor técnico de escalares y JSON. | Asistente con porcentajes visibles, calendarios, fuentes y escenarios guiados. | Conserva el asistente y mantiene el editor JSON como opción avanzada. |
| Controles numéricos | `dt` y Euler/RK4 estaban en el panel principal. | Se retiraron del DOM y se fijaron internamente. | Permanecen ocultos en “Diagnóstico técnico y compatibilidad”, con los mismos IDs históricos. |
| Identificadores | Usaba `capacidad_bokashi`, `bokashi_actual` y `bokashi_ampliado`. | Cambió los identificadores técnicos al corregir las etiquetas. | Conserva los identificadores históricos; solo cambia el nombre visible. |
| Resultados | Mostraba resultados, stocks, gráficos y tres CSV. | Añadió lectura guiada, comparación, fuentes y diccionario. | Conserva las salidas nuevas y los IDs usados por la versión estable. |
| Verificación | Ocho pruebas numéricas. | Doce pruebas, pero sin contrato DOM ni navegador real. | Añade contrato de compatibilidad y recorrido automatizado en navegador. |

## Causas probables de la regresión

1. El primer intento cambió 10 archivos en un solo salto: 2,690 líneas añadidas y 1,019 eliminadas. Eso mezcló contenido, navegación, compatibilidad y exportación sin puntos de control.
2. Se eliminaron IDs y controles que podían usar enlaces, pruebas o flujos existentes: `simulador`, `parameter-editor`, `dt`, `integrator-method`, `method-pill`, `restore-params`, `restore-tree`, `tree-preview` y `kpi-grid`.
3. Se cambiaron identificadores técnicos del árbol aunque A02 solo pedía corregir su significado visible. Eso alteró rutas y CSV reproducibles.
4. El constructor de escenarios usó `Object.hasOwn`, que no existe en Chrome 92. El fallo fue reproducido: al pulsar “Agregar dato que cambia” se lanzaba `TypeError: Object.hasOwn is not a function` y el cambio no se agregaba.
5. Las pruebas anteriores verificaron el núcleo y contenido, pero no recorrieron la interfaz real. Por ello podían aprobar mientras una interacción del navegador fallaba.

## Salvaguardas del reintento

- Los nombres cotidianos se separan de los identificadores serializados.
- Los controles técnicos siguen fuera del modo normal, pero conservan sus IDs y funcionan como diagnóstico.
- Se evita `Object.hasOwn` y `Array.prototype.at` para ampliar compatibilidad.
- El arranque captura errores y muestra un diagnóstico visible en vez de dejar una página aparentemente vacía.
- Restaurar parámetros o escenarios vuelve a renderizar sin duplicar controles.
- Antes de publicar se recorren bienvenida, pasos, constructor de escenarios, revisión, cálculo y resultados en un navegador headless, además de las pruebas numéricas.
- La bienvenida y los resultados se auditan contra WCAG 2 A/AA; la tabla comparativa es accesible por teclado y las leyendas cumplen contraste.
