"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.append = void 0;
const FIELD_NAME_REGEXP = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
/**
 * Append a field to a vary header.
 *
 * @param {String} header
 * @param {String|Array} field
 * @return {String}
 * @public
 */
const append = (header, field) => {
    if (typeof header !== "string") {
        throw new TypeError("header argument is required");
    }
    if (!field) {
        throw new TypeError("field argument is required");
    }
    // get fields array
    const fields = !Array.isArray(field) ? parse(String(field)) : field;
    // assert on invalid field names
    for (var j = 0; j < fields.length; j++) {
        if (!FIELD_NAME_REGEXP.test(fields[j])) {
            throw new TypeError("field argument contains an invalid header name");
        }
    }
    // existing, unspecified vary
    if (header === "*") {
        return header;
    }
    // enumerate current values
    let val = header;
    const vals = parse(header.toLowerCase());
    // unspecified vary
    if (fields.indexOf("*") !== -1 || vals.indexOf("*") !== -1) {
        return "*";
    }
    for (var i = 0; i < fields.length; i++) {
        var fld = fields[i].toLowerCase();
        // append value (case-preserving)
        if (vals.indexOf(fld) === -1) {
            vals.push(fld);
            val = val ? val + ", " + fields[i] : fields[i];
        }
    }
    return val;
};
exports.append = append;
/**
 * Parse a vary header into an array.
 *
 * @param {String} header
 * @return {Array}
 * @private
 */
const parse = (header) => {
    let end = 0, start = 0;
    const list = [];
    // gather tokens
    for (var i = 0, len = header.length; i < len; i++) {
        switch (header.charCodeAt(i)) {
            case 0x20 /*   */:
                if (start === end) {
                    start = end = i + 1;
                }
                break;
            case 0x2c /* , */:
                list.push(header.substring(start, end));
                start = end = i + 1;
                break;
            default:
                end = i + 1;
                break;
        }
    }
    // final token
    list.push(header.substring(start, end));
    return list;
};
/**
 * Mark that a request is varied on a header field.
 *
 * @param {Object} res
 * @param {String|Array} field
 * @public
 */
const vary = (res, field) => {
    if (!res || !res.getHeader || !res.setHeader) {
        // quack quack
        throw new TypeError("res argument is required");
    }
    // get existing header
    let val = res.getHeader("Vary") || "";
    const header = Array.isArray(val) ? val.join(", ") : String(val);
    // set new header
    if ((val = (0, exports.append)(header, field))) {
        res.setHeader("Vary", val);
    }
};
exports.default = vary;
//# sourceMappingURL=vary.js.map