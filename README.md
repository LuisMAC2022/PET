# Simulador stock-and-flow de residuos · FES Acatlán

Aplicación estática en HTML, CSS y JavaScript puro para explorar dos cadenas de residuos —PET y orgánicos— mediante stocks, flujos y un árbol determinista de escenarios. La interfaz es un asistente de captura trazable para público no técnico; el núcleo numérico permanece separado y reproducible. No utiliza frameworks, bibliotecas numéricas, servicios externos ni aleatoriedad.

> El estudio de caracterización aún no está autorizado. Los valores `SUPUESTO` son marcadores de posición, no datos observados del campus.

La experiencia de uso y la interpretación de resultados están documentadas en [`GUIA_USUARIO.md`](GUIA_USUARIO.md). Este README conserva el detalle técnico del modelo.

## Ejecutar

Los módulos ES requieren servir la carpeta por HTTP. Desde la raíz del repositorio:

```bash
python3 -m http.server 8080
```

Después abre `http://localhost:8080`. La página `tests.html` ejecuta la misma suite en el navegador.

Para las pruebas automatizadas con Node 20 o posterior:

```bash
npm test
npm run check
```

No es necesario ejecutar `npm install`: el proyecto no tiene dependencias.

## Diagrama causal

```text
R1 — reforzador

participación (+)
  → captura orgánica (+)
  → fermentación y composta disponible (+)
  → aplicación al huerto (+)
  → productividad visible (+)
  → participación objetivo (+)
  → participación


B1 — balanceador

participación (+)
  → captura PET (+)
  → PET acopiado (+)
  → saturación de almacenamiento (+)
  → participación objetivo (−)
  → participación
```

La capacidad de trituración reduce `PET_acopiado`, pero sólo hasta su límite físico.

```text
G·φ_pet → PET_disperso → PET_acopiado → filamento
                └─────────→ relleno ←──┘ rechazos

G·φ_org → Organico_disperso → F1 → F2 → … → FN
                 └────────→ relleno             ↓
                                          Composta_lista
                                                 ↓
                                         aplicación huerto

G·φ_resto ───────────────────────────────────→ relleno
```

## Ecuaciones

### Generación

```text
G(t) = c · m · Σp Np(t) · ap · dp                [kg/día]

Gpet   = φpet   · G
Gorg   = φorg   · G
Gresto = φresto · G

φpet + φorg + φresto = 1
```

`Np(t)` se resuelve con calendarios declarativos por segmento poblacional. Cada parámetro conserva valor, unidad, procedencia y fuente.

### Captura

Para cada corriente `x ∈ {pet, org}`:

```text
qDisponible,x = Disperso,x / τcapt,x
qIntento,x    = qDisponible,x · coberturax · participación
qAceptado,x   = (1 − rechazoCapturax) · qIntento,x
qNoCapturado  = qDisponible,x − qIntento,x
qRechazo      = rechazoCapturax · qIntento,x
```

Lo no capturado y el rechazo se contabilizan como salida a relleno. Nada desaparece del balance.

### PET

```text
d(PET_disperso)/dt = φpet · G − qDisponible,pet

qProceso = min(PET_acopiado / τproc, capacidadTrituradora)

d(PET_acopiado)/dt = qAceptado,pet − qProceso
d(Filamento)/dt    = (1 − rechazoProceso) · qProceso
```

El `min()` es un mínimo duro, no una aproximación suave. Cuando la entrada aceptada `I` supera la capacidad `K` y el proceso está saturado:

```text
d(PET_acopiado)/dt = I − K
```

Por ello, el backlog crece linealmente con pendiente `I − K`.

`τproc` separa la física del paso numérico. Usar `PET_acopiado/dt` haría que Euler y RK4 representaran modelos distintos.

### Fermentación Erlang

```text
k = N / τferm

dF1/dt = qAceptado,org − kF1
dFi/dt = kF(i−1) − kFi             i = 2, …, N

d(Composta_lista)/dt = kFN − qAplicación
qAplicación = Composta_lista / τaplicación
```

La respuesta al impulso tiene:

```text
media     = τferm
varianza  = τferm² / N
```

`N` es un parámetro estructural. Puede cambiarse antes de una corrida, pero no dentro de una ramificación porque modifica la dimensión del vector de estado.

En v1, el bokashi se expresa en kg-equivalentes de residuo húmedo. Una versión con pérdida de agua o emisiones deberá añadir un sumidero acumulado explícito.

### Participación y retroalimentación

```text
señalHuerto = qAplicación / (qReferencia + qAplicación)
dH/dt       = (señalHuerto − H) / τvisible

saturación  = PET_acopiado / capacidadAlmacén
z*          = logit(Pbase) + βR·H − βB·saturación
dz/dt       = (z* − z) / τpart

participación = sigmoid(z)
```

El stock de información se conserva como log-odds `z`. La participación observable siempre pertenece a `[0,1]` por construcción y nunca se recorta.

La capacidad de almacén es un umbral nominal, no un límite del vector. Esto permite observar el backlog por encima de la capacidad.

## Balance de masa

La suma física excluye productividad visible y logit de participación:

```text
error = stocks_materiales
      + relleno_acumulado
      + filamento_acumulado
      + composta_aplicada_acumulada
      − masa_inicial
      − generación_acumulada
```

Después de cada paso se exige un error relativo menor que `1e-9`. Cuando todavía no existe generación, se usa el error absoluto. Euler y RK4 integran el acumulador de generación con el mismo esquema que el resto del vector.

