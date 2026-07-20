import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ARBOL_EJEMPLO } from "../escenarios_ejemplo.js";

const raiz = new URL("../", import.meta.url);
const [html, app] = await Promise.all([
  readFile(new URL("index.html", raiz), "utf8"),
  readFile(new URL("app.js", raiz), "utf8"),
]);

test("conserva el contrato DOM de la versión estable", () => {
  const ids = [
    "simulador", "contenido", "metodo", "parameter-editor", "dt", "integrator-method", "method-pill",
    "restore-params", "restore-tree", "tree-preview", "kpi-grid", "run-model",
    "leaf-select", "tree-spec", "export-indicators", "export-trajectory", "export-parameters",
  ];
  ids.forEach((id) => assert.match(html, new RegExp(`id=["']${id}["']`), `Falta #${id}`));
  assert.match(html, /id="compatibility-controls"/);
  assert.match(html, /<details[^>]+id="compatibility-controls"/);
});

test("conserva rutas técnicas y corrige únicamente sus nombres visibles", () => {
  const decision = ARBOL_EJEMPLO.puntos.find((punto) => punto.nombre === "capacidad_bokashi");
  assert.ok(decision, "Debe conservarse el identificador capacidad_bokashi");
  assert.deepEqual(decision.alternativas.map((alternativa) => alternativa.etiqueta), ["bokashi_actual", "bokashi_ampliado"]);
  assert.deepEqual(decision.alternativas.map((alternativa) => alternativa.nombreVisible), [
    "Operación orgánica actual",
    "Separación y aplicación orgánica ampliadas",
  ]);
});

test("evita APIs que rompieron el constructor en navegadores institucionales", () => {
  assert.doesNotMatch(app, /Object\.hasOwn\s*\(/);
  assert.doesNotMatch(app, /\.at\s*\(/);
  assert.match(app, /Object\.prototype\.hasOwnProperty\.call/);
});

test("no ejecuta la primera corrida automáticamente y muestra fallos de arranque", () => {
  assert.doesNotMatch(app, /^simular\(\);$/m);
  assert.match(app, /try\s*{\s*iniciar\(\);/);
  assert.match(app, /No se pudo iniciar la interfaz/);
});

test("invalida resultados cuando cambia la configuración", () => {
  assert.match(app, /function invalidarResultados\(\)/);
  assert.match(app, /\[data-calendar-path\] button, #scenario-list button, #add-decision/);
  assert.match(app, /\[data-provenance-control\]/);
  assert.match(app, /botonResultados\.disabled = true/);
});
