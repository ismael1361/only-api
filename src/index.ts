import path from "path";
import { PathInfo, SimpleCache, SimpleEventEmitter, RouteResponse, parseUrl, resolvePath, joinObject, dirName } from "./utils";
import chokidar from "chokidar";
import { FetchOptions, OnlyApiOptions, Headers, Route, RouteFunction, RouteRequest, FileInfo } from "./type";
import { importModule } from "./tsUtils";
import { logError, logTrace } from "./log";
import { getCachedResponse, getUrlOrigin } from "./tools";
import { RouteConfigContext, RoutePathContext, RouteRequestContext } from "./contexts";
import express, { NextFunction, Request, Response } from "express";
import { corsSync } from "./utils/Cors";
import multer from "multer";
import { platform } from "os";

export * from "./type";
export * from "./tools";

const localDir = dirName();

class OnlyApi extends SimpleEventEmitter {
	private _ready: boolean = false;
	private mainPath: string = localDir;
	private pathSearchRoutes: string = "";
	private _routes: Record<string, Route<RouteResponse>> = {};
	private _routesPath: string[] = [];
	private _routesCache: Map<string, SimpleCache> = new Map();
	private options: OnlyApiOptions;
	private app: ReturnType<typeof express>;

	constructor(readonly routePath: string, options: Partial<OnlyApiOptions> | ReturnType<typeof express> = {}) {
		super();

		this.options = joinObject<OnlyApiOptions>(
			{
				host: "localhost",
				port: 3000,
				allowOrigin: "*",
				maxPayloadSize: "100mb",
				trustProxy: false,
				middlewares: [],
			},
			options instanceof express ? ({} as any) : options,
		);

		this.app = options instanceof express ? (options as any) : express();

		const dirnames = (new Error().stack ?? "")
			.split("\n")
			.map((frame) => {
				frame = frame.trim();
				let p = /(?<path>[^\(\s]+):[0-9]+:[0-9]+/.exec(frame)?.groups?.path ?? "";
				if (p.indexOf("file") >= 0) {
					p = new URL(p).pathname;
				}
				let dirname = path.dirname(p);
				if (dirname[0] === "/" && platform() === "win32") {
					dirname = dirname.slice(1);
				}
				return dirname;
			})
			.filter((dirname) => {
				return (
					dirname &&
					dirname.trim() !== "" &&
					dirname.trim() !== "." &&
					!dirname.split(/[\\\/]/gi).includes("internal") &&
					!dirname.split(/[\\\/]/gi).includes("node_modules") &&
					dirname.search(localDir) < 0 &&
					dirname.search(localDir.replace(/\\/gi, "/")) < 0
				);
			});

		this.mainPath = path.resolve(dirnames[0], routePath);

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
					this.changeRoute(file);
					resolveReady();
				})
				.on("unlink", (file) => {
					this.removeRoute(file);
					resolveReady();
				});
			resolveReady();
		});

		const storage = multer.memoryStorage();
		const upload = multer({ storage });

		this.app.use(upload.array("files", Infinity));

		this.app.use(express.json());

		const route: [string, ...any[]] = Array.prototype.concat.apply(
			[] as any[],
			[
				"/*",
				this.options.middlewares,
				async (req: Request, res: Response, next: NextFunction) => {
					try {
						const allowed: Array<boolean> = [];

						allowed.push(
							corsSync(
								{
									origin: this.options.allowOrigin,
								},
								req,
								res,
							),
						);

						if (this.options.cors) {
							allowed.push(corsSync(this.options.cors, req, res));
						}

						if (!allowed.includes(true)) {
							throw new Error("Origin not allowed");
						}
					} catch {
						if (res && typeof res.status === "function" && !(res.finished || res.headersSent || res.destroyed)) {
							res.status(403).send("Origin not allowed");
						}
						return;
					}

					const route = req.originalUrl;
					const method: any = req.method;

					const findRoute = this.findRouteBy(route);

					if (!findRoute) {
						return next();
					}

					const response = await this.fetchRoute(
						route,
						{
							method,
							headers: req.headers as any,
							params: {},
							query: req.query as any,
							body: req.body as any,
						},
						req,
						res,
						next,
					);

					try {
						if (res.finished || res.headersSent || res.destroyed) {
							return;
						}

						res.setHeader("Content-Type", response.content.type);

						if (response.content.length) {
							res.setHeader("Content-Length", response.content.length.toString());
						}

						if (response.content.disposition) {
							res.setHeader("Content-Disposition", response.content.disposition);
						}

						if (typeof response.content.attachment === "boolean") {
							res.setHeader("Content-Disposition", response.content.attachment ? "attachment" : "inline");
						} else if (typeof response.content.attachment === "string") {
							res.setHeader("Content-Disposition", `attachment; filename="${response.content.attachment}"`);
						}

						if (typeof response.content.security === "object") {
							if (response.content.security.policy) {
								res.setHeader("Content-Security-Policy", response.content.security.policy);
							}

							if (typeof response.content.security.reportOnly === "boolean") {
								res.setHeader("Content-Security-Policy-Report-Only", response.content.security.reportOnly ? "true" : "false");
							} else if (typeof response.content.security.reportOnly === "string") {
								res.setHeader("Content-Security-Policy-Report-Only", response.content.security.reportOnly);
							}
						} else if (typeof response.content.security === "string") {
							res.setHeader("Content-Security-Policy", response.content.security);
						}

						if (response.type === "stream") {
							const stream: NodeJS.ReadableStream = response.response as any;
							stream.on("data", (chunk) => {
								res.write(chunk);
							});

							stream.on("end", () => {
								res.end();
							});

							stream.on("error", (err) => {
								res.status(500).send(err.message);
							});

							stream.pipe(res);
							return;
						}

						res.status(response.code).send(response.response);
					} catch {}
				},
			] as any[],
		) as any;

		this.app.get("/routes", (req, res) => {
			res.json(this._routesPath);
		});

		this.app.all(...route);

		this.app.all("*", (req, res) => {
			res.status(404).send("Not found");
		});

		this.app.listen(this.options.port, this.options.host, () => {
			logTrace("info", `Server started at http://${this.options.host}:${this.options.port}`, this.mainPath);
			this.emit("ready");
		});
	}

	private async addRoute(routePath: string) {
		const p = routePath
			.replace(/\\/g, "/")
			.replace(this.mainPath.replace(/\\/g, "/"), "")
			.replace("/index.ts", "")
			.replace("/index.js", "")
			.replace(/(\/{1,})\[/gi, "[");

		const exports: Route<RouteResponse> = await importModule(routePath, true, () => {
			this.addRoute(routePath);
		});

		if (this._routesCache.has(p)) {
			this._routesCache.get(p)?.applyOptions(exports.cacheOptions);
		} else {
			this._routesCache.set(p, new SimpleCache(exports.cacheOptions));
		}

		if (p in this._routes) {
			logTrace("info", `Rota "${p}" foi alterado!`, routePath);
		} else {
			logTrace("info", `Rota "${p}" foi adicionado!`, routePath);
		}

		this._routes[p] = exports;
		this._routesPath = Object.keys(this._routes);
	}

	private async changeRoute(routePath: string) {
		return await this.addRoute(routePath);
	}

	private async removeRoute(routePath: string) {
		const p = routePath
			.replace(/\\/g, "/")
			.replace(this.mainPath.replace(/\\/g, "/"), "")
			.replace("/index.ts", "")
			.replace("/index.js", "")
			.replace(/(\/{1,})\[/gi, "[");
		delete this._routes[p];
		this._routesPath = Object.keys(this._routes);
		this._routesCache.delete(p);
		logTrace("warn", `Rota "${p}" foi removido!`, routePath);
	}

	findRouteBy(routePath: string, base: string = ""): string | undefined {
		const { pathname: pn } = parseUrl(routePath);
		const pathname = resolvePath(base, pn);
		const route = pathname.replace(/^\//gi, "").replace(/\/$/gi, "");
		return this._routesPath.find((path) => {
			return PathInfo.get(path).equals(route);
		});
	}

	async fetchRoute<T = any>(
		route: string,
		options: Partial<FetchOptions> = {
			method: "GET",
			headers: {},
			body: {},
			params: {},
			query: {},
			files: [],
			file: undefined,
		},
		request?: Request,
		response?: Response,
		next?: NextFunction,
	): Promise<RouteResponse<T>> {
		const initialyTime = Date.now();

		try {
			await new Promise<void>((resolve) => setTimeout(resolve, 0));

			const localPath = getUrlOrigin();
			const { pathname: pn, searchParams } = parseUrl(route);

			const pathname = resolvePath(localPath, pn);

			const routePath = pathname.replace(/^\//gi, "").replace(/\/$/gi, "");

			const findRoute = this.findRouteBy(route, localPath);

			if (!findRoute) {
				throw new Error(`"/${routePath}": Route not found!`);
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
					: "default" in moduleRoute
					? "default"
					: null;

			if (!methodBy || typeof moduleRoute[methodBy] !== "function") {
				throw new Error(`"/${routePath}": Method not allowed!`);
			}

			const prevConfig = RouteConfigContext.get();

			const res = response ?? prevConfig.res;
			const req = request ?? prevConfig.req;

			const files: FileInfo[] = (options && Array.isArray(options.files) ? options.files : req && Array.isArray((req as any).files) ? ((req as any).files as any[]) : [])
				.filter((b) => b instanceof Buffer || (typeof b === "object" && "buffer" in b))
				.map((b) => {
					return b instanceof Buffer
						? {
								fieldname: "file",
								originalname: "file",
								encoding: "7bit",
								mimetype: "application/octet-stream",
								size: b.length,
								stream: undefined,
								destination: "",
								filename: "file",
								path: "",
								buffer: b,
						  }
						: b;
				});

			const getParams = () => {
				const { length, ...params } = PathInfo.extractVariables(findRoute, routePath);
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

			const fn = async (): Promise<RouteResponse> => {
				try {
					await new Promise<void>((resolve) => setTimeout(resolve, 0));
					// const cached = getCachedResponse();

					// if (cached) {
					// 	return Promise.resolve(cached);
					// }

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
						files,
						file: options.file instanceof Buffer ? options.file : files.length > 0 ? files[0] : undefined,
					};

					let response: RouteResponse | undefined;

					for (let i = 0; i < callbacks.length; i++) {
						if (typeof callbacks[i] !== "function") {
							continue;
						}

						response = await new Promise<RouteResponse>(async (res, rej) => {
							let resolved: boolean = false;

							const resolve = (value: RouteResponse) => {
								if (resolved) {
									return;
								}
								resolved = true;
								res(value);
							};

							const reject = (e: Error) => {
								if (resolved) {
									return;
								}
								resolved = true;
								rej(e);
							};

							const next = (toContinue: boolean | Error = true) => {
								if (typeof toContinue === "boolean") {
									return toContinue ? resolve(new RouteResponse({ code: 200 })) : reject(new Error("Middleware not allowed!"));
								}

								if (toContinue instanceof Error) {
									return reject(toContinue);
								}

								return resolve(new RouteResponse({ code: 200 }));
							};

							const result = await Promise.race([callbacks[i](req, next)]).catch((e) => {
								return new Error(e);
							});

							if (result instanceof RouteResponse) {
								return resolve(result);
							}

							if (result instanceof Error) {
								return reject(result);
							}
						});

						if (!response) {
							throw new Error("Middleware not allowed!");
						}

						await new Promise<void>((resolve) => setTimeout(resolve, 0));
					}

					if (!(response instanceof RouteResponse)) {
						return Promise.resolve(RouteResponse.send(response));
					}

					const fnCache = RouteConfigContext.value.cacheRoute;

					if (typeof fnCache === "function" && [400, 404].includes(response.code)) {
						fnCache(response);
					}

					return Promise.resolve(response);
				} catch (e) {
					const [_, idCache] = String(e).split("__cache_control_response__");
					const cached = getCachedResponse(idCache);

					if (cached) {
						return Promise.resolve(cached);
					}

					logError(e as any);
					return new RouteResponse({
						code: 500,
						message: String(e).replace(/(Error\:\s?)+/gi, "Error: "),
						timeStart: initialyTime,
						timeEnd: Date.now(),
					});
				}
			};

			const result = await RouteRequestContext.provider(
				RoutePathContext.provider(
					RouteConfigContext.provider(fn, {
						res,
						req,
					}),
					{
						original: routePath,
						parsed: findRoute,
					},
				),
				{
					method: options.method ?? "GET",
					headers: options.headers ?? {},
					body: options.body ?? {},
					params: { ...getParams(), ...(options.params ?? {}) },
					query: {
						...(options.query ?? {}),
						...searchParams,
					},
					files,
					file: options.file instanceof Buffer ? options.file : files.length > 0 ? files[0] : undefined,
				},
			)();

			return new RouteResponse({
				response: result.response,
				content: result.content,
				type: result.type,
				code: result.code,
				message: result.message,
				timeStart: initialyTime,
				timeEnd: Date.now(),
			});
		} catch (e) {
			// logError(e as any);
			return new RouteResponse({
				code: 500,
				message: String(e).replace(/(Error\:\s?)+/gi, "Error: "),
				timeStart: initialyTime,
				timeEnd: Date.now(),
			});
		}
	}
}

let rootOnlyApi: OnlyApi | null = null;

function onlyApi(routePath: string, options: Partial<OnlyApiOptions> | ReturnType<typeof express> = {}) {
	rootOnlyApi = new OnlyApi(routePath, options);
	return rootOnlyApi;
}

export const fetchRoute = async <T = any>(route: string, options: Partial<FetchOptions> = {}) => {
	if (!rootOnlyApi) {
		throw new Error("OnlyApi not initialized!");
	}

	await rootOnlyApi.ready();
	return await rootOnlyApi.fetchRoute<T>(route, options);
};

export { RouteResponse };

export default onlyApi;
