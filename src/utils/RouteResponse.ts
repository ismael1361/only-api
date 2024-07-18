export default class RouteResponse {
	readonly requisitionTime: {
		start: number;
		end: number;
		duration: number;
	};

	readonly status: CodeStatus;

	constructor(
		readonly response: any,
		readonly type: "json" | "text" | "send" | "status",
		readonly code: keyof typeof codeStatus = 200,
		readonly message: string = "OK",
		timeStart: number = Date.now(),
		timeEnd: number = Date.now(),
	) {
		this.status = codeStatus[this.code];

		this.requisitionTime = {
			start: timeStart,
			end: timeEnd,
			duration: timeEnd - timeStart,
		};
	}

	static json(data: any) {
		return new RouteResponse(data, "json");
	}

	static text(data: any) {
		return new RouteResponse(data, "text");
	}

	static send(data: any) {
		return new RouteResponse(data, "send");
	}

	static status(code: keyof typeof codeStatus, message: string = "OK") {
		return new RouteResponse(null, "status", code, message);
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
