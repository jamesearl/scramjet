const {DataStream} = require('./');

const {promisify} = require('util');
const fs = ((fs) => ({
    readdir: promisify(fs.readdir),
    stat: promisify(fs.stat),
    lstat: promisify(fs.lstat),
    readFile: promisify(fs.readFile)
}))(require('fs'));
const _path = require("path");

/**
 * Standard options for scramjet streams.
 *
 * @typedef {Object} FSStreamOptions
 * @augments StreamOptions
 * @prop {String} cwd
 * @prop {String} encoding
 */

 /**
 * A scramjet stream that items point to filesystem items like files, directories etc.
 * Provides methods like `stat`, `contents`.
 *
 * This is useful for listing filesystem, stating stream of files, reading contents and more.
 *
 * @todo work in progress
 * @todo untested
 * @extends DataStream
 */
class FSStream extends DataStream {

    /**
     * Stats all files in stream using `lstat`.
     *
     * Stat class members are merged into current FSStream objects
     *
     * @chainable
     * @memberof FSStream
     */
    lstat() {
        return this.assign(
            async ({ fullpath }) => fs.lstat(fullpath)
        );
    }

    /**
     * Stats all files in stream using `stat`.
     *
     * Stat class members are merged into current FSStream objects
     *
     * @chainable
     * @memberof FSStream
     */
    stat() {
        return this.assign(
            async ({ fullpath }) => fs.stat(fullpath)
        );
    }

    /**
     * Assigns
     *
     * @chainable
     * @memberof FSStream
     */
    contents() {
        return this.assign(
            async ({ fullpath }) => fs.readFile(fullpath)
        );
    }

    /**
     * Checks files against minimatch pattern
     *
     * @param {String} glob minimatch value
     * @memberof FSStream
     */
    match(glob) {
        const mm = new (require('minimatch'))(glob);

        return this._match(mm);
    }

    _match(mm, partial) {
        return this.filter(
            file => mm.match(file.path, partial)
        );
    }

    /**
     * Reads directory and returns a stream of file entries.
     *
     * @static
     * @param {String} path
     * @param {FSStreamOptions} options
     * @returns
     * @memberof FSStream
     */
    static async readdir(path, options) {
        options.cwd = options.cwd || process.cwd();

        return FSStream.fromFileList(
            (await fs.readdir(_path.resolve(options.cwd, path), {encoding: options.encoding || 'utf-8'})),
            options
        );
    }

    static async match(path, glob, options) {
        const mm = new (require('minimatch'))(glob);

        this.readdir(path)
            // [options.follow ? "stat" : "lstat"]() // eslint-disable-line no-unexpected-multiline
            ._match(mm, true)
            .lstat()
            .into(
                async (out, stat) => {
                    if (stat.isDirectory()) {
                        return out.pull(this.match(stat.path, glob, options));
                    } else {
                        return out.whenWrote(path);
                    }
                },
                new this
            )
            ._match(mm);
    }

    static fromFileList(list, options) {
        return this.fromArray(list)
            .map(({ path }) => ({
                cwd: options.cwd,
                fullpath: _path.join(options.cwd, path),
                path,
                filename: _path.basename(path)
            }));
    }

}

module.exports = FSStream;
