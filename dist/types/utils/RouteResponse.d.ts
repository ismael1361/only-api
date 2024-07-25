interface RouteResponseOptions<T = any> {
    response: T | null;
    type: "json" | "text" | "send" | "status" | "buffer" | "stream";
    code: keyof typeof codeStatus;
    message: string;
    timeStart: number;
    timeEnd: number;
    contentType: string;
}
type StreamCallback = (start: number, end: number) => string | Buffer | null;
export default class RouteResponse<T = any> {
    readonly response: RouteResponseOptions<T>["response"];
    readonly contentType: RouteResponseOptions<T>["contentType"];
    readonly type: RouteResponseOptions<T>["type"];
    readonly code: RouteResponseOptions<T>["code"];
    readonly status: CodeStatus;
    readonly message: RouteResponseOptions<T>["message"];
    readonly requisitionTime: {
        start: number;
        end: number;
        duration: number;
    };
    constructor(options?: Partial<RouteResponseOptions<T>>);
    /**
     * Retorna uma resposta JSON com o corpo fornecido
     * @param data O corpo da resposta
     * @returns A resposta JSON
     * @example
     * RouteResponse.json({ message: "Hello, World!" });
     */
    static json<T extends Record<string, any> = {
        [k: string]: any;
    }>(data: T): RouteResponse<T>;
    /**
     * Retorna uma resposta de texto com o corpo fornecido
     * @param data O corpo da resposta
     * @param contentType O tipo de conteúdo da resposta
     * @returns A resposta de texto
     * @example
     * RouteResponse.text("Hello, World!");
     * RouteResponse.text("Hello, World!", "text/html");
     */
    static text(data: string, contentType?: string): RouteResponse<string>;
    /**
     * Retorna uma resposta de HTML com o corpo fornecido
     * @param data O corpo da resposta
     * @returns A resposta de HTML
     * @example
     * RouteResponse.html("<h1>Hello, World!</h1>");
     */
    static html(data: string): RouteResponse<string>;
    /**
     * Retorna uma resposta de buffer com o corpo fornecido
     * @param data O corpo da resposta
     * @param contentType O tipo de conteúdo da resposta
     * @returns A resposta de buffer
     * @example
     * RouteResponse.buffer(Buffer.from("Hello, World!"));
     * RouteResponse.buffer(Buffer.from("Hello, World!"), "text/plain");
     */
    static buffer(data: Buffer, contentType?: string): RouteResponse<Buffer>;
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
    static stream(stream: NodeJS.ReadableStream | StreamCallback, contentType?: string): RouteResponse<NodeJS.ReadableStream | StreamCallback>;
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
    static send<T = any>(data: T, contentType?: string): RouteResponse<T>;
    /**
     * Retorna uma resposta de erro com o código e a mensagem fornecidos
     * @param code O código de status do erro
     * @param message A mensagem do erro
     * @returns A resposta de erro
     * @example
     * RouteResponse.error(404, "Not Found");
     */
    static error(code: keyof typeof codeStatus, message: string): RouteResponse<null>;
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
    static status(code: keyof typeof codeStatus, message?: string): {
        send: <T = any>(data: T, contentType?: string) => RouteResponse<T>;
        json: <T extends Record<string, any> = {
            [k: string]: any;
        }>(data: T) => RouteResponse<T>;
        text: (data: string, contentType?: string) => RouteResponse<string>;
        html: (data: string) => RouteResponse<string>;
        buffer: (data: Buffer, contentType?: string) => RouteResponse<Buffer>;
    };
}
declare const codeStatus: {
    readonly 200: "OK";
    readonly 201: "Created";
    readonly 202: "Accepted";
    readonly 204: "No Content";
    readonly 206: "Partial Content";
    readonly 300: "Multiple Choices";
    readonly 301: "Moved Permanently";
    readonly 302: "Found";
    readonly 303: "See Other";
    readonly 304: "Not Modified";
    readonly 307: "Temporary Redirect";
    readonly 308: "Permanent Redirect";
    readonly 400: "Bad Request";
    readonly 401: "Unauthorized";
    readonly 402: "Payment Required";
    readonly 403: "Forbidden";
    readonly 404: "Not Found";
    readonly 405: "Method Not Allowed";
    readonly 406: "Not Acceptable";
    readonly 408: "Request Timeout";
    readonly 409: "Conflict";
    readonly 410: "Gone";
    readonly 411: "Length Required";
    readonly 413: "Payload Too Large";
    readonly 414: "URI Too Long";
    readonly 415: "Unsupported Media Type";
    readonly 416: "Range Not Satisfiable";
    readonly 417: "Expectation Failed";
    readonly 418: "I'm a teapot";
    readonly 422: "Unprocessable Entity";
    readonly 429: "Too Many Requests";
    readonly 500: "Internal Server Error";
    readonly 501: "Not Implemented";
    readonly 502: "Bad Gateway";
    readonly 503: "Service Unavailable";
    readonly 504: "Gateway Timeout";
    readonly 505: "HTTP Version Not Supported";
};
type CodeStatus = (typeof codeStatus)[keyof typeof codeStatus];
export {};
//# sourceMappingURL=RouteResponse.d.ts.map