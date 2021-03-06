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
        const releaseName = ctx.checkQuery('releaseName').optional().isFullReleaseName().value
        const releaseId = ctx.checkQuery('releaseId').optional().isReleaseId().value
        const nodeId = ctx.checkParams('nodeId').optional().isInt().gt(0).value
        const extName = ctx.checkParams('extName').optional().type('string').in(['file', 'info', 'auth']).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        if (!testResourceId && !releaseId && !releaseName) {
            throw new ArgumentError("params-required-validate-failed", 'releaseId,releaseName')
        }

        var testResourceInfo = null
        if (testResourceId) {
            testResourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.testNode}/testResources/${testResourceId}`)
        } else if (releaseId) {
            testResourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.testNode}/${nodeId}/testResources/findByReleaseName?releaseId=${releaseId}`)
        } else if (releaseName) {
            testResourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.testNode}/${nodeId}/testResources/findByReleaseName?releaseName=${releaseName}`)
        }
        ctx.entityNullObjectCheck(testResourceInfo)

        const authResult = await ctx.service.testResourceAuthService.testResourceAuth(testResourceInfo)
        const entityNid = testResourceInfo['testResourceId'].substr(0, 12)
        const responseResourceInfo = await ctx.service.testResourceAuthService.getRealResponseTestResourceInfo(testResourceInfo['testResourceId'], entityNid)
        if (!responseResourceInfo) {
            throw new ApplicationError('请重新匹配规则,待响应的实体信息不存在')
        }
        responseResourceInfo.name = testResourceInfo['testResourceName']

        await this._responseAuthResult(testResourceInfo, authResult, responseResourceInfo, extName)
    }

    /**
     * 测试资源子级依赖授权
     * @param ctx
     * @returns {Promise<void>}
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

        await this._responseAuthResult(testResourceInfo, authResult, responseResourceInfo, extName)
    }

    /**
     * 响应授权结果
     * @param authResult
     * @param responseResourceInfo
     * @param extName
     * @returns {Promise<*>}
     * @private
     */
    async _responseAuthResult(testResourceInfo, authResult, responseResourceInfo, extName) {

        const {ctx} = this, responseDependencies = []
        const {dependencies, nid} = responseResourceInfo
        for (let i = 0; i < dependencies.length; i++) {
            let {replaceRecords = []} = dependencies[i]
            let result = replaceRecords.length ? replaceRecords[0] : dependencies[i]
            responseDependencies.push(lodash.pick(result, ['id', 'name', 'type', 'resourceType']))
        }
        ctx.set('freelog-entity-nid', nid)
        ctx.set('freelog-sub-dependencies', cryptoHelper.base64Encode(JSON.stringify(responseDependencies)))

        if (!authResult.isAuth) {
            authResult.data.testResourceInfo = testResourceInfo
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
            return ctx.success(testResourceInfo)
        }

        await this._responseResourceFile(responseResourceInfo.resourceId || responseResourceInfo.id, responseResourceInfo.type, responseResourceInfo.name)
    }

    /**
     * 响应资源文件
     * @param resourceId
     * @param filename
     * @returns {Promise<void>}
     * @private
     */
    async _responseResourceFile(id, type, filename) {

        var {ctx, app} = this
        var signedResourceInfo = null
        if (type === 'mock') {
            signedResourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/mocks/${id}/signedMockResourceInfo`)
        } else {
            signedResourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/${id}/signedResourceInfo`)
        }

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