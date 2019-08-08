'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const {BasedOnCustomGroup} = require('../enum/auth-code')
const {ContractSetDefaultEvent} = require('../enum/contract-fsm-event')
const authService = require('../authorization-service/process-manager')
const {ArgumentError, ApplicationError} = require('egg-freelog-base/error')
const releasePolicyCompiler = require('egg-freelog-base/app/extend/policy-compiler/release-policy-compiler')

module.exports = class ContractService extends Service {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * 批量签约发行
     * @param signReleases
     * @param contractType
     * @param partyTwoId
     * @returns {Promise<Array>}
     */
    async batchCreateReleaseContracts({signReleases, contractType, partyTwoId, nodeInfo}) {

        const {ctx} = this
        const {userInfo} = ctx.request.identityInfo
        const signReleaseMap = new Map(signReleases.map(x => [x.releaseId, new Set(x.policyIds)]))

        const releases = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/list?releaseIds=${[...signReleaseMap.keys()].toString()}`)
        if (signReleases.length !== releases.length) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'signReleases'), {signReleases})
        }

        const toBeSignedReleases = []
        releases.forEach(releaseInfo => releaseInfo.policies.forEach(policy => {
            const {policyId, policyName, policyText, status} = policy
            const toBeSignedRelease = signReleaseMap.get(releaseInfo.releaseId)
            if (toBeSignedRelease.has(policyId)) {
                const policyInfo = releasePolicyCompiler.compile(policyText, policyName)
                policyInfo.status = status
                policyInfo.policyId = policyId
                toBeSignedReleases.push({releaseInfo, policyInfo})
            }
        }))

        const contractModels = toBeSignedReleases.map(({releaseInfo, policyInfo}) => {
            const {releaseId, userId, releaseName} = releaseInfo
            return {
                contractType,
                partyOneUserId: userId,
                partyTwoUserId: ctx.request.userId,
                targetId: releaseId,
                partyOne: releaseId,
                partyTwo: partyTwoId,
                policySegment: policyInfo,
                nodeId: nodeInfo ? nodeInfo.nodeId : 0,
                contractName: `${releaseName}-${policyInfo.policyName}`,
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

        const identityAuthTasks = signContractModels.map(model => {
            let {policySegment, partyOneUserId} = model
            return authService.policyIdentityAuthentication(ctx, {
                policySegment, partyOneUserId, partyTwoUserInfo: userInfo, partyTwoInfo: nodeInfo
            }).then(authResult => {
                model.isAuth = authResult.isAuth
                model.isDynamicAuthentication = authResult.authCode === BasedOnCustomGroup
            })
        })

        await Promise.all(identityAuthTasks)
        if (signContractModels.some(x => !x.isAuth)) {
            throw new ApplicationError(ctx.gettext('auth-policy-authorizationObject-failed'))
        }

        const createdContracts = await ctx.app.contractService.batchCreateContract(ctx, signContractModels, true)

        return [...createdContracts, ...existContracts]
    }

    /**
     * C端用户创建presentable合同
     * @param presentableInfo
     * @param policyId
     * @param isDefault
     * @returns {Promise<*>}
     */
    async createUserContract({presentableInfo, policyId, isDefault}) {

        const {ctx, app} = this
        const {userInfo} = ctx.request.identityInfo
        const {presentableId, nodeId, policies} = presentableInfo

        const isSignContract = await this.contractProvider.findOne({
            targetId: presentableId,
            partyTwoUserId: userInfo.userId,
            contractType: app.contractType.PresentableToUser,
            isTerminate: 0, policyId
        })
        if (isSignContract) {
            throw new ApplicationError(ctx.gettext('已经存在一份同样的合约,不能重复签订'))
        }

        const policySegment = policies.find(t => t.policyId === policyId)

        const authResult = await authService.policyIdentityAuthentication(ctx, {
            policySegment, partyTwoUserInfo: userInfo,
            partyOneUserId: presentableInfo.userId,
        })
        if (!authResult.isAuth) {
            throw new ApplicationError(ctx.gettext('节点资源策略段身份认证失败,不能签约'), {
                authorizedObjects: policySegment.authorizedObjects, userInfo
            })
        }

        const contractModel = {
            policyId, nodeId, policySegment, isDefault,
            targetId: presentableId,
            partyOne: nodeId,
            partyTwo: userInfo.userId,
            partyOneUserId: presentableInfo.userId,
            partyTwoUserId: userInfo.userId,
            contractName: policySegment.policyName,
            contractType: app.contractType.PresentableToUser,
            isDynamicAuthentication: authResult.authCode === BasedOnCustomGroup
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
            isDefault && this.app.emit(ContractSetDefaultEvent, contractInfo)
        }).then(data => Boolean(data.nModified > 0))
    }
}
