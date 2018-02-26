'use strict'

const Service = require('egg').Service
const authService = require('../authorization-service/process-manager')

class PublicResourceAuthService extends Service {

    /**
     * 资源直接授权
     * @param resourceId
     * @returns {Promise<void>}
     * @constructor
     */
    async resourceAuth({userId, resourceId, nodeId}) {

        let userInfo = userId ? this.ctx.request.identityInfo.userInfo : null
        let nodeInfo = nodeId ? await this.ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/nodes/${nodeId}`) : null
        let resourcePolicy = await this.ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/resources/policies/${resourceId}`)

        if (!resourcePolicy) {
            this.ctx.error({msg: '参数resourceId错误,未能找到资源的策略段', data: resourcePolicy})
        }

        return authService.resourcePolicyAuthorization({
            resourcePolicy,
            nodeInfo,
            userInfo
        })
    }
}

module.exports = PublicResourceAuthService