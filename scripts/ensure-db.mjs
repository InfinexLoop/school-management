import { closeSync, existsSync, openSync } from "node:fs";

if (!existsSync("dev.db")) closeSync(openSync("dev.db", "a"));
