'use strict'

const Service = require('egg').Service
const authCodeEnum = require('../enum/auth-code')
const authService = require('../authorization-service/process-manager')
const commonAuthResult = require('../authorization-service/common-auth-result')
const contractAuthorization = require('../authorization-service/contract-authorization/index')

/**
 * presentable授权业务逻辑层
 */
class PresentableAuthService extends Service {

    /**
     * 授权流程处理者
     * @returns {Promise<void>}
     */
    async authProcessHandler({nodeId, presentableId, resourceId, userContractId}) {

        const {ctx} = this
        const userId = ctx.request.userId
        const authResultCache = await ctx.service.authTokenService.getAuthToken({
            targetId: presentableId,
            partyTwo: userId,
            partyTwoUserId: userId
        })
        if (authResultCache) {
            return authResultCache
        }

        const userInfo = ctx.request.identityInfo.userInfo
        const nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`)
        if (!nodeInfo || nodeInfo.status !== 0) {
            ctx.error({msg: '参数nodeId错误', data: nodeInfo})
        }

        const presentableInfo = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}`)
        if (!presentableInfo || presentableInfo.nodeId !== nodeId) {
            ctx.error({msg: '参数presentableId错误或者presentableId与nodeId不匹配', data: {presentableInfo}})
        }
        if (!presentableInfo.isOnline) {
            ctx.error({msg: 'presentable未上线,无法授权', data: {presentableInfo}})
        }

