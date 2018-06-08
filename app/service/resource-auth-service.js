'use strict'

const Service = require('egg').Service
const authService = require('../authorization-service/process-manager-new')
const commonAuthResult = require('../authorization-service/common-auth-result')

class PublicResourceAuthService extends Service {

    /**
     * 基于资源策略直接授权
     * @param resourceId
     * @returns {Promise<void>}
     * @constructor
     */
    async resourceAuth({resourceId, nodeId}) {

        const {ctx, app} = this
        const userId = ctx.request.userId

        const authResultCache = await this.getLatestAuthResultCache({userId, nodeId, resourceId})
        if (authResultCache) {
            return authResultCache
        }

        const resourceInfo = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/${resourceId}`)
        if (!resourceInfo || resourceInfo.status !== 2) {
            ctx.error({msg: '参数resourceId错误,未能找到有效的资源信息', data: {resourceInfo}})
        }

        const userInfo = ctx.request.identityInfo.userInfo || null
        const nodeInfo = nodeId ? await this.ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`) : null
        if (nodeInfo && nodeInfo.userId !== userId) {
            ctx.error({msg: '节点信息与登录用户不匹配', data: {nodeInfo, userInfo}})
        }

        const params = {
            contractType: nodeInfo ? app.contractType.ResourceToNode : 4,
            partyOneUserId: resourceInfo.userId,
            partyTwoInfo: nodeInfo,
            partyTwoUserInfo: userId
        }

        let authResult = null
        const resourceAuthSchemes = await ctx.curlIntranetApi(`${ctx.webApi.authSchemeInfo}?resourceIds=${resourceId}`)
        for (let i = 0, j = resourceAuthSchemes.length; i < j; i++) {
            authResult = await authService.policyAuthorization(Object.assign(params, {policySegments: resourceAuthSchemes[i].policy}))
            if (authResult.isAuth) {
                break;
            }
        }

        this.saveAuthResult({userInfo, nodeInfo, resourceId, authResult})

        return authResult
    }

    /**
     * 获取最新一次的授权结果缓存
     * @returns {Promise<void>}
     */
    async getLatestAuthResultCache({userId, nodeId, resourceId}) {

        if (!userId) {
            return
        }

        let condition = {userId, targetId: resourceId}
        if (nodeId) {
            condition.nodeId = nodeId
        }

        let lastAuthResult = await this.app.dal.authTokenProvider.getLatestAuthToken(condition)
        if (!lastAuthResult) {
            return
        }

        let authResult = new commonAuthResult(lastAuthResult.authCode)
        authResult.data.authToken = lastAuthResult.extendInfo

        return authResult
    }

    /**
     * 保存最后一次授权结果
     * @param userInfo
     * @param authResult
     * @returns {Promise<void>}
     */
    async saveAuthResult({userInfo, nodeInfo, resourceId, authResult}) {
        if (!userInfo || !authResult.isAuth) {
            return
        }
        let model = {
            userId: userInfo.userId,
            nodeId: nodeInfo ? nodeInfo.nodeId : 0,
            targetId: resourceId,
            targetType: 2,
            authCode: authResult.authCode,
            extendInfo: authResult.data.authToken,
            signature: authResult.data.authToken.signature,
            expire: authResult.data.authToken.expire
        }
        await this.app.dal.authTokenProvider.createAuthToken(model)
    }
}

module.exports = PublicResourceAuthService