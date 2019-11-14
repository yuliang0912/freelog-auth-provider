'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const authCodeEnum = require('../enum/auth-code')
const commonAuthResult = require('../authorization-service/common-auth-result')

module.exports = class NodeTestResourceAuthService extends Service {


    /**
     * 测试资源全链路授权
     * @param testResourceInfo
     * @param subEntityId
     * @param subEntityVersion
     * @returns {Promise<module.CommonAuthResult|*>}
     */
    async testResourceAuth(testResourceInfo) {

        const {app, ctx} = this
        const {userInfo} = ctx.request.identityInfo
        const {testResourceId, differenceInfo, nodeId, resourceType, resolveReleaseSignStatus} = testResourceInfo
        const {onlineStatusInfo} = differenceInfo

        if (!onlineStatusInfo.isOnline && resourceType !== app.resourceType.PAGE_BUILD) {
            return new commonAuthResult(authCodeEnum.NodeTestResourceNotOnline)
        }
        if (resolveReleaseSignStatus === 2) { //未完成签约
            return new commonAuthResult(authCodeEnum.NodeTestResourceNotCompleteSignContract)
        }

        const nodeInfoTask = ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`)
        const testResourceAuthTreeTask = ctx.curlIntranetApi(`${ctx.webApi.testNode}/testResources/${testResourceId}/authTree`)
        const [nodeInfo, testResourceAuthTree] = await Promise.all([nodeInfoTask, testResourceAuthTreeTask])

        if (nodeInfo['ownerUserId'] !== userInfo.userId) {
            return new commonAuthResult(authCodeEnum.UserUnauthorized)
        }

        const releaseSideAuthTask = ctx.service.releaseContractAuthService.testResourceReleaseSideAuth(testResourceAuthTree)
        const nodeSideAuthTask = ctx.service.nodeContractAuthService.testResourceNodeSideAuth(testResourceInfo, nodeInfo, userInfo)

        const [nodeSideAuthResult, releaseSideAuthResult] = await Promise.all([nodeSideAuthTask, releaseSideAuthTask])

        return nodeSideAuthResult.isAuth ? releaseSideAuthResult : nodeSideAuthResult
    }

    /**
     * 获取真实响应的实体(依赖可能被替换了,此时需要响应被替换过的,但是参数传入还是原始的ID或名称)
     * @param dependencies
     * @param subEntityId
     * @param subEntityName
     */
    async getRealResponseTestResourceInfo(testResourceId, parentEntityNid, subEntityId, subEntityName, subEntityType) {

        const dependencies = await this.getTestResourceDependencies(testResourceId, parentEntityNid, 2)

        const filterFunc = (item, field, value) => {
            let targetInfo = lodash.isEmpty(item['replaceRecords']) ? item : item['replaceRecords'][0]
            return targetInfo[field].toLowerCase() === value.toLowerCase()
        }

        var subDependencyChain = lodash.chain(dependencies)
        if (subEntityId) {
            subDependencyChain = subDependencyChain.filter(x => filterFunc(x, 'id', subEntityId))
        }
        if (subEntityName) {
            subDependencyChain = subDependencyChain.filter(x => filterFunc(x, 'name', subEntityName))
        }
        if (subEntityType) {
            subDependencyChain = subDependencyChain.filter(x => filterFunc(x, 'type', subEntityType))
        }
        if (!parentEntityNid) {
            let defaultRootNodeId = testResourceId.substr(0, 12)
            subDependencyChain = subDependencyChain.filter(x => x.nid === defaultRootNodeId)
        }
        return subDependencyChain.first().value()
    }

    /**
     * 获取直接依赖(不包含依赖的依赖信息,非依赖树)
     * @param testResourceId
     * @param entityNid
     * @returns {Promise<*>}
     */
    async getTestResourceDependencies(testResourceId, entityNid, maxDeep = 100) {

        const {ctx} = this

        return ctx.curlIntranetApi(`${ctx.webApi.testNode}/testResources/${testResourceId}/dependencyTree?maxDeep=${maxDeep}&${entityNid ? 'entityNid=' + entityNid : ''}`)
    }
}

