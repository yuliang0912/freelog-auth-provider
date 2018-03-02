'use strict'

const Service = require('egg').Service
const authService = require('../authorization-service/process-manager')
const commonAuthResult = require('../authorization-service/common-auth-result')

class PublicResourceAuthService extends Service {

    /**
     * 资源直接授权
     * @param resourceId
     * @returns {Promise<void>}
     * @constructor
     */
    async resourceAuth({userId, resourceId, nodeId}) {

        let authResultCache = await this.getLatestAuthResultCache({userId, nodeId, resourceId})
        if (authResultCache) {
            return authResultCache
        }

        let userInfo = userId ? this.ctx.request.identityInfo.userInfo : null
        let nodeInfo = nodeId ? await this.ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/nodes/${nodeId}`) : null
        let resourcePolicy = await this.ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/resources/policies/${resourceId}`)

        if (!resourcePolicy) {
            this.ctx.error({msg: '参数resourceId错误,未能找到资源的策略段', data: resourcePolicy})
        }

        let authResult = await authService.resourcePolicyAuthorization({
            resourcePolicy,
            nodeInfo,
            userInfo
        })

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