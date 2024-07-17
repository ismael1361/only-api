import { RouteResponse, RouteRequest, fetchRoute } from "../../../../src";
import * as root from "../";
import * as colorette from "colorette";

export const get = async (req: RouteRequest<{}>) => {
	return await fetchRoute("/user");
};
