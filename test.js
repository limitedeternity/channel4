var test = require('tape');
var Channel = require('./channel.js');

test('Channel() creates a new channel', (assert) => {
    assert.plan(3);

    const channel = new Channel();
    assert.deepEqual(channel.buffer, []);
    assert.deepEqual(channel.consumers, []);
    assert.ok(!channel.closed);
});

test('Channel.put puts a value into a channel', (assert) => {
    assert.plan(1);

    let channel = new Channel();
    channel.put(42);
    assert.deepEqual(channel.buffer, [42]);
});

test('Channel.put puts END into a channel', (assert) => {
    assert.plan(1);

    let channel = new Channel();
    channel.put(52);
    channel.put(Channel.END);
    channel.put(53);
    assert.deepEqual(channel.buffer, [52, Channel.END]);
});

test('Channel.take takes a value from a channel', (assert) => {
    assert.plan(1);

    let channel = new Channel();
    channel.put(43);
    channel.take(value => assert.equal(value, 43));
});

test('Channel.take takes values from a channel', (assert) => {
    assert.plan(2);

    let channel = new Channel();
    channel.put(91);
    channel.put(92);
    channel.take(value => assert.equal(value, 91));
    channel.take(value => assert.equal(value, 92));
});

test('Channel.take is not called multiple times on the same channel', (assert) => {
    assert.plan(1);

    let channel = new Channel();
    channel.take(sequential(
        value => assert.equal(value, 91),
        () => assert.fail('should not have been called'),
    ));

    channel.put(91);
    channel.put(92);
});

test('Channel.take ignores values from closed channel with consumers', (assert) => {
    assert.plan(2);

    let channel = new Channel();
    channel.take(value => {
    channel.take(() => assert.fail('should not have been called'));
    assert.strictEqual(value, Channel.END);
    });

    channel.close();
    channel.put(57);
    assert.deepEqual(channel.buffer, []);
});

test('Channel.take ignores values from closed channel with values', (assert) => {
    assert.plan(4);

    let channel = new Channel();
    channel.put(75);
    channel.close();
    assert.deepEqual(channel.buffer, [75, Channel.END]);

    channel.take(value => assert.equal(value, 75));
    channel.take(value => {
        assert.strictEqual(value, Channel.END);
        assert.deepEqual(channel.buffer, []);
    });
});

test('Channel.close closes a channel', (assert) => {
    assert.plan(2);

    let channel = new Channel();
    channel.close();
    channel.put(58);
    channel.take(value => assert.strictEqual(value, Channel.END));
    assert.deepEqual(channel.buffer, []);
});

test('Channel.pipe pipes values from input to output', (assert) => {
    assert.plan(1);

    let input = new Channel();
    let output = new Channel();
    input.pipe(output);
    input.put(44);
    output.take(value => assert.equal(value, 44));
});

test('Channel.pipe transforms piped values', (assert) => {
    assert.plan(1);

    let input = new Channel();
    let output = new Channel();
    input.pipe(output, { transform: x => x / 5 });
    input.put(45);
    output.take(value => assert.equal(value, 9));
});

test('Channel.pipe pipes END to input and output', (assert) => {
    assert.plan(3);

    let input = new Channel();
    let output = new Channel();
    input.pipe(output, { keepOpen: Channel.CLOSE_BOTH });
    input.put(Channel.END);
    output.take(value => {
        input.put(59);
        output.put(59);
        assert.strictEqual(value, Channel.END);
        assert.deepEqual(input.buffer, []);
        assert.deepEqual(output.buffer, []);
    });
});

test('Channel.pipe does not pipe values to a closed output channel', (assert) => {
      assert.plan(2);

      let input = new Channel();
      let output = new Channel();
      input.pipe(output);
      output.close();

      input.put(201);
      output.take(value => assert.strictEqual(value, Channel.END));
      assert.deepEqual(output.buffer, []);
});

test('Channel.pipe does not pipe END to output', (assert) => {
    assert.plan(1);

    let input = new Channel();
    let output = new Channel();
    input.pipe(output);
    input.put(Channel.END);
    output.put(202);

    output.take(value => assert.equal(value, 202));
    input.take(() => assert.fail('should not have been called'));
});

test('Channel.demux merges multiple channels into one', (assert) => {
    assert.plan(2);

    let one = new Channel();
    let two = new Channel();
    let output = new Channel();
    output.demux([one, two]);
    output.take(value => assert.equal(value, 46));
    output.take(value => assert.equal(value, 47));

    one.put(46);
    two.put(47);
});

test('Channel.mux broadcasts values from a single into multiple channels', (assert) => {
    assert.plan(2);

    let one = new Channel();
    let two = new Channel();
    let input = new Channel();
    input.mux([one, two]);
    one.take(value => assert.equal(value, 64));
    two.take(value => assert.equal(value, 64));

    input.put(64);
});

const sequential = (...fns) => {
    let callCount = 0;
    return (...args) => {
        fns[callCount].apply(void 0, args);
        callCount += 1;
    }
};
