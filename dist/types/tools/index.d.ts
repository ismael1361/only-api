import { RouteResponse } from "../utils";
/**
 * Obter a origem da URL
 * @returns A origem da URL
 */
export declare const getUrlOrigin: () => string;
/**
 * Armazenar em cache a resposta de uma rota
 * @param duration A duração do cache em segundos
 * @param id Um identificador único para a rota
 * @throws Se a rota já estiver armazenada em cache; expressão regular "__cache_control_response__{id}"
 */
export declare const cacheControl: (duration: number, id?: string) => void;
/**
 * Obter a resposta de uma rota armazenada em cache
 * @param id Um identificador único para a rota
 * @returns A resposta armazenada em cache
 */
export declare const getCachedResponse: (id?: string) => RouteResponse | undefined;
/**
 * Obter a resposta armazenada em cache
 * @param id Um identificador único para a rota
 * @returns A resposta armazenada em cache
 */
export declare const getCached: <T = any>(id?: string) => T | undefined;
/**
 * Armazenar uma resposta em cache
 * @param id Um identificador único para a rota
 * @param value A resposta a ser armazenada
 * @param duration A duração do cache em segundos, padrão 15 segundos
 */
export declare const setCache: <T = any>(id: string, value: T, duration?: number) => void;
/**
 * Verificar se há um valor armazenada em cache
 * @param id Um identificador único para a rota
 * @returns Se a rota está armazenada em cache
 */
export declare const hasCache: (id?: string) => boolean;
/**
 * Configura o cabeçalho CORS e ao mesmo tempo valida a origem
 * @param origin Origem permitida
 * @param exposeHeaders Cabeçalhos expostos
 * @throws Se a origem não for permitida
 * @returns Se a origem é permitida
 *
 * @example
 * ```typescript
 * await corsOringin("https://meu.servidor.com", "Content-Type, Authorization, Content-Length, Accept, Origin, X-Requested-With, DataBase-Context");
 * ```
 */
export declare const corsOringin: (origin: string | string[], exposeHeaders?: string | string[]) => Promise<void>;
/**
 * Requer acesso para acessar uma rota
 * @param users Usuários e senhas permitidos
 * @throws Se o usuário não tiver acesso
 * @returns Se o usuário tem acesso
 *
 * @example
 * ```typescript
 * await requiresAccess({
 * 	"admin": "123456",
 * 	"user": ["123456", "654321"]
 * });
 * ```
 */
export declare const requiresAccess: (users: Record<string, string | string[]>) => Promise<void>;
//# sourceMappingURL=index.d.ts.map