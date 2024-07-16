import { RouteResponse, RouteRequest } from "../../../../src";

export const get = (req: RouteRequest<{}>) => {
	console.log("Ok");
	return RouteResponse.json({ message: "Hello World!" });
};
