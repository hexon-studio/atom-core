import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/cli.ts", "src/main.ts", "src/utils.ts", "src/errors/index.ts"],
	format: ["esm", "cjs"],
	splitting: false,
	sourcemap: false,
	dts: true,
	clean: true,
	minify: true,
});
