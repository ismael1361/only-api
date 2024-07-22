import { RouteResponse, RouteRequest, fetchRoute } from "src";
import { Users } from "controlers";

export const get = async (req: RouteRequest<{}>) => {
	const res = await fetchRoute<{ message: string }>("../");
	Users.show(req.params.id);
	return res;
};
