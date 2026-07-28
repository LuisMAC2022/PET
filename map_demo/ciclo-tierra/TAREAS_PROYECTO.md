# Tablero multidisciplinario del proyecto hermano Ciclo Tierra

Este archivo es la referencia versionable para convertir el MVP digital en un piloto verificable de recolección de residuos orgánicos para compostaje. El recorrido visible es **Estimación → Propuesta → Mapa → Simulación**.

## Antes de elegir una tarea

1. Leer Estimación y Propuesta en `presentacion.html`.
2. Explorar al menos un punto demostrativo de acopio y uno de procesamiento en `index.html`.
3. Completar una ruta limpia y una contaminada en `compostaje_fase1.html`.
4. Acordar con coordinación: responsable, alcance, fecha, dependencias y evidencia de aceptación.
5. Trabajar con revisión cruzada y registrar fuente, método, archivos, incertidumbre, riesgos y límites.

Marcar interés no equivale a una asignación. Las ubicaciones, capacidades, horarios, tasas y rendimientos actuales son hipótesis de diseño, no datos institucionales.

## Correspondencia ya implementada

- Se distinguen **orgánicos generados (G), recolectados (R), aceptados (A) y composta madura (C)**.
- El mapa integra seis puntos demostrativos de acopio y cuatro de procesamiento; ninguna coordenada es todavía una ubicación propuesta.
- Cada uno de los seis acopios tiene una instancia persistente del simulador y un perfil horario independiente.
- El simulador modela impropios, tamaño de partícula, estructurante, humedad y aireación.
- “Incorporar a la pila” produce una estimación de composta potencial; no simula tiempo, temperatura, madurez ni calidad agronómica.
- Se preservan navegación por teclado, foco visible, regiones vivas y preferencia de movimiento reducido.

## Lista de tareas

| ID | Prioridad | Estado | Perfiles sugeridos | Tarea | Evidencia de aceptación | Dependencias |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | P0 | [ ] | Gestión ambiental, normatividad, coordinación | Confirmar alcance institucional, responsables, permisos, fuentes aceptadas y destino de la composta. | Matriz de fuentes y decisiones con responsable, fecha, periodo, autoridad y límites. | Acceso a responsables del campus. |
| T02 | P0 | [ ] | Estadística, ciencia de datos, ingeniería | Auditar fórmulas, unidades, escenarios, incertidumbre y balance entre G, R, A y C. | Cálculo reproducible, pruebas de unidades, sensibilidad y registro de supuestos. | Alcance acordado en T01. |
| T03 | P0 | [ ] | Campo, operaciones, estadística | Diseñar y ejecutar la línea base de orgánicos, poda e impropios por fuente, zona, día y turno. | Protocolo, datos anonimizados, taras, bitácora y resumen con incertidumbre. | Permisos, seguridad y estratos de T01. |
| T04 | P0 | [ ] | Pedagogía, psicología, UX research | Crear evaluación pre/post sobre balance de masa, impropios, proceso y madurez. | Instrumento, clave, plan de análisis, consentimiento y umbral definido antes del piloto. | Objetivos de aprendizaje y recorrido estable. |
| T05 | P0 | [ ] | Desarrollo web, analítica, privacidad | Instrumentar navegación, decisiones, bloqueos, tiempos, estación, salida potencial y finalización. | Diccionario de eventos, implementación probada y política de conservación mínima. | Variables acordadas con T04. |
| T06 | P0 | [ ] | QA, accesibilidad, frontend | Automatizar navegación completa, mapa, ruta limpia, ruta contaminada, persistencia y regreso. | Pruebas repetibles en móvil, teclado, lector de pantalla y movimiento reducido. | Versión del MVP congelada para prueba. |
| T07 | P1 | [ ] | Logística, diseño de servicios, seguridad | Validar ubicaciones, capacidad, frecuencia, ventanas, responsables y contingencias de la red. | Mapa versionado, aforo, tiempos de ruta, RACI operativo y criterios de reubicación. | Línea base T03 y alcance T01. |
| T08 | P1 | [ ] | Agronomía, biología, química, ingeniería | Definir formulación, monitoreo, volteos, curado, cribado y criterios de madurez. | Protocolo por lote, registros de temperatura/humedad, balance y especificación de salida. | Materiales aceptados y capacidad confirmados. |
| T09 | P1 | [ ] | Seguridad, salud, operaciones | Evaluar higiene, vectores, olores, lixiviados, EPP, capacitación e incidencias. | Matriz de riesgos, controles, responsables, capacitación y regla de suspensión. | Ubicación y método preliminar de T07/T08. |
| T10 | P1 | [ ] | Coordinación, ética, evaluación | Integrar piloto, comparación, calendario, recursos y umbrales para decidir. | Protocolo aprobado, RACI, presupuesto, calendario y acta para iterar, escalar o detener. | T03–T09 con evidencia mínima. |

## Trabajo funcional disponible

- [x] Laboratorio interactivo con escenarios y advertencia cuando R supera G.
- [x] Mapa filtrable, buscable y navegable por teclado.
- [x] Seis estados persistentes e independientes para puntos de acopio.
- [x] Generación Poisson no homogénea por hora simulada.
- [x] Ruta limpia y ruta con impropios con consecuencias visibles.
- [x] Selección de tareas persistente y mensaje de colaboración copiable.
- [ ] Pruebas automatizadas de extremo a extremo.
- [ ] Validación formal con lector de pantalla y contraste.
- [ ] Calibración con pesajes y protocolo local.

## Regla de calidad

Una tarea solo cambia a `[x]` cuando:

1. tiene responsable y revisión cruzada identificados;
2. incluye fuente, fecha, método, alcance y archivos reproducibles;
3. satisface la evidencia de aceptación de su fila;
4. documenta datos faltantes, incertidumbre, riesgos y límites;
5. actualiza documento, datos, simulador y pruebas cuando corresponda;
6. registra la decisión sin atribuir causalidad más allá del diseño utilizado.

## Orden sugerido

**T01 → T02/T03 → T04/T05/T06 → T07/T08/T09 → T10.** Las tareas de una misma etapa pueden avanzar en paralelo cuando sus dependencias estén acordadas.
