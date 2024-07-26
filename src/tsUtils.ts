import path from "path";
import fs from "fs";
import ts from "typescript";
import * as colorette from "colorette";

import { PathInfo } from "./utils";
import * as vm from "vm";
import JSON5 from "json5";

import { createRequire } from "module";
import { pathToFileURL } from "url";

const getTSCompilerOptions = (filePath: string): ts.CompilerOptions => {
	let options: ts.CompilerOptions = {};

	let tsconfigFile = filePath;

	while (fs.existsSync(path.resolve(tsconfigFile, "tsconfig.json")) !== true && path.dirname(tsconfigFile) !== path.dirname(process.cwd())) {
		tsconfigFile = path.dirname(tsconfigFile);
	}

	try {
		if (fs.existsSync(path.resolve(tsconfigFile, "tsconfig.json"))) {
			const tsconfig: ts.TranspileOptions = JSON5.parse(fs.readFileSync(path.resolve(tsconfigFile, "tsconfig.json"), "utf-8"));
			options = tsconfig.compilerOptions ?? {};
		}
	} catch (err) {}

	const rootDir = path.join(tsconfigFile, options.rootDir ?? "");

	const compilerOptions: ts.CompilerOptions = {
		listEmittedFiles: true,
		declaration: true,
		declarationMap: true,
		sourceMap: true,
		forceConsistentCasingInFileNames: true,
		allowJs: true,
		checkJs: false,
		allowSyntheticDefaultImports: true,
		noFallthroughCasesInSwitch: true,
		esModuleInterop: true,
		resolveJsonModule: true,
		strict: true,
		noImplicitAny: false,
		skipLibCheck: true,
		pretty: true,
		noEmitOnError: true,
		removeComments: false,
		...options,
		target: ts.ScriptTarget.ESNext,
		module: ts.ModuleKind.CommonJS,
		moduleResolution: ts.ModuleResolutionKind.NodeJs,
		lib: [...(options.lib ?? []), "esnext", "ES2015"].map((lib) => `lib.${lib.toLowerCase()}.d.ts`),
		rootDir: typeof options.rootDir === "string" ? rootDir : undefined,
		outDir: typeof options.outDir === "string" ? path.join(tsconfigFile, options.outDir) : undefined,
		declarationDir: typeof options.declarationDir === "string" ? path.join(tsconfigFile, options.declarationDir) : undefined,
		noEmit: false,
	};

	compilerOptions.baseUrl = compilerOptions.baseUrl ?? compilerOptions.rootDir ?? tsconfigFile;

	return compilerOptions;
};

const validateTypeScript = (filePath: string): string => {
	// Ler o conteúdo do arquivo TypeScript
	const fileContent = fs.readFileSync(filePath, "utf-8");

	// Carregar as configurações do tsconfig.json (se existir)
	const compilerOptions = getTSCompilerOptions(filePath);

	// Criar o compilador TypeScript
	const program = ts.createProgram([filePath], { ...compilerOptions, outDir: path.resolve(process.cwd(), "dist") });

	// Verificar se há erros no código TypeScript
	const diagnostics = ts.getPreEmitDiagnostics(program);

	if (diagnostics.length > 0) {
		// Exibir erros de validação
		diagnostics.forEach((diagnostic) => {
			const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
			const fileName = diagnostic.file?.fileName ?? filePath;

			if (diagnostic.file && diagnostic.start !== undefined) {
				const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
				const errorLine = fileContent.split("\n")[line].replace(/\t/g, " ");
				const errorLength = diagnostic.length || message.length; // Usa o comprimento do erro ou da mensagem
				console.error(
					`\n${colorette.cyan(path.relative(process.cwd(), fileName))}:${colorette.yellow(line + 1)}:${colorette.yellow(character + 1)} - ${colorette.red("error")} ${colorette.blue(
						`TS${diagnostic.code}`,
					)}: ${message}\n\n${colorette.bgWhite(colorette.black(line + 1))} ${errorLine}\n${colorette.bgWhite(" ")} ${" ".repeat(character)}${colorette.red("~".repeat(errorLength))}\n`,
				);
			} else {
				console.error(`\n${colorette.cyan(path.relative(process.cwd(), fileName))} - ${colorette.red("error")} ${colorette.blue(`TS${diagnostic.code}`)}: ${message}\n`);
			}
		});

		return "";
	}

	return fileContent;
};

