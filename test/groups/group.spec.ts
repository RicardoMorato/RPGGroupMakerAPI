import Database from '@ioc:Adonis/Lucid/Database'
import { UserFactory } from 'Database/factories'
import test from 'japa'
import supertest from 'supertest'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`

test.group('Groups', (group) => {
  group.beforeEach(async () => {
    await Database.beginGlobalTransaction()
  })

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction()
  })

  test('It should create a group', async (assert) => {
    const user = await UserFactory.create()
    const groupPayload = {
      name: 'test-group',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: user.id,
    }

    const { body } = await supertest(BASE_URL).post('/groups').send(groupPayload).expect(201)

    assert.exists(body.group, 'Group is not defined')
    assert.equal(body.group.name, groupPayload.name)
    assert.equal(body.group.description, groupPayload.description)
    assert.equal(body.group.schedule, groupPayload.schedule)
    assert.equal(body.group.location, groupPayload.location)
    assert.equal(body.group.chronicle, groupPayload.chronicle)
    assert.equal(body.group.master, groupPayload.master)
  })

  test('It should return 422 when required data is not provided', async (assert) => {
    const { body } = await supertest(BASE_URL).post('/groups').send({}).expect(422)

    assert.exists(body.message, 'Error message is not defined')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })
})
