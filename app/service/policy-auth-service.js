'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const {ArgumentError} = require('egg-freelog-base/error')
const AuthService = require('../authorization-service/process-manager')
const releasePolicyCompiler = require('egg-freelog-base/app/extend/policy-compiler/release-policy-compiler')

module.exports = class PolicyAuthService extends Service {

    constructor({app}) {
        super(...arguments)
        this.authService = new AuthService(app)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * presentable策略身份认证
     * @param presentableIds
     * @param policyIds
     * @param isFilterSignedPolicy
     * @returns {Promise<any>}
     */
    async batchPresentablePolicyIdentityAuthentication(presentableIds, policyIds, isFilterSignedPolicy) {

        const {ctx, authService} = this
        const signedContractSet = new Set()
        const {userInfo} = ctx.request.identityInfo
        const presentables = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/list?presentableIds=${presentableIds.toString()}&projection=policies,userId`)

        const invalidPresentableIds = lodash.differenceWith(presentableIds, presentables, (x, y) => x === y.presentableId)
        if (invalidPresentableIds.length) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'presentableIds'), {invalidPresentableIds})
        }

        if (isFilterSignedPolicy) {
            const condition = {contractType: 3, partyTwoUserId: userInfo.userId, targetId: {$in: presentableIds}}
            await this.contractProvider.find(condition, 'targetId policyId').each(({targetId, policyId}) => signedContractSet.add(`${targetId}-${policyId}`))
        }

        const {policies, tasks} = presentables.reduce((acc, presentable) => {
            let {presentableId, userId, policies} = presentable
            for (let i = 0, j = policyIds.length; i < j; i++) {
                if (presentableIds[i] === presentableId) {
                    let policyId = policyIds[i]
                    let policyInfo = policies.find(m => m.policyId === policyId)

                    if (!policyInfo || (policyInfo.status !== 1 && !signedContractSet.has(`${presentableId}-${policyId}`))) {
                        acc.policies.push({releaseId, policyId, authenticationResult: -1})
                    }
                    else {
                        policyInfo.isNeedValidateIdentity = true
                    }
                }
            }
            for (let i = 0, j = policies.length; i < j; i++) {
                let policyInfo = policies[i]
                if (!policyInfo.isNeedValidateIdentity && policyIds.length) {
                    continue
                }
                let result = {presentableId, policyId: policyInfo.policyId}
                acc.policies.push(result)
                if (signedContractSet.has(`${presentableId}-${policyInfo.policyId}`)) {
                    result.authenticationResult = 2
                    continue
                }
                let task = authService.policyIdentityAuthentication({
                    policySegment: policyInfo, partyOneUserId: userId, partyTwoUserInfo: userInfo
                }).then(authResult => {
                    result.authenticationResult = authResult.isAuth ? 1 : 0
                })
                acc.tasks.push(task)
            }
            return acc
        }, {policies: [], tasks: []})

        return Promise.all(tasks).then(() => policies)
    }

    /**
     * 发行策略身份认证
     * @param releaseIds
     * @param policyIds
     * @param contractType
     * @param nodeInfo
     * @param isFilterSignedPolicy
     * @returns {Promise<*>}
     */
    async batchReleasePolicyIdentityAuthentication(releaseIds, policyIds, nodeInfo, isFilterSignedPolicy) {

        const {ctx, authService} = this
        const signedContractSet = new Set()
        const {userInfo} = ctx.request.identityInfo
        const releases = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/list?releaseIds=${releaseIds.toString()}&projection=policies,userId`)

        const invalidReleaseIds = lodash.differenceWith(releaseIds, releases, (x, y) => x === y.releaseId)
        if (invalidReleaseIds.length) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'releaseIds'), {invalidReleaseIds})
        }

        if (isFilterSignedPolicy) {
            const condition = {contractType: 1, partyTwoUserId: userInfo.userId, targetId: {$in: releaseIds}}
            if (nodeInfo) {
                condition.contractType = 2
                condition.partyTwo = nodeInfo.nodeId.toString()
            }
            await this.contractProvider.find(condition, 'targetId policyId').each(({targetId, policyId}) => signedContractSet.add(`${targetId}-${policyId}`))
        }

        const params = {partyTwoInfo: nodeInfo, partyTwoUserInfo: userInfo}
        const {policies, tasks} = releases.reduce((acc, release) => {
            let {releaseId, userId, policies} = release
            for (let i = 0, j = policyIds.length; i < j; i++) {
                if (releaseIds[i] === releaseId) {
                    let policyId = policyIds[i]
                    let policyInfo = policies.find(m => m.policyId === policyId)
                    if (!policyInfo || (policyInfo.status !== 1 && !signedContractSet.has(`${releaseId}-${policyId}`))) {
                        acc.policies.push({releaseId, policyId, authenticationResult: -1})
                    }
                    else {
                        policyInfo.isNeedValidateIdentity = true
                    }
                }
            }
            for (let i = 0, j = policies.length; i < j; i++) {
                let policyInfo = policies[i]
                if (!policyInfo.isNeedValidateIdentity && policyIds.length) {
                    continue
                }
                let result = {releaseId, policyId: policyInfo.policyId}
                acc.policies.push(result)
                if (signedContractSet.has(`${releaseId}-${policyInfo.policyId}`)) {
                    result.authenticationResult = 2
                    continue
                }
                let task = authService.policyIdentityAuthentication(Object.assign({
                    policySegment: policyInfo, partyOneUserId: userId
                }, params)).then(authResult => {
                    result.authenticationResult = authResult.isAuth ? 1 : 0
                    //result._authResult = authResult
                })
                acc.tasks.push(task)
            }
            return acc
        }, {policies: [], tasks: []})

        return Promise.all(tasks).then(() => policies)
    }


    /**
     * 策略身份认证授权
     * @param policies 策略
     * @param partyOneUserId 甲方用户ID
     * @param partyTwoInfo 乙方(只有为节点时,才需要传nodeInfo)
     * @param policyIds 指定需要校验的策略ID
     * @returns {Promise<Array>}
     */
    async policyIdentityAuthentication({policies, partyOneUserId, partyTwoUserInfo, partyTwoInfo = null, policyIds = []}) {

        const {ctx, authService} = this

        const targetPolicies = lodash.isEmpty(policyIds) ? policies : policies.filter(x => policyIds.includes(x.policyId))

        const tasks = targetPolicies.map(policyInfo => authService.policyIdentityAuthentication({
            partyOneUserId, partyTwoInfo, partyTwoUserInfo,
            policySegment: policyInfo,
        }).then(authResult => {
            return {policyId: policyInfo.policyId, authResult}
        }))

        return Promise.all(tasks)
    }


    /**
     * 未登陆用户尝试获取presentable授权(满足initial-terminate模式)
     * @returns {Promise<void>}
     */
    async policyAuthorization({policies, policyType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {

        const {authService} = this
        const policySegments = policies.map(policyInfo => releasePolicyCompiler.compile(policyInfo.policyText))

        return authService.policyAuthorization({
            policySegments, policyType, partyOneUserId, partyTwoInfo, partyTwoUserInfo
        })
    }
}