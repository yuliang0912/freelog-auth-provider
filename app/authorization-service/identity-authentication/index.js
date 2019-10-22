'use strict'

const Patrun = require('patrun')
const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth-code')
const {ApplicationError} = require('egg-freelog-base/error')
const NodeDomainRoleAuthHandler = require('./node-domain-role')
const UserIndividualRoleAuthHandler = require('./user-individual-role')
const UserOrNodeGroupRoleAuthHandler = require('./user-or-node-group-role')

module.exports = class IdentityAuthHandler {

    constructor(app) {
        this.app = app
        this.patrun = Patrun()
        this.__registerCertificationRules__()
    }

    /**
     * 策略段身份认证
     * @param partyTwoInfo 节点信息,只有针对节点做身份认证时,才需要此参数
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async handle({policySegment, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {

        const authResults = []
        for (let i = 0, j = this.authRuleSteps.length; i < j; i++) {
            let stepRule = this.authRuleSteps[i]
            let params = {
                partyOneUserId, partyTwoInfo, partyTwoUserInfo,
                authUserObject: policySegment.authorizedObjects.find(t => t.userType.toUpperCase() === stepRule.userType)
            }
            if (!params.authUserObject) {
                continue
            }
            let authRule = this.patrun.find(stepRule);
            if (!authRule) {
                continue
            }

            let authResult = await authRule.handle(params)
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

        const {app, patrun} = this

        patrun.add({ruleName: 'nodeDomainAuth', userType: 'DOMAIN'}, new NodeDomainRoleAuthHandler(app))
        patrun.add({ruleName: 'userOrNodeGroupAuth', userType: 'GROUP'}, new UserOrNodeGroupRoleAuthHandler(app))
        patrun.add({ruleName: 'userIndividualAuth', userType: 'INDIVIDUAL'}, new UserIndividualRoleAuthHandler(app))
    }
}

