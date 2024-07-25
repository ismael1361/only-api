import { SimpleCacheOptions } from "../type";
/**
 * Implementação simples de cache que mantém valores imutáveis na memória por um tempo limitado.
 * A imutabilidade é garantida clonando os valores armazenados e recuperados. Para alterar um valor em cache, ele terá que ser `set` novamente com o novo valor.
 */
export default class SimpleCache<T extends Record<string, any> = {
    [key: string]: any;
}> {
    options: SimpleCacheOptions;
    private cache;
    enabled: boolean;
    get size(): number;
    constructor(options?: number | Partial<SimpleCacheOptions>);
    applyOptions(options?: number | Partial<SimpleCacheOptions>): void;
    has<K extends keyof T>(key: K): boolean;
    get<K extends keyof T>(key: K, updateExpiration?: boolean): T[K] | undefined;
    set<K extends keyof T, V extends T[K]>(key: K, value: V, expirySeconds?: number): void;
    remove<K extends keyof T>(key: K): void;
    cleanUp(): void;
    keys(): (keyof T)[];
    values(): T[keyof T][];
    forEach(callback: <K extends keyof T, V extends T[K]>(value: V, key: K, cache: SimpleCache<T>) => void): void;
}
//# sourceMappingURL=SimpleCache.d.ts.map