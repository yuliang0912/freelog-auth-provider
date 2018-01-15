/**
 * 个人用户策略认证检查
 */
'use strict'

const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth_code')
const authErrorCodeEnum = require('../../enum/auth_err_code')

module.exports.auth = (policyAuthUsers, userInfo) => {

    let authResult = new AuthResult(authCodeEnum.Default)
    let individualsUserPolicy = policyAuthUsers.find(t => t.userType === 'individuals')

    //如果没有个人认证的策略,则默认返回
    if (!individualsUserPolicy) {
        return authResult
    }

    //如果有个人认证的策略,则需要验证用户信息
    if (!userInfo) {
        authResult.authCode = authCodeEnum.UserObjectUngratified
        authResult.authErrCode = authErrorCodeEnum.notFoundUser
        authResult.addError('未登陆的用户')
        return authResult
    }

    //如果匹配到当前登录用户的邮件或者手机号,则通过认证
    if (!individualsUserPolicy.users.some(item => userInfo.email.toLowerCase() === item || userInfo.mobile === item)) {
        authResult.authCode = authCodeEnum.UserObjectUngratified
        authResult.authErrCode = authErrorCodeEnum.individualsRefuse
        authResult.addError('不满足个人认证策略')
        return authResult
    }

    authResult.authCode = authCodeEnum.BasedOnIndividuals

    return authResult
}