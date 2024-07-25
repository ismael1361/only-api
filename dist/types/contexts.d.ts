import createContext from "fn-context";
import { FetchOptions } from "./type";
import { RouteResponse } from "./utils";
import { Request, Response } from "express";
export declare const RouteRequestContext: createContext<FetchOptions, {
    [key: string]: any;
}>;
export declare const RoutePathContext: createContext<{
    original: string;
    parsed: string;
}, {
    [key: string]: any;
}>;
export declare const RouteConfigContext: createContext<{
    req?: Request;
    res?: Response;
    cacheRoute?: (value: RouteResponse) => void;
}, {
    [key: string]: any;
}>;
//# sourceMappingURL=contexts.d.ts.map