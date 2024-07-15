import { RouteResponse, RouteRequest } from "../../../../src";

export const get = (req: RouteRequest<{}, "id">) => {
    console.log("Ok 2");
    return RouteResponse.json({ message: "Hello World!" });
};
