import Database from '@ioc:Adonis/Lucid/Database'
import { GroupFactory, UserFactory } from 'Database/factories'
import test from 'japa'
import supertest from 'supertest'

import User from 'App/Models/User'
import Group from 'App/Models/Group'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}/api/v1`

let TOKEN = ''
let USER = {} as User

test.group('Groups', (group) => {
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

    const { body } = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)
      .expect(201)

    assert.exists(body.group, 'Group is not defined')
    assert.equal(body.group.name, groupPayload.name)
    assert.equal(body.group.description, groupPayload.description)
    assert.equal(body.group.schedule, groupPayload.schedule)
    assert.equal(body.group.location, groupPayload.location)
    assert.equal(body.group.chronicle, groupPayload.chronicle)
    assert.equal(body.group.master, groupPayload.master)
    assert.exists(body.group.players, 'Players are not defined')
    assert.equal(body.group.players.length, 1)
    assert.equal(body.group.players[0].id, groupPayload.master)
  })

  test('It should return 422 when required data is not provided', async (assert) => {
    const { body } = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({})
      .expect(422)

    assert.exists(body.message, 'Error message is not defined')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 422)
  })

  test('It should update a group', async (assert) => {
    const group = await GroupFactory.merge({ master: USER.id }).create()

    const payload = {
      name: 'test-group',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
    }

    const { body } = await supertest(BASE_URL)
      .patch(`/groups/${group.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(payload)
      .expect(200)

    assert.exists(body.group, 'Group is not defined')
    assert.equal(body.group.name, payload.name)
    assert.equal(body.group.description, payload.description)
    assert.equal(body.group.schedule, payload.schedule)
    assert.equal(body.group.location, payload.location)
    assert.equal(body.group.chronicle, payload.chronicle)
  })

  test('It should return 404 when providing a nonexisting group for update', async (assert) => {
    const invalidGroupId = '123123123213'
    const { body } = await supertest(BASE_URL)
      .patch(`/groups/${invalidGroupId}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({})
      .expect(404)

    assert.exists(body.message, 'Error message is not defined')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 404)
  })

  test('It should remove user from group', async (assert) => {
    // Create group with master being USER
    const group = await GroupFactory.merge({ master: USER.id }).create()

    const plainTextPassword = 'test@123'
    const newUser = await UserFactory.merge({ password: plainTextPassword }).create()

    // Login with a new newUser
    const response = await supertest(BASE_URL)
      .post('/sessions')
      .send({ email: newUser.email, password: plainTextPassword })
    const playerToken = response.body.token.token

    // As the newUser, ask to enter the group created previously
    const { body } = await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({})

    // As the USER, accept the player in the group
    await supertest(BASE_URL)
      .post(`/groups/${group.id}/requests/${body.groupRequest.id}/accept`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200)

    await supertest(BASE_URL)
      .delete(`/groups/${group.id}/players/${newUser.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({})
      .expect(200)

    await group.load('players')

    assert.isEmpty(group.players)
  })

  test('It should not remove the master of the group', async (assert) => {
    const groupPayload = {
      name: 'test-group',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: USER.id,
    }

    const { body } = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)

    const groupId = body.group.id

    await supertest(BASE_URL)
      .delete(`/groups/${groupId}/players/${USER.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({})
      .expect(400)

    const group = await Group.findOrFail(body.group.id)
    await group.load('players')

    assert.isNotEmpty(group.players)
  })

  test('It should remove the group', async (assert) => {
    const groupPayload = {
      name: 'test-group',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: USER.id,
    }

    const { body } = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)

    const groupId = body.group.id

    await supertest(BASE_URL)
      .delete(`/groups/${groupId}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({})
      .expect(200)

    const emptyGroup = await Database.query().from('groups').where('id', groupId)

    const players = await Database.query().from('groups_users')

    assert.isEmpty(emptyGroup)
    assert.isEmpty(players)
  })

  test('It should return 404 when providing a nonexisting group for deletion', async (assert) => {
    const invalidGroupId = '1238912312'

    const { body } = await supertest(BASE_URL)
      .delete(`/groups/${invalidGroupId}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({})
      .expect(404)

    assert.exists(body.message, 'Error message is not defined')
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 404)
  })

  test('It should return all groups when no query is provided to list groups', async (assert) => {
    const groupPayload = {
      name: 'test-group',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: USER.id,
    }

    const response = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200)

    assert.exists(body.groups.data, 'Groups are not defined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)

    assert.exists(body.groups.data[0].masterUser, 'Master is not defined')
    assert.equal(body.groups.data[0].masterUser.id, USER.id)
    assert.equal(body.groups.data[0].masterUser.username, USER.username)

    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, USER.id)
    assert.equal(body.groups.data[0].players[0].email, USER.email)
    assert.equal(body.groups.data[0].players[0].username, USER.username)
  })

  test('It should return no groups by user id', async (assert) => {
    const groupPayload = {
      name: 'test-group',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: USER.id,
    }

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)
      .expect(201)

    const invalidUserId = 123

    const { body } = await supertest(BASE_URL)
      .get(`/groups?user=${invalidUserId}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200)

    assert.exists(body.groups.data, 'Groups are not defined')
    assert.equal(body.groups.data.length, 0)
  })

  test('It should return all groups by user id', async (assert) => {
    const groupPayload = {
      name: 'test-group',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: USER.id,
    }

    const response = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get(`/groups?user=${USER.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200)

    assert.exists(body.groups.data, 'Groups are not defined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)

    assert.exists(body.groups.data[0].masterUser, 'Master is not defined')
    assert.equal(body.groups.data[0].masterUser.id, USER.id)
    assert.equal(body.groups.data[0].masterUser.username, USER.username)

    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, USER.id)
    assert.equal(body.groups.data[0].players[0].email, USER.email)
    assert.equal(body.groups.data[0].players[0].username, USER.username)
  })

  test('It should return all groups by user id and name', async (assert) => {
    const groupPayload = {
      name: 'test-group',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: USER.id,
    }

    const response = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Another group', description: 'Another description' })
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Yet another group', description: 'Yet another description' })
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get(`/groups?user=${USER.id}&text=${group.name}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200)

    assert.exists(body.groups.data, 'Groups are not defined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)

    assert.exists(body.groups.data[0].masterUser, 'Master is not defined')
    assert.equal(body.groups.data[0].masterUser.id, USER.id)
    assert.equal(body.groups.data[0].masterUser.username, USER.username)

    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, USER.id)
    assert.equal(body.groups.data[0].players[0].email, USER.email)
    assert.equal(body.groups.data[0].players[0].username, USER.username)
  })

  test('It should return all groups by user id and a part of the name', async (assert) => {
    const groupName = 'test-group'
    const partialGroupName = 'test-g'

    const groupPayload = {
      name: groupName,
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: USER.id,
    }

    const response = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Another group', description: 'Another description' })
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Yet another group', description: 'Yet another description' })
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get(`/groups?user=${USER.id}&text=${partialGroupName}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200)

    assert.exists(body.groups.data, 'Groups are not defined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)

    assert.exists(body.groups.data[0].masterUser, 'Master is not defined')
    assert.equal(body.groups.data[0].masterUser.id, USER.id)
    assert.equal(body.groups.data[0].masterUser.username, USER.username)

    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, USER.id)
    assert.equal(body.groups.data[0].players[0].email, USER.email)
    assert.equal(body.groups.data[0].players[0].username, USER.username)
  })

  test('It should return all groups by user id and description', async (assert) => {
    const groupPayload = {
      name: 'test-group',
      description: 'Just a description here',
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: USER.id,
    }

    const response = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Another group', description: 'Another description' })
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Yet another group', description: 'Yet another description' })
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get(`/groups?user=${USER.id}&text=${group.description}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200)

    assert.exists(body.groups.data, 'Groups are not defined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)

    assert.exists(body.groups.data[0].masterUser, 'Master is not defined')
    assert.equal(body.groups.data[0].masterUser.id, USER.id)
    assert.equal(body.groups.data[0].masterUser.username, USER.username)

    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, USER.id)
    assert.equal(body.groups.data[0].players[0].email, USER.email)
    assert.equal(body.groups.data[0].players[0].username, USER.username)
  })

  test('It should return all groups by user id and a part of the description', async (assert) => {
    const groupDescription = 'Just a description here'
    const partialGroupDescription = 'st a des'

    const groupPayload = {
      name: 'test-group',
      description: groupDescription,
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: USER.id,
    }

    const response = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Another group', description: 'Another description' })
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Yet another group', description: 'Yet another description' })
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get(`/groups?user=${USER.id}&text=${partialGroupDescription}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200)

    assert.exists(body.groups.data, 'Groups are not defined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)

    assert.exists(body.groups.data[0].masterUser, 'Master is not defined')
    assert.equal(body.groups.data[0].masterUser.id, USER.id)
    assert.equal(body.groups.data[0].masterUser.username, USER.username)

    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, USER.id)
    assert.equal(body.groups.data[0].players[0].email, USER.email)
    assert.equal(body.groups.data[0].players[0].username, USER.username)
  })

  test('It should return all groups by name', async (assert) => {
    const groupPayload = {
      name: 'test-group',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: USER.id,
    }

    const response = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Another group', description: 'Another description' })
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Yet another group', description: 'Yet another description' })
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get(`/groups?text=${group.name}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200)

    assert.exists(body.groups.data, 'Groups are not defined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)

    assert.exists(body.groups.data[0].masterUser, 'Master is not defined')
    assert.equal(body.groups.data[0].masterUser.id, USER.id)
    assert.equal(body.groups.data[0].masterUser.username, USER.username)

    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, USER.id)
    assert.equal(body.groups.data[0].players[0].email, USER.email)
    assert.equal(body.groups.data[0].players[0].username, USER.username)
  })

  test('It should return all groups by a part of the name', async (assert) => {
    const groupName = 'test-group'
    const partialGroupName = 'st-g'

    const groupPayload = {
      name: groupName,
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: USER.id,
    }

    const response = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Another group', description: 'Another description' })
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Yet another group', description: 'Yet another description' })
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get(`/groups?text=${partialGroupName}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200)

    assert.exists(body.groups.data, 'Groups are not defined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)

    assert.exists(body.groups.data[0].masterUser, 'Master is not defined')
    assert.equal(body.groups.data[0].masterUser.id, USER.id)
    assert.equal(body.groups.data[0].masterUser.username, USER.username)

    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, USER.id)
    assert.equal(body.groups.data[0].players[0].email, USER.email)
    assert.equal(body.groups.data[0].players[0].username, USER.username)
  })

  test('It should return all groups by description', async (assert) => {
    const groupPayload = {
      name: 'test-group',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: USER.id,
    }

    const response = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Another group', description: 'Another description' })
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Yet another group', description: 'Yet another description' })
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get(`/groups?text=${group.description}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200)

    assert.exists(body.groups.data, 'Groups are not defined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)

    assert.exists(body.groups.data[0].masterUser, 'Master is not defined')
    assert.equal(body.groups.data[0].masterUser.id, USER.id)
    assert.equal(body.groups.data[0].masterUser.username, USER.username)

    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, USER.id)
    assert.equal(body.groups.data[0].players[0].email, USER.email)
    assert.equal(body.groups.data[0].players[0].username, USER.username)
  })

  test('It should return all groups by a part of the description', async (assert) => {
    const groupDescription = 'Just a description here'
    const partialGroupDescription = 'st a des'

    const groupPayload = {
      name: 'test-group',
      description: groupDescription,
      schedule: 'test',
      location: 'test',
      chronicle: 'test',
      master: USER.id,
    }

    const response = await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send(groupPayload)
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Another group', description: 'Another description' })
      .expect(201)

    await supertest(BASE_URL)
      .post('/groups')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ ...groupPayload, name: 'Yet another group', description: 'Yet another description' })
      .expect(201)

    const group = response.body.group

    const { body } = await supertest(BASE_URL)
      .get(`/groups?text=${partialGroupDescription}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200)

    assert.exists(body.groups.data, 'Groups are not defined')
    assert.equal(body.groups.data.length, 1)
    assert.equal(body.groups.data[0].id, group.id)
    assert.equal(body.groups.data[0].name, group.name)
    assert.equal(body.groups.data[0].description, group.description)
    assert.equal(body.groups.data[0].location, group.location)
    assert.equal(body.groups.data[0].schedule, group.schedule)

    assert.exists(body.groups.data[0].masterUser, 'Master is not defined')
    assert.equal(body.groups.data[0].masterUser.id, USER.id)
    assert.equal(body.groups.data[0].masterUser.username, USER.username)

    assert.isNotEmpty(body.groups.data[0].players, 'Empty players')
    assert.equal(body.groups.data[0].players[0].id, USER.id)
    assert.equal(body.groups.data[0].players[0].email, USER.email)
    assert.equal(body.groups.data[0].players[0].username, USER.username)
  })
})