const resolveModule = (specifier: string, actualPath: string, baseUrl?: string, paths?: ts.MapLike<string[]>): string => {
	const isExists = (p: string): string | undefined => {
		const paths: string[] = ["", ".js", ".ts", ".json", ".node", ".cjs", ".mjs", ".jsx", ".tsx", ".mts"]
			.map((ext) => p + ext)
			.concat(["index.js", "index.ts", "index.json", "index.node", "index.cjs", "index.mjs", "index.jsx", "index.tsx", "index.mts"].map((ext) => path.resolve(p, ext)));
		return paths.find((p) => fs.existsSync(p));
	};

	const resolvedPath = isExists(path.resolve(actualPath, specifier));
	if (resolvedPath) {
		return resolvedPath;
	}

	if (!baseUrl) {
		return specifier;
	}

	const absoluteBaseUrl = path.resolve(baseUrl);

	if (fs.existsSync(path.resolve(absoluteBaseUrl, specifier))) {
		return path.resolve(absoluteBaseUrl, specifier);
	}

	if (paths) {
		for (const [key, values] of Object.entries(paths)) {
			const pattern = new RegExp(`^${key.replace(/\*/g, "(.*)")}$`);
			const match = specifier.match(pattern);
			if (match) {
				for (const value of values) {
					const resolvedPath = isExists(path.join(absoluteBaseUrl, value.replace(/\*/g, match[1])));
					if (resolvedPath) {
						return resolvedPath;
					}
				}
			}
		}
	}
	// Caso não tenha tsconfig paths ou não resolva, retorna o especificador original
	return specifier;
};

const compileTypeScript = (filePath: string): string => {
	try {
		const fileContent = validateTypeScript(filePath);

		// Opções de compilação do TypeScript
		const compilerOptions = getTSCompilerOptions(filePath);

		// Compilar o código TypeScript
		let { outputText, sourceMapText } = ts.transpileModule(fileContent, {
			compilerOptions: { ...compilerOptions, sourceMap: true },
			fileName: filePath,
			transformers: {
				before: [
					(context) => {
						return (sourceFile): any => {
							function visitor(node: ts.Node): ts.Node {
								if (ts.isImportDeclaration(node)) {
									const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
									const resolvedModule = resolveModule(moduleSpecifier, path.dirname(filePath), compilerOptions.baseUrl, compilerOptions.paths);
									return ts.factory.updateImportDeclaration(
										node,
										node.modifiers,
										node.importClause,
										ts.factory.createStringLiteral(resolvedModule),
										node.assertClause, // Adiciona o parâmetro assertClause
									);
								}
								return ts.visitEachChild(node, visitor, context);
							}
							return ts.visitNode(sourceFile, visitor);
						};
					},
				],
			},
		});

		outputText = `(async function(){${outputText.replace(/\n\/\/\# sourceMappingURL\=(.+)$/gi, "").replace(/(.)require(.{1,10})/gi, (a, b, c) => {
			if (c.trim().startsWith("(") && !/[a-z_]/gi.test(b)) {
				return `${b}await require${c}`;
			}
			return a;
		})}
        moduleResolve();})();`;

		// Retorna o código JavaScript transpilado
		return `${outputText}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(sourceMapText ?? "").toString("base64")}`;
	} catch {}
	return "";
};

const cacheModules = new Map<string, any>();
const observeModules = new Map<string, { event?: fs.StatsListener; modules: Record<string, () => void> }>();

const getRequire = async (p: string): Promise<any> => {
	try {
		// Tenta carregar usando require
		return require(p);
	} catch (e1) {
		try {
			return await import(p);
		} catch (e2) {
			throw new Error(`Cannot find module '${p}': ${e2}`);
		}
	}
};

