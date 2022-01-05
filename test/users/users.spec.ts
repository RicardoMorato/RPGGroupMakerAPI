import test from 'japa'
import supertest from 'supertest'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`

test.group('Users', () => {
  test.only('It should create a user', async (assert) => {
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
})
