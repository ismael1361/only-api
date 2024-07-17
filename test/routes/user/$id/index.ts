import { RouteResponse, RouteRequest } from "../../../../src";

import * as root from "../";

export const get = (req: RouteRequest<{}>) => {
	console.log("Ok 3");
	root.get();
	return RouteResponse.json({ message: "Hello World!" });
};
