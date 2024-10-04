import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/cli.ts", "src/main.ts"],
	format: ["esm", "cjs"],
	splitting: false,
	sourcemap: false,
	dts: true,
	clean: true,
});
