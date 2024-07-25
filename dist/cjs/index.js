"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteResponse = exports.fetchRoute = void 0;
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
Object.defineProperty(exports, "RouteResponse", { enumerable: true, get: function () { return utils_1.RouteResponse; } });
const chokidar_1 = __importDefault(require("chokidar"));
const tsUtils_1 = require("./tsUtils");
const log_1 = require("./log");
const tools_1 = require("./tools");
const contexts_1 = require("./contexts");
const express_1 = __importDefault(require("express"));
const Cors_1 = require("./utils/Cors");
__exportStar(require("./type"), exports);
__exportStar(require("./tools"), exports);
class OnlyApi extends utils_1.SimpleEventEmitter {
    constructor(routePath, options = {}) {
        var _a;
        super();
        this.routePath = routePath;
        this._ready = false;
        this.mainPath = __dirname;
        this.pathSearchRoutes = "";
        this._routes = {};
        this._routesPath = [];
        this._routesCache = new Map();
        this.options = (0, utils_1.joinObject)({
            host: "localhost",
            port: 3000,
            allowOrigin: "*",
            maxPayloadSize: "100mb",
            trustProxy: false,
            middlewares: [],
        }, options instanceof express_1.default ? {} : options);
        this.app = options instanceof express_1.default ? options : (0, express_1.default)();
        const stack = ((_a = new Error().stack) !== null && _a !== void 0 ? _a : "").split("\n");
        const frames = stack.map((frame) => {
            frame = frame.trim();
            const match = frame.match(/^at (.+) \((.+)(:(\d+):(\d+))\)$/i);
            return match ? [match[1], match[2]] : frame;
        });
        for (let i = 1; i < frames.length; i++) {
            const currentFrame = frames[i];
            if (path_1.default.dirname(currentFrame[1]) !== __dirname) {
                this.mainPath = path_1.default.resolve(path_1.default.dirname(currentFrame[1]), routePath);
                break;
            }
        }
        this.pathSearchRoutes = path_1.default.join(this.mainPath, "./**/index.{js,ts}").replace(/\\/g, "/");
        this.on("ready", () => {
            this._ready = true;
        });
        this.initialize();
    }
    async ready(callback) {
        if (this._ready) {
            callback === null || callback === void 0 ? void 0 : callback();
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            this.once("ready", () => {
                callback === null || callback === void 0 ? void 0 : callback();
                resolve();
            });
        });
    }
    async initialize() {
        await new Promise((resolve) => {
            let time, resolved = false;
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
            chokidar_1.default
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
        const route = Array.prototype.concat.apply([], [
            "/*",
            this.options.middlewares,
            async (req, res) => {
                try {
                    const allowed = [];
                    allowed.push((0, Cors_1.corsSync)({
                        origin: this.options.allowOrigin,
                    }, req, res));
                    if (this.options.cors) {
                        allowed.push((0, Cors_1.corsSync)(this.options.cors, req, res));
                    }
                    if (!allowed.includes(true)) {
                        throw new Error("Origin not allowed");
                    }
                }
                catch (_a) {
                    if (res && typeof res.status === "function" && !(res.finished || res.headersSent || res.destroyed)) {
                        res.status(403).send("Origin not allowed");
                    }
                    return;
                }
                const route = req.originalUrl;
                const method = req.method;
                const response = await this.fetchRoute(route, {
                    method,
                    headers: req.headers,
                    params: req.params,
                    query: req.query,
                }, req, res);
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
                    }
                    else if (typeof response.content.attachment === "string") {
                        res.setHeader("Content-Disposition", `attachment; filename="${response.content.attachment}"`);
                    }
                    if (typeof response.content.security === "object") {
                        if (response.content.security.policy) {
                            res.setHeader("Content-Security-Policy", response.content.security.policy);
                        }
                        if (typeof response.content.security.reportOnly === "boolean") {
                            res.setHeader("Content-Security-Policy-Report-Only", response.content.security.reportOnly ? "true" : "false");
                        }
                        else if (typeof response.content.security.reportOnly === "string") {
                            res.setHeader("Content-Security-Policy-Report-Only", response.content.security.reportOnly);
                        }
                    }
                    else if (typeof response.content.security === "string") {
                        res.setHeader("Content-Security-Policy", response.content.security);
                    }
                    if (response.type === "stream") {
                        const stream = response.response;
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
                }
                catch (_b) { }
            },
        ]);
        this.app.all(...route);
        this.app.all("*", (req, res) => {
            res.status(404).send("Not found");
        });
        this.app.listen(this.options.port, this.options.host, () => {
            (0, log_1.logTrace)("info", `Server started at http://${this.options.host}:${this.options.port}`, this.mainPath);
            this.emit("ready");
        });
    }
    async addRoute(routePath) {
        var _a;
        const p = routePath.replace(/\\/g, "/").replace(this.mainPath.replace(/\\/g, "/"), "").replace("/index.ts", "").replace("/index.js", "");
        const exports = await (0, tsUtils_1.importModule)(routePath, true, () => {
            this.addRoute(routePath);
        });
        if (this._routesCache.has(p)) {
            (_a = this._routesCache.get(p)) === null || _a === void 0 ? void 0 : _a.applyOptions(exports.cacheOptions);
        }
        else {
            this._routesCache.set(p, new utils_1.SimpleCache(exports.cacheOptions));
        }
        if (p in this._routes) {
            (0, log_1.logTrace)("info", `Rota "${p}" foi alterado!`, routePath);
        }
        else {
            (0, log_1.logTrace)("info", `Rota "${p}" foi adicionado!`, routePath);
        }
        this._routes[p] = exports;
        this._routesPath = Object.keys(this._routes);
    }
    async changeRoute(routePath) {
        return await this.addRoute(routePath);
    }
    async removeRoute(routePath) {
        const path = routePath.replace(/\\/g, "/").replace(this.mainPath.replace(/\\/g, "/"), "").replace("/index.ts", "").replace("/index.js", "");
        delete this._routes[path];
        this._routesPath = Object.keys(this._routes);
        this._routesCache.delete(path);
        (0, log_1.logTrace)("warn", `Rota "${path}" foi removido!`, routePath);
    }
    async fetchRoute(route, options = {
        method: "GET",
        headers: {},
        body: {},
        params: {},
        query: {},
    }, request, response) {
        var _a, _b, _c, _d, _e, _f;
        const initialyTime = Date.now();
        try {
            await new Promise((resolve) => setTimeout(resolve, 0));
            const localPath = (0, tools_1.getUrlOrigin)();
            const { pathname: pn, searchParams } = (0, utils_1.parseUrl)(route);
            const pathname = (0, utils_1.resolvePath)(localPath, pn);
            const routePath = pathname.replace(/^\//gi, "").replace(/\/$/gi, "");
            const findRoute = this._routesPath.find((path) => {
                return utils_1.PathInfo.get(path).equals(routePath);
            });
            if (!findRoute) {
                throw new Error(`"/${routePath}": Route not found!`);
            }
            const moduleRoute = this._routes[findRoute];
            const method = ((_a = options.method) !== null && _a !== void 0 ? _a : "GET").toLowerCase();
            const methodBy = method === "get" && "get" in moduleRoute
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
                throw new Error(`"/${routePath}": Method not allowed!`);
            }
            const prevConfig = contexts_1.RouteConfigContext.get();
            const res = response !== null && response !== void 0 ? response : prevConfig.res;
            const req = request !== null && request !== void 0 ? request : prevConfig.req;
            const getParams = () => {
                const _a = utils_1.PathInfo.extractVariables(findRoute, routePath), { length } = _a, params = __rest(_a, ["length"]);
                return Object.entries(params).reduce((acc, [key, value]) => {
                    acc[key] = decodeURIComponent(value.toString());
                    return acc;
                }, {});
            };
            const parseHeaders = (headers) => {
                return Object.entries(headers).reduce((acc, [key, value]) => {
                    acc[key.toLowerCase()] = value;
                    return acc;
                }, {});
            };
            const fn = async () => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                try {
                    await new Promise((resolve) => setTimeout(resolve, 0));
                    // const cached = getCachedResponse();
                    // if (cached) {
                    // 	return Promise.resolve(cached);
                    // }
                    const valueContext = contexts_1.RouteRequestContext.get();
                    const middleware = ("middleware" in moduleRoute ? (Array.isArray(moduleRoute.middleware) ? moduleRoute.middleware : [moduleRoute.middleware]) : []).filter((fn) => typeof fn === "function");
                    const callbacks = middleware.concat((Array.isArray(moduleRoute[methodBy]) ? moduleRoute[methodBy] : [moduleRoute[methodBy]]));
                    const cache = (_a = this._routesCache.get(findRoute)) !== null && _a !== void 0 ? _a : new utils_1.SimpleCache();
                    const req = {
                        method: (_c = (_b = options.method) === null || _b === void 0 ? void 0 : _b.toUpperCase()) !== null && _c !== void 0 ? _c : "GET",
                        headers: Object.assign(Object.assign({}, parseHeaders(valueContext.headers)), parseHeaders((_d = options.headers) !== null && _d !== void 0 ? _d : {})),
                        body: (_f = (_e = options.body) !== null && _e !== void 0 ? _e : valueContext.body) !== null && _f !== void 0 ? _f : {},
                        params: Object.assign(Object.assign({}, getParams()), ((_g = options.params) !== null && _g !== void 0 ? _g : {})),
                        query: Object.assign(Object.assign(Object.assign({}, valueContext.query), ((_h = options.query) !== null && _h !== void 0 ? _h : {})), searchParams),
                        cache,
                    };
                    let response;
                    for (let i = 0; i < callbacks.length; i++) {
                        let continueToNext = false;
                        const next = () => {
                            continueToNext = true;
                        };
                        response = await Promise.race([callbacks[i](req, next)]);
                        if (!continueToNext) {
                            break;
                        }
                        await new Promise((resolve) => setTimeout(resolve, 0));
                    }
                    if (!(response instanceof utils_1.RouteResponse)) {
                        return Promise.resolve(utils_1.RouteResponse.send(response));
                    }
                    const fnCache = contexts_1.RouteConfigContext.value.cacheRoute;
                    if (typeof fnCache === "function" && [400, 404].includes(response.code)) {
                        fnCache(response);
                    }
                    return Promise.resolve(response);
                }
                catch (e) {
                    const [_, idCache] = String(e).split("__cache_control_response__");
                    const cached = (0, tools_1.getCachedResponse)(idCache);
                    if (cached) {
                        return Promise.resolve(cached);
                    }
                    (0, log_1.logError)(e);
                    return new utils_1.RouteResponse({
                        code: 500,
                        message: String(e).replace(/(Error\:\s?)+/gi, "Error: "),
                        timeStart: initialyTime,
                        timeEnd: Date.now(),
                    });
                }
            };
            const result = await contexts_1.RouteRequestContext.provider(contexts_1.RoutePathContext.provider(contexts_1.RouteConfigContext.provider(fn, {
                res,
                req,
            }), {
                original: routePath,
                parsed: findRoute,
            }), {
                method: (_b = options.method) !== null && _b !== void 0 ? _b : "GET",
                headers: (_c = options.headers) !== null && _c !== void 0 ? _c : {},
                body: (_d = options.body) !== null && _d !== void 0 ? _d : {},
                params: Object.assign(Object.assign({}, getParams()), ((_e = options.params) !== null && _e !== void 0 ? _e : {})),
                query: Object.assign(Object.assign({}, ((_f = options.query) !== null && _f !== void 0 ? _f : {})), searchParams),
            })();
            return new utils_1.RouteResponse({
                response: result.response,
                content: result.content,
                type: result.type,
                code: result.code,
                message: result.message,
                timeStart: initialyTime,
                timeEnd: Date.now(),
            });
        }
        catch (e) {
            // logError(e as any);
            return new utils_1.RouteResponse({
                code: 500,
                message: String(e).replace(/(Error\:\s?)+/gi, "Error: "),
                timeStart: initialyTime,
                timeEnd: Date.now(),
            });
        }
    }
}
let rootOnlyApi = null;
function onlyApi(routePath, options = {}) {
    rootOnlyApi = new OnlyApi(routePath, options);
    return rootOnlyApi;
}
const fetchRoute = async (route, options = {}) => {
    if (!rootOnlyApi) {
        throw new Error("OnlyApi not initialized!");
    }
    await rootOnlyApi.ready();
    return await rootOnlyApi.fetchRoute(route, options);
};
exports.fetchRoute = fetchRoute;
exports.default = onlyApi;
//# sourceMappingURL=index.js.map