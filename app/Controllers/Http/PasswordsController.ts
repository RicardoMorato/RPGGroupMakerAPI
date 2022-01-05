import Mail from '@ioc:Adonis/Addons/Mail'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'

export default class PasswordsController {
  public async forgotPassword({ request, response }: HttpContextContract) {
    const { email, resetPasswordUrl } = request.only(['email', 'resetPasswordUrl'])

    const user = await User.findByOrFail('email', email)

    await Mail.send((message) => {
      message
        .from('no-reply@rpgtablemaker.com')
        .to(email)
        .subject('RPGTableMaker: Recuperação de senha')
        .htmlView('emails/forgotpassword', {
          productName: 'RPGTableMaker',
          name: user.username,
          resetPasswordUrl,
        })
    })

    return response.noContent()
  }
}
