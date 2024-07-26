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
exports.importModule = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const typescript_1 = __importDefault(require("typescript"));
const colorette = __importStar(require("colorette"));
const utils_1 = require("./utils");
const vm = __importStar(require("vm"));
const json5_1 = __importDefault(require("json5"));
const getTSCompilerOptions = (filePath) => {
    let options = {};
    let tsconfigFile = filePath;
    while (fs_1.default.existsSync(path_1.default.resolve(tsconfigFile, "tsconfig.json")) !== true && path_1.default.dirname(tsconfigFile) !== path_1.default.dirname(process.cwd())) {
        tsconfigFile = path_1.default.dirname(tsconfigFile);
    }
    try {
        if (fs_1.default.existsSync(path_1.default.resolve(tsconfigFile, "tsconfig.json"))) {
            const tsconfig = json5_1.default.parse(fs_1.default.readFileSync(path_1.default.resolve(tsconfigFile, "tsconfig.json"), "utf-8"));
            options = tsconfig.compilerOptions ?? {};
        }
    }
    catch (err) { }
    const rootDir = path_1.default.join(tsconfigFile, options.rootDir ?? "");
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
        target: typescript_1.default.ScriptTarget.ESNext,
        module: typescript_1.default.ModuleKind.CommonJS,
        moduleResolution: typescript_1.default.ModuleResolutionKind.NodeJs,
        lib: [...(options.lib ?? []), "esnext", "ES2015"].map((lib) => `lib.${lib.toLowerCase()}.d.ts`),
        rootDir: typeof options.rootDir === "string" ? rootDir : undefined,
        outDir: typeof options.outDir === "string" ? path_1.default.join(tsconfigFile, options.outDir) : undefined,
        declarationDir: typeof options.declarationDir === "string" ? path_1.default.join(tsconfigFile, options.declarationDir) : undefined,
        noEmit: false,
    };
    compilerOptions.baseUrl = compilerOptions.baseUrl ?? compilerOptions.rootDir ?? tsconfigFile;
    return compilerOptions;
};
const validateTypeScript = (filePath) => {
    // Ler o conteúdo do arquivo TypeScript
    const fileContent = fs_1.default.readFileSync(filePath, "utf-8");
    // Carregar as configurações do tsconfig.json (se existir)
    const compilerOptions = getTSCompilerOptions(filePath);
    // Criar o compilador TypeScript
    const program = typescript_1.default.createProgram([filePath], { ...compilerOptions, outDir: path_1.default.resolve(process.cwd(), "dist") });
    // Verificar se há erros no código TypeScript
    const diagnostics = typescript_1.default.getPreEmitDiagnostics(program);
    if (diagnostics.length > 0) {
        // Exibir erros de validação
        diagnostics.forEach((diagnostic) => {
            const message = typescript_1.default.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            const fileName = diagnostic.file?.fileName ?? filePath;
            if (diagnostic.file && diagnostic.start !== undefined) {
                const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                const errorLine = fileContent.split("\n")[line].replace(/\t/g, " ");
                const errorLength = diagnostic.length || message.length; // Usa o comprimento do erro ou da mensagem
                console.error(`\n${colorette.cyan(path_1.default.relative(process.cwd(), fileName))}:${colorette.yellow(line + 1)}:${colorette.yellow(character + 1)} - ${colorette.red("error")} ${colorette.blue(`TS${diagnostic.code}`)}: ${message}\n\n${colorette.bgWhite(colorette.black(line + 1))} ${errorLine}\n${colorette.bgWhite(" ")} ${" ".repeat(character)}${colorette.red("~".repeat(errorLength))}\n`);
            }
            else {
                console.error(`\n${colorette.cyan(path_1.default.relative(process.cwd(), fileName))} - ${colorette.red("error")} ${colorette.blue(`TS${diagnostic.code}`)}: ${message}\n`);
            }
        });
        return "";
    }
    return fileContent;
};
const resolveModule = (specifier, actualPath, baseUrl, paths) => {
    const isExists = (p) => {
        const paths = ["", ".js", ".ts", ".json", ".node", ".cjs", ".mjs", ".jsx", ".tsx", ".mts"]
            .map((ext) => p + ext)
            .concat(["index.js", "index.ts", "index.json", "index.node", "index.cjs", "index.mjs", "index.jsx", "index.tsx", "index.mts"].map((ext) => path_1.default.resolve(p, ext)));
        return paths.find((p) => fs_1.default.existsSync(p));
    };
    const resolvedPath = isExists(path_1.default.resolve(actualPath, specifier));
    if (resolvedPath) {
        return resolvedPath;
    }
    if (!baseUrl) {
        return specifier;
    }
    const absoluteBaseUrl = path_1.default.resolve(baseUrl);
    if (fs_1.default.existsSync(path_1.default.resolve(absoluteBaseUrl, specifier))) {
        return path_1.default.resolve(absoluteBaseUrl, specifier);
    }
    if (paths) {
        for (const [key, values] of Object.entries(paths)) {
            const pattern = new RegExp(`^${key.replace(/\*/g, "(.*)")}$`);
            const match = specifier.match(pattern);
            if (match) {
                for (const value of values) {
                    const resolvedPath = isExists(path_1.default.join(absoluteBaseUrl, value.replace(/\*/g, match[1])));
                    if (resolvedPath) {
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
        let { outputText, sourceMapText } = typescript_1.default.transpileModule(fileContent, {
            compilerOptions: { ...compilerOptions, sourceMap: true },
            fileName: filePath,
            transformers: {
                before: [
                    (context) => {
                        return (sourceFile) => {
                            function visitor(node) {
                                if (typescript_1.default.isImportDeclaration(node)) {
                                    const moduleSpecifier = node.moduleSpecifier.text;
                                    const resolvedModule = resolveModule(moduleSpecifier, path_1.default.dirname(filePath), compilerOptions.baseUrl, compilerOptions.paths);
                                    return typescript_1.default.factory.updateImportDeclaration(node, node.modifiers, node.importClause, typescript_1.default.factory.createStringLiteral(resolvedModule), node.assertClause);
                                }
                                return typescript_1.default.visitEachChild(node, visitor, context);
                            }
                            return typescript_1.default.visitNode(sourceFile, visitor);
                        };
                    },
                ],
            },
        });
        outputText = `(async function(){${outputText.replace(/\n\/\/\# sourceMappingURL\=(.+)$/gi, "").replace(/(.)require(.{1,10})/gi, (a, b, c) => {
            if (c.trim().startsWith("(") && !/[a-z_]/gi.test(b)) {
                return `${b}await require${c}`;
            }
            return a;
        })}
        moduleResolve();})();`;
        // Retorna o código JavaScript transpilado
        return `${outputText}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(sourceMapText ?? "").toString("base64")}`;
    }
    catch { }
    return "";
};
const cacheModules = new Map();
const observeModules = new Map();
const getRequire = async (p) => {
    try {
        // Tenta carregar usando require
        return require(p);
    }
    catch (e1) {
        try {
            return await Promise.resolve(`${p}`).then(s => __importStar(require(s)));
        }
        catch (e2) {
            throw new Error(`Cannot find module '${p}': ${e2}`);
        }
    }
};
const createCustomRequire = (filePath, onMutate) => {
    const baseDir = path_1.default.dirname(filePath);
    return async (modulePath) => {
        try {
            const compilerOptions = getTSCompilerOptions(filePath);
            modulePath = resolveModule(modulePath, baseDir, compilerOptions.baseUrl, compilerOptions.paths);
            let absolutePath = fs_1.default.existsSync(modulePath)
                ? modulePath
                : fs_1.default.existsSync(path_1.default.join(baseDir, modulePath))
                    ? path_1.default.join(baseDir, modulePath)
                    : require.resolve(path_1.default.join(baseDir, modulePath));
            const isOnlyApiModule = utils_1.PathInfo.get(__dirname).equals(absolutePath) || utils_1.PathInfo.get(__dirname).isParentOf(absolutePath) || utils_1.PathInfo.get(__dirname).isAncestorOf(absolutePath);
            if (isOnlyApiModule || !fs_1.default.existsSync(absolutePath) || absolutePath.includes("node_modules")) {
                throw new Error("Invalid module path");
            }
            if (fs_1.default.statSync(absolutePath).isDirectory()) {
                const posibleFiles = fs_1.default.readdirSync(absolutePath).find((file) => {
                    return (file.endsWith("index.js") || file.endsWith("index.ts") || file.endsWith("index.cjs") || file.endsWith("index.mjs") || file.endsWith("index.jsx") || file.endsWith("index.tsx"));
                });
                if (posibleFiles) {
                    absolutePath = path_1.default.resolve(absolutePath, posibleFiles);
                }
            }
            const updateImport = async () => {
                await (0, exports.importModule)(absolutePath, true, updateImport);
                const callbacks = Object.values(observeModules.get(absolutePath)?.modules ?? {});
                for (const callback of callbacks) {
                    callback();
                }
            };
            const module = await (0, exports.importModule)(absolutePath, false, updateImport);
            const observer = observeModules.get(absolutePath) ?? {
                event: undefined,
                modules: {},
            };
            if (observer.event) {
                fs_1.default.unwatchFile(absolutePath, observer.event);
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
            fs_1.default.watchFile(absolutePath, observer.event);
            return module;
        }
        catch (err) {
            return await getRequire(modulePath);
        }
    };
};
const getGlobalContext = (filePath, exports, resolve, onMutateImports) => {
    const globalContext = Object.create(global);
    globalContext["__filename"] = filePath;
    globalContext["__dirname"] = path_1.default.dirname(filePath);
    globalContext.console = console;
    globalContext.setTimeout = setTimeout;
    globalContext.clearTimeout = clearTimeout;
    globalContext.setInterval = setInterval;
    globalContext.clearInterval = clearInterval;
    globalContext.process = process;
    globalContext.require = createCustomRequire(filePath, onMutateImports);
    globalContext.exports = exports;
    globalContext.moduleResolve = resolve;
    return globalContext;
};
const importModule = async (filePath, ignoreCache = false, onMutateImports) => {
    if (fs_1.default.existsSync(filePath)) {
        if (fs_1.default.statSync(filePath).isDirectory()) {
            const posibleFiles = fs_1.default.readdirSync(filePath).find((file) => {
                return file.endsWith("index.js") || file.endsWith("index.ts") || file.endsWith("index.cjs") || file.endsWith("index.mjs") || file.endsWith("index.jsx") || file.endsWith("index.tsx");
            });
            if (posibleFiles) {
                filePath = path_1.default.resolve(filePath, posibleFiles);
            }
            else {
                return {};
            }
        }
    }
    else {
        return await getRequire(filePath);
    }
    if (cacheModules.has(filePath) && !ignoreCache) {
        return cacheModules.get(filePath);
    }
    const compiledCode = compileTypeScript(filePath);
    const exports = {};
    // console.log("compiledCode", compiledCode);
    await new Promise((resolve) => {
        const script = new vm.Script(compiledCode, { filename: filePath });
        const context = vm.createContext(getGlobalContext(filePath, exports, resolve, onMutateImports));
        script.runInContext(context);
    });
    cacheModules.set(filePath, exports);
    return exports;
};
exports.importModule = importModule;
//# sourceMappingURL=tsUtils.js.map