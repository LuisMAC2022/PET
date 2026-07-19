import { ejecutarSuite } from "./suite.js";

const salida = document.querySelector("#resultados-pruebas");
const resumen = document.querySelector("#resumen-pruebas");
const resultados = ejecutarSuite();
const aprobadas = resultados.filter((resultado) => resultado.ok).length;

resumen.textContent = `${aprobadas} de ${resultados.length} pruebas aprobadas`;
resumen.className = aprobadas === resultados.length ? "test-summary ok" : "test-summary fail";

for (const resultado of resultados) {
  const articulo = document.createElement("article");
  articulo.className = `test-result ${resultado.ok ? "ok" : "fail"}`;
  const titulo = document.createElement("h2");
  titulo.textContent = `${resultado.ok ? "✓" : "✕"} ${resultado.nombre}`;
  const detalle = document.createElement("p");
  detalle.textContent = `${resultado.duracionMs.toFixed(1)} ms`;
  articulo.append(titulo, detalle);
  if (resultado.error) {
    const pre = document.createElement("pre");
    pre.textContent = resultado.error;
    articulo.append(pre);
  }
  salida.append(articulo);
}
