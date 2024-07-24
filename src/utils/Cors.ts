"use strict";
import type { Request, Response, NextFunction } from "express";
import assign from "./ObjectAssign";
import vary from "./vary";
import type { CustomOrigin, StaticOrigin, CorsOptions, CorsOptionsDelegate, CorsHeaders } from "../type";

const defaults: {
	origin: StaticOrigin | CustomOrigin;
	methods: string;
	preflightContinue: boolean;
	optionsSuccessStatus: number;
} = {
	origin: "*",
	methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
	preflightContinue: false,
	optionsSuccessStatus: 204,
};

const isString = (s: any): s is string => {
	return typeof s === "string" || s instanceof String;
};

const isOriginAllowed = (origin: string, allowedOrigin: StaticOrigin): boolean => {
	if (Array.isArray(allowedOrigin)) {
		for (var i = 0; i < allowedOrigin.length; ++i) {
			if (isOriginAllowed(origin, allowedOrigin[i])) {
				return true;
			}
		}
		return false;
	} else if (isString(allowedOrigin)) {
		return origin === allowedOrigin;
	} else if (allowedOrigin instanceof RegExp) {
		return allowedOrigin.test(origin);
	} else {
		return !!allowedOrigin;
	}
};

const configureOrigin = (options: CorsOptions, req: Request) => {
	const requestOrigin = req.headers.origin ?? "",
		headers: CorsHeaders = [];
	let isAllowed: boolean = false;

	if (!options.origin || options.origin === "*") {
		// allow any origin
		headers.push([
			{
				key: "Access-Control-Allow-Origin",
				value: "*",
			},
		]);
	} else if (isString(options.origin)) {
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
	} else {
		isAllowed = isOriginAllowed(requestOrigin, options.origin as any);
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

const configureMethods = (options: CorsOptions): CorsHeaders => {
	let methods = options.methods;
	if (Array.isArray(options.methods)) {
		methods = options.methods.join(","); // .methods is an array, so turn it into a string
	}
	return {
		key: "Access-Control-Allow-Methods",
		value: methods,
	};
};

const configureCredentials = (options: CorsOptions): CorsHeaders => {
	if (options.credentials === true) {
		return {
			key: "Access-Control-Allow-Credentials",
			value: "true",
		};
	}
	return null;
};

const configureAllowedHeaders = (options: CorsOptions, req: Request): CorsHeaders => {
	let allowedHeaders = options.allowedHeaders || options.headers;
	let headers: CorsHeaders = [];

	if (!allowedHeaders) {
		allowedHeaders = req.headers["access-control-request-headers"] as any; // .headers wasn't specified, so reflect the request headers
		headers.push([
			{
				key: "Vary",
				value: "Access-Control-Request-Headers",
			},
		]);
	} else if (Array.isArray(allowedHeaders)) {
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

const configureExposedHeaders = (options: CorsOptions): CorsHeaders => {
	let headers = options.exposedHeaders;
	if (!headers) {
		return null;
	} else if (Array.isArray(headers)) {
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

const configureMaxAge = (options: CorsOptions): CorsHeaders => {
	const maxAge = (typeof options.maxAge === "number" || options.maxAge) && options.maxAge.toString();
	if (maxAge && maxAge.length) {
		return {
			key: "Access-Control-Max-Age",
			value: maxAge,
		};
	}
	return null;
};

const applyHeaders = (headers: CorsHeaders, res: Response) => {
	if (Array.isArray(headers)) {
		for (var i = 0, n = headers.length; i < n; i++) {
			applyHeaders(headers[i], res);
		}
	} else if (headers) {
		if (headers.key === "Vary" && headers.value) {
			vary(res, headers.value);
		} else if (headers.value) {
			res.setHeader(headers.key, headers.value);
		}
	}
};

const cors = (options: CorsOptions, req: Request, res: Response) => {
	var headers: CorsHeaders = [],
		method = req.method && req.method.toUpperCase && req.method.toUpperCase();

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
		} else {
			// Safari (and potentially other browsers) need content-length 0,
			//   for 204 or they just hang waiting for a body
			res.statusCode = options.optionsSuccessStatus ?? res.statusCode;
			res.setHeader("Content-Length", "0");
			res.end();
		}
	} else {
		// actual response
		headers.push(configureOrigin(options, req));
		headers.push(configureCredentials(options));
		headers.push(configureExposedHeaders(options));
		applyHeaders(headers, res);
	}
};

export const corsSync = (options: CorsOptions | CorsOptionsDelegate, req: Request, res: Response): boolean => {
	const optionsCallback: CorsOptionsDelegate =
		typeof options === "function"
			? options
			: function (req, cb) {
					cb(null, options);
			  };

	let erro: Error | undefined;

	optionsCallback(req, function (err, options) {
		try {
			if (err) {
				throw err;
			} else {
				const corsOptions = assign<Object, typeof defaults>({}, defaults, options as typeof defaults);
				let originCallback: any = null;
				if (corsOptions.origin && typeof corsOptions.origin === "function") {
					originCallback = corsOptions.origin;
				} else if (corsOptions.origin) {
					originCallback = function (origin: any, cb: any) {
						cb(null, corsOptions.origin);
					};
				}

				if (originCallback) {
					originCallback(req.headers.origin, function (err2: any, origin: any) {
						if (err2 || !origin) {
							erro = new Error("No access");
						} else {
							corsOptions.origin = origin;
							cors(corsOptions, req, res);
						}
					});
				} else {
					return;
				}
			}
		} catch (e) {
			erro = e as any;
		}
	});

	const allowed = ((res.getHeader("Access-Control-Allow-Origin") as string) ?? "*").split(/\s*,\s*/);
	return erro === undefined && (allowed.includes(req.headers.origin ?? "*") || allowed.includes("*"));
};

export const middlewareWrapper = (options?: CorsOptions | CorsOptionsDelegate) => {
	const optionsCallback: CorsOptionsDelegate =
		typeof options === "function"
			? options
			: function (req, cb) {
					cb(null, options);
			  };

	return function corsMiddleware(req: Request, res: Response, next: NextFunction) {
		try {
			const allowed = corsSync(optionsCallback, req, res);
			if (!allowed) {
				throw new Error("Origin not allowed");
			}
		} catch (e) {
			return next(e);
		}
		next();
	};
};

export default middlewareWrapper;
