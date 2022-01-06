import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BadRequest from 'App/Exceptions/BadRequestException'
import User from 'App/Models/User'
import CreateUser from 'App/Validators/CreateUserValidator'
import UpdateUser from 'App/Validators/UpdateUserValidator'

export default class UsersController {
  public async store({ request, response }: HttpContextContract) {
    const userPayload = await request.validate(CreateUser)

    const userByEmail = await User.findBy('email', userPayload.email)

    if (userByEmail) throw new BadRequest('Email already in use', 400)

    const userByUsername = await User.findBy('username', userPayload.username)

    if (userByUsername) throw new BadRequest('Username already in use', 400)

    const user = await User.create(userPayload)

    return response.created({ user })
  }

  public async update({ request, response, bouncer }: HttpContextContract) {
    const { email, password, avatar } = await request.validate(UpdateUser)
    const id = request.param('id')

    const user = await User.findOrFail(id)

    await bouncer.authorize('updateUser', user)

    user.email = email
    user.password = password
    if (avatar) user.avatar = avatar

    await user.save()

    return response.ok({ user })
  }
}
