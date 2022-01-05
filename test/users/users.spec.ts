import Database from '@ioc:Adonis/Lucid/Database'
import Hash from '@ioc:Adonis/Core/Hash'
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
    }

    const { body } = await supertest(BASE_URL).post('/users').send(userPayload).expect(201)

    assert.exists(body.user, 'User is undefined')
    assert.exists(body.user.id, 'Id is undefined')
    assert.equal(body.user.email, userPayload.email)
    assert.equal(body.user.username, userPayload.username)
    assert.notExists(body.user.password, 'Password is defined')
  })

  test('It should return 400 when email is already in use', async (assert) => {
    const { email } = await UserFactory.create()

    const userPayload = {
      email,
      username: 'testUser',
      password: 'test@123',
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
    }

    const { body } = await supertest(BASE_URL).post('/users').send(userPayload).expect(400)

    assert.exists(body.message, 'There is no error message in the body')
    assert.include(body.message, 'Username')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 400)
  })

  test('It should return 422 when required data is not provided', async (assert) => {
    const { body } = await supertest(BASE_URL).post('/users').send({}).expect(422)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('It should return 422 when an invalid password is provided', async (assert) => {
    const userPayload = {
      email: 'test@test.com',
      username: 'testUser',
      password: '123',
    }

    const { body } = await supertest(BASE_URL).post('/users').send(userPayload).expect(422)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('It should return 422 when an invalid email is provided', async (assert) => {
    const userPayload = {
      email: 'test@',
      username: 'testUser',
      password: 'test@123',
    }

    const { body } = await supertest(BASE_URL).post('/users').send(userPayload).expect(422)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('It should update a user', async (assert) => {
    const { id, password } = await UserFactory.create()
    const email = 'new_email@test.com'
    const avatar = 'http://github.com/RicardoMorato.png'

    const updateUserPayload = {
      email,
      avatar,
      password,
    }

    const { body } = await supertest(BASE_URL)
      .put(`/users/${id}`)
      .send(updateUserPayload)
      .expect(200)

    assert.exists(body.user, 'User is undefined')
    assert.equal(body.user.email, email)
    assert.equal(body.user.avatar, avatar)
    assert.equal(body.user.id, id)
  })

  test("It should update the user's password", async (assert) => {
    const user = await UserFactory.create()
    const password = 'test_password@123'

    const updateUserPayload = {
      email: user.email,
      avatar: user.avatar,
      password,
    }

    const { body } = await supertest(BASE_URL)
      .put(`/users/${user.id}`)
      .send(updateUserPayload)
      .expect(200)

    await user.refresh()

    assert.exists(body.user, 'User is undefined')
    assert.equal(body.user.id, user.id)
    assert.isTrue(await Hash.verify(user.password, password))
  })

  test('It should return 422 when required data is not provided', async (assert) => {
    const { id } = await UserFactory.create()

    const { body } = await supertest(BASE_URL).put(`/users/${id}`).send({}).expect(422)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('It should return 422 when a invalid email is provided', async (assert) => {
    const user = await UserFactory.create()

    const updateUserPayload = {
      email: 'test@',
      password: user.password,
      avatar: user.avatar,
    }

    const { body } = await supertest(BASE_URL)
      .put(`/users/${user.id}`)
      .send(updateUserPayload)
      .expect(422)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('It should return 422 when a invalid password is provided', async (assert) => {
    const user = await UserFactory.create()

    const updateUserPayload = {
      email: 'new_email@test.com',
      password: '123',
      avatar: user.avatar,
    }

    const { body } = await supertest(BASE_URL)
      .put(`/users/${user.id}`)
      .send(updateUserPayload)
      .expect(422)

    assert.exists(body.message, 'There is no error message in the body')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })
})
