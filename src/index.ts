import path from "path";
import { fileURLToPath } from "url";
// @ts-ignore
import { tsImport } from "tsx/esm/api";
import { text } from "stream/consumers";
import SimpleEventEmitter from "./utils/SimpleEventEmitter";
import chokidar from "chokidar";
import isGlob from "is-glob";
import fs from "fs";
import ts from "typescript";
import * as vm from "vm";

const validateTypeScript = async (filePath: string): Promise<void> => {
    // Ler o conteúdo do arquivo TypeScript
    const fileContent = fs.readFileSync(filePath, "utf-8");

    // Carregar as configurações do tsconfig.json (se existir)
    const configFile = ts.readConfigFile(filePath.replace(/\\/gi, "/"), ts.sys.readFile);
    const compilerOptions = ts.parseJsonConfigFileContent(configFile.config, ts.sys, "./", undefined, filePath).options;

    // Criar o compilador TypeScript
    const program = ts.createProgram([filePath], {
        ...compilerOptions,
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        resolveJsonModule: true,
        strict: true,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        forceConsistentCasingInFileNames: true,
    });

    // Verificar se há erros no código TypeScript
    const diagnostics = ts.getPreEmitDiagnostics(program);

    if (diagnostics.length > 0) {
        // Exibir erros de validação
        console.error("Erros de validação TypeScript:");
        diagnostics.forEach((diagnostic) => {
            if (diagnostic.file && diagnostic.start !== undefined) {
                const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                console.error(`  Linha ${line + 1}, coluna ${character + 1}: ${message}`);
            } else {
                console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
            }
        });
        return Promise.reject();
    }

    return Promise.resolve();
};

const compileTypeScript = async (filePath: string): Promise<string> => {
    await validateTypeScript(filePath);

    // Ler o conteúdo do arquivo TypeScript
    const fileContent = fs.readFileSync(filePath, "utf-8");

    // Opções de compilação do TypeScript
    const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ESNext, // ou outro alvo adequado
        module: ts.ModuleKind.CommonJS, // ou outro formato de módulo necessário
    };

    // Compilar o código TypeScript
    const result = ts.transpileModule(fileContent, {
        compilerOptions,
        reportDiagnostics: true,
        fileName: filePath,
    });

    console.log(result);

    // Retorna o código JavaScript transpilado
    return result.outputText;
};

class FlexRoute extends SimpleEventEmitter {
    private _ready: boolean = false;
    private mainPath: string = __dirname;
    private pathSearchRoutes: string = "";
    private _routes: Record<string, any> = {};

    constructor(readonly routePath: string) {
        super();

        const stack = (new Error().stack ?? "").split("\n");

        const frames = stack.map((frame) => {
            frame = frame.trim();
            const match = frame.match(/^at (.+) \((.+)(:(\d+):(\d+))\)$/i);
            return match ? [match[1], match[2]] : frame;
        });

        for (let i = 1; i < frames.length; i++) {
            const currentFrame = frames[i];
            if (path.dirname(currentFrame[1]) !== __dirname) {
                this.mainPath = path.resolve(path.dirname(currentFrame[1]), routePath);
                break;
            }
        }

        this.pathSearchRoutes = path.join(this.mainPath, "./**/index.{js,ts}").replace(/\\/g, "/");

        this.on("ready", () => {
            this._ready = true;
        });

        this.initialize();
    }

    async ready(callback?: () => void) {
        if (this._ready) {
            callback?.();
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            this.once("ready", () => {
                callback?.();
                resolve();
            });
        });
    }

    initialize() {
        chokidar
            .watch(this.pathSearchRoutes)
            .on("add", (file) => {
                this.addRoute(file);
            })
            .on("change", (file) => {
                this.changeRoute(file);
                console.log(`O arquivo ${file} foi modificado!`);
            })
            .on("unlink", (file) => {
                this.removeRoute(file);
                console.log(`O arquivo ${file} foi removido!`);
            });

        this.emit("ready");
    }

    private async addRoute(routePath: string) {
        const p = routePath.replace(/\\/g, "/").replace(this.mainPath.replace(/\\/g, "/"), "").replace("/index.ts", "").replace("/index.js", "");

        const compiledCode = await compileTypeScript(routePath);
        const exports = {};

        const script = new vm.Script(compiledCode, { filename: routePath });
        const context = vm.createContext({
            exports,
            require: (p: string) => {
                return require(path.resolve(path.dirname(routePath), p));
            },
            console,
        });
        script.runInContext(context);

        this._routes[p] = exports;

        console.log(this._routes);
        console.log((exports as any).get());
    }

    private changeRoute(routePath: string) {
        return this.addRoute(routePath);
    }

    private removeRoute(routePath: string) {
        const path = routePath.replace(/\\/g, "/").replace(this.mainPath.replace(/\\/g, "/"), "").replace("/index.ts", "").replace("/index.js", "");
        delete this._routes[path];
    }
}

function flexRoute(routePath: string) {
    return new FlexRoute(routePath);
}

export interface RouteRequest<B = any, P extends string = string, Q extends string = string> {
    body: B;
    params: {
        [key in P]: string;
    };
    query: {
        [key in Q]: string;
    };
}

export const RouteResponse = {
    json: (data: any) => {
        return data;
    },
    text: (data: any) => {
        return data;
    },
    send: (data: any) => {
        return data;
    },
    status: (code: number) => {
        return {
            json: (data: any) => {
                return data;
            },
            send: (data: any) => {
                return data;
            },
        };
    },
};

export default flexRoute;
