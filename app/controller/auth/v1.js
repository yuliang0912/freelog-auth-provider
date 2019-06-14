'use strict'

const lodash = require('lodash')
const semver = require('semver')
const Controller = require('egg').Controller
const {ArgumentError, ApplicationError, AuthorizationError} = require('egg-freelog-base/error')

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

        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value
        const extName = ctx.checkParams('extName').optional().type('string').in(['file', 'info', 'release', 'auth']).value
        ctx.validate(false)

        const presentableInfo = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}`)
        ctx.entityNullObjectCheck(presentableInfo)
        if (presentableInfo.isOnline !== 1) {
            throw new ArgumentError(ctx.gettext('presentable-online-check-failed'))
        }

        const authResult = await ctx.service.presentableAuthService.presentableAllChainAuth(presentableInfo)
        if (extName === 'auth') {
            return ctx.success(authResult)
        }
        if (!authResult.isAuth) {
            authResult.data.presentableInfo = lodash.pick(presentableInfo, ["presentableId", "presentableName", "intro", "policies"])
            throw new AuthorizationError(ctx.gettext('presentable-authorization-failed'), {
                authCode: authResult.authCode, authResult
            })
        }
        if (authResult.data.subReleases) {
            ctx.set('freelog-sub-releases', authResult.data.subReleases.map(({releaseId, version}) => `${releaseId}-${version}`).toString())
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

    /**
     * presentable的依赖子发行授权
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentableSubReleaseAuth(ctx) {

        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value
        const subReleaseId = ctx.checkParams('releaseId').exist().isReleaseId().value
        const version = ctx.checkQuery('version').exist().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value
        const extName = ctx.checkParams('extName').optional().type('string').in(['file', 'info', 'auth']).value
        ctx.validate(false)

        const presentableInfo = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}`)
        ctx.entityNullObjectCheck(presentableInfo)
        if (presentableInfo.isOnline !== 1) {
            throw new ArgumentError(ctx.gettext('presentable-online-check-failed'))
        }

        const subReleaseInfo = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${subReleaseId}`)
        ctx.entityNullObjectCheck(subReleaseInfo)

        const resourceVersion = subReleaseInfo.resourceVersions.find(x => x.version === version)
        if (!resourceVersion) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'version'))
        }

        const authResult = await ctx.service.presentableAuthService.presentableAllChainAuth(presentableInfo, subReleaseInfo, version)
        if (extName === 'auth') {
            return ctx.success(authResult)
        }
        if (!authResult.isAuth) {
            authResult.data = Object.assign(authResult.data || {}, {
                presentableInfo: lodash.pick(presentableInfo, ["presentableId", "presentableName", "intro", "nodeId", "policies", "releaseInfo"])
            })
            throw new AuthorizationError(ctx.gettext('presentable-authorization-failed'), {
                authCode: authResult.authCode, authResult
            })
        }
        if (authResult.data.subReleases) {
            ctx.set('freelog-sub-releases', authResult.data.subReleases.map(({releaseId, version}) => `${releaseId}-${version}`).toString())
        }
        if (extName === 'info') {
            return ctx.success(subReleaseInfo)
        }
        await this._responseResourceFile(resourceVersion.resourceId)
    }

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
        ctx.validate(false)

        if (identityType === 2 && !nodeId) {
            throw new ArgumentError(ctx.gettext('params-comb-validate-failed', 'identityType,nodeId'), {versionRange})
        }

        const releaseInfo = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${releaseId}`)
        ctx.entityNullObjectCheck(releaseInfo)

        const version = semver.maxSatisfying(releaseInfo.resourceVersions.map(x => x.version), versionRange)
        if (!version) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'versionRange'), {versionRange})
        }

        var nodeInfo = null
        if (identityType === 2) {
            nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`)
            ctx.entityNullValueAndUserAuthorizationCheck(nodeInfo)
        }

        const authResult = await ctx.service.policyAuthService.policyAuthorization({
            policies: releaseInfo.policies,
            policyType: 1,
            partyOneUserId: releaseInfo.userId,
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

        const resourceVersion = releaseInfo.resourceVersions.find(x => x.version === version)

        await this._responseResourceFile(resourceVersion.resourceId, releaseId)
    }

    /**
     * presentable授权树授权概况(树状图)
     * @returns {Promise<void>}
     */
    async presentableNodeAndReleaseSideAuthSketch(ctx) {

        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value
        ctx.validate()

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
        ctx.validate()

        const releaseInfo = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${releaseId}`)
        ctx.entityNullValueAndUserAuthorizationCheck(releaseInfo, {
            msg: ctx.gettext('params-validate-failed', 'releaseId')
        })

        if (!releaseInfo.resourceVersions.some(x => x.version === version)) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'version'))
        }

    }

    /**
     * 获取presentable节点和发行侧授权
     * @returns {Promise<void>}
     */
    async presentableNodeAndReleaseSideAuth(ctx) {

        const presentableId = ctx.checkParams('presentableId').exist().isPresentableId().value
        ctx.validate()

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
        ctx.validate()

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
        ctx.validate()

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
        ctx.validate()

        if (policyIds.length && policyIds.length !== presentableIds.length) {
            throw new ArgumentError(ctx.gettext('params-comb-validate-failed', 'presentableIds,policyIds'))
        }

        await ctx.service.policyAuthService.batchPresentablePolicyIdentityAuthentication(presentableIds, policyIds, isFilterSignedPolicy)
            .then(ctx.success)
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