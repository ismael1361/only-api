import { SimpleEventEmitter, RouteResponse } from "./utils";
import { FetchOptions, OnlyApiOptions } from "./type";
import express, { Request, Response } from "express";
export * from "./type";
export * from "./tools";
declare class OnlyApi extends SimpleEventEmitter {
    readonly routePath: string;
    private _ready;
    private mainPath;
    private pathSearchRoutes;
    private _routes;
    private _routesPath;
    private _routesCache;
    private options;
    private app;
    constructor(routePath: string, options?: Partial<OnlyApiOptions> | ReturnType<typeof express>);
    ready(callback?: () => void): Promise<void>;
    initialize(): Promise<void>;
    private addRoute;
    private changeRoute;
    private removeRoute;
    fetchRoute<T = any>(route: string, options?: Partial<FetchOptions>, request?: Request, response?: Response): Promise<RouteResponse<T>>;
}
declare function onlyApi(routePath: string, options?: Partial<OnlyApiOptions> | ReturnType<typeof express>): OnlyApi;
export declare const fetchRoute: <T = any>(route: string, options?: Partial<FetchOptions>) => Promise<RouteResponse<T>>;
export { RouteResponse };
export default onlyApi;
//# sourceMappingURL=index.d.ts.map