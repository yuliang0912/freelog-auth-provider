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

        await this._responseSubDependToHeader(testResourceId)

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
        // const releaseInfo = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${presentableInfo.releaseInfo.releaseId}`)
        // if (extName === 'release') {
        //     return ctx.success(releaseInfo)
        // }
        //
        // const resourceVersion = releaseInfo.resourceVersions.find(x => x.version === presentableInfo.releaseInfo.version)
        //
        // await this._responseResourceFile(resourceVersion.resourceId, presentableId)
    }

    /**
     * 测试资源子依赖授权
     * @param ctx
     * @returns {Promise<void>}
     */
    async testResourceDependencyAuth(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value
        const subEntityId = ctx.checkParams('subEntityId').optional().isMongoObjectId().value
        const subEntityName = ctx.checkParams('subEntityName').optional().value
        const subEntityType = ctx.checkParams('subEntityType').exist().in(['release', 'mock']).value
        const subEntityVersion = ctx.checkQuery('subEntityVersion').exist().is(semver.valid, ctx.gettext('params-format-validate-failed', 'subEntityVersion')).value
        const extName = ctx.checkParams('extName').optional().type('string').in(['file', 'info', 'release', 'auth']).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        if (!subEntityId && !subEntityName) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed', 'subEntityId,subEntityName'))
        }
    }

    /**
     * 响应资源文件
     * @param entityId
     * @param entityType
     * @param responseFilename
     * @returns {Promise<void>}
     * @private
     */
    // async _responseFile(entityId, entityVersion, entityType, responseFilename) {
    //
    //     const {ctx} = this
    //     const signedResourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/${resourceId}/signedResourceInfo`)
    //     if (entityType === '')
    //         const {aliasName, meta = {}, systemMeta, resourceType, resourceFileUrl} = signedResourceInfo
    //
    //     ctx.set('freelog-resource-type', resourceType)
    //     ctx.set('freelog-meta', encodeURIComponent(JSON.stringify(meta)))
    //     ctx.set('freelog-system-meta', encodeURIComponent(JSON.stringify(lodash.omit(systemMeta, 'dependencies'))))
    //
    //     await ctx.curl(resourceFileUrl, {streaming: true}).then(({status, headers, res}) => {
    //         if (status < 200 || status > 299) {
    //             throw new ApplicationError(ctx.gettext('文件流读取失败'), {httpStatus: status})
    //         }
    //         ctx.body = res
    //         ctx.status = status
    //         ctx.attachment(filename || aliasName)
    //         ctx.set('content-type', headers['content-type'])
    //         ctx.set('content-length', headers['content-length'])
    //     })
    // }
    //
    // async _getResourceOrMockInfo(entityId, entityVersion, entityType) {
    //
    //     const {ctx} = this
    //     var result = null
    //     if (entityType === 'release') {
    //         let releaseInfo = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${entityId}`)
    //         let resourceVersionInfo = releaseInfo.resourceVersions.find(x => x.version === entityVersion)
    //         if (resourceVersionInfo) {
    //             const resourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/${resourceVersionInfo.resourceId}/signedResourceInfo`)
    //         }
    //         //resourceVersionInfo.resourceId
    //     }
    //     else if (entityType === 'presentable') {
    //         let presentableInfo = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${entityId}`)
    //     }
    //     else if (entityType === 'mock') {
    //         result = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/mocks/${entityId}`)
    //     }
    //     return result
    // }
}