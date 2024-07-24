import { RouteCacheContext, RoutePathContext, RouteRequestContext } from "../contexts";
import cors from "cors";
import { getCorsHeaders, getStackTrace, RouteResponse, SimpleCache } from "../utils";

/**
 * Obter a origem da URL
 * @returns A origem da URL
 */
export const getUrlOrigin = (): string => {
	console.log(getStackTrace());
	console.log();
	const { original, parsed } = RoutePathContext.get();
	return original;

	// Error.stackTraceLimit = Infinity;
	// const stack = (new Error().stack ?? "").split("\n");

	// for (const frame of stack) {
	// 	const match = frame.match(/at (.+) \((.+):(\d+):(\d+)\)/i);
	// 	if (!match) {
	// 		continue;
	// 	}
	// 	const [_, t] = match;
	// 	const [before, after] = t.split("__flex_route_path__");
	// 	if (typeof after === "string") {
	// 		return "/" + decodeURI(after);
	// 	}
	// }

	// return "/";
};

const cacheRoutes = new SimpleCache();

/**
 * Armazenar em cache a resposta de uma rota
 * @param duration A duração do cache em segundos
 * @param id Um identificador único para a rota
 * @returns A resposta armazenada em cache
 */
export const cacheResponse = (duration: number, id: string = ""): RouteResponse | undefined => {
	duration = typeof duration === "number" ? duration : 15;
	const { original, parsed } = RoutePathContext.get();
	const key = encodeURI(`${parsed}_${id}`);
	const value: RouteResponse | undefined = cacheRoutes.get(key);

	if (!value) {
		RouteCacheContext.set({
			fn(value: RouteResponse) {
				cacheRoutes.set(key, value, duration);
				console.log("cacheRoutes", key);
			},
		});
	}

	return value;
};

/**
 * Obter a resposta de uma rota armazenada em cache
 * @param id Um identificador único para a rota
 * @returns A resposta armazenada em cache
 */
export const getCachedResponse = (id: string = ""): RouteResponse | undefined => {
	console.log(getStackTrace());
	console.log();
	const { original, parsed } = RoutePathContext.get();
	const key = encodeURI(`${parsed}_${id}`);
	return cacheRoutes.get(key);
};

/**
 * Obter a resposta armazenada em cache
 * @param id Um identificador único para a rota
 * @returns A resposta armazenada em cache
 */
export const getCached = <T = any>(id: string = ""): T | undefined => {
	const { original, parsed } = RoutePathContext.get();
	const key = encodeURI(`${parsed}_${id}`);
	const value = cacheRoutes.get(key);
	return value instanceof RouteResponse ? value.response : value;
};

/**
 * Armazenar uma resposta em cache
 * @param id Um identificador único para a rota
 * @param value A resposta a ser armazenada
 */
export const setCache = <T = any>(id: string, value: T): void => {
	if (id === "" || value instanceof RouteResponse) {
		return;
	}
	const { original, parsed } = RoutePathContext.get();
	const key = encodeURI(`${parsed}_${id}`);
	cacheRoutes.set(key, value);
};

/**
 * Verificar se há um valor armazenada em cache
 * @param id Um identificador único para a rota
 * @returns Se a rota está armazenada em cache
 */
export const hasCache = (id: string = ""): boolean => {
	const { original, parsed } = RoutePathContext.get();
	const key = encodeURI(`${parsed}_${id}`);
	return cacheRoutes.has(key);
};

/**
 * Configura o cabeçalho CORS e ao mesmo tempo valida a origem
 * @param origin Origem permitida
 * @param exposeHeaders Cabeçalhos expostos
 * @returns Uma promessa que resolve quando a origem é permitida
 *
 * @example
 * ```typescript
 * await corsOringin("https://meu.servidor.com", "Content-Type, Authorization, Content-Length, Accept, Origin, X-Requested-With, DataBase-Context");
 * ```
 */
export const corsOringin = (origin: string | string[], exposeHeaders?: string | string[]): Promise<void> => {
	const { __config } = RouteRequestContext.get();
	const { req, res } = __config;

	return new Promise((resolve, reject) => {
		try {
			const headers: {
				[name: string]: string;
			} = getCorsHeaders(origin, req.headers.origin, exposeHeaders);

			for (const name in headers) {
				res.setHeader(name, headers[name]);
			}

			cors((req, callback) => {
				const corsOptions = { origin: false };
				const whitelist = headers["Access-Control-Allow-Origin"].split(/,\s*/);

				if (whitelist.includes(req.headers.origin ?? "") || whitelist.includes("*")) {
					corsOptions.origin = true;
				}

				callback(null, corsOptions);
			})(req, res, () => {
				if (res && typeof (res as any).status === "function" && !(res as any).finished) {
					resolve();
				} else {
					reject(new Error("Origin not allowed!"));
				}
			});
		} catch (e) {
			reject(e);
		}
	});
};
