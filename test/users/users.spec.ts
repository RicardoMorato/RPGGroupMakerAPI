import Database from '@ioc:Adonis/Lucid/Database'
import { UserFactory } from 'Database/factories'
import test from 'japa'
import supertest from 'supertest'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`

test.group('Users', (group) => {
  group.beforeEach(async () => {
    await Database.beginGlobalTransaction()
  })

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction()
  })

  test('It should create a user', async (assert) => {
    const userPayload = {
      email: 'test@test.com',
      username: 'testUser',
      password: 'test@123',
      avatar: 'https://images.com/image/1',
    }

    const { body } = await supertest(BASE_URL).post('/users').send(userPayload).expect(201)

    assert.exists(body.user, 'User is undefined')
    assert.exists(body.user.id, 'Id is undefined')
    assert.equal(body.user.email, userPayload.email)
    assert.equal(body.user.username, userPayload.username)
    assert.equal(body.user.avatar, userPayload.avatar)
    assert.notExists(body.user.password, 'Password is defined')
  })

  test('It should return 400 when email is already in use', async (assert) => {
    const { email } = await UserFactory.create()

    const userPayload = {
      email,
      username: 'testUser',
      password: 'test@123',
      avatar: 'https://images.com/image/1',
    }

    const { body } = await supertest(BASE_URL).post('/users').send(userPayload).expect(400)

    assert.exists(body.message, 'There is no error message in the body')
    assert.include(body.message, 'Email')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 400)
  })

  test('It should return 400 when username is already in use', async (assert) => {
    const { username } = await UserFactory.create()

    const userPayload = {
      username,
      email: 'test@test.com',
      password: 'test@123',
      avatar: 'https://images.com/image/1',
    }

    const { body } = await supertest(BASE_URL).post('/users').send(userPayload).expect(400)

    assert.exists(body.message, 'There is no error message in the body')
    assert.include(body.message, 'Username')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 400)
  })

  test.only('It should return 422 when required data is not provided', async (assert) => {
    const { body } = await supertest(BASE_URL).post('/users').send({}).expect(422)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })
})
