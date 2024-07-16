import { RouteResponse, RouteRequest } from "../../../../src";

import * as root from "./";

export const get = (req: RouteRequest<{}>) => {
	console.log("Ok");
	root.get(req);
	return RouteResponse.json({ message: "Hello World!" });
};
