import path from "path";
import * as colorette from "colorette";

export const logTrace = (type: "error" | "warn" | "verb" | "info" | "log", message: string, fileName: string, ln?: number, col?: number) => {
	const typeFormat = type === "error" ? colorette.red("error") : type === "warn" ? colorette.yellow(type) : colorette.blue(type);

	console.error(
		`\n${colorette.cyan(path.relative(process.cwd(), fileName))}${
			typeof ln === "number" && typeof col === "number" ? `:${colorette.yellow(ln)}:${colorette.yellow(col)}` : ""
		} - ${typeFormat}: ${message}\n`,
	);
};

export const logError = (error: Error) => {
	const message: string = error.message;
	const stack: string = error.stack ?? "";
	const lines = stack.split("\n").slice(1);
	const [_, t, file, ln, col] = lines[0].match(/at (.+) \((.+):(\d+):(\d+)\)/i) ?? [];
	logTrace("error", message, file, ln ? Number(ln) : undefined, col ? Number(col) : undefined);
};
