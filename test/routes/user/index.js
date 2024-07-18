import { RouteResponse } from "../../../src";

export const get = (req) => {
	const { query } = req;

	throw new Error("This is an error message");
	return RouteResponse.json({ message: "Hello World!" });
};
