'use strict'

const lodash = require('lodash')
const semver = require('semver')
const Controller = require('egg').Controller
const {ArgumentError, ApplicationError, AuthorizationError} = require('egg-freelog-base/error')
const {LoginUser, UnLoginUser, InternalClient} = require('egg-freelog-base/app/enum/identity-type')

module.exports = class PresentableOrResourceAuthController extends Controller {

    /**
     * 发行授权(直接请求获取release)
     * @param ctx
     * @returns {Promise<void>}
     */
    async releaseAuth(ctx) {

        const releaseId = ctx.checkParams("releaseId").exist().isReleaseId().value
        const nodeId = ctx.checkQuery('nodeId').optional().toInt().gt(0).value
        const identityType = ctx.checkQuery('identityType').exist().toInt().in([1, 2, 3]).value //1:资源方 2:节点方 3:C端消费
        const versionRange = ctx.checkQuery("versionRange").exist().is(semver.validRange, ctx.gettext('params-format-validate-failed', 'versionRange')).value
        const extName = ctx.checkParams('extName').optional().type('string').in(['file', 'info', 'auth']).value
        ctx.validateParams().validateVisitorIdentity(LoginUser | UnLoginUser | InternalClient)

        if (identityType === 2 && !nodeId) {
            throw new ArgumentError(ctx.gettext('params-comb-validate-failed', 'identityType,nodeId'), {versionRange})
        }

        const releaseInfo = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${releaseId}`)
        ctx.entityNullObjectCheck(releaseInfo)

        const {resourceVersions, policies, userId} = releaseInfo
        const version = semver.maxSatisfying(resourceVersions.map(x => x.version), versionRange)
        if (!version) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'versionRange'), {versionRange})
        }

        var nodeInfo = null
        if (identityType === 2) {
            nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`)
            ctx.entityNullObjectCheck(nodeInfo)
        }

        const authResult = await ctx.service.policyAuthService.policyAuthorization({
            policies,
            policyType: 1,
            partyOneUserId: userId,
            partyTwoInfo: nodeInfo,
            partyTwoUserInfo: ctx.request.identityInfo.userInfo,
        })

        if (extName === 'auth') {
            return ctx.success(authResult)
        }
        if (!authResult.isAuth) {
            throw new AuthorizationError(ctx.gettext('release-policy-authorization-failed'), {
                authCode: authResult.authCode, authResult
            })
        }
        if (extName === 'info') {
            return ctx.success(releaseInfo)
        }

        const resourceVersion = resourceVersions.find(x => x.version === version)

        await this._responseResourceFile(resourceVersion.resourceId, releaseId)
    }

    /**
     * 响应资源文件
     * @param resourceId
     * @param filename
     * @returns {Promise<void>}
     * @private
     */
    async _responseResourceFile(resourceId, filename) {

        const {ctx} = this

        const signedResourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/${resourceId}/signedResourceInfo`)
        const {aliasName, meta = {}, systemMeta, resourceType, resourceFileUrl} = signedResourceInfo

        ctx.set('freelog-resource-type', resourceType)
        ctx.set('freelog-meta', encodeURIComponent(JSON.stringify(meta)))
        ctx.set('freelog-system-meta', encodeURIComponent(JSON.stringify(lodash.omit(systemMeta, 'dependencies'))))

        await ctx.curl(resourceFileUrl, {streaming: true}).then(({status, headers, res}) => {
            if (status < 200 || status > 299) {
                throw new ApplicationError(ctx.gettext('文件流读取失败'), {httpStatus: status})
            }
            ctx.body = res
            ctx.status = status
            ctx.attachment(filename || aliasName)
            ctx.set('content-type', headers['content-type'])
            ctx.set('content-length', headers['content-length'])
        })
    }

}