import { RouteResponse, getUrlOrigin } from "src";

export const get = (req) => {
	console.log("path:", getUrlOrigin());
	return RouteResponse.json({ message: "Hello World!" });
};
