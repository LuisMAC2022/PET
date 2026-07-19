import test from "node:test";
import { CASOS } from "./suite.js";

for (const caso of CASOS) test(caso.nombre, caso.ejecutar);
