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
const multer_1 = __importDefault(require("multer"));
const os_1 = require("os");
__exportStar(require("./type"), exports);
__exportStar(require("./tools"), exports);
const localDir = (0, utils_1.dirName)();
class OnlyApi extends utils_1.SimpleEventEmitter {
    routePath;
    _ready = false;
    mainPath = localDir;
    pathSearchRoutes = "";
    _routes = {};
    _routesPath = [];
    _routesCache = new Map();
    options;
    app;
    constructor(routePath, options = {}) {
        super();
        this.routePath = routePath;
        this.options = (0, utils_1.joinObject)({
            host: "localhost",
            port: 3000,
            allowOrigin: "*",
            maxPayloadSize: "100mb",
            trustProxy: false,
            middlewares: [],
        }, options instanceof express_1.default ? {} : options);
        this.app = options instanceof express_1.default ? options : (0, express_1.default)();
        const dirnames = (new Error().stack ?? "")
            .split("\n")
            .map((frame) => {
            frame = frame.trim();
            let p = /(?<path>[^\(\s]+):[0-9]+:[0-9]+/.exec(frame)?.groups?.path ?? "";
            if (p.indexOf("file") >= 0) {
                p = new URL(p).pathname;
            }
            let dirname = path_1.default.dirname(p);
            if (dirname[0] === "/" && (0, os_1.platform)() === "win32") {
                dirname = dirname.slice(1);
            }
            return dirname;
        })
            .filter((dirname) => {
            return (dirname &&
                dirname.trim() !== "" &&
                dirname.trim() !== "." &&
                !dirname.split(/[\\\/]/gi).includes("internal") &&
                !dirname.split(/[\\\/]/gi).includes("node_modules") &&
                dirname.search(localDir) < 0 &&
                dirname.search(localDir.replace(/\\/gi, "/")) < 0);
        });
        this.mainPath = path_1.default.resolve(dirnames[0], routePath);
        this.pathSearchRoutes = path_1.default.join(this.mainPath, "./**/index.{js,ts}").replace(/\\/g, "/");
        this.on("ready", () => {
            this._ready = true;
        });
        this.initialize();
    }
    async ready(callback) {
        if (this._ready) {
            callback?.();
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            this.once("ready", () => {
                callback?.();
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
        const storage = multer_1.default.memoryStorage();
        const upload = (0, multer_1.default)({ storage });
        this.app.use(upload.array("files", Infinity));
        this.app.use(express_1.default.json());
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
                catch {
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
                    body: req.body,
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
                catch { }
            },
        ]);
        this.app.get("/routes", (req, res) => {
            res.json(this._routesPath);
        });
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
        const p = routePath
            .replace(/\\/g, "/")
            .replace(this.mainPath.replace(/\\/g, "/"), "")
            .replace("/index.ts", "")
            .replace("/index.js", "")
            .replace(/(\/{1,})\[/gi, "[");
        const exports = await (0, tsUtils_1.importModule)(routePath, true, () => {
            this.addRoute(routePath);
        });
        console.log(exports);
        if (this._routesCache.has(p)) {
            this._routesCache.get(p)?.applyOptions(exports.cacheOptions);
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
        files: [],
        file: undefined,
    }, request, response) {
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
            const method = (options.method ?? "GET").toLowerCase();
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
            const res = response ?? prevConfig.res;
            const req = request ?? prevConfig.req;
            const files = (options && Array.isArray(options.files) ? options.files : req && Array.isArray(req.files) ? req.files : [])
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
                const { length, ...params } = utils_1.PathInfo.extractVariables(findRoute, routePath);
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
                try {
                    await new Promise((resolve) => setTimeout(resolve, 0));
                    // const cached = getCachedResponse();
                    // if (cached) {
                    // 	return Promise.resolve(cached);
                    // }
                    const valueContext = contexts_1.RouteRequestContext.get();
                    const middleware = ("middleware" in moduleRoute ? (Array.isArray(moduleRoute.middleware) ? moduleRoute.middleware : [moduleRoute.middleware]) : []).filter((fn) => typeof fn === "function");
                    const callbacks = middleware.concat((Array.isArray(moduleRoute[methodBy]) ? moduleRoute[methodBy] : [moduleRoute[methodBy]]));
                    const cache = this._routesCache.get(findRoute) ?? new utils_1.SimpleCache();
                    const req = {
                        method: options.method?.toUpperCase() ?? "GET",
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