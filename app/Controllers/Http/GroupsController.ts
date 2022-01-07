import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Group from 'App/Models/Group'
import CreateGroup from 'App/Validators/CreateGroupValidator'
import BadRequest from 'App/Exceptions/BadRequestException'

export default class GroupsController {
  public async index({ request, response }: HttpContextContract) {
    const { user: userId, text } = request.qs()

    const page = request.input('page', 1)
    const limit = request.input('limit', 5)

    const groupsQuery = this._filterByQueryString(userId, text)

    const groups = await groupsQuery.paginate(page, limit)

    return response.ok({ groups })
  }

  public async store({ request, response }: HttpContextContract) {
    const groupPayload = await request.validate(CreateGroup)

    const group = await Group.create(groupPayload)

    await group.related('players').attach([groupPayload.master])
    await group.load('players')

    return response.created({ group })
  }

  public async update({ request, response, bouncer }: HttpContextContract) {
    const id = request.param('id')
    const payload = request.all()

    const group = await Group.findOrFail(id)

    await bouncer.authorize('updateGroup', group)

    const updateGroup = await group.merge(payload).save()

    return response.ok({ group: updateGroup })
  }

  public async removePlayer({ request, response }: HttpContextContract) {
    const groupId = request.param('groupId') as number
    const playerId = +request.param('playerId')

    const group = await Group.findOrFail(groupId)

    if (playerId === group.master) throw new BadRequest('Cannot remove master from group', 400)

    await group.related('players').detach([playerId])

    return response.ok({})
  }

  public async destroy({ request, response, bouncer }: HttpContextContract) {
    const id = request.param('id')

    const group = await Group.findOrFail(id)

    await bouncer.authorize('deleteGroup', group)

    await group.delete()

    return response.ok({})
  }

  private _filterByQueryString(userId: number | undefined, text: string | undefined) {
    if (userId && text) return this._filterGroupsByUserAndText(userId, text)
    else if (userId) return this._filterGroupsByUser(userId)
    else if (text) return this._filterGroupsByText(text)
    else return this._allGroups()
  }

  private _allGroups() {
    return Group.query().preload('players').preload('masterUser')
  }

  private _filterGroupsByUser(userId: number) {
    return Group.query()
      .preload('players')
      .preload('masterUser')
      .withScopes((scope) => scope.withPlayer(userId))
  }

  private _filterGroupsByText(text: string) {
    return Group.query()
      .preload('players')
      .preload('masterUser')
      .withScopes((scope) => scope.withText(text))
  }

  private _filterGroupsByUserAndText(userId: number, text: string) {
    return Group.query()
      .preload('players')
      .preload('masterUser')
      .withScopes((scope) => scope.withPlayer(userId))
      .withScopes((scope) => scope.withText(text))
  }
}
