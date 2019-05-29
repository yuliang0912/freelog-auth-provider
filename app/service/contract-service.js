'use strict'

const lodash = require('lodash')
const Service = require('egg').Service;
const authService = require('../authorization-service/process-manager')
const {LogicError, ArgumentError, ApplicationError} = require('egg-freelog-base/error')
const releasePolicyCompiler = require('egg-freelog-base/app/extend/policy-compiler/release-policy-compiler')

class ContractService extends Service {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * 批量签约发行
     * @param signReleases
     * @param contractType
     * @param partyTwoId
     * @param targetId
     * @returns {Promise<Array>}
     */
    async batchCreateReleaseContracts({signReleases, contractType, partyTwoId, targetId}) {

        const {ctx} = this
        const releases = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/list?releaseIds=${signReleases.map(x => x.releaseId).toString()}`)
        if (signReleases.length !== releases.length) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'signReleases'), {signReleases})
        }

        const signReleaseMap = new Map(signReleases.map(x => [x.releaseId, new Set(x.policyIds)]))

        const toBeSignedReleases = []
        releases.forEach(releaseInfo => releaseInfo.policies.forEach(policy => {
            const {policyId, policyText, status} = policy
            const toBeSignedRelease = signReleaseMap.get(releaseInfo.releaseId)
            if (toBeSignedRelease.has(policyId)) {
                const policyInfo = releasePolicyCompiler.compile(policyText)
                policyInfo.status = status
                policyInfo.policyId = policyId
                toBeSignedReleases.push({releaseInfo, policyInfo})
            }
        }))

        const contractModels = toBeSignedReleases.map(({releaseInfo, policyInfo}) => {
            const {releaseId, userId, releaseName} = releaseInfo
            return {
                contractType, targetId,
                partyOneUserId: userId,
                partyTwoUserId: ctx.request.userId,
                partyOne: releaseId,
                partyTwo: partyTwoId,
                policySegment: policyInfo,
                contractName: releaseName,
                policyId: policyInfo.policyId,
                policyStatus: policyInfo.status
            }
        })

        if (!contractModels.length) {
            return []
        }

        const existContracts = await this.contractProvider.find({
            partyTwo: partyTwoId,
            $or: contractModels.map(x => lodash.pick(x, ['partyOne', 'policyId']))
        })

        const signContractModels = lodash.differenceWith(contractModels, existContracts, (x, y) => x.partyOne === y.partyOne && x.policyId === y.policyId)
        if (!signContractModels.length) {
            return existContracts
        }
        if (signContractModels.some(x => x.policyStatus !== 1)) {
            throw new ArgumentError('invalid policies', {invalidPolicies: signContractModels.filter(x => x.policyStatus !== 1)})
        }
        const createdContracts = await ctx.app.contractService.batchCreateContract(ctx, signContractModels, true)

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
    async createUserContract({presentableId, policyId, isDefault}) {

        const {ctx, app} = this
        const userInfo = ctx.request.identityInfo.userInfo

        const oldContract = await this.contractProvider.findOne({
            targetId: presentableId,
            partyTwoUserId: userInfo.userId,
            contractType: app.contractType.PresentableToUser,
            isTerminate: 0, policyId
        })
        if (oldContract) {
            throw new ApplicationError(ctx.gettext('已经存在一份同样的合约,不能重复签订'), oldContract)
        }

        const presentable = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}`)
        if (!presentable || !presentable.isOnline) {
            throw new ArgumentError(ctx.gettext('节点信息校验失败'), {presentable})
        }

        const policySegment = presentable.policies.find(t => t.policyId === policyId)
        if (!policySegment || policySegment.status !== 1) {
            throw new ArgumentError(ctx.gettext('参数%s校验失败', 'policyId'), {policyId, policySegment})
        }

        const authResult = await authService.policyIdentityAuthentication(ctx, {
            policySegment,
            contractType: app.contractType.PresentableToUser,
            partyOneUserId: presentable.userId,
            partyTwoUserInfo: userInfo
        })
        if (!authResult.isAuth) {
            throw new ApplicationError(ctx.gettext('节点资源策略段身份认证失败,不能签约'), {
                authorizedObjects: policySegment.authorizedObjects, userInfo
            })
        }

        const nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${presentable.nodeId}`)
        if (!nodeInfo || nodeInfo.status !== 0) {
            throw new LogicError(ctx.gettext('节点信息校验失败'), {presentable, nodeInfo})
        }

        const contracts = await ctx.service.signAuthService.presentableSignAuth(presentableId)
        const signAuthFailedContracts = contracts.filter(x => !x.signAuthResult.isAuth)
        if (signAuthFailedContracts.length) {
            throw new ApplicationError(ctx.gettext('节点资源的合约链中存在未获得再签约授权的合约'), {signAuthFailedContracts})
        }

        const contractModel = {
            policyId, policySegment, isDefault,
            targetId: presentableId,
            partyOne: presentable.nodeId,
            partyTwo: userInfo.userId,
            partyOneUserId: presentable.userId,
            partyTwoUserId: userInfo.userId,
            resourceId: presentable.resourceId,
            contractName: policySegment.policyName,
            contractType: app.contractType.PresentableToUser
        }

        return app.contractService.createContract(ctx, contractModel, true)
    }

    /**
     * 更新合同
     * @param contractInfo
     * @param remark
     * @param isDefault
     * @returns {Promise<void>}
     */
    async updateContractInfo(contractInfo, remark, isDefault) {

        const model = {}
        if (lodash.isString(remark)) {
            model.remark = remark
        }
        if (isDefault === 1) {
            model.isDefault = isDefault
        }

        return this.contractProvider.updateOne({_id: contractInfo.id}, model).tap(() => {
            if (!isDefault) {
                return
            }
            const condition = lodash.pick(contractInfo, ['targetId', 'partyTwo', 'contractType'])
            condition._id = {$ne: condition.id}
            this.contractProvider.updateOne(condition, {isDefault: 0})
        }).then(data => Boolean(data.nModified > 0))
    }

    /**
     * 检查重签授权
     * @private
     */
    // async _checkReContractableAuth(authSchemeIds) {
    //
    //     const {ctx} = this
    //
    //     const resourceReContractableSignAuthFailed = []
    //
    //     for (let i = 0, j = authSchemeIds.length; i < j; i++) {
    //         const contracts = await ctx.service.signAuthService.resourceSignAuth(authSchemeIds[i])
    //         contracts.forEach(contractInfo => {
    //             if (!contractInfo.signAuthResult.isAuth) {
    //                 resourceReContractableSignAuthFailed.push({authSchemeId: authSchemeIds[i], contract: contractInfo})
    //             }
    //         })
    //     }
    //     return resourceReContractableSignAuthFailed
    // }
}

module.exports = ContractService;
