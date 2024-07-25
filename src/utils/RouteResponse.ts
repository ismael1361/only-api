import { Readable } from "stream";

interface RouteResponseOptions<T = any> {
	response: T | null;
	type: "json" | "text" | "send" | "status" | "buffer" | "stream";
	code: keyof typeof codeStatus;
	message: string;
	timeStart: number;
	timeEnd: number;
	content: Partial<ContentInfo>;
}

type StreamCallback = (start: number, end: number) => string | Buffer | null;

interface ContentInfo {
	type: string;
	length?: number;
	disposition?: string;
	attachment?: boolean | string;
	security?:
		| Partial<{
				policy: string;
				reportOnly: boolean | string;
		  }>
		| string;
}

export default class RouteResponse<T = any> {
	readonly response: RouteResponseOptions<T>["response"];
	readonly content: ContentInfo;
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
		const { response = null, content, type = "status", code = 200, message = "Ok", timeStart = Date.now(), timeEnd = Date.now() } = options;

		this.response = response ?? null;
		this.content = {
			type: type === "json" ? "application/json" : type === "text" ? "text/plain" : "application/octet-stream",
			...content,
		};
		this.type = type;
		this.code = code;
		this.message = message;
		this.status = codeStatus[this.code];

		this.requisitionTime = {
			start: timeStart,
			end: timeEnd,
			duration: parseFloat(((timeEnd - timeStart) / 1000).toFixed(3)),
		};
	}

	/**
	 * Retorna uma resposta JSON com o corpo fornecido
	 * @param data O corpo da resposta
	 * @returns A resposta JSON
	 * @example
	 * RouteResponse.json({ message: "Hello, World!" });
	 */
	static json<T extends Record<string, any> = { [k: string]: any }>(data: T) {
		return new RouteResponse<T>({ response: data, type: "json", content: { type: "application/json" } });
	}

	/**
	 * Retorna uma resposta de texto com o corpo fornecido
	 * @param data O corpo da resposta
	 * @param contentType O tipo de conteúdo da resposta
	 * @returns A resposta de texto
	 * @example
	 * RouteResponse.text("Hello, World!");
	 * RouteResponse.text("Hello, World!", "text/html");
	 */
	static text(data: string, content: string | ContentInfo = "text/plain") {
		const c: ContentInfo =
			typeof content === "string"
				? {
						type: content,
						length: data.length,
				  }
				: content;
		return new RouteResponse<string>({ response: data, type: "text", content: c });
	}

	/**
	 * Retorna uma resposta de HTML com o corpo fornecido
	 * @param data O corpo da resposta
	 * @returns A resposta de HTML
	 * @example
	 * RouteResponse.html("<h1>Hello, World!</h1>");
	 */
	static html(data: string) {
		return RouteResponse.text(data, "text/html");
	}

	/**
	 * Retorna uma resposta de buffer com o corpo fornecido
	 * @param data O corpo da resposta
	 * @param contentType O tipo de conteúdo da resposta
	 * @returns A resposta de buffer
	 * @example
	 * RouteResponse.buffer(Buffer.from("Hello, World!"));
	 * RouteResponse.buffer(Buffer.from("Hello, World!"), "text/plain");
	 */
	static buffer(data: Buffer, content: string | ContentInfo = "application/octet-stream") {
		const c: ContentInfo =
			typeof content === "string"
				? {
						type: content,
						length: data.length,
				  }
				: content;
		return new RouteResponse<Buffer>({ response: data, type: "buffer", content: c });
	}

	/**
	 * Retorna uma resposta de stream com o corpo fornecido
	 * @param stream O corpo da resposta
	 * @param contentType O tipo de conteúdo da resposta
	 * @returns A resposta de stream
	 * @example
	 * RouteResponse.stream(fs.createReadStream("file.txt"));
	 * RouteResponse.stream(fs.createReadStream("file.txt"), "text/plain");
	 * RouteResponse.stream((start, end) => chunk.slice(start, end));
	 */
	static stream(stream: NodeJS.ReadableStream | StreamCallback, content: string | ContentInfo = "application/octet-stream") {
		let start = 0;
		const response =
			stream instanceof Function
				? new Readable({
						read(size) {
							const chunk = stream(start, start + size);
							if (chunk) {
								start += chunk.length;
								this.push(chunk);
							} else {
								this.push(null);
							}
						},
				  })
				: stream;
		const c: ContentInfo =
			typeof content === "string"
				? {
						type: content,
				  }
				: content;
		return new RouteResponse<NodeJS.ReadableStream>({ response, type: "stream", content: c });
	}

	/**
	 * Retorna uma resposta com o corpo fornecido
	 * @param data O corpo da resposta
	 * @param contentType O tipo de conteúdo da resposta
	 * @returns A resposta
	 * @example
	 * RouteResponse.send({ message: "Hello, World!" });
	 * RouteResponse.send("Hello, World!");
	 * RouteResponse.send(Buffer.from("Hello, World!"));
	 */
	static send<T = any>(data: T, content?: string | ContentInfo) {
		if (!content) {
			if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(data))) {
				content = "application/json";
			} else if (typeof data === "string") {
				content = "text/plain";
			} else {
				content = "application/octet-stream";
			}
		}
		const c: ContentInfo =
			typeof content === "string"
				? {
						type: content,
						length: (data as any)?.length,
				  }
				: content;
		return new RouteResponse<T>({ response: data, content: c, type: "send" });
	}

	/**
	 * Retorna uma resposta de erro com o código e a mensagem fornecidos
	 * @param code O código de status do erro
	 * @param message A mensagem do erro
	 * @returns A resposta de erro
	 * @example
	 * RouteResponse.error(404, "Not Found");
	 */
	static error(code: keyof typeof codeStatus, message: string) {
		return new RouteResponse<null>({ type: "status", code, message });
	}

	/**
	 * Retorna uma resposta de status com o código e a mensagem fornecidos
	 * @param code O código de status
	 * @param message A mensagem do status
	 * @returns A resposta de status
	 * @example
	 * RouteResponse.status(200, "OK").send({ message: "Hello, World!" });
	 * RouteResponse.status(404, "Not Found").send("Hello, World!");
	 * RouteResponse.status(200).json({ message: "Hello, World!" });
	 */
	static status(
		code: keyof typeof codeStatus,
		message: string = "OK",
	): {
		send: <T = any>(data: T, content?: string | ContentInfo) => RouteResponse<T>;
		json: <T extends Record<string, any> = { [k: string]: any }>(data: T) => RouteResponse<T>;
		text: (data: string, content?: string | ContentInfo) => RouteResponse<string>;
		html: (data: string) => RouteResponse<string>;
		buffer: (data: Buffer, content?: string | ContentInfo) => RouteResponse<Buffer>;
	} {
		return {
			send: (data, content) => {
				const response = RouteResponse.send(data, content);
				return new RouteResponse({ ...response, code, message });
			},
			json: (data) => {
				const response = RouteResponse.json(data);
				return new RouteResponse({ ...response, code, message });
			},
			text: (data, content) => {
				const response = RouteResponse.text(data, content);
				return new RouteResponse({ ...response, code, message });
			},
			html: (data) => {
				const response = RouteResponse.html(data);
				return new RouteResponse({ ...response, code, message });
			},
			buffer: (data, content) => {
				const response = RouteResponse.buffer(data, content);
				return new RouteResponse({ ...response, code, message });
			},
		};
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
