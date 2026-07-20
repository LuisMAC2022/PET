/**
 * Catálogo y validación de parámetros del simulador.
 * Todas las conversiones terminan aquí: el modelo recibe kg, días y fracciones.
 */

export const PROCEDENCIAS = Object.freeze(["MEDIDO", "ESTIMADO", "SUPUESTO"]);
export const EXPOSICIONES = Object.freeze(["U", "U-R", "A"]);
export const FORMATOS_ENTRADA = Object.freeze([
  "entero", "decimal", "porcentaje", "calendario", "gramos", "dias", "masa", "factor",
]);

/** @typedef {'MEDIDO'|'ESTIMADO'|'SUPUESTO'} Procedencia */

/**
 * @typedef {Object} Parametro
 * @property {unknown} valor
 * @property {string} unidad
 * @property {Procedencia} procedencia
 * @property {string} fuente
 * @property {string} descripcion
 * @property {boolean} [estructural]
 * @property {number} [min]
 * @property {number} [max]
 * @property {boolean} [entero]
 * @property {Object} onboarding
 */

const ui = (onboarding) => ({ onboarding });

const p = (valor, unidad, procedencia, fuente, descripcion, opciones = {}) => {
  const { onboarding, ...restricciones } = opciones;
  return {
    valor,
    unidad,
    procedencia,
    fuente,
    descripcion,
    ...restricciones,
    onboarding: onboarding ? { ...onboarding, origenDefault: fuente } : undefined,
  };
};

/**
 * Marcadores de posición explícitos. Deben sustituirse después del estudio de
 * caracterización; su procedencia nunca se oculta en los resultados.
 */
