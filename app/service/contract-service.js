'use strict'

const Service = require('egg').Service;
const authService = require('../authorization-service/process-manager')
const {LogicError, ArgumentError, ApplicationError} = require('egg-freelog-base/error')


class ContractService extends Service {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

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

        const {ctx, app} = this
        const resourceMap = new Map()
        const userInfo = ctx.request.identityInfo.userInfo
        const contractObjects = new Map(signObjects.map(x => [x.targetId, x]))
        const authSchemeInfos = await ctx.curlIntranetApi(`${ctx.webApi.authSchemeInfo}?authSchemeIds=${Array.from(contractObjects.keys()).toString()}`)

        if (authSchemeInfos.length !== contractObjects.size) {
            throw new ArgumentError('参数targetId校验失败,数据不完全匹配', {signObjects})
        }

        const resourceReContractableSignAuthFailed = await this._checkReContractableAuth(Array.from(contractObjects.keys()))
        if (resourceReContractableSignAuthFailed.length) {
            throw new ArgumentError('签约的授权方案中存在部分上游合同没有执行到允许再签约授权的状态', resourceReContractableSignAuthFailed)
        }

        const identityAuthTasks = [], signAuthResults = []
        authSchemeInfos.forEach(({authSchemeId, policy, userId, resourceId}) => {
            const contractObject = contractObjects.get(authSchemeId)
            const policySegment = policy.find(x => x.segmentId === contractObject.segmentId)
            if (!policySegment) {
                throw new ArgumentError('参数segmentId校验失败', {
                    targetId: authSchemeId, policy,
                    segmentId: contractObject.segmentId,
                })
            }
            contractObject.partyOneUserId = userId
            contractObject.partyTwoUserId = userInfo.userId
            contractObject.partyOne = authSchemeId
            contractObject.partyTwo = partyTwo
            contractObject.resourceId = resourceId
            contractObject.contractType = contractType
            contractObject.policySegment = policySegment

            resourceMap.set(resourceId, null)
            identityAuthTasks.push(authService.policyIdentityAuthentication({
                policySegment, contractType,
                partyOneUserId: userId,
                partyTwoInfo: nodeInfo,
                partyTwoUserInfo: userInfo
            }))
            signAuthResults.push({
                authSchemeId,
                policySegment,
                purpose: this.getPurposeFromPolicy(policySegment)
            })
        })

        const basePurpose = contractType === app.contractType.ResourceToResource ? 1 : 2
        const signAuthFailedResults = signAuthResults.filter(x => (x.purpose & basePurpose) !== basePurpose)
        if (signAuthFailedResults.length) {
            throw new ApplicationError('待签约列表中存在部分策略不包含再签约授权', {signAuthFailedResults})
        }

        const identityAuthResults = await Promise.all(identityAuthTasks)
        const identityAuthFailedResults = identityAuthResults.filter(x => !x.isAuth)
        if (identityAuthFailedResults.length) {
            throw new ApplicationError('待签约列表中存在部分策略身份认证失败', {identityAuthFailedResults})
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

        const createdContracts = await app.contractService.batchCreateContract(models, true)

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
    async createUserContract({presentableId, segmentId, isDefault}) {

        const {ctx, app} = this
        const userInfo = ctx.request.identityInfo.userInfo

        const oldContract = await this.contractProvider.findOne({
            targetId: presentableId,
            partyTwoUserId: userInfo.userId,
            contractType: app.contractType.PresentableToUser,
            isTerminate: 0, segmentId
        })
        if (oldContract) {
            throw new ApplicationError('已经存在一份同样的合约,不能重复签订', oldContract)
        }

        const presentable = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}`)
        if (!presentable || !presentable.isOnline) {
            throw new ArgumentError(`presentableId:${presentableId}错误或者presentable未上线`, {presentable})
        }

        const policySegment = presentable.policy.find(t => t.segmentId === segmentId)
        if (!policySegment || policySegment.status !== 1) {
            throw new ArgumentError(`segmentId错误,未找到策略段`, {policySegment})
        }

        const authResult = await authService.policyIdentityAuthentication({
            policySegment,
            contractType: app.contractType.PresentableToUser,
            partyOneUserId: presentable.userId,
            partyTwoUserInfo: userInfo
        })
        if (!authResult.isAuth) {
            throw new ApplicationError('presentable策略段身份认证失败,不能签约', {
                authorizedObjects: policySegment.authorizedObjects, userInfo
            })
        }

        const nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${presentable.nodeId}`)
        if (!nodeInfo || nodeInfo.status !== 0) {
            throw new LogicError('未找到节点信息或者节点已不存在', {presentable, nodeInfo})
        }

        const contracts = await ctx.service.signAuthService.presentableSignAuth(presentableId)
        const signAuthFailedContracts = contracts.filter(x => !x.signAuthResult.isAuth)
        if (signAuthFailedContracts.length) {
            throw new ApplicationError('节点资源的合约链中存在未获得再签约授权的合约', {signAuthFailedContracts})
        }

        const contractModel = {
            segmentId, policySegment, isDefault,
            targetId: presentableId,
            partyOne: presentable.nodeId,
            partyTwo: userInfo.userId,
            partyOneUserId: presentable.userId,
            partyTwoUserId: userInfo.userId,
            resourceId: presentable.resourceId,
            contractName: policySegment.policyName,
            contractType: app.contractType.PresentableToUser
        }

        return app.contractService.createContract(contractModel, true)
    }

    /**
     * 检查是否存在重复的合同
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

        const contractList = await this.contractProvider.find({
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

    /**
     * 检查重签授权
     * @private
     */
    async _checkReContractableAuth(authSchemeIds) {

        const {ctx} = this

        const resourceReContractableSignAuthFailed = []

        for (let i = 0, j = authSchemeIds.length; i < j; i++) {
            const contracts = await ctx.service.signAuthService.resourceSignAuth(authSchemeIds[i])
            contracts.forEach(contractInfo => {
                if (!contractInfo.signAuthResult.isAuth) {
                    resourceReContractableSignAuthFailed.push({authSchemeId: authSchemeIds[i], contract: contractInfo})
                }
            })
        }

        return resourceReContractableSignAuthFailed
    }

    /**
     * 获取策略使用目的(签约授权)
     * @param policyText
     * @private
     */
    getPurposeFromPolicy({policyText}) {
        var purpose = 0
        if (policyText.toLowerCase().includes('recontractable')) {
            purpose = purpose | 1
        }
        if (policyText.toLowerCase().includes('presentable')) {
            purpose = purpose | 2
        }
        return purpose
    }
}

module.exports = ContractService;
