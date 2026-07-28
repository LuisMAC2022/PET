# Tablero multidisciplinario del proyecto PET

Este archivo es la referencia versionable para incorporarse al proyecto, elegir una tarea y acordar su cierre. El recorrido visible actual es **Estimación → Propuesta → Simulación**. El mapa se conserva en el repositorio para una iteración posterior, pero no forma parte del recorrido ni de los criterios de aceptación actuales.

## Antes de elegir una tarea

1. Leer Estimación y Propuesta en `presentacion.html`.
2. Completar una ruta limpia y una contaminada en `reciclaje_pet_fase1.html`.
3. Elegir una tarea compatible con la experiencia o habilidad que se desea desarrollar.
4. Confirmar con la coordinación: responsable, alcance, fecha, dependencias y evidencia de aceptación.
5. Trabajar con revisión cruzada de al menos otra disciplina y registrar fuentes, método, archivos y límites.

Marcar interés no equivale a quedar asignado. La coordinación debe evitar duplicidades y confirmar quién integra cada entrega.

## Cambios editoriales ya aplicados

- Se distinguen **PET generado, recuperado, aceptado y útil**; “reciclado” no se usa como sinónimo de “recolectado”.
- Las cifras se redondean según la calidad del dato y los valores sin fuente local se identifican como demostrativos.
- El aprendizaje y el cambio de conducta se formulan como hipótesis por evaluar, no como efectos demostrados.
- El mapa se retiró temporalmente del recorrido y la validación enlaza directamente Propuesta con Simulación.

## Lista de tareas

| ID | Prioridad | Estado | Perfiles sugeridos | Tarea | Evidencia de aceptación | Dependencias |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | P0 | [ ] | Investigación documental, gestión ambiental | Confirmar días operativos, recuperación atribuida a ECOCE, ruta institucional y vínculo con HUMAN STEM. | Matriz de fuentes con afirmación respaldada, responsable, fecha, periodo, método y alcance. | Acceso a documentos y contactos institucionales. |
| T02 | P0 | [ ] | Estadística, ciencia de datos | Auditar fórmulas, unidades, escenarios, intervalos y balance entre generado, recuperado, aceptado y útil. | Cálculo reproducible y registro de supuestos, errores y sensibilidad. | Definiciones de alcance de T01. |
| T03 | P0 | [ ] | Trabajo de campo, operaciones, estadística | Diseñar y ejecutar la línea base de botellas, masa seca, rechazo y contaminación por zona, día y turno. | Protocolo, datos anonimizados, bitácora visual y resumen con incertidumbre. | Permisos, seguridad y criterios operativos de T01. |
| T04 | P0 | [ ] | Pedagogía, psicología, UX research | Crear la evaluación pre/post sobre cadena de valor, balance de masa y consecuencias de contaminación. | Instrumento, clave, plan de análisis, consentimiento y umbral previo al piloto. | Objetivos de aprendizaje y recorrido estable. |
| T05 | P0 | [ ] | Desarrollo web, datos, privacidad | Instrumentar inicio, decisiones, bloqueos, errores, omisiones, tiempo, precio y finalización. | Diccionario de eventos, implementación probada y política de conservación sin datos personales innecesarios. | Variables de análisis acordadas con T04. |
| T06 | P0 | [ ] | QA, accesibilidad, frontend | Automatizar el recorrido de Estimación a Propuesta y luego a Simulación, ruta limpia, ruta contaminada y regreso al documento. | Pruebas repetibles y reporte en móvil, teclado, lector de pantalla y movimiento reducido. | Versión del recorrido congelada para el piloto. |
| T07 | P1 | [ ] | Economía, gestión de residuos | Calibrar precios, descuentos y rechazos del PET limpio, mezclado o húmedo. | Tabla versionada con fuente, unidad, vigencia, rango y regla implementable. | Comprador o gestor confirmado en T01. |
| T08 | P1 | [ ] | Materiales, mecánica, biomédica | Definir la ruta técnica de selección, lavado, secado, extrusión, caracterización y ensayos del rPET. | Diagrama de proceso, criterios de avance, riesgos y límites antes de considerar uso protésico. | Actor técnico y composición del flujo confirmados. |
| T09 | P1 | [ ] | Edición, diseño, comunicación científica | Revisar lenguaje, fuentes, cifras, causalidad, jerarquía visual y comprensión para personas nuevas. | Lista de control resuelta y revisión cruzada de afirmaciones, figuras y referencias. | Resultados estabilizados de T01–T04. |
| T10 | P1 | [ ] | Coordinación, ética, evaluación | Integrar piloto, responsables, riesgos, consentimientos, comparación y umbrales para decidir. | Protocolo aprobado, matriz RACI, calendario y acta para iterar, escalar o detener. | T03–T06 listas y recursos confirmados. |

## Trabajo funcional ya disponible

- [x] La simulación permite generar o esperar, recolectar, acondicionar y vender una botella.
- [x] Tapa, etiqueta, líquido, humedad y compresión producen consecuencias visibles.
- [x] El recorrido visible presenta Estimación, Propuesta y Simulación en ese orden.
- [x] La simulación permite volver a la Propuesta.
- [x] Los valores económicos demostrativos se señalan como pendientes de calibración local.

## Regla de calidad para cualquier entrega

Una tarea solo cambia a `[x]` cuando:

1. tiene una persona responsable y una revisión cruzada identificadas;
2. incluye fuente, fecha, método, alcance y archivos reproducibles;
3. satisface la evidencia de aceptación de su fila;
4. documenta datos faltantes, incertidumbre, riesgos y límites;
5. actualiza el documento y, cuando corresponda, la simulación y sus pruebas;
6. registra la decisión resultante sin atribuir causalidad más allá del diseño utilizado.

## Orden sugerido

**T01 → T02/T03 → T04/T05/T06 → T07/T08/T09 → T10.** Las tareas que comparten etapa pueden avanzar en paralelo una vez que sus dependencias estén acordadas.
