import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BadRequest from 'App/Exceptions/BadRequestException'
import User from 'App/Models/User'

export default class UsersController {
  public async store({ request, response }: HttpContextContract) {
    const userPayload = request.only(['email', 'username', 'password', 'avatar'])

    if (!userPayload.email || !userPayload.username || !userPayload.password)
      throw new BadRequest('Not all required data was provided', 422)

    const userByEmail = await User.findBy('email', userPayload.email)

    if (userByEmail) throw new BadRequest('Email already in use', 400)

    const userByUsername = await User.findBy('username', userPayload.username)

    if (userByUsername) throw new BadRequest('Username already in use', 400)

    const user = await User.create(userPayload)

    return response.created({ user })
  }
}
