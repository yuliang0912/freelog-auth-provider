'use strict'

const Controller = require('egg').Controller
const authProcessManager = require('../../authorization-service/process-manager')

module.exports = class PresentableOrResourceAuthController extends Controller {

    /**
     * 请求获取presentable资源
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentable(ctx) {

        const nodeId = ctx.checkQuery('nodeId').toInt().value
        const extName = ctx.checkParams('extName').optional().in(['data', 'info']).value
        const presentableId = ctx.checkParams('presentableId').isPresentableId().value
        ctx.validate(false)

        const {presentableAuthService, resourceAuthService} = ctx.service
        const authResult = await presentableAuthService.authProcessHandler({nodeId, presentableId}).catch(ctx.error)

        if (!authResult.isAuth) {
            ctx.error({msg: '授权未能通过', errCode: authResult.authCode, data: authResult})
        }

        const {authToken} = authResult.data
        await resourceAuthService.getAuthResourceInfo({
            resourceId: authToken.masterResourceId,
            payLoad: {nodeId, presentableId, partyTwoUserId: authToken.partyTwoUserId}
        }).then(resourceInfo => {
            authToken.authResourceIds = authToken.authResourceIds.filter(x => x !== authToken.masterResourceId)
            if (authToken.authResourceIds.length) {
                ctx.set('freelog-sub-resourceIds', authToken.authResourceIds.toString())
                ctx.set('freelog-sub-resource-auth-token', authToken.token)
            }
            if (extName === 'info') {
                Reflect.deleteProperty(resourceInfo, 'resourceUrl')
                return ctx.success(resourceInfo)
            }
            return this._responseResourceFile(ctx, resourceInfo, presentableId)
        }).catch(ctx.error)
    }

    /**
     * 请求获取presentable对应的子资源
     * @returns {Promise<void>}
     */
    async presentableSubResource(ctx) {

        const resourceId = ctx.checkParams('resourceId').isResourceId().value
        const token = ctx.checkQuery('token').isMongoObjectId('token格式错误').value
        ctx.validate(false)

        const {presentableAuthService, resourceAuthService} = ctx.service
        const authResult = await presentableAuthService.tokenAuthHandler({token, resourceId})
        if (!authResult.isAuth) {
            ctx.error({msg: '授权未能通过', errCode: authResult.authCode, data: authResult})
        }
        const {authToken} = authResult.data
        await resourceAuthService.getAuthResourceInfo({
            resourceId, payLoad: {presentableId: authToken.targetId, partyTwoUserId: authToken.partyTwoUserId}
        }).then(resourceInfo => {
            return this._responseResourceFile(ctx, resourceInfo, resourceId)
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
        const extName = ctx.checkParams('extName').optional().in(['data', 'info']).value

        ctx.validate(false)

        const authResult = await ctx.service.resourceAuthService.resourceAuth({resourceId, nodeId})
        if (!authResult.isAuth) {
            ctx.error({msg: '授权未能通过', errCode: authResult.authCode, data: authResult})
        }

        //基于策略的直接授权,目前token缓存172800秒(2天)
        await ctx.service.resourceAuthService.getAuthResourceInfo({
            resourceId, payLoad: {nodeId, userId: ctx.request.userId, resourceId}
        }).then(resourceInfo => {
            if (extName === 'info') {
                Reflect.deleteProperty(resourceInfo, 'resourceUrl')
                return ctx.success(resourceInfo)
            }
            return this._responseResourceFile(ctx, resourceInfo, resourceId)
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
        if (nodeId && (!nodeInfo || nodeInfo.ownerUserId !== ctx.request.userId)) {
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

        const allTasks = Array.from(allPolicySegments.values())
            .map(item => authProcessManager.policyIdentityAuthentication(item).then(authResult => item.authResult = authResult))

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
            contractType: ctx.app.contractType.PresentableToUser
        }

        const policyIdentityAuthTasks = presentableInfo.policy.reduce((acc, policySegment) => {
            if (policySegment.status === 1) {
                const task = authProcessManager.policyIdentityAuthentication(Object.assign({}, params, {policySegment}))
                    .then(authResult => policySegment.authResult = authResult)
                acc.push(task)
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

    /**
     * presentable授权树授权测试
     */
    async presentableTreeAuthTest(ctx) {

        const nodeId = ctx.checkQuery('nodeId').toInt().value
        const presentableId = ctx.checkParams('presentableId').isPresentableId().value
        ctx.validate()

        const nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`)
        if (!nodeInfo || nodeInfo.ownerUserId !== ctx.request.userId) {
            ctx.error({msg: '参数nodeId错误', data: {nodeInfo, userId: ctx.request.userId}})
        }

        const authResult = await ctx.service.presentableAuthService.presentableTreeAuthHandler(presentableId, nodeInfo)

        ctx.success(authResult)
    }

    /**
     * 获取presentable签约授权结果
     * @param ctx
     * @returns {Promise<void>}
     */
    async getPresentableSignAuth(ctx) {

        const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().value
        ctx.validate()

        const presentableSignAuthResult = [...new Set(presentableIds)].map(presentableId => new Object({
            presentableId, isAcquireSignAuth: -1
        }))

        const presentableAuthTrees = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/presentableTrees?presentableIds=${presentableIds.toString()}`)

        const contractIds = presentableAuthTrees.reduce((acc, current) => {
            acc = [...acc, ...current.authTree.map(x => x.contractId)]
            return acc
        }, [])

        const contractMap = await ctx.dal.contractProvider.find({_id: {$in: contractIds}}).then(dataList => new Map(dataList.map(x => [x.contractId, x])))

        for (let x = 0, y = presentableAuthTrees.length; x < y; x++) {
            let presentableAuthTree = presentableAuthTrees[x]
            let presentableSignAuth = presentableSignAuthResult.find(m => m.presentableId === presentableAuthTree.presentableId)
            presentableSignAuth.isAcquireSignAuth = 1
            for (let i = 0, j = presentableAuthTree.authTree.length; i < j; i++) {
                let {contractId, resourceId} = presentableAuthTree.authTree[i]
                if (!contractMap.has(contractId)) {
                    continue
                }
                let contractInfo = contractMap.get(contractId)
                let signAuthResult = null
                if (presentableAuthTree.masterResourceId === resourceId) {
                    signAuthResult = await authProcessManager.resourcePresentableSignAuth(contractInfo)
                } else {
                    signAuthResult = await authProcessManager.resourceReContractableSignAuth(contractInfo)
                }
                if (!signAuthResult.isAuth) {
                    presentableSignAuth.isAcquireSignAuth = 0
                    break
                }
            }
        }

        ctx.success(presentableSignAuthResult)
    }

    /**
     * 响应输出resource-file信息
     * @returns {Promise<void>}
     */
    async _responseResourceFile(ctx, resourceInfo, fileName) {

        const isCache = ctx.get('if-none-match') === `"${resourceInfo.resourceId}"`
        ctx.set('freelog-resource-type', resourceInfo.resourceType)
        ctx.set('freelog-meta', encodeURIComponent(JSON.stringify(resourceInfo.meta)))
        ctx.set('freelog-system-meta', encodeURIComponent(JSON.stringify(resourceInfo.systemMeta)))

        // if (isCache) {
        //     ctx.set('ETag', `"${resourceInfo.resourceId}"`)
        //     ctx.set('content-type', resourceInfo.mimeType)
        //     ctx.body = null
        //     ctx.status = 304
        //     return
        //}

        const result = await ctx.curl(resourceInfo.resourceUrl, {streaming: true})
        if (!/^2[\d]{2}$/.test(result.status)) {
            ctx.error({msg: '文件丢失,未能获取到资源源文件信息', data: {['http-status']: result.status}})
        }
        ctx.attachment(fileName || resourceInfo.resourceId)
        Object.keys(result.headers).forEach(key => ctx.set(key, result.headers[key]))
        ctx.body = result.res
        ctx.set('ETag', `"${resourceInfo.resourceId}"`)
        ctx.set('content-type', resourceInfo.mimeType)
    }
}