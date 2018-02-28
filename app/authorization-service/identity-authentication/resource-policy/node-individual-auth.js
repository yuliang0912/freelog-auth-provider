/**
 * 节点分组策略认证检查
 * 节点的个人用户策略检查为: self or email or mobile
 */
'use strict'

const AuthResult = require('../../common-auth-result')
const authCodeEnum = require('../../../enum/auth_code')
const authErrorCodeEnum = require('../../../enum/auth_err_code')

module.exports.auth = async ({policyAuthUsers, nodeInfo, userInfo, policyOwnerId}) => {

    let authResult = new AuthResult(authCodeEnum.Default)
    let individualUserPolicy = policyAuthUsers.find(t => t.userType.toUpperCase() === 'INDIVIDUAL')

    //如果没有分组认证的策略,则默认返回
    if (!individualUserPolicy) {
        return authResult
    }

    //1.策略中是否存在SELF认证
    //2.如果存在节点信息,则验证节点主人ID与策略作者ID是否一致
    //3.如果不存在节点信息,则校验当前登录用户的ID是否与策略作者ID一致
    if (individualUserPolicy.users.some(item => item.toUpperCase() === 'SELF')) {
        if (nodeInfo && nodeInfo.ownerUserId === policyOwnerId) {
            authResult.authCode = authCodeEnum.BasedOnIndividuals
            return authResult
        } else if (userInfo && userInfo.userId === policyOwnerId) {
            authResult.authCode = authCodeEnum.BasedOnIndividuals
            return authResult
        }
    }

    if (!userInfo) {
        authResult.authCode = authCodeEnum.UserObjectUngratified
        authResult.authErrCode = authErrorCodeEnum.notFoundUser
        authResult.data.individualUserPolicy = individualUserPolicy
        authResult.addError('未找到用户信息')
        return authResult
    }

    //如果匹配到当前登录用户的邮件或者手机号,则通过认证
    if (individualUserPolicy.users.some(item => userInfo.email.toLowerCase() === item || userInfo.mobile === item)) {
        authResult.authCode = authCodeEnum.BasedOnIndividuals
        return authResult
    }

    //其他默认不通过
    authResult.authCode = authCodeEnum.UserObjectUngratified
    authResult.authErrCode = authErrorCodeEnum.identityAuthenticationRefuse
    authResult.data.individualUserPolicy = individualUserPolicy
    return authResult
}

