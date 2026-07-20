# Guía de usuario · Explorador de residuos FES Acatlán

Esta guía acompaña al asistente de configuración. Está pensada para brigadistas, personal administrativo y comités institucionales que necesitan comparar decisiones sin leer el código del modelo.

## Antes de empezar

El explorador es **determinista**: si recibe los mismos datos, produce exactamente la misma trayectoria. Esto permite repetir y auditar una comparación, pero no convierte el resultado en una predicción exacta.

La lectura correcta es:

> Esto ocurriría dentro de las reglas del modelo si los datos y supuestos se mantuvieran.

La lectura incorrecta es:

> Esto sucederá con esta probabilidad en el campus.

La base incluida contiene 41 parámetros: **0 medidos, 4 estimados y 37 supuestos**. Puedes usarla para aprender. Si la conservas, los resultados se marcan como **Corrida ilustrativa**.

## Recorrido del asistente

### 0. Elegir cómo comenzar

- **Probar con datos de ejemplo** conserva todos los valores y marca la corrida como ilustrativa.
- **Configurar con mis datos** permite sustituirlos. Cada edición debe indicar si fue `MEDIDO`, `ESTIMADO` o `SUPUESTO`, además de una fuente concreta.

Las definiciones son:

- `MEDIDO`: observado, contado o pesado localmente.
- `ESTIMADO`: calculado a partir de registros o una aproximación documentada.
- `SUPUESTO`: elegido para explorar cuando falta evidencia.

Escribir un número no lo convierte automáticamente en una medición.

### 1. Pregunta y periodo

Escribe la pregunta institucional que quieres comparar. La pregunta sirve como contexto en las exportaciones; no altera las ecuaciones.

La fecha de referencia representa el día 0 y ayuda a traducir días relativos a fechas. El modelo sigue calculando en días. La duración debe terminar después del último punto de decisión.

Ejemplo:

> Durante 180 días, ¿qué cambia si aumenta la participación desde el día 45 y se amplía la capacidad PET desde el día 90?

### 2. Personas y actividad

Cada segmento pide tres datos distintos:

1. **Población potencial:** matrícula, plantilla o aforo posible.
2. **Porcentaje presente:** parte de esa población que suele estar físicamente en un día activo.
3. **Unidades desechadas por persona y día:** conteo de una unidad de referencia; todavía no son kilogramos.

La tarjeta calcula en vivo personas presentes y unidades diarias. Para visitantes del tianguis, el porcentaje representa la parte del aforo que equivale a un día promedio, no ausentismo.

#### Calendarios

Cada calendario se captura como periodos con:

- día inicial, incluido;
- día final, no incluido;
- porcentaje de actividad.

`100 %` significa actividad habitual, `0 %` ausencia de actividad y `120 %` una actividad 20 % mayor que la habitual.

Un traslape bloquea la corrida. Un hueco genera una advertencia porque el modelo usaría actividad cero durante esos días. El asistente muestra también la fecha civil equivalente.

### 3. Masa y composición

El modelo convierte unidades contadas a kg y después reparte esa masa entre orgánico, PET y resto.

En el flujo normal editas:

- porcentaje orgánico;
- porcentaje PET.

El porcentaje de resto se calcula como `100 % − orgánico − PET`, para impedir sumas incoherentes.

El peso por unidad y el factor de conversión están en **Avanzado**. El asistente de pesaje divide la masa total de una muestra entre el número de unidades. La captura visible usa gramos por unidad y el modelo guarda kg por unidad.

Ejemplo: 200 unidades con una masa total de 5 000 g equivalen a 25 g por unidad, o 0.025 kg por unidad internamente.

### 4. Operación PET

Los campos cotidianos son:

- PET al alcance de contenedores y rutas;
- PET separado que se rechaza;
- capacidad diaria de la trituradora;
- PET que se pierde al procesar;
- umbral de saturación del acopio.

**Cobertura y participación no son sinónimos.** La cobertura describe el alcance de la infraestructura. La participación describe a las personas que separan correctamente. El modelo las combina.

