'use strict'

const lodash = require('lodash')
const semver = require('semver')
const Controller = require('egg').Controller
const cryptoHelper = require('egg-freelog-base/app/extend/helper/crypto_helper')
const {ArgumentError, ApplicationError, AuthorizationError} = require('egg-freelog-base/error')
const {LoginUser, UnLoginUser, InternalClient} = require('egg-freelog-base/app/enum/identity-type')

module.exports = class PresentableOrResourceAuthController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    
    async presentableAuth(ctx) {

        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value
        const extName = ctx.checkParams('extName').optional().type('string').in(['file', 'info', 'release', 'auth']).value
        ctx.validateParams().validateVisitorIdentity(LoginUser | UnLoginUser | InternalClient)

        const presentableInfo = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}`)
        ctx.entityNullObjectCheck(presentableInfo)

        const authResult = await ctx.service.presentableAuthService.presentableAllChainAuth(presentableInfo)
        if (!authResult.isAuth) {
            authResult.data.presentableInfo = lodash.pick(presentableInfo, ["presentableId", "presentableName", "intro", "policies"])
        }

        await this._responseSubDependToHeader(presentableId)

        if (extName === 'auth') {
            return ctx.success(authResult)
        }
        if (!authResult.isAuth) {
            throw new AuthorizationError(ctx.gettext('presentable-authorization-failed'), {
                authCode: authResult.authCode, authResult
            })
        }
        if (extName === 'info') {
            return ctx.success(presentableInfo)
        }
        const releaseInfo = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${presentableInfo.releaseInfo.releaseId}`)
        if (extName === 'release') {
            return ctx.success(releaseInfo)
        }

        const resourceVersion = releaseInfo.resourceVersions.find(x => x.version === presentableInfo.releaseInfo.version)

        await this._responseResourceFile(resourceVersion.resourceId, presentableId)
    }
}