'use strict'

const authCodeEnum = require('../enum/auth-code')
const commonAuthResult = require('./common-auth-result')
const IdentityAuthentication = require('./identity-authentication/index')
const ContractAuthorization = require('./contract-authorization/index')
const PolicyAuthorization = require('./policy-authorization/index')

module.exports = {

    /**
     * 获取合同授权结果
     * @param contract
     * @param partyTwoInfo 如果是节点合同,则需要传入nodeInfo,其他类型合同可以不穿此参数
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async contractAuthorization(ctx, {contract, partyTwoInfo, partyTwoUserInfo}) {
        return ContractAuthorization.main(...arguments)
    },

    /***
     * 针对策略段尝试获取授权(用户对象满足,策略满足initial-terminate模式)
     * @param policySegment
     * @param policyType 策略类型 1:发行策略 2:presentable策略
     * @param partyOneUserId 甲方用户ID
     * @param partyTwoInfo 只有乙方是节点时,此处才需要传入nodeInfo
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async policyAuthorization(ctx, {policySegments, policyType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {

        const authResult = new commonAuthResult(authCodeEnum.BasedOnReleasePolicy)
        const params = {policyType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}

        for (let i = 0, j = policySegments.length; i < j; i++) {
            let policySegment = policySegments[i]
            if (policySegment.status !== 1) {
                continue
            }
            let policyAuthResult = await PolicyAuthorization.main(ctx, Object.assign({}, params, {policySegment}))
            if (!policyAuthResult.isAuth) {
                continue
            }
            authResult.data.policySegment = policySegment
            authResult.data.policyId = policySegment.policyId
            break
        }

        if (!authResult.data.policySegment) {
            authResult.authCode = authCodeEnum.PolicyAuthFailed
            authResult.addError(ctx.gettext('未能通过资源策略授权'))
        }

        return authResult
    },

    /**
     * 针对策略尝试对目标对象做认证
     * @param policySegment
     * @param partyOneUserId 甲方用户ID
     * @param partyTwoInfo 只有乙方是节点时,此处才需要传入noedeInfo
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async policyIdentityAuthentication(ctx, {policySegment, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {
        return IdentityAuthentication.main(...arguments)
    }
}