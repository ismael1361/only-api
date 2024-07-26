import createContext from "fn-context";
import { FetchOptions } from "./type";
import { RouteResponse } from "./utils";
import { Request, Response } from "express";

export const RouteRequestContext = createContext<FetchOptions>({
	method: "GET",
	headers: {},
	body: {},
	params: {},
	query: {},
	files: [],
});

export const RoutePathContext = createContext<{
	original: string;
	parsed: string;
}>(
	{
		original: "",
		parsed: "",
	},
	{
		individual: true,
	},
);

export const RouteConfigContext = createContext<{
	req?: Request;
	res?: Response;
	cacheRoute?: (value: RouteResponse) => void;
}>(
	{},
	{
		individual: true,
	},
);
