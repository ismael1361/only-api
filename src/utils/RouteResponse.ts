interface RouteResponseOptions<T = any> {
	response: T | null;
	type: "json" | "text" | "send" | "status" | "buffer";
	code: keyof typeof codeStatus;
	message: string;
	timeStart: number;
	timeEnd: number;
	contentType: string;
}

export default class RouteResponse<T = any> {
	readonly response: RouteResponseOptions<T>["response"];
	readonly contentType?: RouteResponseOptions<T>["contentType"];
	readonly type: RouteResponseOptions<T>["type"];
	readonly code: RouteResponseOptions<T>["code"] = 200;
	readonly status: CodeStatus;
	readonly message: RouteResponseOptions<T>["message"];

	readonly requisitionTime: {
		start: number;
		end: number;
		duration: number;
	};

	constructor(options: Partial<RouteResponseOptions<T>> = {}) {
		const { response = null, contentType, type = "status", code = 200, message = "Ok", timeStart = Date.now(), timeEnd = Date.now() } = options;

		this.response = response ?? null;
		this.contentType = contentType;
		this.type = type;
		this.code = code;
		this.message = message;
		this.status = codeStatus[this.code];

		this.requisitionTime = {
			start: timeStart,
			end: timeEnd,
			duration: timeEnd - timeStart,
		};
	}

	static json<T extends Record<string, any> = { [k: string]: any }>(data: T) {
		return new RouteResponse<T>({ response: data, type: "json", contentType: "application/json" });
	}

	static text(data: string, contentType: string = "text/plain") {
		return new RouteResponse<string>({ response: data, type: "text", contentType });
	}

	static buffer(data: Buffer, contentType: string = "application/octet-stream") {
		return new RouteResponse<Buffer>({ response: data, type: "buffer", contentType });
	}

	static send<T = any>(data: T, contentType?: string) {
		if (!contentType) {
			if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(data))) {
				contentType = "application/json";
			} else if (typeof data === "string") {
				contentType = "text/plain";
			} else {
				contentType = "application/octet-stream";
			}
		}
		return new RouteResponse<T>({ response: data, contentType, type: "send" });
	}

	static error(code: keyof typeof codeStatus, message: string) {
		return new RouteResponse<null>({ type: "status", code, message });
	}

	static status(code: keyof typeof codeStatus, message: string = "OK") {
		return new RouteResponse<null>({ type: "status", code, message });
	}
}

const codeStatus = {
	200: "OK",
	201: "Created",
	202: "Accepted",
	204: "No Content",
	206: "Partial Content",
	300: "Multiple Choices",
	301: "Moved Permanently",
	302: "Found",
	303: "See Other",
	304: "Not Modified",
	307: "Temporary Redirect",
	308: "Permanent Redirect",
	400: "Bad Request",
	401: "Unauthorized",
	402: "Payment Required",
	403: "Forbidden",
	404: "Not Found",
	405: "Method Not Allowed",
	406: "Not Acceptable",
	408: "Request Timeout",
	409: "Conflict",
	410: "Gone",
	411: "Length Required",
	413: "Payload Too Large",
	414: "URI Too Long",
	415: "Unsupported Media Type",
	416: "Range Not Satisfiable",
	417: "Expectation Failed",
	418: "I'm a teapot",
	422: "Unprocessable Entity",
	429: "Too Many Requests",
	500: "Internal Server Error",
	501: "Not Implemented",
	502: "Bad Gateway",
	503: "Service Unavailable",
	504: "Gateway Timeout",
	505: "HTTP Version Not Supported",
} as const;

type CodeStatus = (typeof codeStatus)[keyof typeof codeStatus];
