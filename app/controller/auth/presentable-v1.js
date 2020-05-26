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

    /**
     * presentable授权
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentableAuth(ctx) {

        const presentableId = ctx.checkParams('presentableId').optional().isPresentableId().value
        const releaseName = ctx.checkQuery('releaseName').optional().isFullReleaseName().value
        const releaseId = ctx.checkQuery('releaseId').optional().isReleaseId().value
        const nodeId = ctx.checkParams('nodeId').optional().isInt().gt(0).value
        const extName = ctx.checkParams('extName').optional().type('string').in(['file', 'info', 'release', 'auth']).value
        ctx.validateParams().validateVisitorIdentity(LoginUser | UnLoginUser | InternalClient)

        if (!presentableId && !releaseId && !releaseName) {
            throw new ArgumentError("params-required-validate-failed", 'releaseId,releaseName')
        }

        var presentableInfo = null
        if (presentableId) {
            presentableInfo = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}`)
        } else if (releaseId) {
            presentableInfo = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/detail?nodeId=${nodeId}&releaseId=${releaseId}`)
        } else if (releaseName) {
            presentableInfo = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/detail?nodeId=${nodeId}&releaseName=${releaseName}`)
        }

        ctx.entityNullObjectCheck(presentableInfo)

        const authResult = await ctx.service.presentableAuthService.presentableAllChainAuth(presentableInfo)

        const entityNid = presentableInfo.presentableId.substr(0, 12)
        const responseResourceInfo = await ctx.service.presentableAuthService.getRealResponseReleaseInfo(presentableInfo.presentableId, entityNid)
        responseResourceInfo.releaseName = presentableInfo['presentableName']

        await this._responseAuthResult(presentableInfo, authResult, responseResourceInfo, extName)
    }

    /**
     * presentable的依赖子发行授权
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentableSubReleaseAuth(ctx) {

        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value
        const entityNid = ctx.checkQuery('entityNid').exist().type('string').len(12, 12).value
        const subReleaseId = ctx.checkQuery('subReleaseId').optional().isReleaseId().value
        const subReleaseName = ctx.checkQuery('subReleaseName').optional().isFullReleaseName().value
        const extName = ctx.checkParams('extName').optional().type('string').in(['file', 'info', 'auth']).value
        ctx.validateParams().validateVisitorIdentity(LoginUser | UnLoginUser | InternalClient)

        if (!subReleaseId && !subReleaseName) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed', 'subReleaseName'))
        }

        const presentableInfo = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}`)
        ctx.entityNullObjectCheck(presentableInfo)

        const responseResourceInfo = await ctx.service.presentableAuthService.getRealResponseReleaseInfo(presentableId, entityNid, subReleaseId, subReleaseName)
        if (!responseResourceInfo) {
            throw new ArgumentError(ctx.gettext('params-relevance-validate-failed', 'presentableId,entityNid,subReleaseId,subReleaseName'))
        }

        const authResult = await ctx.service.presentableAuthService.presentableAllChainAuth(presentableInfo)

        await this._responseAuthResult(presentableInfo, authResult, responseResourceInfo, extName)
    }

    /**
     * presentable授权树授权概况(树状图)
     * @returns {Promise<void>}
     */
    async presentableNodeAndReleaseSideAuthSketch(ctx) {

        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const presentableInfo = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}`)
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        })

        await ctx.service.presentableAuthService.presentableNodeAndReleaseSideAuthSketch(presentableInfo).then(ctx.success)
    }

    /**
     * 发行具体版本(方案)的授权概况(树状图)
     * @param ctx
     * @returns {Promise<void>}
     */
    async releaseSchemeAuthSketch(ctx) {

        const releaseId = ctx.checkParams("releaseId").exist().isReleaseId().value
        const version = ctx.checkParams("version").exist().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const releaseInfo = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${releaseId}`)
        ctx.entityNullValueAndUserAuthorizationCheck(releaseInfo, {
            msg: ctx.gettext('params-validate-failed', 'releaseId')
        })

        if (!releaseInfo['resourceVersions'].some(x => x.version === version)) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'version'))
        }
    }

    /**
     * 获取presentable节点和发行侧授权
     * @returns {Promise<void>}
     */
    async presentableNodeAndReleaseSideAuth(ctx) {

        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const presentableInfo = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}`)
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo)

        const nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${presentableInfo.nodeId}`)
        ctx.entityNullObjectCheck(nodeInfo)

        const {userInfo} = ctx.request.identityInfo
        const presentableAuthTree = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableInfo.presentableId}/authTree`)

        await ctx.service.presentableAuthService.presentableNodeAndReleaseSideAuth(presentableInfo, presentableAuthTree, nodeInfo, userInfo).then(ctx.success)
    }

    /**
     * 获取presentable节点和发行侧授权
     * @returns {Promise<void>}
     */
    async batchPresentableNodeAndReleaseSideAuth(ctx) {

        const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const presentableInfos = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/list?presentableIds=${presentableIds.toString()}`)
        if (lodash.uniq(presentableIds).length !== presentableInfos.length) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'presentableIds'))
        }

        const nodeIds = lodash.chain(presentableInfos).map(x => x.nodeId).uniq().value()
        if (nodeIds.length > 1) {
            throw new ArgumentError('presentable must be vest the same node')
        }

        const nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeIds[0]}`)
        ctx.entityNullValueAndUserAuthorizationCheck(nodeInfo, {property: 'ownerUserId'})

        await ctx.service.presentableAuthService.batchPresentableNodeAndReleaseSideAuth(presentableInfos, nodeInfo).then(ctx.success)
    }

    /**
     * 批量针对发行进行策略身份认证
     * @param ctx
     * @returns {Promise<void>}
     */
    async batchReleasePolicyIdentityAuthentication(ctx) {

        const policyIdsRegex = /^[0-9a-f]{32}(,[0-9a-f]{32})*$/
        const releaseIds = ctx.checkQuery('releaseIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value
        const nodeId = ctx.checkQuery('nodeId').optional().isInt().toInt().gt(0).value
        const policyIds = ctx.checkQuery('policyIds').optional().match(policyIdsRegex).toSplitArray().len(1, 100).default([]).value
        const isFilterSignedPolicy = ctx.checkQuery('isFilterSignedPolicy').optional().toInt().default(0).in([0, 1]).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        var nodeInfo = null
        if (nodeId) {
            nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`)
            ctx.entityNullValueAndUserAuthorizationCheck(nodeInfo, {
                msg: ctx.gettext('params-validate-failed', 'nodeId'),
                property: 'ownerUserId'
            })
        }

        if (policyIds.length && policyIds.length !== releaseIds.length) {
            throw new ArgumentError(ctx.gettext('params-comb-validate-failed', 'releaseIds,policyIds'))
        }

        await ctx.service.policyAuthService.batchReleasePolicyIdentityAuthentication(releaseIds, policyIds, nodeInfo, isFilterSignedPolicy)
            .then(ctx.success)
    }

    /**
     * 指定策略的授权对象检查
     * @param ctx
     * @returns {Promise<void>}
     */
    async batchPresentablePolicyIdentityAuthentication(ctx) {

        const policyIdsRegex = /^[0-9a-f]{32}(,[0-9a-f]{32})*$/
        const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value
        const policyIds = ctx.checkQuery('policyIds').optional().match(policyIdsRegex).toSplitArray().len(1, 100).default([]).value
        const isFilterSignedPolicy = ctx.checkQuery('isFilterSignedPolicy').optional().toInt().default(0).in([0, 1]).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        if (policyIds.length && policyIds.length !== presentableIds.length) {
            throw new ArgumentError(ctx.gettext('params-comb-validate-failed', 'presentableIds,policyIds'))
        }

        await ctx.service.policyAuthService.batchPresentablePolicyIdentityAuthentication(presentableIds, policyIds, isFilterSignedPolicy)
            .then(ctx.success)
    }


    /**
     * 响应授权结果
     * @param presentableInfo
     * @param authResult
     * @param responseResourceInfo
     * @param extName
     * @returns {Promise<*>}
     * @private
     */
    async _responseAuthResult(presentableInfo, authResult, responseResourceInfo, extName) {

        const {ctx} = this
        const responseDependencies = responseResourceInfo.dependencies.map(x => Object({
            id: x.releaseId, name: x.releaseName, type: 'release', resourceType: x.resourceType
        }))

        ctx.set('freelog-entity-nid', responseResourceInfo['nid'])
        ctx.set('freelog-sub-dependencies', cryptoHelper.base64Encode(JSON.stringify(responseDependencies)))

        if (!authResult.isAuth) {
            authResult.data.presentableInfo = lodash.pick(presentableInfo, ["presentableId", "presentableName", "intro", "nodeId", "policies", "releaseInfo"])
        }
        if (extName === 'auth') {
            return ctx.success(authResult)
        }
        if (!authResult.isAuth) {
            throw new AuthorizationError(ctx.gettext('test-resource-authorization-failed'), {
                authCode: authResult.authCode, authResult
            })
        }
        if (extName === 'info') {
            return ctx.success(presentableInfo)
        }
        if (extName === 'release') {
            const releaseInfo = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${presentableInfo.releaseInfo.releaseId}`)
            return ctx.success(releaseInfo)
        }

        await this._responseResourceFile(responseResourceInfo.resourceId, responseResourceInfo.releaseName)
    }


    /**
     * 响应资源文件
     * @param resourceId
     * @param filename
     * @returns {Promise<void>}
     * @private
     */
    async _responseResourceFile(resourceId, filename) {

        const {ctx, app} = this

        const signedResourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/${resourceId}/signedResourceInfo`)
        const {aliasName, meta = {}, systemMeta, resourceType, resourceFileUrl} = signedResourceInfo

        ctx.set('freelog-resource-type', resourceType)
        ctx.set('freelog-meta', encodeURIComponent(JSON.stringify(meta)))
        ctx.set('freelog-system-meta', encodeURIComponent(JSON.stringify(lodash.omit(systemMeta, 'dependencies'))))

        if (ctx.get('If-None-Match') === resourceId) {
            ctx.status = 304
            return
        }

        await ctx.curl(resourceFileUrl, {streaming: true}).then(({status, headers, res}) => {
            if (status < 200 || status > 299) {
                throw new ApplicationError(ctx.gettext('文件流读取失败'), {httpStatus: status})
            }
            ctx.body = res
            ctx.status = status
            ctx.attachment(filename || aliasName)
            ctx.set('content-type', systemMeta.mimeType)
            ctx.set('content-length', headers['content-length'])
            ctx.set('Last-Modified', signedResourceInfo.createDate)
            ctx.set('ETag', resourceId)
        })

        if (resourceType === app.resourceType.VIDEO || resourceType === app.resourceType.AUDIO) {
            ctx.set('Accept-Ranges', 'bytes')
        }
    }
}