const createCustomRequire = (filePath: string, onMutate?: () => void) => {
	const baseDir = path.dirname(filePath);
	return async (modulePath: string) => {
		try {
			const compilerOptions = getTSCompilerOptions(filePath);
			modulePath = resolveModule(modulePath, baseDir, compilerOptions.baseUrl, compilerOptions.paths);

			let absolutePath = fs.existsSync(modulePath)
				? modulePath
				: fs.existsSync(path.join(baseDir, modulePath))
				? path.join(baseDir, modulePath)
				: require.resolve(path.join(baseDir, modulePath));

			const isOnlyApiModule = PathInfo.get(__dirname).equals(absolutePath) || PathInfo.get(__dirname).isParentOf(absolutePath) || PathInfo.get(__dirname).isAncestorOf(absolutePath);

			if (isOnlyApiModule || !fs.existsSync(absolutePath) || absolutePath.includes("node_modules")) {
				throw new Error("Invalid module path");
			}

			if (fs.statSync(absolutePath).isDirectory()) {
				const posibleFiles = fs.readdirSync(absolutePath).find((file) => {
					return (
						file.endsWith("index.js") || file.endsWith("index.ts") || file.endsWith("index.cjs") || file.endsWith("index.mjs") || file.endsWith("index.jsx") || file.endsWith("index.tsx")
					);
				});

				if (posibleFiles) {
					absolutePath = path.resolve(absolutePath, posibleFiles);
				}
			}

			const updateImport = async () => {
				await importModule(absolutePath, true, updateImport);
				const callbacks = Object.values(observeModules.get(absolutePath)?.modules ?? {});
				for (const callback of callbacks) {
					callback();
				}
			};

			const module = await importModule(absolutePath, false, updateImport);

			const observer = observeModules.get(absolutePath) ?? {
				event: undefined,
				modules: {},
			};

			if (observer.event) {
				fs.unwatchFile(absolutePath, observer.event);
			}

			observer.event = (curr, prev) => {
				if (curr.mtime !== prev.mtime) {
					updateImport();
				}
			};

			if (typeof onMutate === "function") {
				observer.modules[filePath] = onMutate;
			}

			observeModules.set(absolutePath, observer);
			fs.watchFile(absolutePath, observer.event);

			return module;
		} catch (err) {
			return await getRequire(modulePath);
		}
	};
};

const getGlobalContext = (filePath: string, exports: Record<string, any>, resolve: () => void, onMutateImports?: () => void) => {
	const globalContext = Object.create(global);

	globalContext["__filename"] = filePath;
	globalContext["__dirname"] = path.dirname(filePath);
	globalContext.console = console;
	globalContext.setTimeout = setTimeout;
	globalContext.clearTimeout = clearTimeout;
	globalContext.setInterval = setInterval;
	globalContext.clearInterval = clearInterval;
	globalContext.process = process;
	globalContext.require = createCustomRequire(filePath, onMutateImports);
	globalContext.exports = exports;
	globalContext.moduleResolve = resolve;

	return globalContext;
};

export const importModule = async (filePath: string, ignoreCache: boolean = false, onMutateImports?: () => void) => {
	if (fs.existsSync(filePath)) {
		if (fs.statSync(filePath).isDirectory()) {
			const posibleFiles = fs.readdirSync(filePath).find((file) => {
				return file.endsWith("index.js") || file.endsWith("index.ts") || file.endsWith("index.cjs") || file.endsWith("index.mjs") || file.endsWith("index.jsx") || file.endsWith("index.tsx");
			});

			if (posibleFiles) {
				filePath = path.resolve(filePath, posibleFiles);
			} else {
				return {};
			}
		}
	} else {
		return await getRequire(filePath);
	}

	if (cacheModules.has(filePath) && !ignoreCache) {
		return cacheModules.get(filePath);
	}

	const compiledCode = compileTypeScript(filePath);
	const exports = {};

	// console.log("compiledCode", compiledCode);

	await new Promise<void>((resolve) => {
		const script = new vm.Script(compiledCode, { filename: filePath });
		const context = vm.createContext(getGlobalContext(filePath, exports, resolve, onMutateImports));

		script.runInContext(context);
	});

	cacheModules.set(filePath, exports);
	return exports;
};
