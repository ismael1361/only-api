import { RouteResponse, getUrlOrigin, corsOringin, RouteRequest } from "only-api";

export const get = async (reg: RouteRequest) => {
	corsOringin("*");
	console.log(reg.params);
	return RouteResponse.json({
		path: getUrlOrigin(),
		params: reg.params,
		message: "Hello World!",
		id: Math.round(Math.random() * 10000),
	});
};
