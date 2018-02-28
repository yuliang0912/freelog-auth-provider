'use strict'

const Service = require('egg').Service;
const authService = require('../authorization-service/process-manager')
const contractFsmEventHandler = require('../contract-service/contract-fsm-event-handler')

class ContractService extends Service {
    /**
     * 创建合同
     * @returns {Promise<void>}
     */
    async createContract({targetId, contractType, segmentId, serialNumber, partyTwo}) {

        let {ctx, app} = this
        let contractModel = null
        let userInfo = this.ctx.request.identityInfo.userInfo

        if (contractType === app.contractType.PresentableToUer) {
            contractModel = await this.createUserContract({presentableId: targetId, segmentId, serialNumber, userInfo})
        } else {
            contractModel = await this.createNodeContract({
                resourceId: targetId,
                segmentId,
                serialNumber,
                nodeId: partyTwo,
                userInfo
            })
        }

        await app.dal.contractProvider.getContract({targetId, partyTwo, segmentId}).then(oldContract => {
            oldContract && ctx.error({msg: "已经存在一份同样的合约,不能重复签订", errCode: 105, data: oldContract})
        })

        let policyTextBuffer = new Buffer(contractModel.policySegment.segmentText, 'utf8')

        /**
         * 保持策略原文副本,以备以后核查
         */
        await app.upload.putBuffer(`contracts/${serialNumber}.txt`, policyTextBuffer).then(data => {
            contractModel.policyCounterpart = data.url
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
     * @param serialNumber
     * @param partyTwo
     * @returns {Promise<void>}
     */
    async createUserContract({presentableId, segmentId, serialNumber, userInfo}) {

        let {ctx, app} = this
        let presentable = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/presentables/${presentableId}`)
        //let presentable = await ctx.curlIntranetApi(`http://127.0.0.1:7005/v1/presentables/${presentableId}`)
        if (!presentable) {
            ctx.error({msg: `targetId:${presentableId}错误`})
        }
        if (presentable.serialNumber !== serialNumber) {
            ctx.error({msg: 'serialNumber不匹配,policy已变更,变更时间' + new Date(policyInfo.updateDate).toLocaleString()})
        }
        let policySegment = presentable.policy.find(t => t.segmentId === segmentId)
        if (!policySegment) {
            ctx.error({msg: 'segmentId错误,未找到策略段'})
        }

        await ctx.dal.contractProvider.getContractById(presentable.contractId).then(resourceContract => {
            if (!resourceContract || resourceContract.status !== 3) {
                ctx.error({msg: 'presentable对应的节点与资源的合同不在激活状态,无法签订合约', data: resourceContract})
            }
        })

        let nodeInfo = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/nodes/${presentable.nodeId}`)
        //let nodeInfo = await ctx.curlIntranetApi(`http://127.0.0.1:7005/v1/nodes/${presentable.nodeId}`)
        if (!nodeInfo) {
            ctx.error({msg: '未找到节点信息', data: {presentable}})
        }
        if (!authService.presentablePolicyIdentityAuthentication({policySegment, userInfo, nodeInfo}).isAuth) {
            ctx.error({msg: 'presentable策略段身份认证失败', data: {policyUsers: policySegment.users, userInfo}})
        }

        return {
            segmentId,
            policySegment,
            targetId: presentableId,
            partyOne: presentable.nodeId,
            partyTwo: userInfo.userId,
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
     * @param serialNumber
     * @param partyTwo
     * @returns {Promise<void>}
     */
    async createNodeContract({resourceId, segmentId, serialNumber, nodeId, userInfo}) {

        let {ctx, app, config} = this
        let resourcePolicy = await ctx.curlIntranetApi(`${config.gatewayUrl}/api/v1/resources/policies/${resourceId}`)
        //debug let resourcePolicy = await ctx.curlIntranetApi(`http://127.0.0.1:7001/v1/policies/${resourceId}`)
        if (!resourcePolicy) {
            ctx.error({msg: `targetId:${resourceId}错误`})
        }
        if (resourcePolicy.serialNumber !== serialNumber) {
            ctx.error({msg: 'serialNumber不匹配,policy已变更,变更时间' + new Date(policyInfo.updateDate).toLocaleString()})
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

        let resourcePolicyIdentityAuth = authService.resourcePolicyIdentityAuthentication({
            resourcePolicy,
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
            resourceId: resourceId,
            contractType: app.contractType.ResourceToNode,
            languageType: resourcePolicy.languageType
        }
    }
}

module.exports = ContractService;