import { ParsedUrl } from "../type";
import PathInfo from "./PathInfo";

export class PartialArray {
	[index: number]: any;
	constructor(sparseArray?: { [index: number]: any } | any[]) {
		if (sparseArray instanceof Array) {
			for (let i = 0; i < sparseArray.length; i++) {
				if (typeof sparseArray[i] !== "undefined") {
					this[i] = sparseArray[i];
				}
			}
		} else if (sparseArray) {
			Object.assign(this, sparseArray);
		}
	}
}

export function cloneObject(original: any, stack: any[] = []): typeof original {
	const checkAndFixTypedArray = (obj: any) => {
		if (
			obj !== null &&
			typeof obj === "object" &&
			typeof obj.constructor === "function" &&
			typeof obj.constructor.name === "string" &&
			["Buffer", "Uint8Array", "Int8Array", "Uint16Array", "Int16Array", "Uint32Array", "Int32Array", "BigUint64Array", "BigInt64Array"].includes(obj.constructor.name)
		) {
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

	const cloneValue = (val: any) => {
		if (stack.indexOf(val) >= 0) {
			throw new ReferenceError("object contains a circular reference");
		}
		val = checkAndFixTypedArray(val);
		if (val === null || val instanceof Date || val instanceof ArrayBuffer || val instanceof RegExp) {
			// || val instanceof ID
			return val;
		} else if (typeof val === "object") {
			stack.push(val);
			val = cloneObject(val, stack);
			stack.pop();
			return val;
		} else {
			return val; // Anything other can just be copied
		}
	};
	if (typeof stack === "undefined") {
		stack = [original];
	}
	const clone: PartialArray | any[] | Record<string, any> = original instanceof Array ? [] : original instanceof PartialArray ? new PartialArray() : {};
	Object.keys(original).forEach((key) => {
		const val = original[key];
		if (typeof val === "function") {
			return; // skip functions
		}
		(clone as any)[key] = cloneValue(val);
	});
	return clone;
}

export const parseUrl = (urlString: string): ParsedUrl => {
	const urlPattern = /^([^?#]*)(\?[^#]*)?(#.*)?$/;
	const matches = urlString.match(urlPattern);

	if (!matches) {
		throw new Error("Invalid URL");
	}

	const [, pathname, search, hash] = matches;

	const searchParams: Record<string, string> = {};
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

export const resolvePath = (from: string, to: string): string => {
	const normalize = (path: string) => {
		const keys = PathInfo.get(path).keys.reduce((acc, key, index) => {
			if (index === 0) {
				acc.push(key);
			} else if (key === "..") {
				acc.pop();
			} else if (key !== ".") {
				acc.push(key);
			}
			return acc;
		}, [] as Array<string | number>);

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
		} else if (key !== ".") {
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
export const getCorsOptions = (allowedOrigins: string) => {
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
export const getCorsHeaders = (allowedOrigins: string | string[], currentOrigin?: string, exposeHeaders?: string | string[]) => {
	const corsOptions = getCorsOptions(Array.isArray(allowedOrigins) ? allowedOrigins.join(",") : allowedOrigins);
	const origins =
		typeof corsOptions.origin === "boolean" ? (corsOptions.origin ? currentOrigin ?? "*" : "") : corsOptions.origin instanceof Array ? corsOptions.origin.join(",") : corsOptions.origin;

	const options: {
		"Access-Control-Allow-Origin": string;
		"Access-Control-Allow-Methods": string;
		"Access-Control-Allow-Headers": string;
		"Access-Control-Expose-Headers"?: string;
	} = {
		"Access-Control-Allow-Origin": origins,
		"Access-Control-Allow-Methods": corsOptions.methods,
		"Access-Control-Allow-Headers": corsOptions.allowedHeaders,
	};

	if (Array.isArray(exposeHeaders) || typeof exposeHeaders === "string") {
		options["Access-Control-Expose-Headers"] = Array.isArray(exposeHeaders) ? exposeHeaders.join(", ") : exposeHeaders; // Cabeçalhos permitidos para serem acessados pelo cliente
	}

	return options;
};

export function getStackTrace(belowFn?: Function): string {
	const oldLimit = Error.stackTraceLimit;
	Error.stackTraceLimit = Infinity;

	const dummyObject: Record<string, any> = {};

	const v8Handler = Error.prepareStackTrace;
	Error.prepareStackTrace = function (dummyObject, v8StackTrace) {
		return v8StackTrace;
	};
	Error.captureStackTrace(dummyObject, belowFn || getStackTrace);

	const v8StackTrace = dummyObject.stack;
	Error.prepareStackTrace = v8Handler;
	Error.stackTraceLimit = oldLimit;

	return v8StackTrace.map((callSite: any) => callSite.toString()).join("\n");
}
