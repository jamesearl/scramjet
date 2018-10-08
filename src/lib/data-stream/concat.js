import {DataStream} from "./";

/**
 * Returns a new stream that will append the passed streams to the callee
 *
 * @chainable
 * @memberof DataStream#
 * @param  {*} streams Streams to be passed
 *
 * @example {@link ../samples/data-stream-concat.js}
 */
DataStream.prototype.concat = function concat(...streams) {
    const out = this._selfInstance({referrer: this});

    streams.unshift(this);

    const next = () => {
        if (streams.length)
            streams.shift()
                .on("end", next)
                .pipe(out, {end: !streams.length});
    };
    next();

    return out;
};