import Mail from '@ioc:Adonis/Addons/Mail'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { randomBytes } from 'crypto'
import { promisify } from 'util'

import User from 'App/Models/User'
import ForgotPassword from 'App/Validators/ForgotPasswordValidator'

export default class PasswordsController {
  public async forgotPassword({ request, response }: HttpContextContract) {
    const { email, resetPasswordUrl } = await request.validate(ForgotPassword)

    const user = await User.findByOrFail('email', email)

    const random = await promisify(randomBytes)(24)
    const token = random.toString('hex')
    await user.related('tokens').updateOrCreate({ userId: user.id }, { token })

    const resetPasswordUrlWithToken = `${resetPasswordUrl}?token=${token}`

    await Mail.send((message) => {
      message
        .from('no-reply@rpgtablemaker.com')
        .to(email)
        .subject('RPGTableMaker: Recuperação de senha')
        .htmlView('emails/forgotpassword', {
          productName: 'RPGTableMaker',
          name: user.username,
          resetPasswordUrl: resetPasswordUrlWithToken,
        })
    })

    return response.noContent()
  }
}
