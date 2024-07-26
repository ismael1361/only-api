import path from "path";
import fs from "fs";
import ts from "typescript";
import * as colorette from "colorette";
import { PathInfo } from "./utils/index.js";
import * as vm from "vm";
import JSON5 from "json5";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import resolve from "resolve";
const getTSCompilerOptions = (filePath) => {
    let options = {};
    let tsconfigFile = filePath;
    while (fs.existsSync(path.resolve(tsconfigFile, "tsconfig.json")) !== true && path.dirname(tsconfigFile) !== path.dirname(process.cwd())) {
        tsconfigFile = path.dirname(tsconfigFile);
    }
    try {
        if (fs.existsSync(path.resolve(tsconfigFile, "tsconfig.json"))) {
            const tsconfig = JSON5.parse(fs.readFileSync(path.resolve(tsconfigFile, "tsconfig.json"), "utf-8"));
            options = tsconfig.compilerOptions ?? {};
        }
    }
    catch (err) { }
    const rootDir = path.join(tsconfigFile, options.rootDir ?? "");
    const compilerOptions = {
        listEmittedFiles: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        forceConsistentCasingInFileNames: true,
        allowJs: true,
        checkJs: false,
        allowSyntheticDefaultImports: true,
        noFallthroughCasesInSwitch: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        strict: true,
        noImplicitAny: false,
        skipLibCheck: true,
        pretty: true,
        noEmitOnError: true,
        removeComments: false,
        ...options,
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        lib: [...(options.lib ?? []), "esnext", "ES2015"].map((lib) => `lib.${lib.toLowerCase()}.d.ts`),
        rootDir: typeof options.rootDir === "string" ? rootDir : undefined,
        outDir: typeof options.outDir === "string" ? path.join(tsconfigFile, options.outDir) : undefined,
        declarationDir: typeof options.declarationDir === "string" ? path.join(tsconfigFile, options.declarationDir) : undefined,
        noEmit: false,
    };
    compilerOptions.baseUrl = compilerOptions.baseUrl ?? compilerOptions.rootDir ?? tsconfigFile;
    return compilerOptions;
};
const validateTypeScript = (filePath) => {
    // Ler o conteúdo do arquivo TypeScript
    const fileContent = fs.readFileSync(filePath, "utf-8");
    // Carregar as configurações do tsconfig.json (se existir)
    const compilerOptions = getTSCompilerOptions(filePath);
    // Criar o compilador TypeScript
    const program = ts.createProgram([filePath], { ...compilerOptions, outDir: path.resolve(process.cwd(), "dist") });
    // Verificar se há erros no código TypeScript
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length > 0) {
        // Exibir erros de validação
        diagnostics.forEach((diagnostic) => {
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            const fileName = diagnostic.file?.fileName ?? filePath;
            if (diagnostic.file && diagnostic.start !== undefined) {
                const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                const errorLine = fileContent.split("\n")[line].replace(/\t/g, " ");
                const errorLength = diagnostic.length || message.length; // Usa o comprimento do erro ou da mensagem
                console.error(`\n${colorette.cyan(path.relative(process.cwd(), fileName))}:${colorette.yellow(line + 1)}:${colorette.yellow(character + 1)} - ${colorette.red("error")} ${colorette.blue(`TS${diagnostic.code}`)}: ${message}\n\n${colorette.bgWhite(colorette.black(line + 1))} ${errorLine}\n${colorette.bgWhite(" ")} ${" ".repeat(character)}${colorette.red("~".repeat(errorLength))}\n`);
            }
            else {
                console.error(`\n${colorette.cyan(path.relative(process.cwd(), fileName))} - ${colorette.red("error")} ${colorette.blue(`TS${diagnostic.code}`)}: ${message}\n`);
            }
        });
        return "";
    }
    return fileContent;
};
const resolveModule = (specifier, baseUrl, paths) => {
    if (baseUrl && paths) {
        const absoluteBaseUrl = path.resolve(baseUrl);
        for (const [key, values] of Object.entries(paths)) {
            const pattern = new RegExp(`^${key.replace(/\*/g, "(.*)")}$`);
            const match = specifier.match(pattern);
            if (match) {
                for (const value of values) {
                    const resolvedPath = path.join(absoluteBaseUrl, value.replace(/\*/g, match[1]));
                    if (fs.existsSync(resolvedPath)) {
                        return resolvedPath;
                    }
                }
            }
        }
    }
    // Caso não tenha tsconfig paths ou não resolva, retorna o especificador original
    return specifier;
};
const compileTypeScript = (filePath) => {
    try {
        const fileContent = validateTypeScript(filePath);
        // Opções de compilação do TypeScript
        const compilerOptions = getTSCompilerOptions(filePath);
        // Compilar o código TypeScript
        const { outputText, sourceMapText } = ts.transpileModule(fileContent, {
            compilerOptions: { ...compilerOptions, sourceMap: true },
            fileName: filePath,
            transformers: {
                before: [
                    (context) => {
                        return (sourceFile) => {
                            function visitor(node) {
                                if (ts.isImportDeclaration(node)) {
                                    const moduleSpecifier = node.moduleSpecifier.text;
                                    const resolvedModule = resolveModule(moduleSpecifier, compilerOptions.baseUrl, compilerOptions.paths);
                                    return ts.factory.updateImportDeclaration(node, node.modifiers, node.importClause, ts.factory.createStringLiteral(resolvedModule), node.assertClause);
                                }
                                return ts.visitEachChild(node, visitor, context);
                            }
                            return ts.visitNode(sourceFile, visitor);
                        };
                    },
                ],
            },
        });
        // Retorna o código JavaScript transpilado
        return `${outputText.replace(/\n\/\/\# sourceMappingURL\=(.+)$/gi, "")}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(sourceMapText ?? "").toString("base64")}`;
    }
    catch { }
    return "";
};
const cacheModules = new Map();
const observeModules = new Map();
const getRequire = (p) => {
    console.log(p);
    try {
        // Tenta carregar usando require
        return require(p);
    }
    catch (e1) {
        try {
            // Converte para caminho absoluto
            const absolutePath = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
            // Cria um require a partir da URL do módulo atual
            const moduleURL = pathToFileURL(absolutePath).href;
            const customRequire = createRequire(moduleURL);
            return customRequire(absolutePath);
        }
        catch (e2) {
            return {};
        }
    }
};
const createCustomRequire = (filePath, onMutate) => {
    const baseDir = path.dirname(filePath);
    return (modulePath) => {
        modulePath = resolve.sync(modulePath, { basedir: baseDir });
        try {
            let absolutePath = fs.existsSync(modulePath)
                ? modulePath
                : fs.existsSync(path.join(baseDir, modulePath))
                    ? path.join(baseDir, modulePath)
                    : require.resolve(path.join(baseDir, modulePath));
            const isOnlyApiModule = PathInfo.get(`${process.platform === 'win32' ? '' : '/'}${/file:\/{2,3}(.+)\/[^/]/.exec(import.meta.url)[1]}`).equals(absolutePath) || PathInfo.get(`${process.platform === 'win32' ? '' : '/'}${/file:\/{2,3}(.+)\/[^/]/.exec(import.meta.url)[1]}`).isParentOf(absolutePath) || PathInfo.get(`${process.platform === 'win32' ? '' : '/'}${/file:\/{2,3}(.+)\/[^/]/.exec(import.meta.url)[1]}`).isAncestorOf(absolutePath);
            if (isOnlyApiModule || !fs.existsSync(absolutePath) || absolutePath.includes("node_modules")) {
                throw new Error("Invalid module path");
            }
            if (fs.statSync(absolutePath).isDirectory()) {
                const posibleFiles = fs.readdirSync(absolutePath).find((file) => {
                    return (file.endsWith("index.js") || file.endsWith("index.ts") || file.endsWith("index.cjs") || file.endsWith("index.mjs") || file.endsWith("index.jsx") || file.endsWith("index.tsx"));
                });
                if (posibleFiles) {
                    absolutePath = path.resolve(absolutePath, posibleFiles);
                }
            }
            const updateImport = () => {
                importModule(absolutePath, true, updateImport);
                const callbacks = Object.values(observeModules.get(absolutePath)?.modules ?? {});
                for (const callback of callbacks) {
                    callback();
                }
            };
            const module = importModule(absolutePath, false, updateImport);
            const observer = observeModules.get(absolutePath) ?? {
                event: undefined,
                modules: {},
            };
            if (observer.event) {
                fs.unwatchFile(absolutePath, observer.event);
            }
            observer.event = (curr, prev) => {
                if (curr.mtime !== prev.mtime) {
                    updateImport();
                }
            };
            if (typeof onMutate === "function") {
                observer.modules[filePath] = onMutate;
            }
            observeModules.set(absolutePath, observer);
            fs.watchFile(absolutePath, observer.event);
            return module;
        }
        catch (err) {
            return getRequire(modulePath);
        }
    };
};
const getGlobalContext = (filePath, exports, onMutateImports) => {
    const globalContext = Object.create(global);
    globalContext["`${process.platform === 'win32' ? '' : '/'}${/file:\/{2,3}(.+)/.exec(import.meta.url)[1]}`"] = filePath;
    globalContext["`${process.platform === 'win32' ? '' : '/'}${/file:\/{2,3}(.+)\/[^/]/.exec(import.meta.url)[1]}`"] = path.dirname(filePath);
    globalContext.console = console;
    globalContext.setTimeout = setTimeout;
    globalContext.clearTimeout = clearTimeout;
    globalContext.setInterval = setInterval;
    globalContext.clearInterval = clearInterval;
    globalContext.process = process;
    globalContext.require = createCustomRequire(filePath, onMutateImports);
    globalContext.exports = exports;
    return globalContext;
};
export const importModule = (filePath, ignoreCache = false, onMutateImports) => {
    if (fs.existsSync(filePath)) {
        if (fs.statSync(filePath).isDirectory()) {
            const posibleFiles = fs.readdirSync(filePath).find((file) => {
                return file.endsWith("index.js") || file.endsWith("index.ts") || file.endsWith("index.cjs") || file.endsWith("index.mjs") || file.endsWith("index.jsx") || file.endsWith("index.tsx");
            });
            if (posibleFiles) {
                filePath = path.resolve(filePath, posibleFiles);
            }
            else {
                return {};
            }
        }
    }
    else {
        return getRequire(filePath);
    }
    if (cacheModules.has(filePath) && !ignoreCache) {
        return cacheModules.get(filePath);
    }
    const compiledCode = compileTypeScript(filePath);
    const exports = {};
    // console.log("compiledCode", compiledCode);
    const script = new vm.Script(compiledCode, { filename: filePath });
    const context = vm.createContext(getGlobalContext(filePath, exports, onMutateImports));
    script.runInContext(context);
    cacheModules.set(filePath, exports);
    return exports;
};
//# sourceMappingURL=tsUtils.js.map