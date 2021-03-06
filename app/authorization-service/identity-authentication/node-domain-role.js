'use strict'

const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth-code')
const {ArgumentError} = require('egg-freelog-base/error')

module.exports = class NodeDomainRoleAuthHandler {

    constructor(app) {
        this.app = app
    }

    /**
     * 节点域名校验
     * @param authUserObject
     * @param partyTwoInfo
     * @returns {Promise<module.CommonAuthResult|*>}
     */
    async handle({authUserObject, partyTwoInfo}) {

        const authResult = new AuthResult(authCodeEnum.Default, {authUserObject, partyTwoInfo})

        //如果没有分组认证的策略,则默认返回
        if (!authUserObject || authUserObject.userType.toUpperCase() !== 'DOMAIN') {
            return authResult
        }

        if (!partyTwoInfo || !Reflect.has(partyTwoInfo, 'nodeDomain')) {
            throw new ArgumentError('system-error-node-domain-role-params-validate-failed: partyTwoInfo', {partyTwoInfo})
        }

        if (partyTwoInfo.status === 2) {
            authResult.authCode = authCodeEnum.NodeUnusable //节点不可用
            return authResult
        }

        const {users} = authUserObject
        const nodeDomainCheckRule = new RegExp(`${partyTwoInfo.nodeDomain}(.freelog.com(\/)?)?$`, "i")
        if (users.some(x => nodeDomainCheckRule.test(x))) {
            authResult.authCode = authCodeEnum.BasedOnDomain
            return authResult
        }

        authResult.authCode = authCodeEnum.PolicyIdentityAuthenticationFailed

        return authResult
    }
}


// module.exports = (ctx, {authUserObject, partyTwoInfo}) => {
//
//     const authResult = new AuthResult(authCodeEnum.Default, {authUserObject, partyTwoInfo})
//
//     //如果没有分组认证的策略,则默认返回
//     if (!authUserObject || authUserObject.userType.toUpperCase() !== 'DOMAIN') {
//         return authResult
//     }
//
//     if (!partyTwoInfo || !Reflect.has(partyTwoInfo, 'nodeDomain')) {
//         throw new ArgumentError(ctx.gettext('params-validate-failed', 'partyTwoInfo'), {partyTwoInfo})
//     }
//
//     if (partyTwoInfo.status === 2) {
//         authResult.authCode = authCodeEnum.NodeUnusable
//         return authResult
//     }
//
//     const {users} = authUserObject
//     const nodeDomainCheckRule = new RegExp(`${partyTwoInfo.nodeDomain}(.freelog.com(\/)?)?$`, "i")
//     if (users.some(x => nodeDomainCheckRule.test(x))) {
//         authResult.authCode = authCodeEnum.BasedOnIndividuals
//         return authResult
//     }
//
//     authResult.authCode = authCodeEnum.PolicyIdentityAuthenticationFailed
//     authResult.addError(ctx.gettext('不满足乙方节点身份认证策略'))
//
//     return authResult
// }