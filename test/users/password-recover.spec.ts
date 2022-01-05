import Mail from '@ioc:Adonis/Addons/Mail'
import Database from '@ioc:Adonis/Lucid/Database'
import { UserFactory } from 'Database/factories'
import test from 'japa'
import supertest from 'supertest'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`

test.group('Password Recover', (group) => {
  group.beforeEach(async () => {
    await Database.beginGlobalTransaction()
  })

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction()
  })

  test.only('It should send an email with instructions to recover a forgotten password', async (assert) => {
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
})
