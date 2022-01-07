import Database from '@ioc:Adonis/Lucid/Database'
import User from 'App/Models/User'
import { GroupFactory, UserFactory } from 'Database/factories'
import test from 'japa'
import supertest from 'supertest'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`

let TOKEN = ''
let USER = {} as User

test.group('Group Request', (group) => {
  group.beforeEach(async () => {
    await Database.beginGlobalTransaction()
  })

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction()
  })

  group.before(async () => {
    const plainTextPassword = 'test@123'
    const user = await UserFactory.merge({ password: plainTextPassword }).create()

    const { body } = await supertest(BASE_URL)
      .post('/sessions')
      .send({ email: user.email, password: plainTextPassword })
      .expect(201)

    TOKEN = body.token.token
    USER = user
  })

  group.after(async () => {
    await supertest(BASE_URL).delete('/sessions').set('Authorization', `Bearer ${TOKEN}`)
  })

  test('It should create a group request', async (assert) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const { body } = await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({})
      .expect(201)

    assert.exists(body.groupRequest, 'Group Request is not defined')
    assert.equal(body.groupRequest.userId, USER.id)
    assert.equal(body.groupRequest.groupId, group.id)
    assert.equal(body.groupRequest.status, 'PENDING')
  })

  test('It should return 409 when group request already exists', async (assert) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({})

    const { body } = await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({})
      .expect(409)

    assert.exists(body.message, 'Error message is not defined')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 409)
  })

  test('It should return 422 when user is already in the group', async (assert) => {
    const groupPayload = {
      name: 'test-group',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: USER.id,
    }

    // Master is added to the group created
    const response = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)

    // A group request is fired, trying to add the master to the group again
    const { body } = await supertest(BASE_URL)
      .post(`/groups/${response.body.group.id}/requests`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({})
      .expect(422)

    assert.exists(body.message, 'Error message is not defined')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })
})