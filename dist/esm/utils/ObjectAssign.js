"use strict";
const toObject = (val) => {
    if (val === null || val === undefined) {
        throw new TypeError("Object.assign cannot be called with null or undefined");
    }
    return Object(val);
};
const shouldUseNative = () => {
    try {
        if (!Object.assign) {
            return false;
        }
        let test1 = new String("abc");
        test1[5] = "de";
        if (Object.getOwnPropertyNames(test1)[0] === "5") {
            return false;
        }
        const test2 = {};
        for (var i = 0; i < 10; i++) {
            test2["_" + String.fromCharCode(i)] = i;
        }
        const order2 = Object.getOwnPropertyNames(test2).map(function (n) {
            return test2[n];
        });
        if (order2.join("") !== "0123456789") {
            return false;
        }
        const test3 = {};
        "abcdefghijklmnopqrst".split("").forEach(function (letter) {
            test3[letter] = letter;
        });
        if (Object.keys(Object.assign({}, test3)).join("") !== "abcdefghijklmnopqrst") {
            return false;
        }
        return true;
    }
    catch (err) {
        return false;
    }
};
const assign = shouldUseNative()
    ? Object.assign
    : (target, ...sources) => {
        const to = toObject(target);
        for (var s = 1; s < sources.length; s++) {
            const from = Object(sources[s]);
            for (var key in from) {
                if (Object.prototype.hasOwnProperty.call(from, key)) {
                    to[key] = from[key];
                }
            }
            if (Object.getOwnPropertySymbols) {
                let symbols = Object.getOwnPropertySymbols(from);
                for (var i = 0; i < symbols.length; i++) {
                    if (Object.prototype.propertyIsEnumerable.call(from, symbols[i])) {
                        to[symbols[i]] = from[symbols[i]];
                    }
                }
            }
        }
        return to;
    };
export default assign;
//# sourceMappingURL=ObjectAssign.js.map