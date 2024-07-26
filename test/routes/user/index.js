import { RouteResponse, getUrlOrigin } from "only-api";

export const get = (req) => {
	console.log("path:", getUrlOrigin());
	return RouteResponse.json({ message: "Hello World!", id: Math.round(Math.random() * 10000) });
};
