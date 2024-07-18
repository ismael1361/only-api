import { RouteResponse, RouteRequest, fetchRoute } from "../../../../src";

export const get = async (req: RouteRequest<{}>) => {
	return await fetchRoute("/user");
};
