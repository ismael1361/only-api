export type HeadersProps =
	| "content-type"
	| "authorization"
	| "user-agent"
	| "accept"
	| "accept-encoding"
	| "accept-language"
	| "cache-control"
	| "connection"
	| "content-length"
	| "content-security-policy"
	| "content-security-policy-report-only"
	| "content-type"
	| "cookie"
	| "dnt"
	| "date"
	| "etag"
	| "expect"
	| "expires"
	| "host"
	| "if-modified-since"
	| "if-none-match"
	| "keep-alive"
	| "last-modified"
	| "origin"
	| "pragma"
	| "referer"
	| "server"
	| "set-cookie"
	| "transfer-encoding"
	| "upgrade-insecure-requests"
	| "user-agent"
	| "vary"
	| "via"
	| "www-authenticate"
	| "warning"
	| "x-content-type-options"
	| "x-dns-prefetch-control"
	| "x-frame-options"
	| "x-xss-protection";

export type Headers = Partial<Record<HeadersProps, string>> & { [key: string]: string };

export interface FetchOptions {
	method: "GET" | "POST" | "PUT" | "DELETE" | "get" | "post" | "put" | "delete";
	headers: Headers;
	body: Blob | Buffer | string | URLSearchParams | Record<string, any>;
	params: Record<string, string>;
	query: Record<string, string>;
}

export interface RouteRequest<B = any, P extends string = string, Q extends string = string> {
	method: "GET" | "POST" | "PUT" | "DELETE";
	headers: Headers;
	body: B;
	params: {
		[key in P]: string;
	};
	query: {
		[key in Q]: string;
	};
}

export type RouteFunction = (req: RouteRequest, next: () => void) => any | Promise<any>;

export interface Route {
	all?: RouteFunction | RouteFunction[];
	get?: RouteFunction | RouteFunction[];
	post?: RouteFunction | RouteFunction[];
	put?: RouteFunction | RouteFunction[];
	delete?: RouteFunction | RouteFunction[];
	middleware?: RouteFunction | RouteFunction[];
}

export interface ParsedUrl {
	pathname: string;
	search: string;
	searchParams: Record<string, string>;
	hash: string;
}
