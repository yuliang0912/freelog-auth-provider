/**
 * 资源策略身份对象认证
 */

'use strict'

const Patrun = require('patrun')
const authCodeEnum = require('../../enum/auth-code')
const nodeDomainRule = require('./node-domain-rule')
const userIndividualRule = require('./user-individual-rule')
const userOrNodeGroupRule = require('./user-or-node-group-rule')
const {ApplicationError} = require('egg-freelog-base/error')

class FreelogPolicyIdentityAuthentication {

    constructor() {
        this.certificationRules = this.__registerCertificationRules__()
    }

    /**
     * 身份认证主函数
     * @param policySegment
     * @param contractType
     * @param partyOneUserId
     * @param partyTwoInfo
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async main(ctx, {policySegment, contractType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {

        const authResults = []

        const params = {contractType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}
        for (let i = 0, j = this.authRuleSteps.length; i < j; i++) {
            const stepRule = this.authRuleSteps[i]
            params.authUserObject = policySegment.authorizedObjects.find(t => t.userType.toUpperCase() === stepRule.userType)
            if (!params.authUserObject) {
                continue
            }
            const authRule = this.certificationRules.find(stepRule);
            if (!authRule) {
                continue
            }
            const authResult = await authRule(ctx, params)

            if (authResult.isAuth) {
                authResult.data.segmentId = policySegment.segmentId
                return authResult
            }
            if (authResult.authCode !== authCodeEnum.Default) {
                authResult.data.partyOneUserId = partyOneUserId
                authResult.data.segmentId = policySegment.segmentId
                authResults.push(authResult)
            }
        }

        if (!authResults.length) {
            throw new ApplicationError('策略中存在系统未知的身份认证方式', {authorizedObjects: policySegment.authorizedObjects})
        }

        return authResults[0]
    }

    /**
     * 授权规则设定
     * @returns {*[]}
     */
    get authRuleSteps() {
        return [
            {ruleName: 'nodeDomainAuth', userType: 'DOMAIN'},
            {ruleName: 'userIndividualAuth', userType: 'INDIVIDUAL'},
            {ruleName: 'userOrNodeGroupAuth', userType: 'GROUP'},
        ]
    }

    /**
     * 注册认证规则
     * @private
     */
    __registerCertificationRules__() {

        const patrun = Patrun()

        //节点域名认证
        patrun.add({ruleName: 'nodeDomainAuth', userType: 'DOMAIN'}, nodeDomainRule)

        //用户个体认证
        patrun.add({ruleName: 'userIndividualAuth', userType: 'INDIVIDUAL'}, userIndividualRule)

        //节点或者用户分组认证
        patrun.add({ruleName: 'userOrNodeGroupAuth', userType: 'GROUP'}, userOrNodeGroupRule)

        return patrun
    }
}

module.exports = new FreelogPolicyIdentityAuthentication()

