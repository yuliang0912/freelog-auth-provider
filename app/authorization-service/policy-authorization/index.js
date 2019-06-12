'use strict'

const resourcePolicyAuth = require('./resource-policy-auth')
const presentablePolicyAuth = require('./presentable-policy-auth')
const policyIdentityAuthentication = require('../identity-authentication/index')

module.exports = {

    /**
     * 合同授权检查(step1:检查合同本身的状态  step2:检查用户对象是否依然符合策略)
     * @param policySegment
     * @param policyType 1:发行策略 2:presentable策略
     * @param partyOneUserId
     * @param partyTwoInfo 节点信息 如果是针对节点的策略才需要此参数
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async main(ctx, {policySegment, policyType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {

        const policyAuthHandler = policyType === 1 ? resourcePolicyAuth : presentablePolicyAuth

        const policyAuthResult = policyAuthHandler(ctx, {policySegment})
        if (!policyAuthResult.isAuth) {
            return policyAuthResult
        }

        const identityAuthResult = await policyIdentityAuthentication.main(ctx, {
            policySegment, partyOneUserId, partyTwoInfo, partyTwoUserInfo
        })

        return identityAuthResult.isAuth ? policyAuthResult : identityAuthResult
    }
}