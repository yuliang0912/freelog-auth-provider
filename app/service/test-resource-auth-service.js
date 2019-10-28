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
        const {testResourceId, differenceInfo, nodeId, resolveReleaseSignStatus} = testResourceInfo
        const {onlineStatusInfo} = differenceInfo

        if (!onlineStatusInfo.isOnline) {
            return new commonAuthResult(authCodeEnum.NodeTestResourceNotOnline)
        }
        if (resolveReleaseSignStatus === 2) { //未完成签约
            return new commonAuthResult(authCodeEnum.NodeTestResourceNotCompleteSignContract)
        }

        const nodeInfoTask = ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`)
        const testResourceAuthTreeTask = ctx.curlIntranetApi(`${ctx.webApi.testNode}/testResources/${testResourceId}/authTree`)
        const [nodeInfo, testResourceAuthTree] = await Promise.all([nodeInfoTask, testResourceAuthTreeTask])
        const {authTree} = testResourceAuthTree

        if (nodeInfo.ownerUserId !== userInfo.userId) {
            return new commonAuthResult(authCodeEnum.UserUnauthorized)
        }

        var subEntityInfo = null
        if (subEntityId || subEntityName) {
            subEntityInfo = this._getSubEntityInfo(authTree, subEntityId, subEntityName, subEntityType, subEntityVersion)
            if (!subEntityInfo) {
                throw ApplicationError(ctx.gettext('params-validate-failed', 'subReleaseId,subEntityName'))
            }
        }

        const releaseSideAuthTask = ctx.service.releaseContractAuthService.testResourceReleaseSideAuth(testResourceAuthTree)
        const nodeSideAuthTask = ctx.service.nodeContractAuthService.testResourceNodeSideAuth(testResourceInfo, nodeInfo, userInfo)

        const [nodeSideAuthResult, releaseSideAuthResult] = await Promise.all([nodeSideAuthTask, releaseSideAuthTask])

        releaseSideAuthResult.data.subEntityInfo = nodeSideAuthResult.data.subEntityInfo = subEntityInfo

        return nodeSideAuthResult.isAuth ? releaseSideAuthResult : nodeSideAuthResult
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
        return authTreeChain.first().value()
    }
}

