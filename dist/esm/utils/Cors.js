"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.middlewareWrapper = exports.corsSync = void 0;
const ObjectAssign_1 = __importDefault(require("./ObjectAssign.js"));
const vary_1 = __importDefault(require("./vary.js"));
const defaults = {
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
};
const isString = (s) => {
    return typeof s === "string" || s instanceof String;
};
const isOriginAllowed = (origin, allowedOrigin) => {
    if (Array.isArray(allowedOrigin)) {
        for (var i = 0; i < allowedOrigin.length; ++i) {
            if (isOriginAllowed(origin, allowedOrigin[i])) {
                return true;
            }
        }
        return false;
    }
    else if (isString(allowedOrigin)) {
        return origin === allowedOrigin;
    }
    else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
    }
    else {
        return !!allowedOrigin;
    }
};
const configureOrigin = (options, req) => {
    const requestOrigin = req.headers.origin ?? "", headers = [];
    let isAllowed = false;
    if (!options.origin || options.origin === "*") {
        // allow any origin
        headers.push([
            {
                key: "Access-Control-Allow-Origin",
                value: "*",
            },
        ]);
    }
    else if (isString(options.origin)) {
        // fixed origin
        headers.push([
            {
                key: "Access-Control-Allow-Origin",
                value: options.origin,
            },
        ]);
        headers.push([
            {
                key: "Vary",
                value: "Origin",
            },
        ]);
    }
    else {
        isAllowed = isOriginAllowed(requestOrigin, options.origin);
        // reflect origin
        headers.push([
            {
                key: "Access-Control-Allow-Origin",
                value: isAllowed ? requestOrigin : false,
            },
        ]);
        headers.push([
            {
                key: "Vary",
                value: "Origin",
            },
        ]);
    }
    return headers;
};
const configureMethods = (options) => {
    let methods = options.methods;
    if (Array.isArray(options.methods)) {
        methods = options.methods.join(","); // .methods is an array, so turn it into a string
    }
    return {
        key: "Access-Control-Allow-Methods",
        value: methods,
    };
};
const configureCredentials = (options) => {
    if (options.credentials === true) {
        return {
            key: "Access-Control-Allow-Credentials",
            value: "true",
        };
    }
    return null;
};
const configureAllowedHeaders = (options, req) => {
    let allowedHeaders = options.allowedHeaders || options.headers;
    let headers = [];
    if (!allowedHeaders) {
        allowedHeaders = req.headers["access-control-request-headers"]; // .headers wasn't specified, so reflect the request headers
        headers.push([
            {
                key: "Vary",
                value: "Access-Control-Request-Headers",
            },
        ]);
    }
    else if (Array.isArray(allowedHeaders)) {
        allowedHeaders = allowedHeaders.join(","); // .headers is an array, so turn it into a string
    }
    if (allowedHeaders && allowedHeaders.length) {
        headers.push([
            {
                key: "Access-Control-Allow-Headers",
                value: allowedHeaders,
            },
        ]);
    }
    return headers;
};
const configureExposedHeaders = (options) => {
    let headers = options.exposedHeaders;
    if (!headers) {
        return null;
    }
    else if (Array.isArray(headers)) {
        headers = headers.join(","); // .headers is an array, so turn it into a string
    }
    if (headers && headers.length) {
        return {
            key: "Access-Control-Expose-Headers",
            value: headers,
        };
    }
    return null;
};
const configureMaxAge = (options) => {
    const maxAge = (typeof options.maxAge === "number" || options.maxAge) && options.maxAge.toString();
    if (maxAge && maxAge.length) {
        return {
            key: "Access-Control-Max-Age",
            value: maxAge,
        };
    }
    return null;
};
const applyHeaders = (headers, res) => {
    if (Array.isArray(headers)) {
        for (var i = 0, n = headers.length; i < n; i++) {
            applyHeaders(headers[i], res);
        }
    }
    else if (headers) {
        if (headers.key === "Vary" && headers.value) {
            (0, vary_1.default)(res, headers.value);
        }
        else if (headers.value) {
            res.setHeader(headers.key, headers.value);
        }
    }
};
const cors = (options, req, res) => {
    var headers = [], method = req.method && req.method.toUpperCase && req.method.toUpperCase();
    if (method === "OPTIONS") {
        // preflight
        headers.push(configureOrigin(options, req));
        headers.push(configureCredentials(options));
        headers.push(configureMethods(options));
        headers.push(configureAllowedHeaders(options, req));
        headers.push(configureMaxAge(options));
        headers.push(configureExposedHeaders(options));
        applyHeaders(headers, res);
        if (options.preflightContinue) {
            return;
        }
        else {
            // Safari (and potentially other browsers) need content-length 0,
            //   for 204 or they just hang waiting for a body
            res.statusCode = options.optionsSuccessStatus ?? res.statusCode;
            res.setHeader("Content-Length", "0");
            res.end();
        }
    }
    else {
        // actual response
        headers.push(configureOrigin(options, req));
        headers.push(configureCredentials(options));
        headers.push(configureExposedHeaders(options));
        applyHeaders(headers, res);
    }
};
const corsSync = (options, req, res) => {
    const optionsCallback = typeof options === "function"
        ? options
        : function (req, cb) {
            cb(null, options);
        };
    let erro;
    optionsCallback(req, function (err, options) {
        try {
            if (err) {
                throw err;
            }
            else {
                const corsOptions = (0, ObjectAssign_1.default)({}, defaults, options);
                let originCallback = null;
                if (corsOptions.origin && typeof corsOptions.origin === "function") {
                    originCallback = corsOptions.origin;
                }
                else if (corsOptions.origin) {
                    originCallback = function (origin, cb) {
                        cb(null, corsOptions.origin);
                    };
                }
                if (originCallback) {
                    originCallback(req.headers.origin, function (err2, origin) {
                        if (err2 || !origin) {
                            erro = new Error("No access");
                        }
                        else {
                            corsOptions.origin = origin;
                            cors(corsOptions, req, res);
                        }
                    });
                }
                else {
                    return;
                }
            }
        }
        catch (e) {
            erro = e;
        }
    });
    const allowed = (res.getHeader("Access-Control-Allow-Origin") ?? "*").split(/\s*,\s*/);
    return erro === undefined && (allowed.includes(req.headers.origin ?? "*") || allowed.includes("*"));
};
exports.corsSync = corsSync;
const middlewareWrapper = (options) => {
    const optionsCallback = typeof options === "function"
        ? options
        : function (req, cb) {
            cb(null, options);
        };
    return function corsMiddleware(req, res, next) {
        try {
            const allowed = (0, exports.corsSync)(optionsCallback, req, res);
            if (!allowed) {
                throw new Error("Origin not allowed");
            }
        }
        catch (e) {
            return next(e);
        }
        next();
    };
};
exports.middlewareWrapper = middlewareWrapper;
exports.default = exports.middlewareWrapper;
//# sourceMappingURL=Cors.js.map