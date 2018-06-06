'use strict'

const Service = require('egg').Service;
const authService = require('../authorization-service/process-manager')
const contractFsmEventHandler = require('../contract-service/contract-fsm-event-handler')
const authErrCode = require('../enum/auth_err_code')

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
        const userInfo = ctx.request.identityInfo.userInfo
        const contractObjects = new Map(signObjects.map(x => [x.targetId, x]))
        const authSchemeInfos = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/resources/authSchemes/?authSchemeIds=${Array.from(contractObjects.keys()).toString()}`)
        //const authSchemeInfos = await ctx.curlIntranetApi(`http://127.0.0.1:7001/v1/resources/authSchemes/?authSchemeIds=${Array.from(contractObjects.keys()).toString()}`)

        if (authSchemeInfos.length !== contractObjects.size) {
            ctx.error({msg: '参数targetId校验失败,数据不完全匹配', data: {signObjects}})
        }

        for (let i = 0, j = authSchemeInfos.length; i < j; i++) {

            let item = authSchemeInfos[i]
            let contractObject = contractObjects.get(item.authSchemeId)
            let policySegment = item.policy.find(x => x.segmentId === contractObject.segmentId)
            if (!policySegment) {
                ctx.error({
                    msg: '参数segmentId校验失败',
                    data: {targetId: item.authSchemeId, segmentId: contractObject.segmentId}
                })
            }

            await authService.resourcePolicyIdentityAuthentication({
                policyOwnerId: item.userId, policySegment, userInfo, nodeInfo
            }).then(identityAuthResult => {
                if (!identityAuthResult.isAuth) {
                    ctx.error({
                        msg: '策略段身份认证失败',
                        data: {targetId: item.authSchemeId, segmentId: contractObject.segmentId}
                    })
                }
            })

            contractObject.partyOneUserId = item.userId
            contractObject.partyTwoUserId = userInfo.userId
            contractObject.policySegment = policySegment
            contractObject.partyOne = item.authSchemeId
            contractObject.partyTwo = partyTwo
            contractObject.resourceId = item.resourceId
            contractObject.contractType = contractType
            contractObject.languageType = item.languageType
        }

        const createdContracts = await ctx.dal.contractProvider.batchCreateContract([...contractObjects.values()])

        return [...createdContracts, ...existContracts]
    }

    /**
     * 创建合同
     * @returns {Promise<void>}
     */
    async createContract({targetId, contractType, segmentId, partyTwo}) {

        let {ctx, app} = this
        let contractModel = null
        let userInfo = ctx.request.identityInfo.userInfo

        if (contractType === app.contractType.PresentableToUer) {
            contractModel = await this.createUserContract({presentableId: targetId, segmentId, userInfo})
        } else {
            contractModel = await this.createNodeContract({
                resourceId: targetId,
                segmentId,
                nodeId: partyTwo,
                userInfo
            })
        }

        await app.dal.contractProvider.getContract({targetId, partyTwo, segmentId}).then(oldContract => {
            oldContract && ctx.error({msg: "已经存在一份同样的合约,不能重复签订", errCode: 105, data: oldContract})
        })

        //如果初始态就是激活态
        if (contractModel.policySegment.activatedStates.some(t => t === contractModel.initialState)) {
            contractModel.status = 3
        }

        let contractInfo = await ctx.dal.contractProvider.createContract(contractModel).then(app.toObject).then(contractInfo => {
            let awaitIninial = new Promise((resolve) => {
                app.once(`${app.event.contractEvent.initialContractEvent}_${contractInfo.contractId}`, function () {
                    resolve(contractInfo)
                })
            })
            contractFsmEventHandler.initContractFsm(contractInfo)
            return awaitIninial
        })
        return ctx.dal.contractProvider.getContractById(contractInfo.contractId)
    }

    /**
     * 创建presentable合同
     * @param targetId
     * @param contractType
     * @param segmentId
     * @param partyTwo
     * @returns {Promise<void>}
     */
    async createUserContract({presentableId, segmentId, userInfo}) {

        let {ctx, app} = this
        let presentable = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/presentables/${presentableId}`)
        //let presentable = await ctx.curlIntranetApi(`http://127.0.0.1:7005/v1/presentables/${presentableId}`)
        if (!presentable) {
            ctx.error({msg: `targetId:${presentableId}错误`})
        }
        let policySegment = presentable.policy.find(t => t.segmentId === segmentId)
        if (!policySegment) {
            ctx.error({msg: 'segmentId错误,未找到策略段'})
        }

        await ctx.dal.contractProvider.getContractById(presentable.contractId).then(resourceContract => {
            if (!resourceContract || resourceContract.status !== 3) {
                ctx.error({
                    msg: 'presentable对应的节点与资源的合同不在激活状态,无法签订合约',
                    errCode: authErrCode.nodeContractNotActivate,
                    data: resourceContract
                })
            }
        })

        let nodeInfo = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/nodes/${presentable.nodeId}`)
        //let nodeInfo = await ctx.curlIntranetApi(`http://127.0.0.1:7005/v1/nodes/${presentable.nodeId}`)
        if (!nodeInfo) {
            ctx.error({msg: '未找到节点信息', data: {presentable}})
        }
        let authResult = await authService.presentablePolicyIdentityAuthentication({policySegment, userInfo, nodeInfo})
        if (!authResult.isAuth) {
            ctx.error({msg: 'presentable策略段身份认证失败', data: {policyUsers: policySegment.users, userInfo}})
        }

        return {
            segmentId,
            policySegment,
            targetId: presentableId,
            partyOne: presentable.nodeId,
            partyTwo: userInfo.userId,
            partyOneUserId: presentable.userId,
            partyTwoUserId: userInfo.userId,
            resourceId: presentable.resourceId,
            contractType: app.contractType.PresentableToUer,
            languageType: presentable.languageType
        }
    }

    /**
     * 创建节点合同
     * @param targetId
     * @param contractType
     * @param segmentId
     * @param partyTwo
     * @returns {Promise<void>}
     */
    async createNodeContract({resourceId, segmentId, nodeId, userInfo}) {

        let {ctx, app, config} = this
        let resourcePolicy = await ctx.curlIntranetApi(`${config.gatewayUrl}/api/v1/resources/policies/${resourceId}`)
        //debug let resourcePolicy = await ctx.curlIntranetApi(`http://127.0.0.1:7001/v1/policies/${resourceId}`)
        if (!resourcePolicy) {
            ctx.error({msg: `targetId:${resourceId}错误`})
        }
        let policySegment = resourcePolicy.policy.find(t => t.segmentId === segmentId)
        if (!policySegment) {
            ctx.error({msg: 'segmentId错误,未找到策略段'})
        }

        let nodeInfo = await ctx.curlIntranetApi(`${config.gatewayUrl}/api/v1/nodes/${nodeId}`)
        //debug let nodeInfo = await ctx.curlIntranetApi(`http://127.0.0.1:7005/v1/nodes/${nodeId}`)
        if (!nodeInfo || nodeInfo.ownerUserId !== userInfo.userId) {
            ctx.error({msg: '未找到节点或者用户与节点信息不匹配', data: nodeInfo})
        }

        let resourcePolicyIdentityAuth = await authService.resourcePolicyIdentityAuthentication({
            policyOwnerId: resourcePolicy.userId,
            policySegment,
            nodeInfo,
            userInfo
        })

        if (!resourcePolicyIdentityAuth.isAuth) {
            ctx.error({msg: '资源策略段身份认证失败', data: {policyUsers: policySegment.users, nodeInfo}})
        }

        return {
            segmentId,
            policySegment,
            targetId: resourceId,
            partyOne: resourcePolicy.userId,
            partyTwo: nodeId,
            partyOneUserId: resourcePolicy.userId,
            partyTwoUserId: nodeInfo.ownerUserId,
            resourceId: resourceId,
            contractType: app.contractType.ResourceToNode,
            languageType: resourcePolicy.languageType
        }
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