Si cualquier stock o acumulador material se vuelve negativo, `integrador.js` lanza `ErrorIntegracion` e informa tiempo, método, índice y `dt`. No existe recorte silencioso.

## Arquitectura

```text
index.html → app.js
app.js → parametros.js, modelo.js, arbol.js, reporte.js
arbol.js → parametros.js, integrador.js
integrador.js → recibe derivadas como callback
modelo.js → no importa otros módulos
```

| Archivo | Responsabilidad |
|---|---|
| `parametros.js` | Catálogo inmutable, unidades, procedencia, validación y overrides. |
| `modelo.js` | Estado, auxiliares y ecuaciones diferenciales puras. |
| `integrador.js` | Euler explícito y RK4 con una firma común. |
| `arbol.js` | Construcción DFS, herencia de estado y trayectorias segmentadas. |
| `reporte.js` | Indicadores, dependencias de supuestos y serialización CSV. |
| `escenarios_ejemplo.js` | Árbol ordenado de tres puntos y ocho hojas. |
| `app.js` | Asistente, conversión de unidades visibles, revisión, SVG y descargas. |
| `GUIA_USUARIO.md` | Recorrido sin jerga, glosario, límites y lectura de salidas. |
| `tests/suite.js` | Invariantes numéricos y cobertura del contenido de onboarding. |

Todas las firmas públicas tienen JSDoc. El estado numérico usa `Float64Array`; las unidades internas son exclusivamente kg y días.

## Agregar un punto de ramificación

La spec usa listas para conservar un orden estable:

```json
{
  "tDia": 120,
  "nombre": "nueva_politica",
  "alternativas": [
    {
      "etiqueta": "sin_cambio",
      "nombreVisible": "Sin cambio",
      "overrides": {}
    },
    {
      "etiqueta": "mayor_capacidad",
      "nombreVisible": "Mayor capacidad",
      "overrides": {
        "pet.capacidadTrituradoraKgDia": {
          "valor": 5,
          "procedencia": "SUPUESTO",
          "fuente": "Escenario exploratorio de capacidad"
        }
      }
    }
  ]
}
```

Pasos:

1. Inserta el punto en `puntos` respetando orden temporal estrictamente creciente.
2. Usa etiquetas `snake_case` únicas dentro del punto.
3. Declara `valor`, `procedencia` y `fuente` en cada override.
4. No modifiques `organico.nEtapasFermentacion` en una rama.
5. Asegura que `tDia` sea posterior al inicio y anterior al horizonte final.

El integrador llega exactamente a `tDia`, congela el vector del padre, crea una copia por alternativa y aplica los overrides desde ese instante. Los cambios nunca son retroactivos. Las hojas siguen DFS y conservan rutas como:

```text
base/alta_participacion/segunda_maquina/separacion_aplicacion_ampliadas
```

La decisión orgánica no se llama “capacidad bokashi” porque el modelo no tiene un tope máximo de fermentación.

En el flujo normal, la persona construye decisiones, alternativas, valores, procedencias y fuentes con controles guiados. La spec completa solo aparece en la divulgación **Avanzado** para importación o diagnóstico experto.

## Indicadores y exportaciones

Cada hoja informa:

- kg desviados de relleno y porcentaje;
- filamento acumulado;
- composta aplicada;
- backlog PET máximo y primer día del máximo;
- tiempo sobre la capacidad nominal de almacenamiento;
- participación terminal;
- inventario material pendiente;
- error relativo del balance.

`generado − relleno` se reporta como desvío neto. Puede incluir material todavía almacenado o en proceso; por eso la interfaz muestra además el inventario pendiente y las salidas útiles realizadas.

Se generan cuatro CSV:

- una fila de indicadores por hoja;
- trayectoria completa de la hoja seleccionada;
- parámetros efectivos y fuentes por hoja e intervalo temporal;
- diccionario de datos con nombre legible, unidades, rangos, ejemplos y exposición.

Indicadores, trayectoria y parámetros incluyen la versión del modelo, commit base, periodo, pregunta, marca de corrida ilustrativa, advertencia determinista, stocks iniciales y límites de esta versión.

El mapa de dependencias de supuestos es conservador. Debido a R1 y B1, PET y orgánicos quedan acoplados a través de participación; la lista indica qué parámetros pueden afectar un indicador, no una sensibilidad calibrada.

## Pruebas de aceptación

La suite cubre:

1. balance de masa en cada paso y hoja con Euler y RK4;
2. no negatividad y fallo explícito con `dt` excesivo;
3. convergencia de stocks terminales al reducir `dt` a la mitad;
4. media y varianza de la respuesta Erlang;
5. crecimiento lineal del backlog bajo saturación;
6. reproducibilidad exacta de indicadores y trayectorias CSV;
7. herencia del estado, orden DFS y bloqueo de parámetros estructurales;
8. participación acotada mediante logit;
9. anotaciones completas para las 41 rutas y clasificación 29 U / 1 U-R / 11 A;
10. conversión explícita `30 % ↔ 0.30`;
11. detección de huecos y traslapes en calendarios;
12. metadatos, fuentes y límites obligatorios en exportaciones.

## Costura futura para estocasticidad

`parametros.js` separa el catálogo trazable de los valores numéricos entregados al modelo. Una versión futura puede resolver una distribución a un escalar antes de iniciar una corrida, usando un generador inyectado con semilla. El modelo seguirá siendo determinista dados esos valores resueltos y no necesitará importar aleatoriedad.
