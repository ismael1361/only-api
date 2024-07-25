import type { SimpleCache } from "./utils";
import type { Request } from "express";
export interface OnlyApiOptions {
    host: string;
    port: number;
    maxPayloadSize: string;
    allowOrigin: StaticOrigin;
    cors?: CorsOptions;
    trustProxy: boolean;
    middlewares: Array<(req: Request, res: Response, next: () => void) => void>;
}
export type StaticOrigin = boolean | string | RegExp | Array<boolean | string | RegExp>;
export type CustomOrigin = (requestOrigin: string | undefined, callback: (err: Error | null, origin?: StaticOrigin) => void) => void;
export interface CorsOptions {
    /**
     * @default '*''
     */
    origin?: StaticOrigin | CustomOrigin | undefined;
    /**
     * @default 'GET,HEAD,PUT,PATCH,POST,DELETE'
     */
    methods?: string | string[] | undefined;
    allowedHeaders?: string | string[] | undefined;
    exposedHeaders?: string | string[] | undefined;
    credentials?: boolean | undefined;
    maxAge?: number | undefined;
    /**
     * @default false
     */
    preflightContinue?: boolean | undefined;
    /**
     * @default 204
     */
    optionsSuccessStatus?: number | undefined;
    headers?: string | string[] | undefined;
}
export type CorsOptionsDelegate = (req: Request, callback: (err: Error | null, options?: CorsOptions) => void) => void;
export type CorsHeaders = {
    key: string;
    value: any;
} | Array<CorsHeaders> | null;
export type HeadersProps = "content-type" | "authorization" | "user-agent" | "accept" | "accept-encoding" | "accept-language" | "cache-control" | "connection" | "content-length" | "content-security-policy" | "content-security-policy-report-only" | "content-type" | "cookie" | "dnt" | "date" | "etag" | "expect" | "expires" | "host" | "if-modified-since" | "if-none-match" | "keep-alive" | "last-modified" | "origin" | "pragma" | "referer" | "server" | "set-cookie" | "transfer-encoding" | "upgrade-insecure-requests" | "user-agent" | "vary" | "via" | "www-authenticate" | "warning" | "x-content-type-options" | "x-dns-prefetch-control" | "x-frame-options" | "x-xss-protection" | "x-requested-with" | "x-forwarded-for" | "x-forwarded-host" | "x-forwarded-proto" | "x-real-ip" | "x-forwarded" | "x-forwarded-server" | "x-forwarded-port" | "x-forwarded-by" | "x-hub-signature";
export type Headers = Partial<Record<HeadersProps, string>> & {
    [key: string]: string;
};
export interface FetchOptions {
    method: "GET" | "POST" | "PUT" | "DELETE" | "get" | "post" | "put" | "delete";
    headers: Headers;
    body: Blob | Buffer | string | URLSearchParams | Record<string, any>;
    params: Record<string, string>;
    query: Record<string, string>;
}
export type RequiresAccess = (users: Record<string, string>) => Promise<boolean>;
export interface RouteRequest<B = any, P extends string = string, Q extends string = string, C extends Record<string, any> = {
    [key: string]: any;
}> {
    method: "GET" | "POST" | "PUT" | "DELETE";
    headers: Headers;
    body: B;
    params: {
        [key in P]: string;
    };
    query: {
        [key in Q]: string;
    };
    cache: SimpleCache<C>;
}
export type RouteFunction<R = any> = (req: RouteRequest, next: () => void) => R | Promise<R>;
export interface Route<R = any> {
    all?: RouteFunction<R> | RouteFunction<R>[];
    get?: RouteFunction<R> | RouteFunction<R>[];
    post?: RouteFunction<R> | RouteFunction<R>[];
    put?: RouteFunction<R> | RouteFunction<R>[];
    delete?: RouteFunction<R> | RouteFunction<R>[];
    middleware?: RouteFunction<R> | RouteFunction<R>[];
    cacheOptions?: SimpleCacheOptions;
}
export interface ParsedUrl {
    pathname: string;
    search: string;
    searchParams: Record<string, string>;
    hash: string;
}
export interface SimpleCacheOptions {
    /** O número de segundos para manter os itens em cache após sua última atualização */
    expirySeconds: number;
    /** Indica se deve-se clonar profundamente os valores armazenados para protegê-los de ajustes acidentais */
    cloneValues?: boolean;
    /** Quantidade máxima de entradas para manter em cache */
    maxEntries?: number;
    /** Se verdadeiro, atualiza o tempo de expiração ao acessar um valor em cache */
    updateExpiration?: boolean;
}
//# sourceMappingURL=type.d.ts.map