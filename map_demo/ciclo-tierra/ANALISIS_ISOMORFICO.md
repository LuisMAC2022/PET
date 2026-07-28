# Ciclo Tierra: análisis de `map_demo` y adaptación isomórfica

## Estado encontrado

La rama `map_demo` era una aplicación web estática sin dependencias ni proceso de compilación. Sus piezas principales eran:

- `presentacion.html`: documento largo con modelo cuantitativo, laboratorio interactivo, propuesta, validación, referencias y selección de tareas;
- `reciclaje_pet_fase1.html`: simulador de la cadena del PET con estado en `localStorage`, llegadas Poisson no homogéneas, instancias por contenedor y acciones con dependencias;
- `index.html`: mapa SVG con búsqueda, filtros, marcadores accesibles y enlaces a instancias del simulador;
- `puntos.json`: 16 contenedores PET con coordenadas;
- `mapa_vectorizado.svg` + `acatlan.png`: base cartográfica reutilizable;
- `TAREAS_PROYECTO.md`: tablero multidisciplinario con dependencias y criterios de aceptación.

El recorrido visible era **Estimación → Propuesta → Simulación**. El mapa existía, pero estaba explícitamente fuera del recorrido. No había `package.json`, pruebas automatizadas, configuración de despliegue ni `AGENTS.md`.

## Invariantes preservados

La adaptación mantiene la topología funcional del sistema:

| Original PET | Ciclo Tierra | Invariante |
| --- | --- | --- |
| Generación de botellas | Generación de aportes de 1 kg | Llegadas temporales por punto |
| Contenedor PET | Estación de acopio orgánico | Instancia persistente independiente |
| Botella en inventario | Aporte orgánico en ruta | Unidad seleccionable y procesable |
| Tapa/etiqueta/líquido/humedad/compresión | Impropios/tamaño/secos/humedad/aireación | Estado con consecuencias y orden recomendado |
| Venta y precio | Incorporación y composta potencial | Salida cuantitativa penalizada por calidad |
| Mapa de contenedores | Seis acopios y cuatro puntos de procesamiento demostrativos | Coordenadas, filtros, búsqueda y ficha |
| PET generado/recuperado/útil | G/R/A/C de orgánicos | Balance de masa sin sinónimos incorrectos |
| API `PETGenerador` | API `OrganicosGenerador` | Eventos públicos y sincronización |

## Cambios de dominio deliberados

1. El mapa se reincorporó como fase 3 porque la ubicación, capacidad y frecuencia son parte esencial de una red de recolección; la simulación pasó a fase 4.
2. La salida dejó de ser dinero. Ahora es **composta potencial**, con una advertencia permanente de que aún faltan fase activa, monitoreo y curado.
3. El modelo usa `G = N · Σ(aₚdₚ) · g`, `ρ = R/G` y `C = R · q · η`.
4. La muestra incluye seis puntos de acopio y cuatro puntos de procesamiento. Las coordenadas solo permiten demostrar la interacción; no constituyen una propuesta de ubicación.
5. Los materiales aceptados son conservadores. Elementos de mayor riesgo operativo quedan fuera hasta que el proceso local los acepte expresamente.
6. Se conservaron accesibilidad base, persistencia local, perfiles horarios y modo sin dependencias.

## Límites actuales

- No existe backend, autenticación ni almacenamiento multiusuario.
- `localStorage` representa una demo por navegador, no un registro operativo.
- Las llegadas Poisson, tasas, capacidades y rendimiento son demostrativos.
- El simulador no modela temperatura, oxígeno, pH, patógenos, tiempo ni madurez.
- Las coordenadas reutilizan la geometría de la rama original; requieren recorrido y autorización.
- No hay pruebas E2E ni auditoría formal con tecnologías de asistencia.

## Convivencia con el proyecto PET

El proyecto PET permanece íntegro en la raíz de `map_demo`. Ciclo Tierra vive en `ciclo-tierra/` y ambos se abren desde `proyectos.html`. Comparten únicamente `acatlan.png` y `mapa_vectorizado.svg`; sus datos, navegación, simuladores y claves de `localStorage` son independientes.

## Archivos de la versión orgánica

- `presentacion.html`: modelo, laboratorio, propuesta, cadena, validación, fuentes y colaboración.
- `index.html`: mapa operativo integrado.
- `compostaje_fase1.html`: simulador por estación.
- `puntos.json`: red demostrativa y parámetros por nodo.
- `organicos_icon.svg`: icono vectorial local.
- `TAREAS_PROYECTO.md`: ruta para convertir el MVP en piloto.
- `reciclaje_pet_fase1.html`: compatibilidad para enlaces antiguos; redirige al nuevo simulador.
