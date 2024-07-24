import { RouteResponse, RouteRequest, fetchRoute, getUrlOrigin, cacheResponse } from "src";
import { Users } from "controlers";

export const get = async (req: RouteRequest<{}>) => {
	cacheResponse(15);

	console.log("path:", getUrlOrigin());
	const res = await fetchRoute<{ message: string }>("../");
	Users.show(req.params.id);

	return res;
};
