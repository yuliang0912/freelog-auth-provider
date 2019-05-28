'use strict'

const lodash = require('lodash')
const Service = require('egg').Service;
const authService = require('../authorization-service/process-manager')
const {ArgumentError, ApplicationError} = require('egg-freelog-base/error')

class SignAuthService extends Service {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * 批量策略身份授权
     * @param releasePolicies
     * @param partyTwo
     * @param isFilterSignedPolicy
     * @returns {Promise<void>}
     */
    async releasePolicyIdentityAuthentication(releasePolicies, contractType, nodeInfo, partyTwo, isFilterSignedPolicy) {

        // const signedContractRecords = isFilterSignedPolicy ? await this.contractProvider.find({
        //     partyTwo, contractType, targetId: {$in: releasePolicies.map(x => x.releaseId)}
        // }) : []
        //
        // const releaseInfoMap1 = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/list?releaseIds=${releasePolicies.map(x => x.releaseId).toString()}`)
        //     .then(list => new Map(list.map(x => [x.releaseId, x])))
        //
        // for (let i = 0, j = releasePolicies.length; i < j; i++) {
        //     if()
        // }
        
        if (isFilterSignedPolicy) {
            const signedContractRecords = await this.contractProvider.find({
                partyTwo, contractType, targetId: {$in: releasePolicies.map(x => x.releaseId)}
            })
            for (let i = 0, j = releasePolicies.length; i < j; i++) {
                let releasePolicy = releasePolicies[i]
                if (signedContractRecords.some(x => x.targetId === releasePolicy.releaseId && x.policyId === releasePolicy.policyId)) {
                    releasePolicy.status = 1
                }
            }
        }

        const {ctx} = this
        const policyIdentityReleases = releasePolicies.filter(x => !x.status)
        if (!policyIdentityReleases.length) {
            return releasePolicies
        }

        const releaseInfoMap = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/list?releaseIds=${policyIdentityReleases.map(x => x.releaseId).toString()}`)
            .then(list => new Map(list.map(x => [x.releaseId, x])))

        const tasks = []
        for (let i = 0, j = policyIdentityReleases.length; i < j; i++) {
            let policyIdentityRelease = policyIdentityReleases[i]
            let releaseInfo = releaseInfoMap.get(policyIdentityRelease.releaseId)
            if (!releaseInfo) {
                continue
            }
            let policyInfo = releaseInfo.policies.find(x => x.policyId === policyIdentityRelease.policyId && x.status === 1)
            if (!policyInfo) {
                policyIdentityRelease.status = -1
                continue
            }
            let task = authService.policyIdentityAuthentication(ctx, {
                policySegment: policyInfo, contractType, partyOneUserId: releaseInfo.userId, partyTwoInfo: nodeInfo,
                partyTwoUserInfo: ctx.request.identityInfo.userInfo
            }).then(authResult => {
                policyIdentityRelease.status = authResult.isAuth ? 1 : 0
            })
            tasks.push(task)
        }

        return Promise.all(tasks).then(() => releasePolicies)
    }

    /**
     * presentable签约授权校验
     * @param presentableId
     * @returns {Promise<*>}
     */
    async presentableSignAuth(presentableId) {

        const {ctx} = this
        const presentableAuthTree = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}/authTree`)
        if (!presentableAuthTree || !presentableAuthTree.authTree.length) {
            throw new ArgumentError(ctx.gettext('未找到节点资源签署的有效的合约信息'))
        }
        const presentableContractIds = presentableAuthTree.authTree.map(x => x.contractId)
        const presentableContracts = await this.contractProvider.find({_id: {$in: presentableContractIds}})
        return this._checkSignAuth(presentableContracts, presentableAuthTree.masterResourceId)
    }

    /**
     * 资源签约授权校验
     * @param authSchemeId
     * @returns {Promise<*>}
     */
    async resourceSignAuth(authSchemeId) {

        const {ctx} = this
        const authSchemeAuthTree = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/authSchemes/schemeAuthTree/${authSchemeId}`)
        if (!authSchemeAuthTree || !authSchemeAuthTree.authTree.length) {
            return []
        }
        const authSchemeContractIds = authSchemeAuthTree.authTree.map(x => x.contractId)
        const authSchemeContracts = await this.contractProvider.find({_id: {$in: authSchemeContractIds}})
        return this._checkSignAuth(authSchemeContracts)
    }


    /**
     * 发行签约授权检测(1:身份对象限制 2:签约权限限制)
     * @param releases
     * @returns {Promise<void>}
     */
    async releaseSignAuthCheck(releases, contractType) {

        const {ctx} = this
        const releaseMap = new Map(releases.map(x => [x.releaseId, x.policies]))

        const releaseList = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/list?releaseIds=${Array.from(releaseMap.keys()).toString()}`)

        if (releaseMap.size !== releaseList.length) {
            throw new ArgumentError(ctx.gettext('参数%s校验失败', 'releases'))
        }

        const tasks = []
        for (let i = 0, j = releaseList.length; i < j; i++) {
            const releaseInfo = releaseList[i]
            const releaseParamPolicies = releaseMap.get(releaseInfo.releaseId)
            if (lodash.isArray(releaseParamPolicies) && releaseParamPolicies.length) {
                releaseInfo.policies = lodash.intersectionBy(releaseInfo.policies, releaseParamPolicies, x => x.policyId)
            }
            tasks.push(this._checkReleasePolicySignAuth(releaseInfo, contractType))
        }

        await Promise.all(tasks)

        return releaseList.map(x => Object({
            releaseId: x.releaseId,
            policies: x.policies.map(m => lodash.pick(m, ['policyId', 'identityAuth', 'signAuth']))
        }))
    }

    /**
     * 检查身份授权
     * @param releaseInfo
     * @param contractType
     * @returns {Promise<*>}
     * @private
     */
    async _checkReleasePolicySignAuth(releaseInfo, contractType, masterReleaseId = null) {

        const {ctx, app} = this
        const userInfo = ctx.request.identityInfo.userInfo

        for (let i = 0, j = releaseInfo.policies.length; i < j; i++) {
            const policyInfo = releaseInfo.policies[i]
            const identityAuthResult = await authService.policyIdentityAuthentication(ctx, {
                policySegment: policyInfo, contractType,
                partyOneUserId: releaseInfo.userId,
                partyTwoUserInfo: userInfo
            })
            policyInfo.identityAuth = identityAuthResult.isAuth
            policyInfo.signAuth = contractType === app.contractType.ResourceToNode && releaseInfo.releaseId === masterReleaseId
                ? (policyInfo.signAuth & 1) === 1 : (policyInfo.signAuth & 2) === 2
        }

        return releaseInfo
    }


    /**
     * 检查签约授权
     * @param contracts
     * @private
     */
    async _checkSignAuth(contracts, masterResourceId = null) {

        const {ctx, app} = this, result = []
        for (let i = 0, j = contracts.length; i < j; i++) {
            let signAuthResult = null
            let contract = contracts[i].toObject()
            if (contract.contractType === app.contractType.ResourceToNode && contract.resourceId === masterResourceId) {
                signAuthResult = await authService.resourcePresentableSignAuth(ctx, contract)
            }
            else {
                signAuthResult = await authService.resourceReContractableSignAuth(ctx, contract)
            }
            contract.signAuthResult = signAuthResult
            result.push(contract)
        }

        return result
    }
}

module.exports = SignAuthService