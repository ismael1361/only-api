import { RouteResponse } from "../../../src";

export const get = (req) => {
	console.log("home", req);
	return RouteResponse.json({ message: "Hello World!" });
};
