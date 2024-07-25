"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.logTrace = void 0;
const path_1 = __importDefault(require("path"));
const colorette = __importStar(require("colorette"));
const logTrace = (type, message, fileName, ln, col) => {
    const typeFormat = type === "error" ? colorette.red("error") : type === "warn" ? colorette.yellow(type) : colorette.blue(type);
    console.error(`\n${colorette.cyan(path_1.default.relative(process.cwd(), fileName))}${typeof ln === "number" && typeof col === "number" ? `:${colorette.yellow(ln)}:${colorette.yellow(col)}` : ""} - ${typeFormat}: ${message}\n`);
};
exports.logTrace = logTrace;
const logError = (error) => {
    var _a, _b;
    const message = error.message;
    const stack = (_a = error.stack) !== null && _a !== void 0 ? _a : "";
    const lines = stack.split("\n").slice(1);
    const [_, t, file, ln, col] = (_b = lines[0].match(/at (.+) \((.+):(\d+):(\d+)\)/i)) !== null && _b !== void 0 ? _b : [];
    (0, exports.logTrace)("error", message, file, ln ? Number(ln) : undefined, col ? Number(col) : undefined);
};
exports.logError = logError;
//# sourceMappingURL=log.js.map