import { RouteResponse } from "../../../src";

export const get = () => {
	return RouteResponse.json({ message: "Hello World!" });
};
