'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const authCodeEnum = require('../enum/auth-code')
const {LogicError, ArgumentError, ApiInvokingError} = require('egg-freelog-base/error')
const authService = require('../authorization-service/process-manager')
const commonAuthResult = require('../authorization-service/common-auth-result')

/**
 * presentable授权业务逻辑层
 */
class PresentableAuthService extends Service {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * 授权流程处理者
     * @returns {Promise<void>}
     */
    async authProcessHandler({nodeId, presentableId}) {

        const {ctx} = this
        const userId = ctx.request.userId || 0
        const authTokenCache = await ctx.service.authTokenService.getAuthToken({
            targetId: presentableId,
            partyTwo: userId,
            partyTwoUserId: userId
        })
        if (authTokenCache) {
            return this._authTokenToAuthResult(authTokenCache)
        }

        const userInfo = ctx.request.identityInfo.userInfo
        const nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`)
        if (!nodeInfo || nodeInfo.status !== 0) {
            throw new ArgumentError('参数nodeId错误', {nodeInfo})
        }

        const presentableInfo = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}`)
        if (!presentableInfo || presentableInfo.nodeId !== nodeId) {
            throw new ArgumentError('参数presentableId错误或者presentableId与nodeId不匹配', {presentableInfo})
        }
        if (!presentableInfo.isOnline) {
            throw new LogicError('presentable未上线,无法授权', {presentableInfo})
        }

        //如果用户未登陆,则尝试获取presentable授权(initial-terminate模式)
        if (userInfo) {
            const userContractAuthResult = await this._tryUserContractAuth({presentableInfo, userInfo, nodeInfo})
            if (!userContractAuthResult.isAuth) {
                return userContractAuthResult
            }
        } else {
            const unLoginUserPresentableAuthResult = await this._unLoginUserPresentableAuth(presentableInfo)
            if (!unLoginUserPresentableAuthResult.isAuth) {
                return unLoginUserPresentableAuthResult
            }
        }

        const partyTwoUserIds = new Set()
        const presentableAuthTree = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/presentableTree/${presentableId}`)
        if (!presentableAuthTree) {
            throw new LogicError('presentable授权树数据缺失')
        }

        const contractIds = presentableAuthTree.authTree.map(x => x.contractId)
        const contractMap = await this.contractProvider.find({_id: {$in: contractIds}}).then(dataList => {
            const contractMap = new Map()
            dataList.forEach(currentContract => {
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
        if (!presentableTreeAuthResult.isAuth) {
            return this._fillPresentableAuthDataInfo({presentableInfo, authResult: presentableTreeAuthResult})
        }

        const authToken = await ctx.service.authTokenService.savePresentableAuthResult({
            presentableAuthTree, userId, nodeInfo,
            authResult: presentableTreeAuthResult
        })

        return this._authTokenToAuthResult(authToken)
    }

    /**
     * 基于token获取授权
     * @param token
     * @param resourceId
     * @returns {Promise<void>}
     */
    async tokenAuthHandler({token, resourceId}) {

        const {ctx, app} = this
        const userId = ctx.request.userId || 0
        const authTokenCache = await ctx.service.authTokenService.getAuthTokenById({
            token,
            partyTwo: userId,
            partyTwoUserId: userId
        })
        if (!authTokenCache || authTokenCache.contractType !== app.contractType.PresentableToUser || !authTokenCache.authResourceIds.some(x => x === resourceId)) {
            return new commonAuthResult(authCodeEnum.ResourceAuthTokenInvalid)
        }

        return this._authTokenToAuthResult(authTokenCache)
    }

    /**
     * 授权token转换成授权结果
     * @param authToken
     * @returns {Promise<module.CommonAuthResult|*>}
     * @private
     */
    async _authTokenToAuthResult(authToken) {
        const authResult = new commonAuthResult(authToken.authCode)
        authResult.data.authToken = authToken
        return authResult
    }

    /**
     * 未登陆用户尝试获取presentable授权(满足initial-terminate模式)
     * @returns {Promise<void>}
     */
    async _unLoginUserPresentableAuth(presentableInfo) {

        const {app} = this
        const params = {
            policySegments: presentableInfo.policy,
            contractType: app.contractType.PresentableToUser,
            partyOneUserId: presentableInfo.userId
        }

        const policyAuthorizationResult = authService.policyAuthorization(params)

        this._fillPresentableAuthDataInfo({presentableInfo, authResult: policyAuthorizationResult})

        if (!policyAuthorizationResult.isAuth) {
            policyAuthorizationResult.authCode = authCodeEnum.NotFoundUserInfo
        }

        return policyAuthorizationResult
    }

    /**
     * 尝试使用用户合同授权.没有用户合同,则查看能否默认创建
     * @param presentable
     * @param contract
     * @param userInfo
     * @returns {Promise<void>}
     * @private
     */
    async _tryUserContractAuth({presentableInfo, userInfo}) {

        const {app} = this
        const allContracts = await this.contractProvider.find({
            targetId: presentableInfo.presentableId, partyTwo: userInfo.userId,
            contractType: app.contractType.PresentableToUser
        })

        const defaultContract = allContracts.find(x => x.isDefault)
        if (!defaultContract) {
            return this._tryCreateDefaultUserContract({presentableInfo, userInfo})
        }

        const defaultContractAuthResult = authService.contractAuthorization({
            contract: defaultContract, partyTwoUserInfo: userInfo
        })

        this._fillPresentableAuthDataInfo({presentableInfo, authResult: defaultContractAuthResult})
        defaultContractAuthResult.data.allContracts = allContracts

        return defaultContractAuthResult
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
            contractType: app.contractType.PresentableToUser,
            partyOneUserId: presentableInfo.userId,
            partyTwoUserInfo: userInfo
        }

        const result = new commonAuthResult(authCodeEnum.BasedOnUserContract)
        const presentablePolicyAuthResult = await authService.policyAuthorization(params)

        this._fillPresentableAuthDataInfo({presentableInfo, authResult: presentablePolicyAuthResult})

        if (!presentablePolicyAuthResult.isAuth) {
            return presentablePolicyAuthResult
        }

        await this._createUserContract({presentableInfo, policySegment: presentablePolicyAuthResult.data.policySegment})

        return result
    }

    /**
     * 创建用户合同
     * @param userContract
     * @returns {Promise<void>}
     */
    async _createUserContract({presentableInfo, policySegment}) {

        const {ctx} = this

        const createUserContractData = {
            presentableId: presentableInfo.presentableId,
            segmentId: policySegment.segmentId
        }

        return ctx.service.contractService.createUserContract(createUserContractData)
    }

    /**
     * 填充授权信息数据
     * @private
     */
    _fillPresentableAuthDataInfo({presentableInfo, authResult}) {

        const exposePresentableInfo = lodash.pick(presentableInfo, ["presentableId", "presentableName", "presentableIntro", "nodeId", "policy", "resourceId", "resourceInfo"])

        authResult.data = Object.assign(authResult.data || {}, exposePresentableInfo)

        return authResult
    }
}

module.exports = PresentableAuthService