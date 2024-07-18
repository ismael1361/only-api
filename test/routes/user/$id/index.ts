import { RouteResponse, RouteRequest, fetchRoute } from "src";

export const get = async (req: RouteRequest<{}>) => {
	const res = await fetchRoute<{ message: string }>("../");
	return res;
};