El umbral de saturación no es una pared física. El PET acopiado puede rebasarlo; hacerlo representa una operación saturada y puede influir en la participación modelada.

Los tiempos internos de captura y proceso permanecen en **Avanzado**.

### 5. Operación orgánica

Los campos cotidianos son:

- orgánico al alcance de separación;
- orgánico separado que se rechaza;
- días promedio hasta que la composta queda lista;
- tiempo promedio para aplicar la composta lista.

La masa se conserva como **kg-equivalentes de residuo húmedo**. Esta versión no descuenta agua ni emisiones y no calcula masa seca, rendimiento agronómico o beneficio climático.

El tiempo del material disperso y el número interno de etapas están en **Avanzado**. El número de etapas cambia la estructura del cálculo y no puede modificarse dentro de una rama de escenario.

### 6. Participación

El modelo usa un único porcentaje de participación para PET y orgánicos.

- **Al comenzar:** situación del día 0.
- **Nivel habitual de referencia:** nivel hacia el que tendería el campus antes de los efectos modelados de resultados visibles y saturación PET.

No los llames “tasa de captura”: la captura también depende de cobertura, rechazo y retrasos operativos.

Los cinco parámetros de velocidad e intensidad de la retroalimentación permanecen en **Avanzado** y deben conservarse como supuestos si no existe una calibración documentada.

### 7. Escenarios

Una decisión entra en vigor desde un día sin reiniciar el material acumulado. El constructor siempre debe conservar una alternativa **Sin cambio**.

Para cada alternativa:

1. asigna un nombre legible;
2. elige el dato que cambia;
3. escribe el valor nuevo en la unidad visible;
4. indica procedencia y fuente.

El sistema muestra cuántas combinaciones se crearán. Tres decisiones con dos alternativas cada una producen ocho combinaciones.

El editor JSON completo existe solo en **Avanzado** para importación o diagnóstico. El flujo normal no lo necesita.

La decisión orgánica de ejemplo se llama **Separación y aplicación orgánica ampliadas**. Cambia cobertura y ritmo de aplicación; no representa una capacidad máxima de fermentación, porque ese límite no existe en el modelo actual.

### 8. Revisión

Antes de calcular, verifica:

- conteo de datos medidos, estimados y supuestos;
- fuentes de las ediciones;
- generación implícita en periodos de mayor y menor actividad;
- composición igual a 100 %;
- decisiones y días de entrada;
- valores fuera del rango de revisión;
- declaración de que todos los inventarios empiezan en 0 kg;
- límites de la versión;
- advertencia determinista.

Los límites matemáticos bloquean. Un rango razonable es una guarda provisional: permite continuar después de confirmar la unidad, documentar una fuente y marcar la confirmación.

### 9. Calcular

El botón **Calcular escenarios** se habilita conceptualmente después de la revisión y la aceptación del mensaje metodológico. Los controles numéricos internos no aparecen en el flujo normal.

Si la configuración numérica segura no logra completar la cuenta, el asistente conserva tus datos, muestra un mensaje cotidiano y deja el detalle técnico dentro de un diagnóstico avanzado para la persona responsable del modelo.

## Cómo leer los resultados

### Destino de la masa

- **Residuo generado acumulado:** masa total que entró desde el inicio. No es kg/día ni una medición observada.
- **Enviado a relleno acumulado:** resto directo, material no capturado y rechazos. No incluye lo que sigue pendiente dentro del sistema.
- **Desvío neto:** generado menos relleno hasta ese momento.

El desvío neto **no equivale a reciclado con éxito**. Incluye filamento, composta aplicada y material aún almacenado o en proceso. Por esa razón siempre aparece junto a los productos útiles y el inventario pendiente.

### Productos e inventario

- **Filamento producido acumulado:** PET útil después del rechazo de proceso. No es un ritmo diario, valor económico ni indicador de calidad.
- **Composta aplicada acumulada:** kg-equivalentes de residuo húmedo enviados al huerto. No es masa seca.
- **Material pendiente al final:** PET u orgánico disperso, PET acopiado, material en fermentación y composta lista.

