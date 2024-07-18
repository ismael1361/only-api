import path from "path";
import { fileURLToPath } from "url";
// @ts-ignore
import { tsImport } from "tsx/esm/api";
import { text } from "stream/consumers";
import { PathInfo, SimpleCache, SimpleEventEmitter, RouteResponse } from "./utils";
import chokidar from "chokidar";
import isGlob from "is-glob";
import fs from "fs";
import ts from "typescript";
import * as vm from "vm";
import * as colorette from "colorette";
import { FetchOptions, Headers, ParsedUrl, Route, RouteFunction, RouteRequest } from "./type";
import createContext from "fn-context";

export * from "./type";

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

const createCustomRequire = (filePath: string) => {
	const baseDir = path.dirname(filePath);
	return (modulePath: string) => {
		try {
			const absolutePath = require.resolve(path.join(baseDir, modulePath));
			return require(absolutePath);
		} catch (err) {
			// Se a resolução falhar, use o require padrão para módulos no node_modules
			return require(modulePath);
		}
	};
};

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
		require: createCustomRequire(filePath),
		module: {},
		console,
		__dirname: path.dirname(filePath),
		__filename: filePath,
	});

	script.runInContext(context);

	cacheModules.set(filePath, exports);
	return exports;
};

const parseUrl = (urlString: string): ParsedUrl => {
	const urlPattern = /^([^?#]*)(\?[^#]*)?(#.*)?$/;
	const matches = urlString.match(urlPattern);

	if (!matches) {
		throw new Error("Invalid URL");
	}

	const [, pathname, search, hash] = matches;

	const searchParams: Record<string, string> = {};
	if (search) {
		search
			.substring(1)
			.split("&")
			.forEach((param) => {
				const [key, value] = param.split("=");
				searchParams[decodeURIComponent(key)] = decodeURIComponent(value || "");
			});
	}

	return {
		pathname: pathname || "",
		search: search || "",
		searchParams,
		hash: hash || "",
	};
};

const RouteRequestContext = createContext<FetchOptions>({
	method: "GET",
	headers: {},
	body: {},
	params: {},
	query: {},
});

class FlexRoute extends SimpleEventEmitter {
	private _ready: boolean = false;
	private mainPath: string = __dirname;
	private pathSearchRoutes: string = "";
	private _routes: Record<string, Route<RouteResponse>> = {};
	private _routesPath: string[] = [];
	private _routesCache: Map<string, SimpleCache> = new Map();

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

	async initialize() {
		await new Promise<void>((resolve) => {
			let time: NodeJS.Timeout,
				resolved: boolean = false;

			const resolveReady = () => {
				if (resolved) {
					return;
				}
				clearTimeout(time);
				time = setTimeout(() => {
					resolve();
					resolved = true;
				}, 1000);
			};

			chokidar
				.watch(this.pathSearchRoutes)
				.on("add", (file) => {
					this.addRoute(file);
					resolveReady();
				})
				.on("change", (file) => {
					console.log(`O arquivo ${file} foi modificado!`);
					this.changeRoute(file);
					resolveReady();
				})
				.on("unlink", (file) => {
					console.log(`O arquivo ${file} foi removido!`);
					this.removeRoute(file);
					resolveReady();
				});
			resolveReady();
		});

		this.emit("ready");
	}

	private async addRoute(routePath: string) {
		const p = routePath.replace(/\\/g, "/").replace(this.mainPath.replace(/\\/g, "/"), "").replace("/index.ts", "").replace("/index.js", "");

		const exports: Route<RouteResponse> = await importModule(routePath, true);

		if (this._routesCache.has(p)) {
			this._routesCache.get(p)?.applyOptions(exports.cacheOptions);
		} else {
			this._routesCache.set(p, new SimpleCache(exports.cacheOptions));
		}

		this._routes[p] = exports;
		this._routesPath = Object.keys(this._routes);
	}

	private changeRoute(routePath: string) {
		return this.addRoute(routePath);
	}

	private removeRoute(routePath: string) {
		const path = routePath.replace(/\\/g, "/").replace(this.mainPath.replace(/\\/g, "/"), "").replace("/index.ts", "").replace("/index.js", "");
		delete this._routes[path];
		this._routesPath = Object.keys(this._routes);
		this._routesCache.delete(path);
	}

	async fetchRoute(
		route: string,
		options: Partial<FetchOptions> = {
			method: "GET",
			headers: {},
			body: {},
			params: {},
			query: {},
		},
	): Promise<RouteResponse> {
		const initialyTime = Date.now();

		try {
			await new Promise<void>((resolve) => setTimeout(resolve, 0));

			const { pathname, searchParams } = parseUrl(route);

			const findRoute = this._routesPath.find((path) => {
				return PathInfo.get(path).equals(pathname);
			});

			if (!findRoute) {
				return Promise.reject(new Error("Route not found!"));
			}

			const moduleRoute = this._routes[findRoute];

			const method = (options.method ?? "GET").toLowerCase();

			const methodBy =
				method === "get" && "get" in moduleRoute
					? "get"
					: method === "post" && "post" in moduleRoute
					? "post"
					: method === "put" && "put" in moduleRoute
					? "put"
					: method === "delete" && "delete" in moduleRoute
					? "delete"
					: "all" in moduleRoute
					? "all"
					: null;

			if (!methodBy || typeof moduleRoute[methodBy] !== "function") {
				return Promise.reject(new Error("Method not allowed!"));
			}

			const getParams = () => {
				const { length, ...params } = PathInfo.extractVariables(findRoute, pathname);
				return Object.entries(params).reduce((acc, [key, value]) => {
					acc[key] = decodeURIComponent(value.toString());
					return acc;
				}, {} as Record<string, string>);
			};

			const parseHeaders = (headers: { [key: string]: string }): Headers => {
				return Object.entries(headers).reduce((acc, [key, value]) => {
					acc[key.toLowerCase()] = value;
					return acc;
				}, {});
			};

			const response = await RouteRequestContext.provider(
				async (): Promise<RouteResponse> => {
					try {
						await new Promise<void>((resolve) => setTimeout(resolve, 0));
						const valueContext = RouteRequestContext.get();

						const middleware: RouteFunction[] = (
							"middleware" in moduleRoute ? (Array.isArray(moduleRoute.middleware) ? moduleRoute.middleware : [moduleRoute.middleware]) : ([] as any[])
						).filter((fn) => typeof fn === "function");

						const callbacks: RouteFunction[] = middleware.concat((Array.isArray(moduleRoute[methodBy]) ? moduleRoute[methodBy] : [moduleRoute[methodBy]]) as any);

						const cache = this._routesCache.get(findRoute) ?? new SimpleCache();

						const req: RouteRequest = {
							method: (options.method?.toUpperCase() as any) ?? "GET",
							headers: { ...parseHeaders(valueContext.headers), ...parseHeaders(options.headers ?? {}) },
							body: options.body ?? valueContext.body ?? {},
							params: { ...getParams(), ...(options.params ?? {}) },
							query: {
								...valueContext.query,
								...(options.query ?? {}),
								...searchParams,
							},
							cache,
						};

						let response: RouteResponse | undefined;

						for (let i = 0; i < callbacks.length; i++) {
							let continueToNext: boolean = false;

							const next = () => {
								continueToNext = true;
							};

							response = await Promise.race([callbacks[i](req, next)]);

							if (!continueToNext) {
								break;
							}
							await new Promise<void>((resolve) => setTimeout(resolve, 0));
						}

						if (!(response instanceof RouteResponse)) {
							return Promise.resolve(RouteResponse.status(200, "OK"));
						}

						return Promise.resolve(response);
					} catch (e) {
						return Promise.reject(new Error(e as any));
					}
				},
				{
					method: options.method ?? "GET",
					headers: options.headers ?? {},
					body: options.body ?? {},
					params: { ...getParams(), ...(options.params ?? {}) },
					query: {
						...(options.query ?? {}),
						...searchParams,
					},
				},
			)();

			return new RouteResponse(response.response, response.type, response.code, response.message, initialyTime, Date.now());
		} catch (e) {
			return Promise.reject(new Error(e as any));
		}
	}
}

let rootFlexRoute: FlexRoute | null = null;

function flexRoute(routePath: string) {
	rootFlexRoute = new FlexRoute(routePath);
	return rootFlexRoute;
}

export const fetchRoute = async (route: string, options: Partial<FetchOptions> = {}) => {
	if (!rootFlexRoute) {
		throw new Error("FlexRoute not initialized!");
	}

	return rootFlexRoute.fetchRoute(route, options);
};

export { RouteResponse };

export default flexRoute;
