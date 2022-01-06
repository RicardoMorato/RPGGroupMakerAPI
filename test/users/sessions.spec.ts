import Database from '@ioc:Adonis/Lucid/Database'
import { UserFactory } from 'Database/factories'
import test from 'japa'
import supertest from 'supertest'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`

test.group('Session', (group) => {
  group.beforeEach(async () => {
    await Database.beginGlobalTransaction()
  })

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction()
  })

  test('It should authenticate a user', async (assert) => {
    const plainTextPassword = 'test@123'
    const { id, email } = await UserFactory.merge({ password: plainTextPassword }).create()

    const { body } = await supertest(BASE_URL)
      .post('/sessions')
      .send({ email, password: plainTextPassword })
      .expect(201)

    assert.isDefined(body.user, 'User is not defined')
    assert.equal(body.user.id, id)
  })

  test('It should create an api token when a session is created', async (assert) => {
    const plainTextPassword = 'test@123'
    const { id, email } = await UserFactory.merge({ password: plainTextPassword }).create()

    const { body } = await supertest(BASE_URL)
      .post('/sessions')
      .send({ email, password: plainTextPassword })
      .expect(201)

    assert.isDefined(body.token, 'Session token is not defined')
    assert.equal(body.user.id, id)
  })

  test('It should return 400 when credentials are not provided', async (assert) => {
    const { body } = await supertest(BASE_URL).post('/sessions').send({}).expect(400)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 400)
  })

  test('It should return 400 when invalid credentials are provided', async (assert) => {
    const { email } = await UserFactory.create()

    const { body } = await supertest(BASE_URL)
      .post('/sessions')
      .send({ email, password: 'test@123' })
      .expect(400)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 400)
  })
})