El material pendiente no desapareció y tampoco está necesariamente destinado a relleno; su evolución requiere continuar la corrida.

### Operación PET

- **Mayor PET esperando proceso:** máximo del backlog PET.
- **Día del máximo:** muestra donde se observó ese máximo.
- **Tiempo sobre el umbral:** duración interpolada con PET acopiado igual o por encima del umbral.

“Sobre el umbral” no significa que el modelo detuvo el ingreso o simuló un derrame físico.

### Participación y gráficos

La participación final y su trayectoria son valores modelados, no encuestas ni probabilidades individuales.

Las líneas de inventario muestran cuánto material existe en cada momento. Una línea alta representa un stock, no kg procesados por día.

### Balance de masa

“Cuenta cerrada” significa que toda la masa que entró aparece en stocks o salidas dentro de la tolerancia numérica. Valida la contabilidad matemática, no la exactitud de los datos ni los supuestos.

### Dependencia de supuestos

La lista indica qué parámetros supuestos pueden afectar estructuralmente un indicador. Es conservadora. No es un ranking, un análisis de sensibilidad ni una prueba causal.

## Comparación y exportación

Elige una combinación como situación de referencia. La tabla muestra el valor absoluto y la diferencia frente a esa referencia. El orden de las filas no es un ranking ni una probabilidad.

Los cuatro archivos disponibles son:

1. indicadores por combinación;
2. trayectoria de la combinación seleccionada;
3. parámetros efectivos y fuentes por periodo;
4. diccionario de datos.

Las exportaciones reproducibles incluyen versión, commit base, fecha de referencia, horizonte, pregunta, marca ilustrativa, stocks iniciales, advertencia metodológica y límites de esta versión.

## Mensajes comunes

- **“Escribe un valor entre 0 y 100 %.”** En la interfaz, `30` significa `30 %`; no escribas `0.30` salvo en JSON o CSV técnico.
- **“Falta la fuente.”** Cambiaste un valor, pero no documentaste de dónde salió.
- **“El periodo comienza antes de que termine el anterior.”** Hay un traslape que debe corregirse.
- **“No hay actividad definida…”** Existe un hueco; confirma si la actividad cero es intencional.
- **“Fuera del rango de revisión.”** El núcleo puede calcularlo, pero debes revisar unidad y fuente.
- **“El número de etapas no puede cambiar…”** Es un parámetro estructural y solo se define antes de iniciar.

## Glosario mínimo

- **Corrida:** ejecución completa con datos, periodo y escenarios.
- **Escenario o combinación:** una alternativa elegida en cada decisión.
- **Parámetro:** dato que guía el cálculo.
- **Procedencia:** calidad documental del dato: medido, estimado o supuesto.
- **Stock o inventario:** cantidad que existe en un momento; se mide en kg.
- **Flujo:** cantidad que entra, sale o se mueve por unidad de tiempo; puede medirse en kg/día.
- **Acumulado:** total sumado desde el inicio.
- **Cobertura:** parte del residuo al alcance de la infraestructura.
- **Participación:** parte de las personas que separa correctamente.
- **Rechazo:** material intentado que no se acepta y termina contabilizado en relleno.
- **Backlog:** PET aceptado y acopiado que todavía espera procesamiento.
- **Umbral de saturación:** punto de alerta operativa que puede rebasarse.
- **Desvío neto:** generado menos relleno; incluye productos y material pendiente.
- **Balance de masa:** control de que toda la masa aparece en algún stock o salida.

## Límites de esta versión

- Solo distingue PET, orgánico y resto.
- El resto va directo a relleno.
- PET y orgánico comparten una sola participación.
- Todos los inventarios empiezan en cero.
- La composta conserva kg-equivalentes húmedos sin pérdidas de agua ni emisiones.
- No representa eventos imprevistos, incertidumbre, probabilidades ni intervalos de confianza.
