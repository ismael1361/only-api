"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function runCallback(callback, data) {
    try {
        callback(data);
    }
    catch (err) {
        console.error("Error in subscription callback", err);
    }
}
const _subscriptions = Symbol("subscriptions");
const _oneTimeEvents = Symbol("oneTimeEvents");
class SimpleEventEmitter {
    [_subscriptions];
    [_oneTimeEvents];
    constructor() {
        this[_subscriptions] = [];
        this[_oneTimeEvents] = new Map();
    }
    on(event, callback) {
        if (this[_oneTimeEvents].has(event)) {
            runCallback(callback, this[_oneTimeEvents].get(event));
        }
        else {
            this[_subscriptions].push({ event, callback, once: false });
        }
        const self = this;
        return {
            stop() {
                self.off(event, callback);
            },
        };
    }
    off(event, callback) {
        this[_subscriptions] = this[_subscriptions].filter((s) => s.event !== event || (callback && s.callback !== callback));
        return this;
    }
    once(event, callback) {
        return new Promise((resolve) => {
            const ourCallback = (data) => {
                resolve(data);
                callback?.(data);
            };
            if (this[_oneTimeEvents].has(event)) {
                runCallback(ourCallback, this[_oneTimeEvents].get(event));
            }
            else {
                this[_subscriptions].push({
                    event,
                    callback: ourCallback,
                    once: true,
                });
            }
        });
    }
    emit(event, data) {
        if (this[_oneTimeEvents].has(event)) {
            throw new Error(`Event "${event}" was supposed to be emitted only once`);
        }
        for (let i = 0; i < this[_subscriptions].length; i++) {
            const s = this[_subscriptions][i];
            if (s.event !== event) {
                continue;
            }
            runCallback(s.callback, data);
            if (s.once) {
                this[_subscriptions].splice(i, 1);
                i--;
            }
        }
        return this;
    }
    emitOnce(event, data) {
        if (this[_oneTimeEvents].has(event)) {
            throw new Error(`Event "${event}" was supposed to be emitted only once`);
        }
        this.emit(event, data);
        this[_oneTimeEvents].set(event, data); // Mark event as being emitted once for future subscribers
        this.off(event); // Remove all listeners for this event, they won't fire again
        return this;
    }
    pipe(event, eventEmitter) {
        return this.on(event, (data) => {
            eventEmitter.emit(event, data);
        });
    }
    pipeOnce(event, eventEmitter) {
        return this.once(event, (data) => {
            eventEmitter.emitOnce(event, data);
        });
    }
}
exports.default = SimpleEventEmitter;
//# sourceMappingURL=SimpleEventEmitter.js.map