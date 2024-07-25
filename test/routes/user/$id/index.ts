import { RouteResponse, RouteRequest, fetchRoute, getUrlOrigin, cacheControl, requiresAccess, corsOringin } from "src";
import { Users } from "controlers";

export const get = async (req: RouteRequest<{}>) => {
	corsOringin("*");

	requiresAccess({ root: "admin" });

	cacheControl(15, "user");

	console.log("path:", getUrlOrigin());
	const res = await fetchRoute<{ message: string }>("../");
	Users.show(req.params.id);

	return res;
};
