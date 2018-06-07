/**
 * 资源策略身份对象认证
 */

'use strict'

const Patrun = require('patrun')
const nodeDomainRele = require('./node-domain-rule')
const userIndividualRule = require('./user-individual-rule')
const userOrNodeGroupRule = require('./user-or-node-group-rule')
const authCodeEnum = require('../../enum/auth_code')
const contractType = require('egg-freelog-base/app/enum/contract_type')

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
    async main({policySegment, contractType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {

        const authResults = []

        const params = {contractType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}
        for (let i = 0, j = this.authRuleSteps.length; i < j; i++) {
            const stepRule = this.authRuleSteps[i]
            try {
                params.authUserObject = policySegment.users.find(t => t.userType.toUpperCase() === stepRule.userType)
            } catch (e) {
                throw new Error(JSON.stringify(policySegment))
            }
            if (!params.authUserObject) {
                continue
            }
            const authRule = this.certificationRules.find(Object.assign(stepRule, {contractType}));
            if (!authRule) {
                continue
            }
            const authResult = await authRule(params)
            if (authResult.isAuth) {
                return authResult
            }
            if (authResult.authCode !== authCodeEnum.Default) {
                authResults.push(authResult)
            }
        }

        if (!authResults.length) {
            throw Object.assign(new Error('策略中存在系统未知的身份认证方式'), {
                data: {users: policySegment.users}
            })
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
        patrun.add({
            ruleName: 'nodeDomainAuth',
            userType: 'DOMAIN',
            contractType: contractType.ResourceToNode
        }, nodeDomainRele)

        //用户个体认证
        patrun.add({ruleName: 'userIndividualAuth', userType: 'INDIVIDUAL'}, nodeDomainRele)

        //节点或者用户分组认证
        patrun.add({ruleName: 'userOrNodeGroupAuth', userType: 'GROUP'}, userOrNodeGroupRule)

        return patrun
    }
}

module.exports = new FreelogPolicyIdentityAuthentication()

