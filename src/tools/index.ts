import { corsSync } from "../utils/Cors";
import { RouteConfigContext, RoutePathContext } from "../contexts";
import { getCorsHeaders, RouteResponse, SimpleCache, cors } from "../utils";

/**
 * Obter a origem da URL
 * @returns A origem da URL
 */
export const getUrlOrigin = (): string => {
	const { original, parsed } = RoutePathContext.get();
	return original;
};

const cacheRoutes = new SimpleCache();

/**
 * Armazenar em cache a resposta de uma rota
 * @param duration A duração do cache em segundos
 * @param id Um identificador único para a rota
 * @returns A resposta armazenada em cache
 */
export const cacheControl = (duration: number, id: string = ""): void => {
	duration = typeof duration === "number" ? duration : 15;
	const { original, parsed } = RoutePathContext.get();
	const key = encodeURI(`${parsed}_${id}`);
	const value: RouteResponse | undefined = cacheRoutes.get(key);

	if (!value) {
		RouteConfigContext.value.cacheRoute = function (value: RouteResponse) {
			cacheRoutes.set(key, value, duration);
		};
	}

	if (cacheRoutes.has(key)) {
		throw new Error(`__cache_control_response__${id}`);
	}
};

/**
 * Obter a resposta de uma rota armazenada em cache
 * @param id Um identificador único para a rota
 * @returns A resposta armazenada em cache
 */
export const getCachedResponse = (id: string = ""): RouteResponse | undefined => {
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
 * @throws Se a origem não for permitida
 *
 * @example
 * ```typescript
 * await corsOringin("https://meu.servidor.com", "Content-Type, Authorization, Content-Length, Accept, Origin, X-Requested-With, DataBase-Context");
 * ```
 */
export const corsOringin = (origin: string | string[], exposeHeaders?: string | string[]): void => {
	const { req, res } = RouteConfigContext.get();

	if (!req || !res) {
		return;
	}

	const headers: {
		[name: string]: string;
	} = getCorsHeaders(origin, req.headers.origin, exposeHeaders);

	for (const name in headers) {
		res.setHeader(name, headers[name]);
	}

	const allowed = corsSync(
		(req, callback) => {
			const corsOptions = { origin: false };
			const whitelist = headers["Access-Control-Allow-Origin"].split(/,\s*/);

			if (whitelist.includes(req.headers.origin ?? "") || whitelist.includes("*")) {
				corsOptions.origin = true;
			}

			callback(null, corsOptions);
		},
		req,
		res,
	);

	if (!allowed) {
		throw new Error("Origin not allowed");
	}
};

/**
 * Requer acesso para acessar uma rota
 * @param users Usuários e senhas permitidos
 * @throws Se o usuário não tiver acesso
 *
 * @example
 * ```typescript
 * await requiresAccess({
 * 	"admin": "123456",
 * 	"user": ["123456", "654321"]
 * });
 * ```
 */
export const requiresAccess = (users: Record<string, string | string[]>): void => {
	const { req, res } = RouteConfigContext.get();

	if (!req || !res) {
		return;
	}

	const sign = req.headers["x-hub-signature"];

	if (!sign) {
		const execute = () => {
			res.setHeader("www-authenticate", `Basic`);
			res.sendStatus(401).send("Authentication required");
		};

		const authorization = req.headers.authorization;

		if (!authorization) {
			execute();
			throw new Error("Authorization header not found");
		}

		const [username_send, password_send] = Buffer.from(authorization.replace("Basic ", ""), "base64").toString().split(":");

		if (!(username_send in users && users[username_send].includes(password_send))) {
			execute();
			throw new Error("Invalid username or password");
		}
	}
};
