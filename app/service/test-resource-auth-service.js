'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const authCodeEnum = require('../enum/auth-code')
const {ApplicationError, ArgumentError} = require('egg-freelog-base/error')
const commonAuthResult = require('../authorization-service/common-auth-result')

module.exports = class NodeTestResourceAuthService extends Service {


    /**
     * 测试资源全链路授权
     * @param testResourceInfo
     * @param subEntityId
     * @param subEntityVersion
     * @returns {Promise<module.CommonAuthResult|*>}
     */
    async testResourceAuth(testResourceInfo, subEntityId, subEntityName, subEntityType, subEntityVersion) {

        const {ctx} = this
        const {userInfo} = ctx.request.identityInfo
        const {testResourceId, differenceInfo, nodeId} = testResourceInfo
        const {onlineStatusInfo} = differenceInfo

        if (!onlineStatusInfo.isOnline) {
            return new commonAuthResult(authCodeEnum.TestResourceNotOnline)
        }

        const nodeInfoTask = ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`)
        const testResourceAuthTreeTask = ctx.curlIntranetApi(`${ctx.webApi.testNode}/testResources/${testResourceId}/authTree`)
        const [nodeInfo, testResourceAuthTree] = await Promise.all([nodeInfoTask, testResourceAuthTreeTask])

        if (nodeInfo.ownerUserId !== userInfo.userId) {
            return new commonAuthResult(authCodeEnum.UserUnauthorized)
        }

        const {authTree} = testResourceAuthTree

        if (subEntityId && subEntityVersion && !authTree.some(x => x.id === subEntityId && x.version === subEntityVersion)) {
            throw ApplicationError(ctx.gettext('params-validate-failed', 'subEntityId,subEntityVersion'))
        }
    }


    /**
     * 获取子实体信息
     * @param authTree
     * @param subEntityId
     * @param subEntityName
     * @param subEntityType
     * @param subEntityVersion
     * @returns {*}
     * @private
     */
    _getSubEntityInfo(authTree, subEntityId, subEntityName, subEntityType, subEntityVersion) {

        var authTreeChain = lodash.chain(authTree)
        if (subEntityId) {
            authTreeChain = authTreeChain.filter(x => x.id === subEntityId)
        }
        if (subEntityName) {
            authTreeChain = authTreeChain.filter(x => x.name === subEntityName)
        }
        if (subEntityType) {
            authTreeChain = authTreeChain.filter(x => x.type === subEntityType)
        }
        if (subEntityVersion) {
            authTreeChain = authTreeChain.filter(x => x.version === subEntityVersion)
        }
        if (authTreeChain.values().length > 1) {
            throw new ArgumentError(this.ctx.gettext('params-comb-validate-failed', 'subEntityId, subEntityName, subEntityType, subEntityVersion'))
        }
        return authTreeChain.first().values()
    }
}

