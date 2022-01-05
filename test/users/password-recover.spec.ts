import Mail from '@ioc:Adonis/Addons/Mail'
import Database from '@ioc:Adonis/Lucid/Database'
import Hash from '@ioc:Adonis/Core/Hash'
import { UserFactory } from 'Database/factories'
import test from 'japa'
import supertest from 'supertest'
import { DateTime, Duration } from 'luxon'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`

test.group('Password Recover', (group) => {
  group.beforeEach(async () => {
    await Database.beginGlobalTransaction()
  })

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction()
  })

  test('It should send an email with instructions to recover a forgotten password', async (assert) => {
    const user = await UserFactory.create()

    // This method really "traps" the email, which means that it does not allow the email to be sent.
    // Great for testing purposes
    Mail.trap((message) => {
      assert.deepEqual(message.to, [{ address: user.email }])
      assert.deepEqual(message.from, {
        address: 'no-reply@rpgtablemaker.com',
      })
      assert.equal(message.subject, 'RPGTableMaker: Recuperação de senha')
      assert.exists(message.html, 'The email must have a HTML template')
      assert.include(message.html!, user.username)
    })

    await supertest(BASE_URL)
      .post('/forgot-password')
      .send({
        email: user.email,
        resetPasswordUrl: BASE_URL,
      })
      .expect(204)

    Mail.restore()
  })

  test('It should create a reset password token', async (assert) => {
    const user = await UserFactory.create()

    await supertest(BASE_URL)
      .post('/forgot-password')
      .send({
        email: user.email,
        resetPasswordUrl: BASE_URL,
      })
      .expect(204)

    const tokens = await user.related('tokens').query()

    assert.isNotEmpty(tokens)
  })

  test('It should return 422 when required data is not provided on forgot-password', async (assert) => {
    const { body } = await supertest(BASE_URL).post('/forgot-password').send({}).expect(422)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('It should return 422 when a invalid email is provided', async (assert) => {
    const { body } = await supertest(BASE_URL)
      .post('/forgot-password')
      .send({
        email: 'test@',
        resetPasswordUrl: BASE_URL,
      })
      .expect(422)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('It should return 422 when a invalid resetPasswordUrl is provided', async (assert) => {
    const { body } = await supertest(BASE_URL)
      .post('/forgot-password')
      .send({
        email: 'test@',
        resetPasswordUrl: 'invalid-reset-password-url',
      })
      .expect(422)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('It should be able to reset password', async (assert) => {
    const user = await UserFactory.create()

    const { token } = await user.related('tokens').create({ token: 'test-token' })
    const password = 'new-valid-password@123'

    await supertest(BASE_URL).post('/reset-password').send({ token, password }).expect(204)

    await user.refresh()
    const arePasswordsEqual = await Hash.verify(user.password, password)

    assert.isTrue(arePasswordsEqual)
  })

  test('It should return 422 when required data is not provided on reset-password', async (assert) => {
    const { body } = await supertest(BASE_URL).post('/reset-password').send({}).expect(422)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('It should return 404 when using the same token more than once', async (assert) => {
    const user = await UserFactory.create()

    const { token } = await user.related('tokens').create({ token: 'test-token' })
    const password = 'new-valid-password@123'

    await supertest(BASE_URL).post('/reset-password').send({ token, password }).expect(204)

    const { body } = await supertest(BASE_URL)
      .post('/reset-password')
      .send({ token, password })
      .expect(404)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 404)
  })

  test('It should not reset password when token is expired after 2 hours', async (assert) => {
    const user = await UserFactory.create()

    const date = DateTime.now().minus(Duration.fromISOTime('02:01'))

    const { token } = await user.related('tokens').create({ token: 'test-token', createdAt: date })
    const password = 'new-valid-password@123'

    const { body } = await supertest(BASE_URL)
      .post('/reset-password')
      .send({ token, password })
      .expect(410)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.message, 'Token has expired')
    assert.equal(body.code, 'TOKEN_EXPIRED')
    assert.equal(body.status, 410)
  })
})
