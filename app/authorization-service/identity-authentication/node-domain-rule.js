/**
 * 针对用户对象的认证规则
 */

'use strict'

const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth-code')
const freelogContractType = require('egg-freelog-base/app/enum/contract_type')

module.exports = ({authUserObject, contractType, partyTwoInfo}) => {

    const authResult = new AuthResult(authCodeEnum.Default, {authUserObject, contractType, partyTwoInfo})

    //如果没有分组认证的策略,则默认返回
    if (!authUserObject || authUserObject.userType.toUpperCase() !== 'DOMAIN') {
        return authResult
    }

    if (contractType !== freelogContractType.ResourceToNode) {
        throw new Error('node-domain-rule Error: contractType与当前校验规则不符合 ')
    }

    if (!partyTwoInfo || !Reflect.has(partyTwoInfo, 'nodeDomain')) {
        authResult.authCode = authCodeEnum.NotFoundNodeInfo
        authResult.addError('未找到乙方节点信息')
        return authResult
    }

    function nodeDomainCheckRule(domainRule) {
        return partyTwoInfo.nodeDomain.toLowerCase() === domainRule.toLowerCase() ||
            `${partyTwoInfo.nodeDomain.toLowerCase()}.freelog.com` === domainRule.toLowerCase()
    }

    //如果匹配到当前节点的域名,则认证通过
    if (authUserObject.users.some(nodeDomainCheckRule)) {
        authResult.authCode = authCodeEnum.BasedOnIndividuals
        return authResult
    }

    authResult.authCode = authCodeEnum.PolciyIdentityAuthenticationFailed
    authResult.addError('不满足乙方节点身份认证策略')

    return authResult
}