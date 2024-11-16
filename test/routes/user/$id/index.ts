import { RouteResponse, RouteRequest, fetchRoute, getUrlOrigin, cacheControl, requiresAccess, corsOringin } from "only-api";
import { Users } from "controlers";

console.log(Users);

export const get = async (req: RouteRequest<{}, "id", "date" | "q">) => {
	await corsOringin("*");

	await requiresAccess({ root: "admin" });

	cacheControl(15, "user");

	console.log("path:", getUrlOrigin());
	const res = await fetchRoute<{ message: string }>("../");
	Users.show(req.params.id);

	return res;
};

export const post = (
	req: RouteRequest<{
		name: string;
	}>,
) => {
	return RouteResponse.json(req.body);
};
