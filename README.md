# Channel4
Dead simple communicating sequential processes for JavaScript (like Clojure core.async or Go channels).

```shell
npm install @limitedeternity/channel4
```

## Usage

```js
let channel = new Channel();
channel.take(value => {
  console.log(`Hello ${value}`);
});
channel.put('World!');

// prints `Hello World!`
```

## Motivation
Consider the following code:

```js
const listenerFn = (event) => {
  event.preventDefault();
  doSomething(event);
};

document.querySelector('button').addEventListener('click', listenerFn);
```

There's a one-to-one relationship between the producer `addEventListener` and
the consumer `listenerFn`. Also the producer knows 1) there's a single listener
attached, 2) how the data is feeded to the listener and 3) when the data is
going to be processed.  Adding a second listener introduces some challenges:

```js
document.querySelector('button').addEventListener('click', (e) => {
  listenerFn() && otherListenerFn();
});

// or

document.querySelector('button').addEventListener('click', listenerFn);
document.querySelector('button').addEventListener('click', otherListenerFn);
```

It's immediately obvious that this couples the producer and consumer: when you
introduce another listener, the producer has to cater for it.

**This is poor separation of concerns.**

But what if you could decouple consumers from producers? What if the producer
could send the message without the need to worry about who's consuming it? What
if the consumer could consume messages at its own peace?

You won't need to fiddle with such poor code, that's for sure. Decoupling would
also lead to better and easier testing.

As you might have guessed by now channels can help you decouple producers and
consumers. The decoupling is obtained through a simple queue.

The producer places items of work on the queue for later processing.
The consumer is free to remove the work item from the queue at any time.

Producer and consumer only have to know about the channel to communicate.
Also, multiple producers can put values for multiple consumers to take.

```js
let channel = new Channel();
document.querySelectorAll('button')
  .addEventListener('click', () => channel.put('onclick'));

channel.take(value => if (value === 'onclick') ...);
```

In the example above, `addEventListener` isn't aware that there's a consumer
listening to click events.

```js
let channel = new Channel();
document.querySelectorAll('a')
  .addEventListener('click', () => channel.put('a.onclick'));
document.querySelectorAll('button')
  .addEventListener('click', () => channel.put('button.onclick'));

channel.take(value => if (value === 'a.onclick') ...);
```

In this other example, the consumer isn't aware that multiple producers are
placing items of work on the queue.

## API

### Channel.put :: Channel d => a -> d

Put a value into a channel and return the channel.
The result in a noop when called on closed channel.

```js
let channel = new Channel();
channel.put(46);
```

### Channel.take :: Channel d => (a -> b) -> d

Take values from the channel and fire the callback.
The result in a noop when called on closed channel.

```js
let channel = new Channel();
channel.take(value => console.log('received: ' + value));
channel.put(47);

// prints `received: 47`
```

### Channel.close :: Channel d => d

Close the current channel. This is a shorthand for `Channel.put(channel,
Channel.END)`.

```js
let channel = new Channel();
channel.take(value => {
  if (value === Channel.END) console.log('Closed!');
});
channel.close();

// prints `Closed!`
//...

channel.put(46); // has no effect
channel.take(value => ()); // callback will never fire
```

### Channel.pipe :: Channel d => d -> {keepOpen: KEEP_OPEN | CLOSE_BOTH, transform: a -> b} -> d

Pipe all the incoming values from the input to the output channel. If the input
channel is closed, the output channel is kept open unless it is specified
otherwise. You can apply a transformation function while piping the values.

```js
let input = new Channel();
let output = new Channel();
input.pipe(output, { transform: x => x / 2 });
output.take(value => console.log('received: ' + value));
input.put(44);

// prints: `received: 22`
```

### Channel.demux :: Channel d => [d] -> {keepOpen: KEEP_OPEN | CLOSE_BOTH, transform: a -> b} -> d

Merge all values from an array of channels into the output. If one of the input
channels is closed, the output channel is kept open unless it is specified
otherwise. You can apply a transformation function while merging the values.

```js
let one = new Channel();
let two = new Channel();
let output = new Channel();
output.demux([one, two]);
output.take(value => console.log('received: ' + value))
output.take(value => console.log('received: ' + value))
one.put(1);
two.put(2);

// prints `received: 1` and `received: 2`
```

### Channel.mux :: Channel d => [d] -> {keepOpen: KEEP_OPEN | CLOSE_BOTH, transform: a -> b} -> [d]

Broadcast all the values from input channel to an array of channels. If the
input channel is closed, the output channels are kept open unless it is
specified otherwise. You can apply a transformation function to the value before
it is broadcasted.

```js
let one = new Channel();
let two = new Channel();
let input = new Channel();
input.mux([one, two]);
one.take(value => console.log('received: ' + value));
two.take(value => console.log('received: ' + value));
input.put(1);

// prints `received: 1` and `received: 1`
```

### @static Channel.END

Emitted from the channel on close.

### @static Channel.KEEP_OPEN

Keep the output channel open during `Channel.pipe`, `Channel.demux` or
`Channel.mux`.

### @static Channel.CLOSE_BOTH

Close the output channel when the input receives a `Channel.END` value.

## Resources

This project is heavily inspired by:

- [CSP and transducers in JavaScript](http://phuu.net/2014/08/31/csp-and-transducers.html)
- [Taming the Asynchronous Beast with CSP Channels in JavaScript](http://jlongster.com/Taming-the-Asynchronous-Beast-with-CSP-in-JavaScript)
- [Go-flavored JavaScript](http://johntantalo.com/blog/go-flavored-javascript/)
- [Raynos/value-event](https://github.com/Raynos/value-event)
- [The Producer Consumer Pattern](http://java.dzone.com/articles/producer-consumer-pattern)
