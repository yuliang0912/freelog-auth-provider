'use strict'

const Controller = require('egg').Controller
const crypto = require('egg-freelog-base/app/extend/helper/crypto_helper')
const authProcessManager = require('../../authorization-service/process-manager')

module.exports = class PresentableOrResourceAuthController extends Controller {

    /**
     * 请求获取presentable资源
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentable(ctx) {

        const nodeId = ctx.checkQuery('nodeId').toInt().value
        const extName = ctx.checkParams('extName').optional().in(['data']).value
        const resourceId = ctx.checkQuery('resourceId').optional().isResourceId().value
        const userContractId = ctx.checkQuery('userContractId').optional().isContractId().value
        const presentableId = ctx.checkParams('presentableId').isMongoObjectId('presentableId格式错误').value
        ctx.validate(false)  //validateIdentity:false  用户可以不用登陆

        if (userContractId && !ctx.request.userId) {
            ctx.error({msg: '参数userContractId错误,当前不存在登录用户'})
        }

        const authResult = await ctx.service.presentableAuthService.authProcessHandler({
            nodeId,
            presentableId,
            resourceId,
            userContractId
        })

        if (!authResult.isAuth) {
            ctx.error({msg: '授权未能通过', errCode: authResult.authErrCode, data: authResult.toObject()})
        }

        await ctx.service.resourceAuthService.getAuthResourceInfo({
            resourceId: resourceId || authResult.data.resourceId,
            payLoad: {nodeId, presentableId}
        }).then(resourceInfo => {
            if (extName) {
                return responseResourceFile.call(this, resourceInfo, presentableId)
            }
            Reflect.deleteProperty(resourceInfo, 'resourceUrl')
            ctx.success(resourceInfo)
        }).catch(ctx.error)

    }


    /**
     * 直接请求获取资源数据(为类似于license资源服务)
     * @param ctx
     * @returns {Promise<void>}
     */
    async resource(ctx) {

        const resourceId = ctx.checkParams("resourceId").isResourceId().value
        const nodeId = ctx.checkQuery('nodeId').optional().toInt().gt(0).value
        const extName = ctx.checkParams('extName').optional().in(['data']).value
        ctx.validate(false)

        const authResult = await ctx.service.resourceAuthService.resourceAuth({resourceId, nodeId})
        if (!authResult.isAuth) {
            ctx.error({msg: '授权未能通过', errCode: authResult.authErrCode, data: authResult.toObject()})
        }

        //基于策略的直接授权,目前token缓存172800秒(2天)
        await ctx.service.resourceAuthService.getAuthResourceInfo({
            resourceId, payLoad: {nodeId, userId: ctx.request.userId, resourceId}
        }).then(resourceInfo => {
            if (extName) {
                return responseResourceFile.call(this, resourceInfo)
            }
            Reflect.deleteProperty(resourceInfo, 'resourceUrl')
            ctx.success(resourceInfo)
        }).catch(ctx.error)

    }

    /**
     * 获取授权点的策略段身份认证结果
     * @param ctx
     * @returns {Promise<void>}
     */
    async authSchemeIdentityAuth(ctx) {

        const nodeId = ctx.checkQuery('nodeId').optional().toInt().gt(0).value
        const authSchemeIds = ctx.checkQuery('authSchemeIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 15).value
        ctx.validate()

        var nodeInfo = null
        if (nodeId) {
            nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`)
        }
        if (nodeId && (!nodeInfo || nodeInfo.ownerUserId === ctx.request.userId)) {
            ctx.error({msg: '参数nodeId错误', data: {nodeInfo, userId: ctx.request.userId}})
        }

        const allPolicySegments = new Map()
        const userInfo = ctx.request.identityInfo.userInfo
        const contractType = nodeId ? ctx.app.contractType.ResourceToNode : ctx.app.contractType.ResourceToResource
        const authSchemeInfos = await ctx.curlIntranetApi(`${ctx.webApi.authSchemeInfo}?authSchemeIds=${authSchemeIds.toString()}`)

        //根据甲方ID以及策略段ID做去重合并,减少重复的策略段认证次数
        authSchemeInfos.forEach(authSchemeInfo => authSchemeInfo.policy.forEach(policySegment => {
            if (policySegment.status === 0) {
                return
            }
            allPolicySegments.set(`${authSchemeInfo.userId}_${policySegment.segmentId}`, {
                partyOneUserId: authSchemeInfo.userId,
                partyTwoInfo: nodeInfo,
                partyTwoUserInfo: userInfo,
                contractType, policySegment
            })
        }))

        const allTasks = Array.from(allPolicySegments.values()).map(item => {
            return authProcessManager.policyIdentityAuthentication(item).then(authResult => item.authResult = authResult.toObject())
        })

        await Promise.all(allTasks)

        const returnResult = authSchemeInfos.map(authSchemeInfo => new Object({
            authSchemeId: authSchemeInfo.authSchemeId,
            policy: authSchemeInfo.policy.map(policySegment => new Object({
                segmentId: policySegment.segmentId,
                status: policySegment.status,
                authResult: allPolicySegments.has(`${authSchemeInfo.userId}_${policySegment.segmentId}`)
                    ? allPolicySegments.get(`${authSchemeInfo.userId}_${policySegment.segmentId}`).authResult
                    : null
            }))
        }))

        ctx.success(returnResult)
    }

    /**
     * 获取presentable的策略段身份认证结果
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentableIdentityAuth(ctx) {

        const presentableId = ctx.checkQuery('presentableId').isPresentableId().value
        ctx.validate()

        const presentableInfo = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}`)
        if (!presentableInfo || !presentableInfo.isOnline) {
            ctx.error({msg: 'presentable不存在或者已下线', data: {presentableId}})
        }

        const userInfo = ctx.request.identityInfo.userInfo

        const params = {
            partyTwoUserInfo: userInfo,
            partyOneUserId: presentableInfo.userId,
            contractType: ctx.app.contractType.PresentableToUer
        }

        const policyIdentityAuthTasks = presentableInfo.policy.reduce((acc, policySegment) => {
            if (policySegment.status === 1) {
                acc.push(authProcessManager.policyIdentityAuthentication(Object.assign({}, params, {policySegment})).then(authResult => {
                    policySegment.authResult = authResult.toObject()
                }))
            }
            return acc
        }, [])

        await Promise.all(policyIdentityAuthTasks)

        const returnResult = presentableInfo.policy.map(policySegment => new Object({
            segmentId: policySegment.segmentId,
            status: policySegment.status,
            authResult: policySegment.authResult || null
        }))

        ctx.success(returnResult)
    }
}


/**
 * 响应输出resource-file信息
 * @returns {Promise<void>}
 */
const responseResourceFile = async function (resourceInfo, fileName) {

    const {ctx} = this
    const result = await ctx.curl(resourceInfo.resourceUrl, {streaming: true})
    if (!/^2[\d]{2}$/.test(result.status)) {
        ctx.error({msg: '文件丢失,未能获取到资源源文件信息', data: {['http-status']: result.status}})
    }
    ctx.attachment(fileName || resourceInfo.resourceId)
    ctx.set('content-type', resourceInfo.mimeType)
    ctx.set('content-length', result.headers['content-length'])
    ctx.set('freelog-resource-type', resourceInfo.resourceType)
    ctx.set('freelog-meta', crypto.base64Encode(JSON.stringify(resourceInfo.meta)))
    ctx.set('freelog-system-meta', crypto.base64Encode(JSON.stringify(resourceInfo.systemMeta)))
    ctx.body = result.res

}