import test from 'japa'

test.group('Example', () => {
  test('Assert sum', (assert) => {
    assert.equal(2 + 2, 4)
  })
})
