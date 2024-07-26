import path from "path";
import PathInfo from "./PathInfo.js";
import { platform } from "os";
export const joinObject = (obj, partial) => {
    const newObj = { ...obj };
    for (const key in partial) {
        if (partial.hasOwnProperty(key)) {
            newObj[key] = partial[key] ?? obj[key];
        }
    }
    return newObj;
};
export class PartialArray {
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
export function cloneObject(original, stack = []) {
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
export const parseUrl = (urlString) => {
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
export const resolvePath = (from, to) => {
    const normalize = (path) => {
        const keys = PathInfo.get(path).keys.reduce((acc, key, index) => {
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
        return PathInfo.get(keys).path;
    };
    if (!to.startsWith(".") && !to.startsWith("..") && to.startsWith("/")) {
        return normalize(to);
    }
    from = normalize(from);
    to = normalize(to);
    if (!to.startsWith(".") && !to.startsWith("..")) {
        return PathInfo.get([from, to]).path;
    }
    const keys = PathInfo.get(to).keys.reduce((acc, key) => {
        if (key === "..") {
            acc.pop();
        }
        else if (key !== ".") {
            acc.push(key);
        }
        return acc;
    }, PathInfo.get(from).keys);
    return PathInfo.get(keys).path;
};
/**
 * Obtém opções de CORS compatíveis com o pacote 'cors' (usado pelo Socket.IO 3+)
 * @param allowedOrigins Origens permitidas
 * @returns Opções de CORS
 */
export const getCorsOptions = (allowedOrigins) => {
    return {
        origin: allowedOrigins === "*" ? true : allowedOrigins === "" ? false : allowedOrigins.split(/,\s*/),
        methods: "GET,PUT,POST,DELETE,OPTIONS",
        allowedHeaders: "Content-Type, Authorization, Content-Length, Accept, Origin, X-Requested-With, DataBase-Context", // Cabeçalhos permitidos
    };
};
/**
 * Obtém cabeçalhos CORS que podem ser enviados em solicitações de preflight (OPTIONS)
 * @param allowedOrigins Origem(s) permitida(s) configurada(s). Exemplos: `'https://meu.servidor.com'` para uma origem permitida específica, `'*'` para qualquer origem (retorna a origem atual), `''` para desativar o CORS (permitindo apenas localhost), ou `'http://servidor1.com,https://servidor1.com,https://servidor2.com'` para várias origens permitidas
 * @param currentOrigin Origem atual dos cabeçalhos da solicitação
 * @returns
 */
export const getCorsHeaders = (allowedOrigins, currentOrigin, exposeHeaders) => {
    const corsOptions = getCorsOptions(Array.isArray(allowedOrigins) ? allowedOrigins.join(",") : allowedOrigins);
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
export const dirName = () => {
    try {
        throw new Error();
    }
    catch (e) {
        const initiator = e.stack.split("\n").slice(2, 3)[0];
        let p = /(?<path>[^\(\s]+):[0-9]+:[0-9]+/.exec(initiator)?.groups?.path ?? "";
        if (p.indexOf("file") >= 0) {
            p = new URL(p).pathname;
        }
        let dirname = path.dirname(p);
        if (dirname[0] === "/" && platform() === "win32") {
            dirname = dirname.slice(1);
        }
        return dirname;
    }
};
//# sourceMappingURL=Utils.js.map