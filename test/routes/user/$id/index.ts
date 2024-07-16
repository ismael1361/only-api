import { RouteResponse, RouteRequest } from "../../../../src";

export const get = (req: RouteRequest<{}, true>) => {
	console.log("Ok 2");
	if (1 === "ewrr") {
		return null;
	}
	return RouteResponse.json({ message: "Hello World!" }, true);
};
