import createContext from "fn-context";
export const RouteRequestContext = createContext({
    method: "GET",
    headers: {},
    body: {},
    params: {},
    query: {},
    files: [],
});
export const RoutePathContext = createContext({
    original: "",
    parsed: "",
}, {
    individual: true,
});
export const RouteConfigContext = createContext({}, {
    individual: true,
});
//# sourceMappingURL=contexts.js.map