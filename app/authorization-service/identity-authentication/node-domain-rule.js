/**
 * 针对用户对象的认证规则
 */

'use strict'

const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth-code')
const freelogContractType = require('egg-freelog-base/app/enum/contract_type')

module.exports = (ctx, {authUserObject, contractType, partyTwoInfo}) => {

    const authResult = new AuthResult(authCodeEnum.Default, {authUserObject, contractType, partyTwoInfo})

    //如果没有分组认证的策略,则默认返回
    if (!authUserObject || authUserObject.userType.toUpperCase() !== 'DOMAIN') {
        return authResult
    }

    if (contractType !== freelogContractType.ResourceToNode) {
        authResult.authCode = authCodeEnum.PolicyIdentityAuthenticationFailed
        authResult.addError(ctx.gettext('不满足乙方节点身份认证策略'))
        return authResult
    }

    if (!partyTwoInfo || !Reflect.has(partyTwoInfo, 'nodeDomain')) {
        authResult.authCode = authCodeEnum.NotFoundNodeInfo
        authResult.addError(ctx.gettext('未找到乙方节点信息'))
        return authResult
    }

    const {users} = authUserObject
    const nodeDomainCheckRule = new RegExp(`${partyTwoInfo.nodeDomain}(.freelog.com(\/)?)?$`, "i")
    //如果匹配到当前节点的域名,则认证通过
    if (users.some(x => nodeDomainCheckRule.test(x))) {
        authResult.authCode = authCodeEnum.BasedOnIndividuals
        return authResult
    }

    authResult.authCode = authCodeEnum.PolicyIdentityAuthenticationFailed
    authResult.addError(ctx.gettext('不满足乙方节点身份认证策略'))

    return authResult
}