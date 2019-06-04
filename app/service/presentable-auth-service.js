'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const authCodeEnum = require('../enum/auth-code')
const authService = require('../authorization-service/process-manager')
const commonAuthResult = require('../authorization-service/common-auth-result')

/**
 * presentable授权业务逻辑层
 */
module.exports = class PresentableAuthService extends Service {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * presentable全部链路(用户,节点,发行)授权
     * @param presentableInfo
     * @returns {Promise<void>}
     */
    async presentableAllChainAuth(presentableInfo) {

        const {ctx} = this
        const {userInfo} = ctx.request.identityInfo
        const {presentableId, nodeId, userId} = presentableInfo

        const userContractAuthResult = await ctx.service.userContractAuthService.userContractAuth(presentableInfo, userInfo)
        if (!userContractAuthResult.isAuth) {
            return userContractAuthResult
        }

        const nodeInfoTask = ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`)
        const presentableAuthTreeTask = ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}/authTree`)
        const nodeUserInfoTask = ctx.curlIntranetApi(`${ctx.webApi.userInfo}/${userId}`)
        const [nodeInfo, presentableAuthTree, nodeUserInfo] = await Promise.all([nodeInfoTask, presentableAuthTreeTask, nodeUserInfoTask])

        return this.presentableNodeAndReleaseSideAuth(presentableInfo, presentableAuthTree, nodeInfo, nodeUserInfo)
    }

    /**
     * 批量获取presentable发行和节点侧授权结果
     * @param presentableInfos
     * @param nodeInfo 目前需要多个presentable所属当前用的同一个节点,如果业务有调整,去掉限制即可
     * @returns {Promise<void>}
     */
    async batchPresentableNodeAndReleaseSideAuth(presentableInfos, nodeInfo) {

        const {ctx} = this
        const {userInfo} = ctx.request.identityInfo
        const presentableIds = presentableInfos.map(x => x.presentableId).toString()
        const presentableAuthTrees = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/authTrees?presentableIds=${presentableIds}`)
            .then(list => new Map(list.map(x => [x.presentableId, x])))

        const authTasks = presentableInfos.map(presentableInfo =>
            this.presentableNodeAndReleaseSideAuth(presentableInfo, presentableAuthTrees.get(presentableInfo.presentableId), nodeInfo, userInfo)
                .then(authResult => presentableInfo.authResult = authResult))

        return Promise.all(authTasks).then(() => presentableInfos.map(presentableInfo => lodash.pick(presentableInfo, ['presentableId', 'authResult'])))
    }

    /**
     * presentable发行和节点侧授权
     * @param presentableInfo
     * @param nodeInfo
     * @returns {Promise<void>}
     */
    async presentableNodeAndReleaseSideAuth(presentableInfo, presentableAuthTree, nodeInfo, nodeUserInfo) {

        const {ctx} = this
        const nodeSideAuthResult = await ctx.service.nodeContractAuthService.presentableNodeSideAuth(presentableInfo, presentableAuthTree, nodeInfo, nodeUserInfo)

        if (!nodeSideAuthResult.isAuth) {
            return nodeSideAuthResult
        }

        return ctx.service.releaseContractAuthService.presentableReleaseSideAuth(presentableInfo, presentableAuthTree)
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
            return new commonAuthResult(authCodeEnum.ResourceAuthTokenInvalid, {
                authTokenCache, resourceId,
                value: app.contractType.PresentableToUser
            })
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
     * 填充授权信息数据
     * @private
     */
    _fillPresentableAuthDataInfo({presentableInfo, authResult}) {

        const exposePresentableInfo = lodash.pick(presentableInfo, ["presentableId", "presentableName", "presentableIntro", "nodeId", "policy", "resourceId", "resourceInfo"])

        authResult.data = Object.assign(authResult.data || {}, {presentableInfo: exposePresentableInfo})

        return authResult
    }
}