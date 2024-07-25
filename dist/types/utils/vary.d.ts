import type { Response } from "express";
/**
 * Append a field to a vary header.
 *
 * @param {String} header
 * @param {String|Array} field
 * @return {String}
 * @public
 */
export declare const append: (header: string, field: string | string[]) => string;
/**
 * Mark that a request is varied on a header field.
 *
 * @param {Object} res
 * @param {String|Array} field
 * @public
 */
declare const vary: (res: Response, field: string | string[]) => void;
export default vary;
//# sourceMappingURL=vary.d.ts.map