import path from "path";
import * as colorette from "colorette";
export const logTrace = (type, message, fileName, ln, col) => {
    const typeFormat = type === "error" ? colorette.red("error") : type === "warn" ? colorette.yellow(type) : colorette.blue(type);
    console.error(`\n${colorette.cyan(path.relative(process.cwd(), fileName))}${typeof ln === "number" && typeof col === "number" ? `:${colorette.yellow(ln)}:${colorette.yellow(col)}` : ""} - ${typeFormat}: ${message}\n`);
};
export const logError = (error) => {
    const message = error.message;
    const stack = error.stack ?? "";
    const lines = stack.split("\n").slice(1);
    const [_, t, file, ln, col] = lines[0].match(/at (.+) \((.+):(\d+):(\d+)\)/i) ?? [];
    logTrace("error", message, file, ln ? Number(ln) : undefined, col ? Number(col) : undefined);
};
//# sourceMappingURL=log.js.map