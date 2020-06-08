const nowait = typeof queueMicrotask !== "undefined" ? queueMicrotask : typeof setImmediate !== "undefined" ? setImmediate : (function() {
    if (typeof Promise !== "undefined") {
        return function(fn) {
            Promise.resolve().then(fn);
        }
    }

    return function(fn) {
        setTimeout(fn, 0);
    }
}());

class Channel {
    static END = Symbol('END');
    static KEEP_OPEN = Symbol('KEEP_OPEN');
    static CLOSE_BOTH = Symbol('CLOSE_BOTH');

    constructor() {
        this.buffer = [];
        this.consumers = [];
        this.closed = false;
    }

    #runTick() {
        if (this.buffer.length === 0 || this.consumers.length === 0) return this;

        const message = this.buffer.shift();
        const consumer = this.consumers.shift();

        nowait(() => consumer(message));
        return this.#runTick();
    };
    
    put(value) {
        if (this.closed) return this;
        if (value === Channel.END) this.closed = true;

        this.buffer.push(value);
        return this.#runTick();
    }

    take(callback) {
        if (this.closed && this.buffer.length === 0) return this;
        if (!!(callback && callback.constructor && callback.call && callback.apply)) this.consumers.push(callback);
        return this.#runTick();
    }

    pipe(output, { keepOpen = Channel.KEEP_OPEN, transform = (x => x) } = {}) {
        function consume(value) {
            if (keepOpen !== Channel.KEEP_OPEN || value !== Channel.END) output.put(transform(value));
            if (value !== Channel.END) this.take(consume);
        }

        this.take(consume.bind(this));
        return output;
    }
    
    demux(channels, { keepOpen = Channel.KEEP_OPEN, transform = (x => x)} = {}) {
        function pipeThere(channel) {
            return channel.pipe(this, { keepOpen, transform });
        }

        channels.forEach(pipeThere.bind(this));
        return this;
    }
    
    mux(channels, { keepOpen = Channel.KEEP_OPEN, transform = (x => x)} = {}) {
        function consume(value) {
            if (keepOpen !== Channel.KEEP_OPEN || value !== Channel.END) 
                channels.forEach(channel => channel.put(transform(value)));
            if (value !== Channel.END) this.take(consume);
        }
        
        this.take(consume.bind(this));
        return channels;
    }

    close() {
        return this.put(Channel.END);
    }
}

(function(root) {
    if (typeof define === "function" && define.amd) {
        define([], () => Channel);
    } else if (typeof exports !== "undefined") {
        if (typeof module !== "undefined" && module.exports) {
            exports = module.exports = Channel;
        }
        exports.Channel = Channel;
    } else {
        root.Channel = Channel;
    }
}(typeof module !== "undefined" ? module : typeof window !== "undefined" ? window : {}));
