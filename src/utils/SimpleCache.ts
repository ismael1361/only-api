import { SimpleCacheOptions } from "../type";
import { cloneObject } from "./Utils";

const calculateExpiryTime = (expirySeconds: number) => (expirySeconds > 0 ? Date.now() + expirySeconds * 1000 : Infinity);

/**
 * Implementação simples de cache que mantém valores imutáveis na memória por um tempo limitado.
 * A imutabilidade é garantida clonando os valores armazenados e recuperados. Para alterar um valor em cache, ele terá que ser `set` novamente com o novo valor.
 */
export default class SimpleCache<
	T extends Record<string, any> = {
		[key: string]: any;
	},
> {
	options: SimpleCacheOptions = {
		cloneValues: true,
		expirySeconds: 15,
		maxEntries: 1000,
		updateExpiration: true,
	};

	private cache: Map<string, { value: any; added: number; expires: number; accessed: number }> = new Map();

	enabled = true;

	get size() {
		return this.cache.size;
	}

	constructor(
		options: number | Partial<SimpleCacheOptions> = {
			cloneValues: true,
			expirySeconds: 15,
			maxEntries: 1000,
			updateExpiration: true,
		},
	) {
		this.applyOptions(options);

		// Limpeza a cada minuto
		const interval = setInterval(() => {
			this.cleanUp();
		}, 60 * 1000);
		interval.unref?.();
	}

	applyOptions(options?: number | Partial<SimpleCacheOptions>) {
		if (!options) {
			return;
		}

		if (typeof options === "number") {
			// Assinatura antiga: apenas expirySeconds fornecido
			options = { expirySeconds: options };
		}

		options.cloneValues = options.cloneValues !== false;

		if (typeof options.expirySeconds !== "number" && typeof options.maxEntries !== "number") {
			throw new Error("Either expirySeconds or maxEntries must be specified");
		}

		this.options = { expirySeconds: 15, updateExpiration: true, ...options };
	}

	has<K extends keyof T>(key: K): boolean {
		if (!this.enabled) {
			return false;
		}
		return this.cache.has(key as any);
	}

	get<K extends keyof T>(key: K, updateExpiration?: boolean): T[K] | undefined {
		if (!this.enabled) {
			return;
		}
		const entry = this.cache.get(key as any);
		if (!entry) {
			return;
		} // if (!entry || entry.expires <= Date.now()) { return null; }
		updateExpiration = updateExpiration ?? this.options.updateExpiration;
		if (updateExpiration) {
			entry.expires = calculateExpiryTime(this.options.expirySeconds);
			entry.accessed = Date.now();
		}
		return this.options.cloneValues ? (cloneObject(entry.value) as any) : entry.value;
	}

	set<K extends keyof T, V extends T[K]>(key: K, value: V, expirySeconds?: number) {
		if (typeof this.options.maxEntries === "number" && this.options.maxEntries > 0 && this.cache.size >= this.options.maxEntries && !this.cache.has(key as any)) {
			// console.warn(`* cache limit ${this.options.maxEntries} reached: ${this.cache.size}`);

			// Remove um item expirado ou aquele que foi acessado há mais tempo
			let oldest: { key: any; accessed: number } | null = null;
			const now = Date.now();
			for (const [key, entry] of this.cache.entries()) {
				if (entry.expires <= now) {
					// Found an expired item. Remove it now and stop
					this.cache.delete(key);
					oldest = null;
					break;
				}
				if (!oldest || entry.accessed < oldest.accessed) {
					oldest = { key, accessed: entry.accessed };
				}
			}
			if (oldest !== null) {
				this.cache.delete(oldest.key);
			}
		}

		this.cache.set(key as any, {
			value: this.options.cloneValues ? (cloneObject(value) as any) : value,
			added: Date.now(),
			accessed: Date.now(),
			expires: calculateExpiryTime(expirySeconds ?? this.options.expirySeconds),
		});
	}

	remove<K extends keyof T>(key: K) {
		this.cache.delete(key as any);
	}

	cleanUp() {
		const now = Date.now();
		this.cache.forEach((entry, key) => {
			if (entry.expires <= now) {
				this.cache.delete(key);
			}
		});
	}

	keys(): (keyof T)[] {
		return Array.from(this.cache.keys());
	}

	values(): T[keyof T][] {
		return Array.from(this.cache.values()).map((v) => v.value);
	}

	forEach(callback: <K extends keyof T, V extends T[K]>(value: V, key: K, cache: SimpleCache<T>) => void) {
		this.cache.forEach((entry, key) => {
			callback(entry.value, key, this);
		});
	}
}
