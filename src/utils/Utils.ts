export class PartialArray {
	[index: number]: any;
	constructor(sparseArray?: { [index: number]: any } | any[]) {
		if (sparseArray instanceof Array) {
			for (let i = 0; i < sparseArray.length; i++) {
				if (typeof sparseArray[i] !== "undefined") {
					this[i] = sparseArray[i];
				}
			}
		} else if (sparseArray) {
			Object.assign(this, sparseArray);
		}
	}
}

export function cloneObject(original: any, stack: any[] = []): typeof original {
	const checkAndFixTypedArray = (obj: any) => {
		if (
			obj !== null &&
			typeof obj === "object" &&
			typeof obj.constructor === "function" &&
			typeof obj.constructor.name === "string" &&
			["Buffer", "Uint8Array", "Int8Array", "Uint16Array", "Int16Array", "Uint32Array", "Int32Array", "BigUint64Array", "BigInt64Array"].includes(obj.constructor.name)
		) {
			// FIX for typed array being converted to objects with numeric properties:
			// Convert Buffer or TypedArray to ArrayBuffer
			obj = obj.buffer.slice(obj.byteOffset, obj.byteOffset + obj.byteLength);
		}
		return obj;
	};
	original = checkAndFixTypedArray(original);

	if (typeof original !== "object" || original === null || original instanceof Date || original instanceof ArrayBuffer || original instanceof RegExp) {
		return original;
	}

	const cloneValue = (val: any) => {
		if (stack.indexOf(val) >= 0) {
			throw new ReferenceError("object contains a circular reference");
		}
		val = checkAndFixTypedArray(val);
		if (val === null || val instanceof Date || val instanceof ArrayBuffer || val instanceof RegExp) {
			// || val instanceof ID
			return val;
		} else if (typeof val === "object") {
			stack.push(val);
			val = cloneObject(val, stack);
			stack.pop();
			return val;
		} else {
			return val; // Anything other can just be copied
		}
	};
	if (typeof stack === "undefined") {
		stack = [original];
	}
	const clone: PartialArray | any[] | Record<string, any> = original instanceof Array ? [] : original instanceof PartialArray ? new PartialArray() : {};
	Object.keys(original).forEach((key) => {
		const val = original[key];
		if (typeof val === "function") {
			return; // skip functions
		}
		(clone as any)[key] = cloneValue(val);
	});
	return clone;
}
