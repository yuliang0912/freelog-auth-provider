/**
 * 节点主域名认证检查
 */
'use strict'

const AuthResult = require('../../common-auth-result')
const authCodeEnum = require('../../../enum/auth_code')
const authErrorCodeEnum = require('../../../enum/auth_err_code')

module.exports.auth = async ({policyAuthUsers, nodeInfo}) => {

    let authResult = new AuthResult(authCodeEnum.Default)
    let nodeDomainPolicy = policyAuthUsers.find(t => t.userType.toUpperCase() === 'DOMAIN')

    //如果没有节点认证的策略,则默认返回
    if (!nodeDomainPolicy) {
        return authResult
    }

    if (!nodeInfo) {
        authResult.authCode = authCodeEnum.UserObjectUngratified
        authResult.authErrCode = authErrorCodeEnum.notFoundNode
        authResult.addError('未找到节点信息')
        return authResult
    }

    function nodeDomainCheck(checkRule) {
        return nodeInfo.nodeDomain.toLowerCase() === checkRule.toLowerCase() ||
            `${nodeInfo.nodeDomain}.freelog.com`.toLowerCase() === checkRule.toLowerCase()
    }

    //如果匹配到当前节点的域名,则认证通过
    if (nodeDomainPolicy.users.some(nodeDomainCheck)) {
        authResult.authCode = authCodeEnum.BasedOnIndividuals
        return authResult
    }

    authResult.authCode = authCodeEnum.UserObjectUngratified
    authResult.authErrCode = authErrorCodeEnum.individualsRefuse
    authResult.data.nodeDomainPolicy = nodeDomainPolicy
    authResult.addError('不满足节点身份认证策略')
    return authResult
}