export const DEFINICION_BASE = Object.freeze({
  generacion: {
    segmentos: [
      {
        id: "estudiantes",
        etiqueta: "Estudiantes",
        poblacion: p(23000, "personas", "ESTIMADO", "Matrícula de referencia; validar con Servicios Escolares", "Población potencial del segmento", { min: 0, ...ui({ nombre: "Estudiantes que podrían asistir", explicacion: "Matrícula o población potencial antes de aplicar asistencia y calendario.", unidadEntrada: "personas", formato: "entero", rangoRazonable: { min: 0, max: 50000, unidad: "personas" }, ejemplo: "15 000 inscritos con 72 % de asistencia representan 10 800 presentes.", consecuencia: "Duplicar matrícula escala casi proporcionalmente toda la generación del segmento.", criticidad: "Alta", exposicion: "U", comoObtener: "Solicita matrícula activa a Servicios Escolares y evita contar bajas o inscripciones duplicadas." }) }),
        asistencia: p(0.72, "1", "SUPUESTO", "Marcador previo a aforo", "Fracción presente en un día activo", { min: 0, max: 1, ...ui({ nombre: "Estudiantes presentes en un día activo", explicacion: "Porcentaje de la matrícula que suele estar físicamente presente; no es la matrícula total.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 0, max: 100, unidad: "%" }, ejemplo: "72 % de 15 000 equivale a 10 800 personas presentes.", consecuencia: "Sobreestimar presencia infla todas las corrientes de residuos del segmento.", criticidad: "Alta", exposicion: "U", comoObtener: "Usa conteos de acceso o aforos de varios días habituales y documenta fechas y accesos." }) }),
        desechosPerCapitaDia: p(0.11, "unidades/(persona·día)", "SUPUESTO", "Marcador previo a caracterización", "Unidades desechadas por persona y día", { min: 0, ...ui({ nombre: "Unidades desechadas por estudiante al día", explicacion: "Promedio de unidades de referencia por persona presente; todavía no son kilogramos.", unidadEntrada: "unidades/(persona·día)", formato: "decimal", rangoRazonable: { min: 0, max: 2, unidad: "unidades/(persona·día)" }, ejemplo: "10 800 presentes × 0.11 producen 1 188 unidades al día.", consecuencia: "Capturar kg aquí y volver a aplicar el peso por unidad cuenta la masa dos veces.", criticidad: "Alta", exposicion: "U", comoObtener: "Caracteriza una muestra, define qué cuenta como unidad y divide por personas presentes y días." }) }),
        calendario: p([{ desde: 0, hasta: 70, multiplicador: 1 }, { desde: 70, hasta: 84, multiplicador: 0.12 }, { desde: 84, hasta: 366, multiplicador: 1 }], "1", "SUPUESTO", "Calendario ilustrativo", "Multiplicador de población por intervalo", ui({ nombre: "Calendario de actividad estudiantil", explicacion: "Ajusta la población durante clases, recesos y eventos; multiplica la asistencia, no la sustituye.", unidadEntrada: "periodos, días y %", formato: "calendario", rangoRazonable: { regla: "Cobertura continua del horizonte; actividad habitual 0–100 %." }, ejemplo: "Del día 70 al 83 se conserva 12 % de la actividad habitual.", consecuencia: "Un hueco lleva la generación a cero y una fecha desplazada mueve el receso.", criticidad: "Alta", exposicion: "U", comoObtener: "Usa el calendario escolar y registra por separado recesos o eventos con actividad distinta." })),
      },
      {
        id: "docentes",
        etiqueta: "Docentes",
        poblacion: p(2200, "personas", "ESTIMADO", "Plantilla de referencia; validar con la administración", "Población potencial del segmento", { min: 0, ...ui({ nombre: "Docentes que podrían asistir", explicacion: "Total de personas de la plantilla docente antes de asistencia y calendario.", unidadEntrada: "personas", formato: "entero", rangoRazonable: { min: 0, max: 10000, unidad: "personas" }, ejemplo: "2 200 docentes con 80 % de asistencia representan 1 760 presentes.", consecuencia: "Contar contratos como personas puede duplicar la generación del segmento.", criticidad: "Alta", exposicion: "U", comoObtener: "Solicita una plantilla depurada por persona, no por contrato o asignatura." }) }),
        asistencia: p(0.8, "1", "SUPUESTO", "Marcador previo a aforo", "Fracción presente en un día activo", { min: 0, max: 1, ...ui({ nombre: "Docentes presentes en un día activo", explicacion: "Porcentaje de la plantilla docente que suele estar en campus; no son plazas ocupadas.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 0, max: 100, unidad: "%" }, ejemplo: "80 % de 2 200 equivale a 1 760 docentes presentes.", consecuencia: "Un día atípico sesga la carga diaria de residuos y procesos.", criticidad: "Alta", exposicion: "U", comoObtener: "Promedia aforos o registros de acceso de varios días lectivos comparables." }) }),
        desechosPerCapitaDia: p(0.08, "unidades/(persona·día)", "SUPUESTO", "Marcador previo a caracterización", "Unidades desechadas por persona y día", { min: 0, ...ui({ nombre: "Unidades desechadas por docente al día", explicacion: "Promedio diario por cada docente presente, expresado en unidades de referencia.", unidadEntrada: "unidades/(persona·día)", formato: "decimal", rangoRazonable: { min: 0, max: 2, unidad: "unidades/(persona·día)" }, ejemplo: "1 760 presentes × 0.08 = 140.8 unidades al día.", consecuencia: "Introducir kg aquí y conservar el peso por unidad multiplica dos veces la masa.", criticidad: "Alta", exposicion: "U", comoObtener: "Caracteriza residuos docentes y divide las unidades observadas por personas presentes y días." }) }),
        calendario: p([{ desde: 0, hasta: 70, multiplicador: 1 }, { desde: 70, hasta: 84, multiplicador: 0.18 }, { desde: 84, hasta: 366, multiplicador: 1 }], "1", "SUPUESTO", "Calendario ilustrativo", "Multiplicador de población por intervalo", ui({ nombre: "Calendario de actividad docente", explicacion: "Refleja clases, recesos y otros periodos con menor o mayor actividad docente.", unidadEntrada: "periodos, días y %", formato: "calendario", rangoRazonable: { regla: "Cobertura continua del horizonte; actividad habitual 0–100 %." }, ejemplo: "Del día 70 al 83 se conserva 18 % de la actividad habitual.", consecuencia: "Omitir un receso mantiene generación como si hubiera clases; un hueco la vuelve cero.", criticidad: "Alta", exposicion: "U", comoObtener: "Combina calendario académico con guardias o actividades docentes durante recesos." })),
      },
      {
        id: "administrativos",
        etiqueta: "Administrativos",
        poblacion: p(1700, "personas", "ESTIMADO", "Plantilla de referencia; validar con la administración", "Población potencial del segmento", { min: 0, ...ui({ nombre: "Personal administrativo que podría asistir", explicacion: "Total potencial de personal administrativo antes de presencia diaria y calendario.", unidadEntrada: "personas", formato: "entero", rangoRazonable: { min: 0, max: 10000, unidad: "personas" }, ejemplo: "1 700 personas con 90 % de asistencia representan 1 530 presentes.", consecuencia: "Mezclar plazas, turnos y personas puede duplicar el segmento.", criticidad: "Alta", exposicion: "U", comoObtener: "Depura la plantilla por persona y aclara si los turnos se superponen." }) }),
        asistencia: p(0.9, "1", "SUPUESTO", "Marcador previo a aforo", "Fracción presente en un día activo", { min: 0, max: 1, ...ui({ nombre: "Personal administrativo presente", explicacion: "Porcentaje del personal que suele estar en campus durante un día activo.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 0, max: 100, unidad: "%" }, ejemplo: "90 % de 1 700 equivale a 1 530 personas presentes.", consecuencia: "Una cifra baja puede ocultar actividad que continúa durante recesos académicos.", criticidad: "Alta", exposicion: "U", comoObtener: "Promedia registros de acceso o asistencia de días laborales habituales." }) }),
        desechosPerCapitaDia: p(0.08, "unidades/(persona·día)", "SUPUESTO", "Marcador previo a caracterización", "Unidades desechadas por persona y día", { min: 0, ...ui({ nombre: "Unidades desechadas por integrante al día", explicacion: "Promedio de unidades de residuo por persona administrativa presente.", unidadEntrada: "unidades/(persona·día)", formato: "decimal", rangoRazonable: { min: 0, max: 2, unidad: "unidades/(persona·día)" }, ejemplo: "1 530 presentes × 0.08 = 122.4 unidades al día.", consecuencia: "Capturar un promedio semanal como diario multiplica aproximadamente por cinco la generación laboral.", criticidad: "Alta", exposicion: "U", comoObtener: "Muestrea varios días laborales y divide por presencia real y número de días." }) }),
        calendario: p([{ desde: 0, hasta: 70, multiplicador: 1 }, { desde: 70, hasta: 84, multiplicador: 0.7 }, { desde: 84, hasta: 366, multiplicador: 1 }], "1", "SUPUESTO", "Calendario ilustrativo", "Multiplicador de población por intervalo", ui({ nombre: "Calendario de actividad administrativa", explicacion: "Permite conservar actividad parcial durante recesos académicos.", unidadEntrada: "periodos, días y %", formato: "calendario", rangoRazonable: { regla: "Cobertura continua del horizonte; actividad habitual 0–100 %." }, ejemplo: "Durante el receso se conserva 70 % de la actividad administrativa.", consecuencia: "Copiar el calendario estudiantil reduciría indebidamente los residuos administrativos.", criticidad: "Alta", exposicion: "U", comoObtener: "Consulta días laborales, guardias y cierres administrativos del periodo." })),
      },
      {
        id: "visitantes_tianguis",
        etiqueta: "Visitantes de tianguis",
        poblacion: p(2500, "personas", "SUPUESTO", "Marcador hasta realizar conteo de acceso", "Visitantes potenciales equivalentes por día", { min: 0, ...ui({ nombre: "Visitantes potenciales de tianguis por día", explicacion: "Aforo diario equivalente, no total mensual ni personas únicas de todo el periodo.", unidadEntrada: "personas/día equivalente", formato: "entero", rangoRazonable: { min: 0, max: 20000, unidad: "personas/día equivalente" }, ejemplo: "2 500 potenciales con 20 % diario equivalen a 500 visitantes por día.", consecuencia: "Capturar el total mensual como diario puede inflar fuertemente la generación.", criticidad: "Alta", exposicion: "U", comoObtener: "Cuenta accesos en fechas de tianguis y conviértelos a un promedio diario documentado." }) }),
        asistencia: p(0.2, "1", "SUPUESTO", "Actividad concentrada en días específicos", "Fracción diaria equivalente", { min: 0, max: 1, ...ui({ nombre: "Parte del aforo que equivale a un día promedio", explicacion: "Distribuye una actividad concentrada en ciertos días; no es exactamente ausentismo.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 0, max: 100, unidad: "%" }, ejemplo: "20 % de 2 500 produce una afluencia diaria equivalente de 500.", consecuencia: "Usar el aforo de un solo evento como promedio diario puede multiplicar la generación por cinco.", criticidad: "Alta", exposicion: "U", comoObtener: "Divide la afluencia observada del evento entre los días del periodo que quieres representar." }) }),
        desechosPerCapitaDia: p(0.12, "unidades/(persona·día)", "SUPUESTO", "Marcador previo a caracterización", "Unidades desechadas por persona y día", { min: 0, ...ui({ nombre: "Unidades desechadas por visitante equivalente", explicacion: "Promedio por visita representada en un día equivalente.", unidadEntrada: "unidades/(persona·día)", formato: "decimal", rangoRazonable: { min: 0, max: 2, unidad: "unidades/(persona·día)" }, ejemplo: "500 visitantes equivalentes × 0.12 = 60 unidades al día.", consecuencia: "Usar residuos por puesto o por evento sin convertir a persona-día rompe la escala.", criticidad: "Alta", exposicion: "U", comoObtener: "Caracteriza residuos del tianguis y divide por visitantes equivalentes y días representados." }) }),
        calendario: p([{ desde: 0, hasta: 70, multiplicador: 1 }, { desde: 70, hasta: 84, multiplicador: 0 }, { desde: 84, hasta: 366, multiplicador: 1 }], "1", "SUPUESTO", "Calendario ilustrativo", "Multiplicador de población por intervalo", ui({ nombre: "Calendario de actividad del tianguis", explicacion: "Activa, reduce o suspende la contribución del tianguis por periodo.", unidadEntrada: "periodos, días y %", formato: "calendario", rangoRazonable: { regla: "Cobertura continua del horizonte; actividad habitual 0–100 %." }, ejemplo: "Del día 70 al 83 la actividad es 0 %.", consecuencia: "Omitir suspensiones conserva generación inexistente; un hueco la vuelve cero.", criticidad: "Alta", exposicion: "U", comoObtener: "Registra fechas reales de operación, suspensiones y cambios de afluencia." })),
      },
    ],
    factorConversion: p(1, "1", "SUPUESTO", "Conversión unitaria provisional", "Factor de conversión de consumo a residuo", { min: 0, ...ui({ nombre: "Parte de las unidades que termina como residuo", explicacion: "Ajuste global entre unidades registradas y desechadas; no lo uses si el conteo ya incluye solo desechos.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 0, max: 100, unidad: "%" }, ejemplo: "Si de 100 unidades consumidas 90 se desechan en campus, usa 90 %.", consecuencia: "Puede duplicar una corrección ya incluida y escalar toda la generación.", criticidad: "Alta", exposicion: "A", comoObtener: "Compara una muestra de unidades consumidas con las que realmente se desechan dentro del campus." }) }),
    masaUnitariaKg: p(0.025, "kg/unidad", "SUPUESTO", "Masa media ilustrativa; pesar muestra local", "Masa media de una unidad de residuo", { min: 0, ...ui({ nombre: "Peso promedio de una unidad de residuo", explicacion: "Convierte el conteo de unidades a masa total antes de repartir por composición.", unidadEntrada: "g/unidad", formato: "gramos", rangoRazonable: { min: 1, max: 1000, unidad: "g/unidad" }, ejemplo: "200 unidades que pesan 5.4 kg promedian 27 g por unidad.", consecuencia: "Confundir gramos con kg multiplica la generación por mil.", criticidad: "Alta", exposicion: "A", comoObtener: "Pesa juntas varias unidades representativas y divide los gramos totales entre el número de unidades." }) }),
  },
  composicion: {
    organica: p(0.55, "1", "SUPUESTO", "Sin estudio de caracterización autorizado", "Fracción orgánica de la generación", { min: 0, max: 1, ...ui({ nombre: "Porcentaje de residuo orgánico", explicacion: "Parte de la masa total que entra a separación y fermentación orgánica.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 0, max: 100, unidad: "%" }, ejemplo: "De 53.62 kg/día, 55 % son 29.49 kg/día orgánicos.", consecuencia: "Sobreestimarlo aumenta fermentación y reduce las otras corrientes.", criticidad: "Alta", exposicion: "U", comoObtener: "Realiza una caracterización gravimétrica y divide la masa orgánica entre la masa total de la muestra." }) }),
    pet: p(0.1, "1", "SUPUESTO", "Sin estudio de caracterización autorizado", "Fracción PET de la generación", { min: 0, max: 1, ...ui({ nombre: "Porcentaje de residuo PET", explicacion: "Parte de la masa total que entra a recolección, acopio y trituración PET.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 0, max: 100, unidad: "%" }, ejemplo: "De 53.62 kg/día, 10 % son 5.36 kg/día de PET.", consecuencia: "Sobreestimarlo crea backlog y filamento artificiales.", criticidad: "Alta", exposicion: "U", comoObtener: "Separa y pesa PET en una muestra representativa y divide entre la masa total." }) }),
    resto: p(0.35, "1", "SUPUESTO", "Cierre provisional de composición", "Fracción enviada directamente a relleno", { min: 0, max: 1, ...ui({ nombre: "Porcentaje de otros residuos", explicacion: "Se calcula como 100 % menos orgánico y PET; en esta versión va directo a relleno.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 0, max: 100, unidad: "%" }, ejemplo: "55 % orgánico y 10 % PET dejan 35 % de resto.", consecuencia: "Editar tres porcentajes por separado facilita sumas incoherentes.", criticidad: "Alta", exposicion: "U-R", comoObtener: "El sistema lo calcula a partir de la caracterización de orgánico y PET." }) }),
  },
  pet: {
    tauCapturaDias: p(2, "días", "SUPUESTO", "Tiempo operativo por validar", "Permanencia media antes de clasificación", { min: 1e-6, ...ui({ nombre: "Tiempo que el PET permanece disperso", explicacion: "Tiempo promedio antes de que el PET deje botes mezclados o puntos dispersos.", unidadEntrada: "días", formato: "dias", rangoRazonable: { min: 0.1, max: 14, unidad: "días" }, ejemplo: "Con 10 kg dispersos y 2 días, 5 kg/día dejan ese stock antes de intentar captura.", consecuencia: "Un valor corto vacía el stock demasiado rápido; uno largo deja inventario pendiente.", criticidad: "Media", exposicion: "A", comoObtener: "Estima el tiempo medio entre descarte, recolección y clasificación mediante seguimiento operativo." }) }),
    cobertura: p(0.65, "1", "SUPUESTO", "Cobertura de contenedores por levantar", "Fracción de la corriente alcanzada por infraestructura", { min: 0, max: 1, ...ui({ nombre: "PET al alcance de contenedores y rutas", explicacion: "Parte de la corriente a la que la infraestructura puede llegar; no es participación.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 0, max: 100, unidad: "%" }, ejemplo: "65 % de cobertura y 35 % de participación intentan captar 22.75 % del PET disponible.", consecuencia: "Usar aquí participación cuenta el comportamiento dos veces.", criticidad: "Alta", exposicion: "U", comoObtener: "Mapea puntos de generación y verifica cuáles tienen contenedor y ruta funcional." }) }),
    rechazoCaptura: p(0.12, "1", "SUPUESTO", "Contaminación por caracterizar", "Fracción rechazada del intento de captura", { min: 0, max: 1, ...ui({ nombre: "PET separado que se rechaza", explicacion: "Porcentaje del intento de separación que no se acepta por contaminación.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 0, max: 100, unidad: "%" }, ejemplo: "De 10 kg intentados, 12 % envía 1.2 kg a relleno y acepta 8.8 kg.", consecuencia: "Omitir contaminación sobreestima el PET útil y el filamento.", criticidad: "Alta", exposicion: "U", comoObtener: "Pesa material aceptado y rechazado en varias jornadas de clasificación." }) }),
    tauProcesoDias: p(1, "días", "SUPUESTO", "Tiempo de despacho operativo", "Tiempo mínimo de disponibilidad para triturar", { min: 1e-6, ...ui({ nombre: "Tiempo mínimo antes de triturar PET", explicacion: "Retraso operativo de disponibilidad; no es la capacidad diaria de la trituradora.", unidadEntrada: "días", formato: "dias", rangoRazonable: { min: 0.1, max: 30, unidad: "días" }, ejemplo: "Con 6 kg acopiados y 1 día, hasta 6 kg/día están disponibles antes del límite de la máquina.", consecuencia: "Confundirlo con frecuencia o capacidad distorsiona el backlog.", criticidad: "Media", exposicion: "A", comoObtener: "Mide el tiempo entre aceptación del PET y disponibilidad efectiva para trituración." }) }),
    capacidadTrituradoraKgDia: p(1, "kg/día", "SUPUESTO", "Capacidad nominal ilustrativa", "Límite duro de procesamiento", { min: 0, ...ui({ nombre: "Capacidad diaria de la trituradora", explicacion: "Máximo de PET que puede procesarse por día cuando hay material disponible.", unidadEntrada: "kg/día", formato: "masa", rangoRazonable: { min: 0, max: 1000, unidad: "kg/día" }, ejemplo: "Si entran 1.8 kg/día y se procesan 1 kg/día, el backlog crece cerca de 0.8 kg/día.", consecuencia: "Usar capacidad por hora como diaria altera de forma grande el acopio.", criticidad: "Alta", exposicion: "U", comoObtener: "Cronometra jornadas representativas y divide kg procesados entre horas efectivas convertidas a día." }) }),
    rechazoProceso: p(0.08, "1", "SUPUESTO", "Rendimiento por medir", "Fracción rechazada durante procesamiento", { min: 0, max: 1, ...ui({ nombre: "PET que se pierde al procesar", explicacion: "Porcentaje del PET triturado que no termina como filamento útil.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 0, max: 100, unidad: "%" }, ejemplo: "Procesar 10 kg con 8 % de rechazo produce 9.2 kg de filamento acumulable.", consecuencia: "Omitirlo convierte todo el material procesado en producto útil.", criticidad: "Alta", exposicion: "U", comoObtener: "Pesa la alimentación y el producto útil del proceso en varios lotes." }) }),
    capacidadAlmacenKg: p(25, "kg", "SUPUESTO", "Umbral nominal ilustrativo", "Umbral de saturación; no es un tope físico", { min: 1e-6, ...ui({ nombre: "Umbral de saturación del acopio PET", explicacion: "Cantidad a partir de la cual la operación se considera saturada; el modelo puede rebasarla.", unidadEntrada: "kg", formato: "masa", rangoRazonable: { min: 0.1, max: 10000, unidad: "kg" }, ejemplo: "Con umbral de 25 kg, 30 kg representan 120 % de saturación, no un bloqueo.", consecuencia: "Tratarlo como tope físico oculta la acumulación y su efecto sobre participación.", criticidad: "Alta", exposicion: "U", comoObtener: "Define con el equipo operativo a partir de qué masa el acopio deja de funcionar con normalidad." }) }),
  },
  organico: {
    tauCapturaDias: p(1.5, "días", "SUPUESTO", "Tiempo operativo por validar", "Permanencia media antes de clasificación", { min: 1e-6, ...ui({ nombre: "Tiempo que el orgánico permanece disperso", explicacion: "Tiempo promedio antes de que deje la corriente mezclada para intentar separarse o ir a relleno.", unidadEntrada: "días", formato: "dias", rangoRazonable: { min: 0.1, max: 14, unidad: "días" }, ejemplo: "Con 9 kg dispersos y 1.5 días, 6 kg/día dejan ese stock.", consecuencia: "Un tiempo incorrecto distorsiona retrasos e inventario pendiente.", criticidad: "Media", exposicion: "A", comoObtener: "Sigue una muestra desde descarte hasta clasificación y documenta tiempos representativos." }) }),
    cobertura: p(0.58, "1", "SUPUESTO", "Cobertura de separación por levantar", "Fracción de la corriente alcanzada", { min: 0, max: 1, ...ui({ nombre: "Orgánico al alcance de separación", explicacion: "Parte del residuo orgánico a la que llegan contenedores y rutas; no es participación.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 0, max: 100, unidad: "%" }, ejemplo: "58 % de cobertura y 35 % de participación intentan separar 20.3 % del orgánico disponible.", consecuencia: "Confundir cobertura con participación cuenta dos veces el comportamiento.", criticidad: "Alta", exposicion: "U", comoObtener: "Mapea puntos de generación orgánica y verifica servicio efectivo de separación." }) }),
    rechazoCaptura: p(0.1, "1", "SUPUESTO", "Contaminación por caracterizar", "Fracción rechazada del intento de captura", { min: 0, max: 1, ...ui({ nombre: "Orgánico separado que se rechaza", explicacion: "Porcentaje del intento de separación que no entra a fermentación por contaminación.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 0, max: 100, unidad: "%" }, ejemplo: "De 10 kg intentados, 10 % rechaza 1 kg y acepta 9 kg.", consecuencia: "Omitirlo sobreestima material en fermentación y composta aplicada.", criticidad: "Alta", exposicion: "U", comoObtener: "Pesa material aceptado y rechazado en varias jornadas de recepción." }) }),
    nEtapasFermentacion: p(3, "etapas", "SUPUESTO", "Estructura Erlang elegida para v1", "Número de sub-stocks en serie", { min: 1, entero: true, estructural: true, ...ui({ nombre: "Etapas internas de fermentación", explicacion: "Aproxima la distribución del tiempo de proceso; cambia la estructura matemática y no son recipientes físicos.", unidadEntrada: "etapas", formato: "entero", rangoRazonable: { min: 1, max: 20, unidad: "etapas" }, ejemplo: "Tres etapas suavizan la salida alrededor del tiempo promedio de 21 días.", consecuencia: "Un valor enorme encarece el cálculo y no puede cambiar dentro de una rama.", criticidad: "Media/Alta", exposicion: "A", comoObtener: "Defínelo durante la calibración del modelo, antes de iniciar cualquier corrida." }) }),
    tauFermentacionDias: p(21, "días", "ESTIMADO", "Duración técnica de referencia para bokashi", "Residencia media total de fermentación", { min: 1e-6, ...ui({ nombre: "Días promedio hasta que la composta queda lista", explicacion: "Permanencia media total del proceso, no duración de cada etapa interna.", unidadEntrada: "días", formato: "dias", rangoRazonable: { min: 1, max: 90, unidad: "días" }, ejemplo: "Material que entra al inicio sale en promedio alrededor del día 21.", consecuencia: "Usar semanas como días adelanta o retrasa la composta y la retroalimentación.", criticidad: "Alta", exposicion: "U", comoObtener: "Registra fechas de ingreso y disponibilidad de varios lotes representativos." }) }),
    tauAplicacionDias: p(4, "días", "SUPUESTO", "Ritmo de aplicación por validar con el huerto", "Tiempo medio para aplicar composta lista", { min: 1e-6, ...ui({ nombre: "Tiempo para aplicar la composta lista", explicacion: "Ritmo promedio con que el huerto retira y aplica el material disponible.", unidadEntrada: "días", formato: "dias", rangoRazonable: { min: 0.1, max: 60, unidad: "días" }, ejemplo: "Con 20 kg-equivalentes listos y 4 días, se aplican 5 kg-equivalentes/día.", consecuencia: "Un valor corto vacía de inmediato la composta; uno largo acumula inventario.", criticidad: "Alta", exposicion: "U", comoObtener: "Divide el inventario medio disponible entre el ritmo diario observado de aplicación." }) }),
  },
  retroalimentacion: {
    participacionInicial: p(0.35, "1", "SUPUESTO", "Sin encuesta de participación", "Participación observable inicial", { min: 1e-6, max: 0.999999, ...ui({ nombre: "Participación al comenzar", explicacion: "Porcentaje de personas que separa correctamente al inicio; no es la meta de una campaña.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 1, max: 99, unidad: "%" }, ejemplo: "35 % significa que al iniciar participan 35 de cada 100 personas.", consecuencia: "Usar una meta futura como valor inicial sobreestima captura desde el día cero.", criticidad: "Alta", exposicion: "U", comoObtener: "Usa observación o encuesta de separación correcta realizada antes de la intervención." }) }),
    participacionBase: p(0.38, "1", "SUPUESTO", "Sin encuesta de participación", "Objetivo basal de participación", { min: 1e-6, max: 0.999999, ...ui({ nombre: "Participación habitual de referencia", explicacion: "Nivel hacia el que tendería el campus antes de refuerzo visible y saturación PET.", unidadEntrada: "%", formato: "porcentaje", rangoRazonable: { min: 1, max: 99, unidad: "%" }, ejemplo: "Sin otras señales, la participación se mueve gradualmente hacia 38 %.", consecuencia: "Confundirla con cobertura cambia la captura de ambas corrientes.", criticidad: "Alta", exposicion: "U", comoObtener: "Estima el nivel sostenido mediante observaciones repetidas en condiciones habituales." }) }),
    tauParticipacionDias: p(10, "días", "SUPUESTO", "Tiempo de ajuste perceptual", "Tiempo de ajuste del stock informacional", { min: 1e-6, ...ui({ nombre: "Tiempo que tarda en cambiar la participación", explicacion: "Rapidez con que las personas responden a una situación sostenida; no cambia por sí solo la meta.", unidadEntrada: "días", formato: "dias", rangoRazonable: { min: 0.1, max: 180, unidad: "días" }, ejemplo: "En 10 días se recorre cerca de 63 % de la distancia hacia una meta constante.", consecuencia: "Un valor casi cero reacciona de inmediato; uno enorme congela la participación.", criticidad: "Media/Alta", exposicion: "A", comoObtener: "Calibra con una serie temporal posterior a una intervención o cambio operativo." }) }),
    betaRefuerzo: p(1.35, "1", "SUPUESTO", "Intensidad R1 ilustrativa", "Efecto de productividad visible sobre log-odds", { min: 0, ...ui({ nombre: "Fuerza del refuerzo por resultados visibles", explicacion: "Controla cuánto puede subir la meta cuando se observa composta aplicada.", unidadEntrada: "factor", formato: "factor", rangoRazonable: { min: 0, max: 5, unidad: "factor" }, ejemplo: "Con base 38 % y señal visible de 50 %, 1.35 lleva la meta cerca de 55 % sin saturación.", consecuencia: "Un valor alto crea un refuerzo conductual no respaldado en ambas corrientes.", criticidad: "Alta", exposicion: "A", comoObtener: "Calibra con datos de participación y visibilidad; no se infiere de una sola observación." }) }),
    betaSaturacion: p(0.9, "1", "SUPUESTO", "Intensidad B1 ilustrativa", "Efecto de saturación PET sobre log-odds", { min: 0, ...ui({ nombre: "Fuerza del desánimo por saturación PET", explicacion: "Controla cuánto baja la meta cuando el PET acopiado alcanza o rebasa el umbral.", unidadEntrada: "factor", formato: "factor", rangoRazonable: { min: 0, max: 5, unidad: "factor" }, ejemplo: "Con base 38 % y acopio igual al umbral, 0.9 reduce la meta cerca de 20 % sin refuerzo.", consecuencia: "Un valor alto atribuye una caída conductual extrema al almacén lleno.", criticidad: "Alta", exposicion: "A", comoObtener: "Calibra con observaciones simultáneas de saturación y participación." }) }),
    tauVisibilidadDias: p(14, "días", "SUPUESTO", "Persistencia visual por validar", "Ajuste de la productividad visible", { min: 1e-6, ...ui({ nombre: "Tiempo de visibilidad del beneficio del huerto", explicacion: "Suaviza la señal de composta aplicada para que no cambie instantáneamente.", unidadEntrada: "días", formato: "dias", rangoRazonable: { min: 0.1, max: 180, unidad: "días" }, ejemplo: "En 14 días la señal visible recorre cerca de 63 % de un ajuste sostenido.", consecuencia: "Un tiempo mínimo vuelve instantáneo el efecto; uno largo lo retrasa.", criticidad: "Media", exposicion: "A", comoObtener: "Documenta cuánto tarda el resultado en hacerse visible y cuánto permanece perceptible." }) }),
    flujoAplicacionReferenciaKgDia: p(5, "kg/día", "SUPUESTO", "Escala de visibilidad ilustrativa", "Flujo que produce una señal visible de 0.5", { min: 1e-6, ...ui({ nombre: "Aplicación diaria claramente visible", explicacion: "Escala de referencia: al aplicar esa cantidad la señal inmediata modelada vale 50 %.", unidadEntrada: "kg-equivalentes húmedos/día", formato: "masa", rangoRazonable: { min: 0.01, max: 1000, unidad: "kg-equivalentes húmedos/día" }, ejemplo: "Aplicar 5 kg/día con referencia 5 produce señal 50 %; 10 kg/día cerca de 67 %.", consecuencia: "Una referencia baja exagera el éxito; una alta vuelve casi invisible la aplicación.", criticidad: "Alta", exposicion: "A", comoObtener: "Acuerda una escala con el huerto y calibra contra resultados que las personas realmente perciben." }) }),
  },
});

const esParametro = (valor) => Boolean(
  valor && typeof valor === "object" && !Array.isArray(valor)
  && Object.prototype.hasOwnProperty.call(valor, "valor")
  && Object.prototype.hasOwnProperty.call(valor, "procedencia"),
);

const CAMPOS_ONBOARDING = Object.freeze([
  "nombre",
  "explicacion",
  "unidadEntrada",
  "formato",
  "rangoRazonable",
  "origenDefault",
  "ejemplo",
  "consecuencia",
  "criticidad",
  "exposicion",
  "comoObtener",
]);

/**
 * Convierte el porcentaje que ve la persona a la fracción que usa el modelo.
 * @param {number|string} valor
 * @param {{max?:number}} [opciones]
 * @returns {number}
 */
export function porcentajeAFraccion(valor, opciones = {}) {
  const numero = Number(valor);
  const max = opciones.max ?? 100;
  if (!Number.isFinite(numero) || numero < 0 || numero > max) {
    throw new Error(`Escribe un valor entre 0 y ${max} %. Por ejemplo, 30 significa 30 %.`);
  }
  return numero / 100;
}

/**
 * Convierte una fracción interna al porcentaje que se muestra en la interfaz.
 * @param {number} valor
 * @returns {number}
 */
export function fraccionAPorcentaje(valor) {
  if (!Number.isFinite(valor) || valor < 0) throw new Error("La fracción debe ser un número no negativo");
  return valor * 100;
}

const clonar = (valor) => {
  if (Array.isArray(valor)) return valor.map(clonar);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(Object.entries(valor).map(([clave, dato]) => [clave, clonar(dato)]));
  }
  return valor;
};

const congelarProfundo = (valor) => {
  if (!valor || typeof valor !== "object" || Object.isFrozen(valor)) return valor;
  Object.values(valor).forEach(congelarProfundo);
  return Object.freeze(valor);
};

const recorrerParametros = (nodo, visita, ruta = "") => {
  if (esParametro(nodo)) {
    visita(nodo, ruta);
    return;
  }
  if (Array.isArray(nodo)) {
    nodo.forEach((item, indice) => recorrerParametros(item, visita, ruta ? `${ruta}.${indice}` : String(indice)));
    return;
  }
  if (nodo && typeof nodo === "object") {
    Object.entries(nodo).forEach(([clave, valor]) => recorrerParametros(valor, visita, ruta ? `${ruta}.${clave}` : clave));
  }
};

const obtenerEnRuta = (objeto, ruta) => ruta.split(".").reduce((actual, parte) => {
  if (actual === undefined || actual === null || !Object.prototype.hasOwnProperty.call(actual, parte)) {
    throw new Error(`Parámetro inexistente: ${ruta}`);
  }
  return actual[parte];
}, objeto);

const validarCalendario = (calendario, ruta) => {
  if (!Array.isArray(calendario) || calendario.length === 0) {
    throw new Error(`${ruta} debe contener al menos un intervalo de calendario`);
  }
  let finAnterior = -Infinity;
  calendario.forEach((tramo, indice) => {
    const { desde, hasta, multiplicador } = tramo ?? {};
    if (![desde, hasta, multiplicador].every(Number.isFinite)) {
      throw new Error(`${ruta}.${indice} contiene valores no numéricos`);
    }
    if (desde < finAnterior || hasta <= desde || multiplicador < 0) {
      throw new Error(`${ruta}.${indice} no es un intervalo ordenado válido`);
    }
    finAnterior = hasta;
  });
};

/**
 * Revisa la captura guiada sin cambiar la semántica del núcleo: los huecos se
 * informan porque el modelo usa actividad cero fuera de los intervalos.
 * @param {Array<{desde:number,hasta:number,multiplicador:number}>} calendario
 * @param {number} horizonte
 * @returns {{errores:string[],advertencias:string[],informacion:string[]}}
 */
export function analizarCalendario(calendario, horizonte) {
  const errores = [];
  const advertencias = [];
  const informacion = [];
  if (!Array.isArray(calendario) || calendario.length === 0) {
    return { errores: ["Agrega al menos un periodo de actividad."], advertencias, informacion };
  }
  let finAnterior = 0;
  calendario.forEach((tramo, indice) => {
    const numero = indice + 1;
    const { desde, hasta, multiplicador } = tramo ?? {};
    if (![desde, hasta, multiplicador].every(Number.isFinite)) {
      errores.push(`El periodo ${numero} contiene un valor no numérico.`);
      return;
    }
    if (!Number.isInteger(desde) || !Number.isInteger(hasta)) errores.push(`El periodo ${numero} debe usar días enteros.`);
    if (desde < 0 || hasta <= desde) errores.push(`El periodo ${numero} debe terminar después de comenzar.`);
    if (multiplicador < 0) errores.push(`El periodo ${numero} no puede tener actividad negativa.`);
    if (desde < finAnterior) errores.push(`El periodo ${numero} comienza antes de que termine el anterior.`);
    if (desde > finAnterior && finAnterior < horizonte) {
      advertencias.push(`No hay actividad definida del día ${finAnterior} al ${Math.min(desde, horizonte)}; el modelo usaría 0 personas.`);
    }
    if (multiplicador > 1) advertencias.push(`El periodo ${numero} usa ${fraccionAPorcentaje(multiplicador)} % de actividad; confirma la fuente.`);
    finAnterior = Math.max(finAnterior, hasta);
  });
  if (finAnterior < horizonte) advertencias.push(`No hay actividad definida del día ${finAnterior} al ${horizonte}; el modelo usaría 0 personas.`);
  if (finAnterior > horizonte) informacion.push(`El calendario continúa después del horizonte, hasta el día ${finAnterior}.`);
  return { errores, advertencias, informacion };
}

/**
 * Valida dominios, unidades, procedencia y coherencia de composición.
 * @param {{catalogo: Object, historial: Array<Object>}} params
 * @returns {void}
 */
export function validarParametros(params) {
  if (!params || typeof params !== "object" || !params.catalogo) {
    throw new TypeError("Se esperaba un catálogo de parámetros");
  }
  recorrerParametros(params.catalogo, (parametro, ruta) => {
    if (!PROCEDENCIAS.includes(parametro.procedencia)) {
      throw new Error(`${ruta} tiene procedencia inválida`);
    }
    if (typeof parametro.unidad !== "string" || !parametro.unidad || typeof parametro.fuente !== "string" || !parametro.fuente) {
      throw new Error(`${ruta} debe declarar unidad y fuente`);
    }
    const faltantes = CAMPOS_ONBOARDING.filter((campo) => {
      const valor = parametro.onboarding?.[campo];
      return valor === undefined || valor === null || valor === "";
    });
    if (faltantes.length > 0) throw new Error(`${ruta} carece de onboarding: ${faltantes.join(", ")}`);
    if (!FORMATOS_ENTRADA.includes(parametro.onboarding.formato)) throw new Error(`${ruta} tiene formato de entrada inválido`);
    if (!EXPOSICIONES.includes(parametro.onboarding.exposicion)) throw new Error(`${ruta} tiene exposición inválida`);
    if (Array.isArray(parametro.valor)) {
      validarCalendario(parametro.valor, ruta);
      return;
    }
    if (!Number.isFinite(parametro.valor)) throw new Error(`${ruta} debe ser numérico y finito`);
    if (parametro.min !== undefined && parametro.valor < parametro.min) throw new Error(`${ruta} está por debajo de ${parametro.min}`);
    if (parametro.max !== undefined && parametro.valor > parametro.max) throw new Error(`${ruta} está por encima de ${parametro.max}`);
    if (parametro.entero && !Number.isInteger(parametro.valor)) throw new Error(`${ruta} debe ser entero`);
  });

  const ids = params.catalogo.generacion.segmentos.map((segmento) => segmento.id);
  if (new Set(ids).size !== ids.length) throw new Error("Los identificadores poblacionales deben ser únicos");
  const composicion = params.catalogo.composicion;
  const suma = composicion.organica.valor + composicion.pet.valor + composicion.resto.valor;
  if (Math.abs(suma - 1) > 1e-12) {
    throw new Error(`Las fracciones de composición deben sumar 1; suma actual: ${suma}`);
  }
}

/**
 * Construye un catálogo inmutable.
 * @param {Object} [definicion]
 * @returns {{catalogo: Object, historial: Array<Object>}}
 */
export function crearParametros(definicion = DEFINICION_BASE) {
  const params = { catalogo: clonar(definicion), historial: [] };
  validarParametros(params);
  return congelarProfundo(params);
}

/**
 * Extrae un objeto de valores sin metadatos para el núcleo numérico.
 * @param {{catalogo: Object}} params
 * @returns {Object}
 */
export function extraerValores(params) {
  const extraer = (nodo) => {
    if (esParametro(nodo)) return clonar(nodo.valor);
    if (Array.isArray(nodo)) return nodo.map(extraer);
    if (nodo && typeof nodo === "object") {
      return Object.fromEntries(Object.entries(nodo).map(([clave, valor]) => [clave, extraer(valor)]));
    }
    return nodo;
  };
  return extraer(params.catalogo);
}

/**
 * Aplica cambios prospectivos y conserva una bitácora inmutable.
 * @param {{catalogo: Object, historial: Array<Object>}} params
 * @param {Record<string, {valor: unknown, procedencia: Procedencia, fuente: string}>} overrides
 * @param {{tDia?: number, ruta?: string, permitirEstructurales?: boolean}} [contexto]
 * @returns {{catalogo: Object, historial: Array<Object>}}
 */
export function aplicarOverrides(params, overrides, contexto = {}) {
  const catalogo = clonar(params.catalogo);
  const cambios = [];
  for (const [ruta, reemplazo] of Object.entries(overrides ?? {})) {
    const parametro = obtenerEnRuta(catalogo, ruta);
    if (!esParametro(parametro)) throw new Error(`${ruta} no identifica un parámetro escalar o calendario`);
    if (parametro.estructural && !contexto.permitirEstructurales) {
      throw new Error(`${ruta} es estructural y no puede cambiar durante una ramificación`);
    }
    if (!reemplazo || !Object.prototype.hasOwnProperty.call(reemplazo, "valor") || !PROCEDENCIAS.includes(reemplazo.procedencia) || !reemplazo.fuente) {
      throw new Error(`El override ${ruta} debe declarar valor, procedencia y fuente`);
    }
    cambios.push({
      ruta,
      anterior: clonar(parametro.valor),
      nuevo: clonar(reemplazo.valor),
      procedencia: reemplazo.procedencia,
      fuente: reemplazo.fuente,
      tDia: contexto.tDia ?? 0,
      rutaEscenario: contexto.ruta ?? "base",
    });
    parametro.valor = clonar(reemplazo.valor);
    parametro.procedencia = reemplazo.procedencia;
    parametro.fuente = reemplazo.fuente;
  }
  const resultado = { catalogo, historial: [...params.historial.map(clonar), ...cambios] };
  validarParametros(resultado);
  return congelarProfundo(resultado);
}

/**
 * Lista parámetros con trazabilidad completa.
 * @param {{catalogo: Object}} params
 * @param {Procedencia|null} [procedencia]
 * @returns {Array<{ruta: string, valor: unknown, unidad: string, procedencia: Procedencia, fuente: string, descripcion: string, estructural: boolean}>}
 */
export function listarParametros(params, procedencia = null) {
  const resultado = [];
  recorrerParametros(params.catalogo, (parametro, ruta) => {
    if (!procedencia || parametro.procedencia === procedencia) {
      resultado.push({
        ruta,
        valor: clonar(parametro.valor),
        unidad: parametro.unidad,
        procedencia: parametro.procedencia,
        fuente: parametro.fuente,
        descripcion: parametro.descripcion,
        estructural: Boolean(parametro.estructural),
        min: parametro.min,
        max: parametro.max,
        entero: Boolean(parametro.entero),
        onboarding: clonar(parametro.onboarding),
      });
    }
  });
  return resultado;
}

/** @param {{catalogo:Object}} params @returns {Record<Procedencia, number>} */
export function contarProcedencias(params) {
  const conteo = { MEDIDO: 0, ESTIMADO: 0, SUPUESTO: 0 };
  recorrerParametros(params.catalogo, (parametro) => { conteo[parametro.procedencia] += 1; });
  return conteo;
}

/**
 * Obtiene un parámetro con metadatos por ruta.
 * @param {{catalogo: Object}} params
 * @param {string} ruta
 * @returns {Parametro}
 */
export function obtenerParametro(params, ruta) {
  const parametro = obtenerEnRuta(params.catalogo, ruta);
  if (!esParametro(parametro)) throw new Error(`${ruta} no identifica un parámetro`);
  return parametro;
}
