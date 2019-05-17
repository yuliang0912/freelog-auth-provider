/**
 * 尝试直接基于策略授权
 * 策略权包含两个部分(A:策略本身符合免费模式(initial-terminate)  B:乙方依然满足合同策略中规定的用户对象范围)
 * @type {module.contractAuthorization}
 */

'use strict'

const Patrun = require('patrun')
const resourcePolicyAuth = require('./resource-policy-auth')
const presentablePolicyAuth = require('./presentable-policy-auth')
const policyIdentityAuthentication = require('../identity-authentication/index')
const contractType = require('egg-freelog-base/app/enum/contract_type')
const {ApplicationError} = require('egg-freelog-base/error')

class PolicyAuthorization {

    constructor() {
        this.certificationRules = this.__registerCertificationRules__()
    }

    /**
     * 合同授权检查(step1:检查合同本身的状态  step2:检查用户对象是否依然符合策略)
     * @param contract
     * @param partyTwoInfo
     * @param partyTwoUserInfo
     */
    async main(ctx, {policySegment, contractType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {

        const policyAuthHandler = this.certificationRules.find({contractType})
        if (!policyAuthHandler) {
            throw new ApplicationError('policy-authentication Error: 不被支持的合同')
        }

        const policyAuthResult = policyAuthHandler(ctx, {policySegment, contractType})
        if (!policyAuthResult.isAuth) {
            return policyAuthResult
        }

        const identityAuthResult = await policyIdentityAuthentication.main(ctx, {
            policySegment,
            contractType,
            partyOneUserId,
            partyTwoInfo,
            partyTwoUserInfo
        })

        return identityAuthResult.isAuth ? policyAuthResult : identityAuthResult
    }

    /**
     * 注册认证规则
     * @private
     */
    __registerCertificationRules__() {

        const patrun = Patrun()

        //资源策略 contractType = 4 代表C端用户直接尝试使用免费资源 此处没有列入合同枚举中
        patrun.add({contractType: 4}, resourcePolicyAuth)
        patrun.add({contractType: contractType.ResourceToResource}, resourcePolicyAuth)
        patrun.add({contractType: contractType.ResourceToNode}, resourcePolicyAuth)
        //节点策略
        patrun.add({contractType: contractType.PresentableToUser}, presentablePolicyAuth)

        return patrun
    }
}

module.exports = new PolicyAuthorization()