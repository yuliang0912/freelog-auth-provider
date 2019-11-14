'use strict'

const lodash = require('lodash')
const Controller = require('egg').Controller
const cryptoHelper = require('egg-freelog-base/app/extend/helper/crypto_helper')
const {ArgumentError, ApplicationError, AuthorizationError} = require('egg-freelog-base/error')
const {LoginUser} = require('egg-freelog-base/app/enum/identity-type')

module.exports = class PresentableOrResourceAuthController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * 测试资源授权
     * @param ctx
     * @returns {Promise<void>}
     */
    async testResourceAuth(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value
        const extName = ctx.checkParams('extName').optional().type('string').in(['file', 'info', 'auth']).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const testResourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.testNode}/testResources/${testResourceId}`)
        ctx.entityNullObjectCheck(testResourceInfo)

        const authResult = await ctx.service.testResourceAuthService.testResourceAuth(testResourceInfo)
        if (!authResult.isAuth) {
            authResult.data.testResourceInfo = testResourceInfo
        }

        const responseResourceInfo = await ctx.service.testResourceAuthService.getRealResponseTestResourceInfo(testResourceId)

        await this._responseSubDependToHeader(responseResourceInfo.dependencies, responseResourceInfo.nid)

        if (extName === 'auth') {
            return ctx.success(authResult)
        }
        if (!authResult.isAuth) {
            throw new AuthorizationError(ctx.gettext('test-resource-authorization-failed'), {
                authCode: authResult.authCode, authResult
            })
        }
        if (extName === 'info') {
            return ctx.success(testResourceInfo)
        }

        const {testResourceName} = testResourceInfo

        await this._responseResourceFile(responseResourceInfo.resourceId || responseResourceInfo.id, responseResourceInfo.type, testResourceName)
    }

    /**
     * 测试资源子级依赖授权
     * @param ctx
     * @returns {Promise<void>}
     */
    /**
     * TODO: 2019-11-8重新讨论整理的授权逻辑:
     * 直接请求测试资源主体文件时,验证整体授权树是否通过即可.
     * 请求子资源时,先验证子资源是否在依赖树中存在(存在替换的需要做逻辑运算匹配),然后再验证整个授权树.
     * 依赖树的每个节点会单独分配一个唯一的ID,用于确定唯一性(请求子资源时,则传入这个ID参数),系统根据ID来确定依赖以及依赖的具体版本.用户无需传递版本信息
     * 依赖树的节点唯一ID会在请求主体资源时,响应到headers中.告知releaseName与ID的映射关系
     */
    async testResourceSubDependAuth(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value
        const entityNid = ctx.checkQuery('entityNid').exist().type('string').len(12, 12).value
        const subEntityId = ctx.checkQuery('subEntityId').optional().isMongoObjectId().value
        const subEntityName = ctx.checkQuery('subEntityName').optional().type('string').value
        const subEntityType = ctx.checkQuery('subEntityType').optional().type('string').value
        const extName = ctx.checkParams('extName').optional().type('string').in(['file', 'info', 'auth']).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        if (!subEntityId && !subEntityName) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed', 'subEntityId,subEntityName,subEntityType'))
        }

        const testResourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.testNode}/testResources/${testResourceId}`)
        ctx.entityNullObjectCheck(testResourceInfo)

        const responseResourceInfo = await ctx.service.testResourceAuthService.getRealResponseTestResourceInfo(testResourceId, entityNid, subEntityId, subEntityName, subEntityType)
        if (!responseResourceInfo) {
            throw new ArgumentError(ctx.gettext('params-relevance-validate-failed', 'testResourceId,entityNid,subEntityId,subEntityName,subEntityType'))
        }

        const authResult = await ctx.service.testResourceAuthService.testResourceAuth(testResourceInfo)
        if (!authResult.isAuth) {
            authResult.data.testResourceInfo = testResourceInfo
        }

        await this._responseSubDependToHeader(responseResourceInfo.dependencies, responseResourceInfo.nid)

        if (extName === 'auth') {
            return ctx.success(authResult)
        }
        if (!authResult.isAuth) {
            throw new AuthorizationError(ctx.gettext('test-resource-authorization-failed'), {
                authCode: authResult.authCode, authResult
            })
        }
        if (extName === 'info') {
            return ctx.success(testResourceInfo)
        }

        await this._responseResourceFile(responseResourceInfo.resourceId || responseResourceInfo.id, responseResourceInfo.type, responseResourceInfo.name)
    }

    /**
     * 响应依赖发行到http-header
     * @param presentableId
     * @param subReleaseId
     * @param subReleaseVersion
     * @returns {Promise<void>}
     * @private
     */
    async _responseSubDependToHeader(subDependencies, entityNid) {
        const {ctx} = this, responseDependencies = []
        for (let i = 0; i < subDependencies.length; i++) {
            let {replaceRecords = []} = subDependencies[i]
            let result = replaceRecords.length ? replaceRecords[0] : subDependencies[i]
            responseDependencies.push(lodash.pick(result, ['id', 'name', 'type']))
        }
        ctx.set('freelog-entity-nid', entityNid)
        ctx.set('freelog-sub-dependencies', cryptoHelper.base64Encode(JSON.stringify(responseDependencies)))
    }

    /**
     * 响应资源文件
     * @param resourceId
     * @param filename
     * @returns {Promise<void>}
     * @private
     */
    async _responseResourceFile(id, type, filename) {

        const {ctx, app} = this
        const url = type === "mock" ?
            `${ctx.webApi.resourceInfo}/mocks/${id}/signedMockResourceInfo` : `${ctx.webApi.resourceInfo}/${id}/signedResourceInfo`

        const signedResourceInfo = await ctx.curlIntranetApi(url)
        const {meta = {}, systemMeta, resourceType, resourceFileUrl} = signedResourceInfo

        ctx.set('freelog-resource-type', resourceType)
        ctx.set('freelog-meta', encodeURIComponent(JSON.stringify(meta)))
        ctx.set('freelog-system-meta', encodeURIComponent(JSON.stringify(lodash.omit(systemMeta, 'dependencies'))))

        await ctx.curl(resourceFileUrl, {streaming: true}).then(({status, headers, res}) => {
            if (status < 200 || status > 299) {
                throw new ApplicationError(ctx.gettext('文件流读取失败'), {httpStatus: status})
            }
            ctx.body = res
            ctx.status = status
            ctx.attachment(filename)
            ctx.set('content-type', headers['content-type'])
            ctx.set('content-length', headers['content-length'])
        })

        if (resourceType === app.resourceType.VIDEO || resourceType === app.resourceType.AUDIO) {
            ctx.set('Accept-Ranges', 'bytes')
        }
    }
}