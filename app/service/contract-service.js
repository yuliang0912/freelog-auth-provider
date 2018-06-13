'use strict'

const Service = require('egg').Service;
const authService = require('../authorization-service/process-manager-new')
const contractFsmEventHandler = require('../contract-service/contract-fsm-event-handler')

class ContractService extends Service {

    /**
     * 批量签约(保证原子性)
     * @param policies
     * @param contractType
     * @param nodeInfo
     * @param partyTwo
     * @returns {Promise<*[]>}
     */
    async batchCreateContracts({policies, contractType, nodeInfo, partyTwo}) {

        const {existContracts, signObjects} = await this._checkDuplicateContract(partyTwo, policies)

        if (!signObjects.length) {
            return existContracts
        }

        const {ctx} = this
        const resourceMap = new Map()
        const userInfo = ctx.request.identityInfo.userInfo
        const contractObjects = new Map(signObjects.map(x => [x.targetId, x]))
        const authSchemeInfos = await ctx.curlIntranetApi(`${ctx.webApi.authSchemeInfo}?authSchemeIds=${Array.from(contractObjects.keys()).toString()}`)

        if (authSchemeInfos.length !== contractObjects.size) {
            ctx.error({msg: '参数targetId校验失败,数据不完全匹配', data: {signObjects}})
        }

        const identityAuthTasks = []
        authSchemeInfos.forEach(item => {

            const contractObject = contractObjects.get(item.authSchemeId)
            const policySegment = item.policy.find(x => x.segmentId === contractObject.segmentId)
            if (!policySegment) {
                ctx.error({
                    msg: '参数segmentId校验失败',
                    data: {targetId: item.authSchemeId, segmentId: contractObject.segmentId, policy: item.policy}
                })
            }
            contractObject.partyOneUserId = item.userId
            contractObject.partyTwoUserId = userInfo.userId
            contractObject.policySegment = policySegment
            contractObject.partyOne = item.authSchemeId
            contractObject.partyTwo = partyTwo
            contractObject.resourceId = item.resourceId
            contractObject.contractType = contractType
            contractObject.languageType = item.languageType

            resourceMap.set(item.resourceId, null)
            identityAuthTasks.push(authService.policyIdentityAuthentication({
                policySegment,
                contractType,
                partyOneUserId: item.userId,
                partyTwoInfo: nodeInfo,
                partyTwoUserInfo: userInfo
            }))
        })

        const identityAuthResults = await Promise.all(identityAuthTasks)
        const identityAuthFaildResults = identityAuthResults.filter(x => !x.isAuth)
        if (identityAuthFaildResults.length) {
            ctx.error({msg: '待签约列表中存在部分策略身份认证失败', data: {identityAuthFaildResults}})
        }

        await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/list?resourceIds=${Array.from(resourceMap.keys()).toString()}`).then(list => {
            list.forEach(resource => resourceMap.set(resource.resourceId, resource.resourceName))
        })

        const models = Array.from(contractObjects.values())

        models.forEach(item => {
            if (resourceMap.has(item.resourceId)) {
                item.contractName = resourceMap.get(item.resourceId)
            }
        })

        const createdContracts = await ctx.dal.contractProvider.batchCreateContract(models)

        return [...createdContracts, ...existContracts]
    }

    /**
     * 创建presentable合同
     * @param targetId
     * @param contractType
     * @param segmentId
     * @param partyTwo
     * @returns {Promise<void>}
     */
    async createUserContract({presentableId, segmentId}) {

        const {ctx, app} = this
        const userInfo = ctx.request.identityInfo.userInfo

        await app.dal.contractProvider.getContract({
            targetId: presentableId,
            partyTwo: userInfo.userId,
            contractType: app.contractType.PresentableToUer,
            segmentId
        }).then(oldContract => {
            oldContract && ctx.error({msg: "已经存在一份同样的合约,不能重复签订", errCode: 105, data: oldContract})
        })

        const presentable = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}`)
        if (!presentable || presentable.status !== 2) {
            ctx.error({msg: `targetId:${presentableId}错误或者presentable未上线`, data: {presentable}})
        }

        const policySegment = presentable.policy.find(t => t.segmentId === segmentId)
        if (!policySegment || policySegment.status !== 1) {
            ctx.error({msg: 'segmentId错误,未找到策略段', data: {policySegment}})
        }

        const authResult = await authService.policyIdentityAuthentication({
            policySegment,
            contractType: app.contractType.PresentableToUer,
            partyOneUserId: presentable.userId,
            partyTwoUserInfo: userInfo
        })
        if (!authResult.isAuth) {
            ctx.error({msg: 'presentable策略段身份认证失败', data: {policyUsers: policySegment.users, userInfo}})
        }

        const nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${presentable.nodeId}`)
        if (!nodeInfo || nodeInfo.status !== 0) {
            ctx.error({msg: '未找到节点信息或者节点已不存在', data: {presentable, nodeInfo}})
        }

        const contractModel = {
            segmentId,
            policySegment,
            targetId: presentableId,
            partyOne: presentable.nodeId,
            partyTwo: userInfo.userId,
            partyOneUserId: presentable.userId,
            partyTwoUserId: userInfo.userId,
            resourceId: presentable.resourceId,
            contractName: presentable.presentableName,
            contractType: app.contractType.PresentableToUer
        }

        const contractInfo = await ctx.dal.contractProvider.createContract(contractModel).then(app.toObject).then(contractInfo => {
            let awaitIninial = new Promise((resolve) => {
                app.once(`${app.event.contractEvent.initialContractEvent}_${contractInfo.contractId}`, function () {
                    resolve(contractInfo)
                })
            })
            contractFsmEventHandler.initContractFsm(contractInfo).catch(console.error)
            return awaitIninial
        })

        return ctx.dal.contractProvider.getContractById(contractInfo.contractId)
    }

    /**
     * 检查是否存在重复的合同
     * @returns {Promise<void>}
     * @private
     */
    async _checkDuplicateContract(partyTwo, signObjects = []) {

        if (!signObjects.length) {
            return []
        }

        const signObjectKeyMap = new Map()
        const statistics = {targetIds: [], segmentIds: []}
        signObjects.forEach(current => {
            statistics.targetIds.push(current.targetId)
            statistics.segmentIds.push(current.segmentId)
            signObjectKeyMap.set(`${current.targetId}_${current.segmentId}`, current)
        })

        const contractList = await this.ctx.dal.contractProvider.find({
            partyTwo,
            targetId: {$in: statistics.targetIds},
            segmentId: {$in: statistics.segmentIds}
        })

        const existContracts = contractList.filter(x => {
            let isExist = signObjectKeyMap.has(`${x.targetId}_${x.segmentId}`)
            isExist && signObjectKeyMap.delete(`${x.targetId}_${x.segmentId}`)
            return isExist
        })

        return {existContracts, signObjects: Array.from(signObjectKeyMap.values())}
    }
}

module.exports = ContractService;
