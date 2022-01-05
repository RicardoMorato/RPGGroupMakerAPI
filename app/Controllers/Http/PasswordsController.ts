import Mail from '@ioc:Adonis/Addons/Mail'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class PasswordsController {
  public async forgotPassword({ request, response }: HttpContextContract) {
    const { email } = request.only(['email'])

    await Mail.send((message) => {
      message
        .from('no-reply@rpgtablemaker.com')
        .to(email)
        .subject('RPGTableMaker: Recuperação de senha')
        .text('Clique no link abaixo para redefinir sua senha')
    })

    return response.noContent()
  }
}
