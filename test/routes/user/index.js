import { RouteResponse } from "../../../src";

export const get = () => {
	console.log("Ok 1");
	return RouteResponse.json({ message: "Hello World!" });
};
