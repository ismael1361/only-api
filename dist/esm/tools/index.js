"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiresAccess = exports.corsOringin = exports.hasCache = exports.setCache = exports.getCached = exports.getCachedResponse = exports.cacheControl = exports.getUrlOrigin = void 0;
const Cors_1 = require("../utils/Cors.js");
const contexts_1 = require("../contexts.js");
const utils_1 = require("../utils/index.js");
/**
 * Obter a origem da URL
 * @returns A origem da URL
 */
const getUrlOrigin = () => {
    const { original, parsed } = contexts_1.RoutePathContext.get();
    return original;
};
exports.getUrlOrigin = getUrlOrigin;
const cacheRoutes = new utils_1.SimpleCache();
/**
 * Armazenar em cache a resposta de uma rota
 * @param duration A duração do cache em segundos
 * @param id Um identificador único para a rota
 * @throws Se a rota já estiver armazenada em cache; expressão regular "__cache_control_response__{id}"
 */
const cacheControl = (duration, id = "") => {
    duration = typeof duration === "number" ? duration : 15;
    const { original, parsed } = contexts_1.RoutePathContext.get();
    const key = encodeURI(`${parsed}_${id}`);
    const value = cacheRoutes.get(key);
    if (!value) {
        contexts_1.RouteConfigContext.value.cacheRoute = function (value) {
            cacheRoutes.set(key, value, duration);
        };
    }
    if (cacheRoutes.has(key)) {
        throw new Error(`__cache_control_response__${id}`);
    }
};
exports.cacheControl = cacheControl;
/**
 * Obter a resposta de uma rota armazenada em cache
 * @param id Um identificador único para a rota
 * @returns A resposta armazenada em cache
 */
const getCachedResponse = (id = "") => {
    const { original, parsed } = contexts_1.RoutePathContext.get();
    const key = encodeURI(`${parsed}_${id}`);
    return cacheRoutes.get(key);
};
exports.getCachedResponse = getCachedResponse;
/**
 * Obter a resposta armazenada em cache
 * @param id Um identificador único para a rota
 * @returns A resposta armazenada em cache
 */
const getCached = (id = "") => {
    const { original, parsed } = contexts_1.RoutePathContext.get();
    const key = encodeURI(`${parsed}_${id}`);
    const value = cacheRoutes.get(key);
    return value instanceof utils_1.RouteResponse ? value.response : value;
};
exports.getCached = getCached;
/**
 * Armazenar uma resposta em cache
 * @param id Um identificador único para a rota
 * @param value A resposta a ser armazenada
 * @param duration A duração do cache em segundos, padrão 15 segundos
 */
const setCache = (id, value, duration = 15) => {
    if (id === "" || value instanceof utils_1.RouteResponse) {
        return;
    }
    const { original, parsed } = contexts_1.RoutePathContext.get();
    const key = encodeURI(`${parsed}_${id}`);
    cacheRoutes.set(key, value, duration);
};
exports.setCache = setCache;
/**
 * Verificar se há um valor armazenada em cache
 * @param id Um identificador único para a rota
 * @returns Se a rota está armazenada em cache
 */
const hasCache = (id = "") => {
    const { original, parsed } = contexts_1.RoutePathContext.get();
    const key = encodeURI(`${parsed}_${id}`);
    return cacheRoutes.has(key);
};
exports.hasCache = hasCache;
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
const corsOringin = (origin, exposeHeaders) => {
    const { req, res } = contexts_1.RouteConfigContext.get();
    if (!req || !res) {
        return;
    }
    const headers = (0, utils_1.getCorsHeaders)(origin, req.headers.origin, exposeHeaders);
    for (const name in headers) {
        res.setHeader(name, headers[name]);
    }
    const allowed = (0, Cors_1.corsSync)((req, callback) => {
        const corsOptions = { origin: false };
        const whitelist = headers["Access-Control-Allow-Origin"].split(/,\s*/);
        if (whitelist.includes(req.headers.origin ?? "") || whitelist.includes("*")) {
            corsOptions.origin = true;
        }
        callback(null, corsOptions);
    }, req, res);
    if (!allowed) {
        throw new Error("Origin not allowed");
    }
};
exports.corsOringin = corsOringin;
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
const requiresAccess = (users) => {
    const { req, res } = contexts_1.RouteConfigContext.get();
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
exports.requiresAccess = requiresAccess;
//# sourceMappingURL=index.js.map