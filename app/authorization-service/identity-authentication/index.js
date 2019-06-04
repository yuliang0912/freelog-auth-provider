'use strict'

const Patrun = require('patrun')
const AuthResult = require('../common-auth-result')
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
     *  策略段身份认证
     * @param partyTwoInfo 节点信息,只有针对节点做身份认证时,才需要此参数
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async main(ctx, {policySegment, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {

        const authResults = []

        const params = {partyOneUserId, partyTwoInfo, partyTwoUserInfo}
        for (let i = 0, j = this.authRuleSteps.length; i < j; i++) {
            let stepRule = this.authRuleSteps[i]
            params.authUserObject = policySegment.authorizedObjects.find(t => t.userType.toUpperCase() === stepRule.userType)
            if (!params.authUserObject) {
                continue
            }
            let authRule = this.certificationRules.find(stepRule);
            if (!authRule) {
                continue
            }

            let authResult = await authRule(ctx, params)
            if (authResult.isAuth) {
                authResult.data.policyId = policySegment.policyId
                return authResult
            }
            if (authResult.authCode !== authCodeEnum.Default) {
                authResult.data.partyOneUserId = partyOneUserId
                authResult.data.policyId = policySegment.policyId
                authResults.push(authResult)
            }
        }
        
        if (!authResults.length) {
            throw new ApplicationError('策略中存在系统未知的身份认证方式', {authorizedObjects: policySegment.authorizedObjects})
        }

        return new AuthResult(authCodeEnum.PolicyIdentityAuthenticationFailed)
    }

    /**
     * 授权规则和顺序设定
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

