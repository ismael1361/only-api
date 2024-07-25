"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCorsHeaders = exports.getCorsOptions = exports.resolvePath = exports.parseUrl = exports.PartialArray = exports.joinObject = void 0;
exports.cloneObject = cloneObject;
const PathInfo_1 = __importDefault(require("./PathInfo.js"));
const joinObject = (obj, partial) => {
    const newObj = { ...obj };
    for (const key in partial) {
        if (partial.hasOwnProperty(key)) {
            newObj[key] = partial[key] ?? obj[key];
        }
    }
    return newObj;
};
exports.joinObject = joinObject;
class PartialArray {
    constructor(sparseArray) {
        if (sparseArray instanceof Array) {
            for (let i = 0; i < sparseArray.length; i++) {
                if (typeof sparseArray[i] !== "undefined") {
                    this[i] = sparseArray[i];
                }
            }
        }
        else if (sparseArray) {
            Object.assign(this, sparseArray);
        }
    }
}
exports.PartialArray = PartialArray;
function cloneObject(original, stack = []) {
    const checkAndFixTypedArray = (obj) => {
        if (obj !== null &&
            typeof obj === "object" &&
            typeof obj.constructor === "function" &&
            typeof obj.constructor.name === "string" &&
            ["Buffer", "Uint8Array", "Int8Array", "Uint16Array", "Int16Array", "Uint32Array", "Int32Array", "BigUint64Array", "BigInt64Array"].includes(obj.constructor.name)) {
            // FIX for typed array being converted to objects with numeric properties:
            // Convert Buffer or TypedArray to ArrayBuffer
            obj = obj.buffer.slice(obj.byteOffset, obj.byteOffset + obj.byteLength);
        }
        return obj;
    };
    original = checkAndFixTypedArray(original);
    if (typeof original !== "object" || original === null || original instanceof Date || original instanceof ArrayBuffer || original instanceof RegExp) {
        return original;
    }
    const cloneValue = (val) => {
        if (stack.indexOf(val) >= 0) {
            throw new ReferenceError("object contains a circular reference");
        }
        val = checkAndFixTypedArray(val);
        if (val === null || val instanceof Date || val instanceof ArrayBuffer || val instanceof RegExp) {
            // || val instanceof ID
            return val;
        }
        else if (typeof val === "object") {
            stack.push(val);
            val = cloneObject(val, stack);
            stack.pop();
            return val;
        }
        else {
            return val; // Anything other can just be copied
        }
    };
    if (typeof stack === "undefined") {
        stack = [original];
    }
    const clone = original instanceof Array ? [] : original instanceof PartialArray ? new PartialArray() : {};
    Object.keys(original).forEach((key) => {
        const val = original[key];
        if (typeof val === "function") {
            return; // skip functions
        }
        clone[key] = cloneValue(val);
    });
    return clone;
}
const parseUrl = (urlString) => {
    const urlPattern = /^([^?#]*)(\?[^#]*)?(#.*)?$/;
    const matches = urlString.match(urlPattern);
    if (!matches) {
        throw new Error("Invalid URL");
    }
    const [, pathname, search, hash] = matches;
    const searchParams = {};
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
exports.parseUrl = parseUrl;
const resolvePath = (from, to) => {
    const normalize = (path) => {
        const keys = PathInfo_1.default.get(path).keys.reduce((acc, key, index) => {
            if (index === 0) {
                acc.push(key);
            }
            else if (key === "..") {
                acc.pop();
            }
            else if (key !== ".") {
                acc.push(key);
            }
            return acc;
        }, []);
        return PathInfo_1.default.get(keys).path;
    };
    if (!to.startsWith(".") && !to.startsWith("..") && to.startsWith("/")) {
        return normalize(to);
    }
    from = normalize(from);
    to = normalize(to);
    if (!to.startsWith(".") && !to.startsWith("..")) {
        return PathInfo_1.default.get([from, to]).path;
    }
    const keys = PathInfo_1.default.get(to).keys.reduce((acc, key) => {
        if (key === "..") {
            acc.pop();
        }
        else if (key !== ".") {
            acc.push(key);
        }
        return acc;
    }, PathInfo_1.default.get(from).keys);
    return PathInfo_1.default.get(keys).path;
};
exports.resolvePath = resolvePath;
/**
 * Obtém opções de CORS compatíveis com o pacote 'cors' (usado pelo Socket.IO 3+)
 * @param allowedOrigins Origens permitidas
 * @returns Opções de CORS
 */
const getCorsOptions = (allowedOrigins) => {
    return {
        origin: allowedOrigins === "*" ? true : allowedOrigins === "" ? false : allowedOrigins.split(/,\s*/),
        methods: "GET,PUT,POST,DELETE,OPTIONS",
        allowedHeaders: "Content-Type, Authorization, Content-Length, Accept, Origin, X-Requested-With, DataBase-Context", // Cabeçalhos permitidos
    };
};
exports.getCorsOptions = getCorsOptions;
/**
 * Obtém cabeçalhos CORS que podem ser enviados em solicitações de preflight (OPTIONS)
 * @param allowedOrigins Origem(s) permitida(s) configurada(s). Exemplos: `'https://meu.servidor.com'` para uma origem permitida específica, `'*'` para qualquer origem (retorna a origem atual), `''` para desativar o CORS (permitindo apenas localhost), ou `'http://servidor1.com,https://servidor1.com,https://servidor2.com'` para várias origens permitidas
 * @param currentOrigin Origem atual dos cabeçalhos da solicitação
 * @returns
 */
const getCorsHeaders = (allowedOrigins, currentOrigin, exposeHeaders) => {
    const corsOptions = (0, exports.getCorsOptions)(Array.isArray(allowedOrigins) ? allowedOrigins.join(",") : allowedOrigins);
    const origins = typeof corsOptions.origin === "boolean" ? (corsOptions.origin ? currentOrigin ?? "*" : "") : corsOptions.origin instanceof Array ? corsOptions.origin.join(",") : corsOptions.origin;
    const options = {
        "Access-Control-Allow-Origin": origins,
        "Access-Control-Allow-Methods": corsOptions.methods,
        "Access-Control-Allow-Headers": corsOptions.allowedHeaders,
    };
    if (Array.isArray(exposeHeaders) || typeof exposeHeaders === "string") {
        options["Access-Control-Expose-Headers"] = Array.isArray(exposeHeaders) ? exposeHeaders.join(", ") : exposeHeaders; // Cabeçalhos permitidos para serem acessados pelo cliente
    }
    return options;
};
exports.getCorsHeaders = getCorsHeaders;
//# sourceMappingURL=Utils.js.map