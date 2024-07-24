import path from "path";
import { PathInfo, SimpleCache, SimpleEventEmitter, RouteResponse, parseUrl, resolvePath, getStackTrace } from "./utils";
import chokidar from "chokidar";
import { FetchOptions, Headers, Route, RouteFunction, RouteRequest } from "./type";
import { importModule } from "./tsUtils";
import { logError, logTrace } from "./log";
import { getCachedResponse, getUrlOrigin } from "./tools";
import { RouteCacheContext, RoutePathContext, RouteRequestContext } from "./contexts";

export * from "./type";
export * from "./tools";

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
					this.changeRoute(file);
					resolveReady();
				})
				.on("unlink", (file) => {
					this.removeRoute(file);
					resolveReady();
				});
			resolveReady();
		});

		this.emit("ready");
	}

	private async addRoute(routePath: string) {
		const p = routePath.replace(/\\/g, "/").replace(this.mainPath.replace(/\\/g, "/"), "").replace("/index.ts", "").replace("/index.js", "");

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
		const path = routePath.replace(/\\/g, "/").replace(this.mainPath.replace(/\\/g, "/"), "").replace("/index.ts", "").replace("/index.js", "");
		delete this._routes[path];
		this._routesPath = Object.keys(this._routes);
		this._routesCache.delete(path);
		logTrace("warn", `Rota "${path}" foi removido!`, routePath);
	}

	async fetchRoute<T = any>(
		route: string,
		options: Partial<FetchOptions> = {
			method: "GET",
			headers: {},
			body: {},
			params: {},
			query: {},
		},
	): Promise<RouteResponse<T>> {
		const initialyTime = Date.now();

		try {
			await new Promise<void>((resolve) => setTimeout(resolve, 0));

			const localPath = getUrlOrigin();
			const { pathname: pn, searchParams } = parseUrl(route);

			const pathname = resolvePath(localPath, pn);

			const routePath = pathname.replace(/^\//gi, "").replace(/\/$/gi, "");

			const findRoute = this._routesPath.find((path) => {
				return PathInfo.get(path).equals(routePath);
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
				console.log(getStackTrace());
				try {
					await new Promise<void>((resolve) => setTimeout(resolve, 0));
					const cached = getCachedResponse();

					if (cached instanceof RouteResponse) {
						return Promise.resolve(cached);
					}

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
						requiresAccess: async (users) => {
							return true;
						},
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
						return Promise.resolve(RouteResponse.send(response));
					}

					const fnCache = RouteCacheContext.get().fn;

					console.log(fnCache);

					if (typeof fnCache === "function") {
						fnCache(response);
					}

					return Promise.resolve(response);
				} catch (e) {
					logError(e as any);
					return new RouteResponse({
						code: 500,
						message: String(e).replace(/(Error\:\s?)+/gi, "Error: "),
						timeStart: initialyTime,
						timeEnd: Date.now(),
					});
				}
			};

			const response = await RouteRequestContext.provider(
				RoutePathContext.provider(RouteCacheContext.provider(fn), {
					original: routePath,
					parsed: findRoute,
				}),
				{
					method: options.method ?? "GET",
					headers: options.headers ?? {},
					body: options.body ?? {},
					params: { ...getParams(), ...(options.params ?? {}) },
					query: {
						...(options.query ?? {}),
						...searchParams,
					},
					__config: {} as any,
				},
			)();

			return new RouteResponse({
				response: response.response,
				contentType: response.contentType,
				type: response.type,
				code: response.code,
				message: response.message,
				timeStart: initialyTime,
				timeEnd: Date.now(),
			});
		} catch (e) {
			logError(e as any);
			return new RouteResponse({
				code: 500,
				message: String(e).replace(/(Error\:\s?)+/gi, "Error: "),
				timeStart: initialyTime,
				timeEnd: Date.now(),
			});
		}
	}
}

let rootFlexRoute: FlexRoute | null = null;

function flexRoute(routePath: string) {
	rootFlexRoute = new FlexRoute(routePath);
	return rootFlexRoute;
}

export const fetchRoute = async <T = any>(route: string, options: Partial<FetchOptions> = {}) => {
	if (!rootFlexRoute) {
		throw new Error("FlexRoute not initialized!");
	}

	await rootFlexRoute.ready();
	return await rootFlexRoute.fetchRoute<T>(route, options);
};

export { RouteResponse };

export default flexRoute;