        const presentableAuthTree = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/presentableTree/${presentableId}`).catch(ctx.error)
        if (!presentableAuthTree) {
            ctx.error({msg: 'presentable授权树数据缺失'})
        }

        if (resourceId && !presentableAuthTree.authTree.some(x => x.resourceId === resourceId)) {
            ctx.error({msg: `参数resourceId:${resourceId}错误`})
        }

        //如果用户未登陆,则尝试获取presentable授权(initial-terminate模式)
        if (userInfo) {
            const userContractAuthResult = await this._tryUserContractAuth({
                presentableInfo,
                userInfo,
                nodeInfo,
                userContractId
            })
            if (!userContractAuthResult.isAuth) {
                return this._fillPresentableAuthDataInfo({
                    presentableInfo,
                    authResult: userContractAuthResult,
                    resourceId
                })
            }
        } else {
            const unLoginUserPresentableAuthResult = await this._unLoginUserPresentableAuth(presentableInfo)
            if (!unLoginUserPresentableAuthResult.isAuth) {
                return this._fillPresentableAuthDataInfo({
                    presentableInfo,
                    authResult: unLoginUserPresentableAuthResult,
                    resourceId
                })
            }
        }

        const partyTwoUserIds = new Set()
        const contractIds = presentableAuthTree.authTree.map(x => x.contractId)

        const contractMap = await ctx.dal.contractProvider.getContracts({_id: {$in: contractIds}}).then(dataList => {
            const contractMap = new Map()
            dataList.forEach(item => {
                let currentContract = item.toObject()
                partyTwoUserIds.add(currentContract.partyTwoUserId)
                contractMap.set(currentContract.contractId, currentContract)
            })
            return contractMap
        })
        const partyTwoUserInfoMap = await ctx.curlIntranetApi(`${ctx.webApi.userInfo}?userIds=${Array.from(partyTwoUserIds).toString()}`).then(dataList => {
            return new Map(dataList.map(x => [x.userId, x]))
        })

        presentableAuthTree.nodeInfo = nodeInfo
        presentableAuthTree.authTree.forEach(item => {
            item.contractInfo = contractMap.get(item.contractId)
            item.contractInfo.partyTwoUserInfo = partyTwoUserInfoMap.get(item.contractInfo.partyTwoUserId)
        })

        const presentableTreeAuthResult = await authService.presentableAuthTreeAuthorization(presentableAuthTree)

        ctx.service.authTokenService.savePresentableAuthResult({
            presentableAuthTree,
            userInfo,
            nodeInfo,
            authResult: presentableTreeAuthResult
        })

        return this._fillPresentableAuthDataInfo({
            presentableInfo,
            authResult: presentableTreeAuthResult,
            resourceId
        })
    }

    /**
     * 未登陆用户尝试获取presentable授权(满足initial-terminate模式)
     * @returns {Promise<void>}
     */
    async _unLoginUserPresentableAuth(presentable) {

        const {app} = this
        const params = {
            policySegments: presentable.policy,
            contractType: app.contractType.PresentableToUer,
            partyOneUserId: presentable.userId
        }

        return authService.policyAuthorization(params)
    }

    /**
     * 尝试使用用户合同授权.没有用户合同,则查看能否默认创建
     * @param presentable
     * @param contract
     * @param userInfo
     * @returns {Promise<void>}
     * @private
     */
    async _tryUserContractAuth({presentableInfo, userInfo, nodeInfo, userContractId}) {

        //获取用户合同,然后尝试基于用户合同获取第一步授权
        const userContract = await this._getUserContract({
            userId: userInfo.userId,
            nodeId: nodeInfo.nodeId,
            presentableId: presentableInfo.presentableId,
            userContractId
        })

        if (userContract) {
            return authService.contractAuthorization({
                contract: userContract, partyTwoUserInfo: userInfo
            })
        }

        return this._tryCreateDefaultUserContract({presentableInfo, userInfo})
    }

    /***
     * 如果用户登录,并且满足presentable的免费授权策略(initial-terminate模式),则默认创建一个合同
     * @param presentable
     * @param userInfo
     * @returns {Promise<void>}
     */
    async _tryCreateDefaultUserContract({presentableInfo, userInfo}) {

        const {app} = this
        const params = {
            policySegments: presentableInfo.policy,
            contractType: app.contractType.PresentableToUer,
            partyOneUserId: presentableInfo.userId,
            partyTwoUserInfo: presentableInfo
        }

        const result = new commonAuthResult(authCodeEnum.BasedOnUserContract)
        const presentablePolicyAuthResult = await authService.policyAuthorization(params)

        if (!presentablePolicyAuthResult.isAuth) {
            return presentablePolicyAuthResult
        }

        await this._createUserContract({
            presentableInfo,
            policySegment: presentablePolicyAuthResult.data.policySegment
        })

        return result
    }

    /**
     * 获取用户合同函数
     * A.如果没有用户信息,则返回null
     * B.如果有登陆用户,且指定了需要执行的合同,则返回用户指定要执行的合同
     * C.如果有登陆用户,但是没用指定需要执行的合同,则搜索所有的合同,如果没有合同,则返回null,
     * 如果只有一份合同,则返回此份合同
     * 如果有多份激活态合同或者多份全部未激活的合同,则让用户选择执行,前端去引导激活合同或者选择需要执行的合同
     * 如果有多份合同,但是只有一份激活态合同,则返回激活态合同执行
     */
    async _getUserContract({userId, presentableId, nodeId, userContractId}) {

        if (!userId) {
            return null
        }

        const {ctx, app} = this
        //如果用户没有选择具体需要执行的合同,则搜索用户的合同列表
        const allUserContracts = await app.dataProvider.contractProvider.getContracts({
            targetId: presentableId,
            partyOne: nodeId,
            partyTwo: userId,
            contractType: app.contractType.PresentableToUer
        }).map(app.toObject)

        //如果用户没有签订合同,则返回
        if (!allUserContracts.length) {
            return null
        }

        //如果用户只有一个合同,则直接返回当前合同
        if (allUserContracts.length === 1) {
            return allUserContracts[0]
        }

        //如果用户指定了合同ID,则执行指定的合同
        if (userContractId) {
            const userContract = allUserContracts.find(x => x.contractId === userContractId)
            if (userContract) {
                ctx.error({msg: '参数userContractId错误,未能找到指定的用户合同', data: {userContractId, allUserContracts}})
            }
            return userContract
        }

        //如果用户有多个合同.默认找激活态的合同
        let activatedContracts = allUserContracts.filter(t => contractAuthorization.isActivated(t))
        if (activatedContracts.length === 1) {
            return activatedContracts[0]
        }

        //如果用户有多个合同,但是激活的不止一个或者没有激活的合同,则需要手动让用户选择一个合同执行
        const result = new commonAuthResult(authCodeEnum.UnsureExecuteUserContracts, {contracts: allUserContracts})

        this.ctx.error({msg: "请选择一个合同执行", data: result})
    }

    /**
     * 创建用户合同
     * @param userContract
     * @returns {Promise<void>}
     */
    async _createUserContract({presentableInfo, policySegment}) {

        const {ctx, app} = this

        return ctx.curlIntranetApi(`${ctx.webApi.contractInfo}`, {
            type: 'post',
            contentType: 'json',
            data: {
                targetId: presentableInfo.presentableId,
                contractType: app.contractType.PresentableToUer,
                segmentId: policySegment.segmentId
            },
        }).catch(error => {
            ctx.error({msg: '创建用户合同失败', errCode: error.errCode, retCode: error.retCode, data: error.toString()})
        })
    }

    /**
     * 填充授权信息数据
     * @param presentableInfo
     * @param authResult
     * @param resourceId
     * @returns {Promise<void>}
     * @private
     */
    _fillPresentableAuthDataInfo({presentableInfo, authResult, resourceId}) {
        authResult.data = authResult.data || {}
        authResult.data.resourceId = resourceId || presentableInfo.resourceId
        authResult.data.presentableId = presentableInfo.presentableId
        authResult.data.presentableInfo = presentableInfo
        return authResult
    }
}

module.exports = PresentableAuthService