import path from "path";
import { fileURLToPath } from "url";
// @ts-ignore
import { tsImport } from "tsx/esm/api";
import { text } from "stream/consumers";
import SimpleEventEmitter from "./utils/SimpleEventEmitter";
import chokidar from "chokidar";
import isGlob from "is-glob";
import fs from "fs";
import ts from "typescript";
import * as vm from "vm";
import * as colorette from "colorette";

const getTSCompilerOptions = (filePath: string): ts.CompilerOptions => {
	let options: ts.CompilerOptions = {};

	let tsconfigFile = filePath;

	while (fs.existsSync(path.resolve(tsconfigFile, "tsconfig.json")) !== true && path.dirname(tsconfigFile) !== path.dirname(process.cwd())) {
		tsconfigFile = path.dirname(tsconfigFile);
	}

	if (fs.existsSync(path.resolve(tsconfigFile, "tsconfig.json"))) {
		const tsconfig: ts.TranspileOptions = JSON.parse(fs.readFileSync(path.resolve(tsconfigFile, "tsconfig.json"), "utf-8"));
		options = tsconfig.compilerOptions ?? {};
	}

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
		lib: [...(options.lib ?? []), "esnext", "ES2015"].map((lib) => `lib.${lib.toLowerCase()}.d.ts`),
		target: ts.ScriptTarget.ESNext,
		module: ts.ModuleKind.CommonJS,
		moduleResolution: ts.ModuleResolutionKind.NodeJs,
		rootDir: typeof options.rootDir === "string" ? rootDir : undefined,
		outDir: typeof options.outDir === "string" ? path.join(tsconfigFile, options.outDir) : undefined,
		declarationDir: typeof options.declarationDir === "string" ? path.join(tsconfigFile, options.declarationDir) : undefined,
		paths: {
			"*": [`${rootDir.replace(/\\/gi, "/").replace(/\/$/gi, "")}/*`],
			...Object.fromEntries(Object.entries(options.paths ?? {}).map(([key, value]) => [key, value.map((v) => path.join(rootDir, v).replace(/\\/gi, "/").replace(/\/$/gi, ""))])),
		},
	};

	return compilerOptions;
};

const validateTypeScript = async (filePath: string): Promise<string> => {
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
		return Promise.reject();
	}

	return fileContent;
};

const compileTypeScript = async (filePath: string): Promise<string> => {
	try {
		const fileContent = await validateTypeScript(filePath);

		// Opções de compilação do TypeScript
		const compilerOptions = getTSCompilerOptions(filePath);

		// Compilar o código TypeScript
		const result = ts.transpileModule(fileContent, {
			compilerOptions,
			fileName: filePath,
		});
		// Retorna o código JavaScript transpilado
		return result.outputText;
	} catch {}
	return "";
};

const cacheModules = new Map<string, any>();

const importModule = async (filePath: string, ignoreCache: boolean = false) => {
	if (fs.existsSync(filePath)) {
		if (fs.statSync(filePath).isDirectory()) {
			const posibleFiles = fs.readdirSync(filePath).find((file) => {
				return file.endsWith(".js") || file.endsWith(".ts") || file.endsWith(".cjs") || file.endsWith(".mjs") || file.endsWith(".jsx") || file.endsWith(".tsx");
			});

			if (posibleFiles) {
				filePath = path.resolve(filePath, posibleFiles);
			} else {
				return {};
			}
		}
	} else {
		return require(filePath);
	}

	if (cacheModules.has(filePath) && !ignoreCache) {
		return cacheModules.get(filePath);
	}

	const compiledCode = await compileTypeScript(filePath);
	const exports = {};

	const script = new vm.Script(compiledCode, { filename: filePath });
	const context = vm.createContext({
		exports,
		require: (file: string) => {
			if (file.startsWith(".") || file.startsWith("/")) {
				return require(path.resolve(path.dirname(filePath), file));
			}
			return require(file);
		},
		console,
		__dirname: path.dirname(filePath),
		__filename: filePath,
	});

	script.runInContext(context);

	cacheModules.set(filePath, exports);
	return exports;
};

interface Route {
	all?: (req: RouteRequest) => any;
	get?: (req: RouteRequest) => any;
	post?: (req: RouteRequest) => any;
	put?: (req: RouteRequest) => any;
	delete?: (req: RouteRequest) => any;
	middleware?: ((req: RouteRequest) => any) | ((req: RouteRequest) => any)[];
}

class FlexRoute extends SimpleEventEmitter {
	private _ready: boolean = false;
	private mainPath: string = __dirname;
	private pathSearchRoutes: string = "";
	private _routes: Record<string, Route> = {};

	constructor(readonly routePath: string) {
		super();

		const stack = (new Error().stack ?? "").split("\n");

		const frames = stack.map((frame) => {
			frame = frame.trim();
			const match = frame.match(/^at (.+) \((.+)(:(\d+):(\d+))\)$/i);
			return match ? [match[1], match[2]] : frame;
		});

		for (let i = 1; i < frames.length; i++) {
			const currentFrame = frames[i];
			if (path.dirname(currentFrame[1]) !== __dirname) {
				this.mainPath = path.resolve(path.dirname(currentFrame[1]), routePath);
				break;
			}
		}

		this.pathSearchRoutes = path.join(this.mainPath, "./**/index.{js,ts}").replace(/\\/g, "/");

		this.on("ready", () => {
			this._ready = true;
		});

		this.initialize();
	}

	async ready(callback?: () => void) {
		if (this._ready) {
			callback?.();
			return Promise.resolve();
		}

		return new Promise<void>((resolve) => {
			this.once("ready", () => {
				callback?.();
				resolve();
			});
		});
	}

	initialize() {
		chokidar
			.watch(this.pathSearchRoutes)
			.on("add", (file) => {
				this.addRoute(file);
			})
			.on("change", (file) => {
				console.log(`O arquivo ${file} foi modificado!`);
				this.changeRoute(file);
			})
			.on("unlink", (file) => {
				console.log(`O arquivo ${file} foi removido!`);
				this.removeRoute(file);
			});

		this.emit("ready");
	}

	private async addRoute(routePath: string) {
		const p = routePath.replace(/\\/g, "/").replace(this.mainPath.replace(/\\/g, "/"), "").replace("/index.ts", "").replace("/index.js", "");

		const exports: Route = await importModule(routePath, true);

		this._routes[p] = exports;

		console.log(p);

		console.log(this._routes);
		console.log((exports as any).get());
	}

	private changeRoute(routePath: string) {
		return this.addRoute(routePath);
	}

	private removeRoute(routePath: string) {
		const path = routePath.replace(/\\/g, "/").replace(this.mainPath.replace(/\\/g, "/"), "").replace("/index.ts", "").replace("/index.js", "");
		delete this._routes[path];
	}
}

function flexRoute(routePath: string) {
	return new FlexRoute(routePath);
}

export interface RouteRequest<B = any, P extends string = string, Q extends string = string> {
	body: B;
	params: {
		[key in P]: string;
	};
	query: {
		[key in Q]: string;
	};
}

export const RouteResponse = {
	json: (data: any) => {
		return data;
	},
	text: (data: any) => {
		return data;
	},
	send: (data: any) => {
		return data;
	},
	status: (code: number) => {
		return {
			json: (data: any) => {
				return data;
			},
			send: (data: any) => {
				return data;
			},
		};
	},
};

export default flexRoute;
