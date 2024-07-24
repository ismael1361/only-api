import createContext from "fn-context";
import { FetchOptions } from "./type";

export const RouteRequestContext = createContext<FetchOptions>({
	method: "GET",
	headers: {},
	body: {},
	params: {},
	query: {},
	__config: {} as any,
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

export const RouteCacheContext = createContext<{ fn?: (value: any) => void }>(
	{},
	{
		individual: true,
	},
);
