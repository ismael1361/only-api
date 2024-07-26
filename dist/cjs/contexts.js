"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteConfigContext = exports.RoutePathContext = exports.RouteRequestContext = void 0;
const fn_context_1 = __importDefault(require("fn-context"));
exports.RouteRequestContext = (0, fn_context_1.default)({
    method: "GET",
    headers: {},
    body: {},
    params: {},
    query: {},
    files: [],
});
exports.RoutePathContext = (0, fn_context_1.default)({
    original: "",
    parsed: "",
}, {
    individual: true,
});
exports.RouteConfigContext = (0, fn_context_1.default)({}, {
    individual: true,
});
//# sourceMappingURL=contexts.js.map