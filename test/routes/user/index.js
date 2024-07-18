import { RouteResponse } from "src";

export const get = (req) => {
	return RouteResponse.json({ message: "Hello World!" });
};
