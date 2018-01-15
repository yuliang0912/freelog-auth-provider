/**
 * 用户分组策略认证检查
 */
'use strict'

const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth_code')
const authErrorCodeEnum = require('../../enum/auth_err_code')

module.exports.auth = (policyAuthUsers, userInfo) => {

    let authResult = new AuthResult(authCodeEnum.Default)
    let groupUserPolicy = policyAuthUsers.find(t => t.userType === 'groups')

    //如果没有分组认证的策略,则默认返回
    if (!groupUserPolicy) {
        return authResult
    }

    //如果存在所有访问者分组,则通过
    if (groupUserPolicy.users.some(item => item === 'AllVisiter')) {
        authResult.authCode = authCodeEnum.BasedOnGroup
        return authResult
    }

    //非全部访问者.又没有登录,则拒绝
    if (!userInfo) {
        authResult.authCode = authCodeEnum.UserObjectUngratified
        authResult.authErrCode = authErrorCodeEnum.notFoundUser
        authResult.addError('未登陆的用户')
        return authResult
    }


    //所有登录用户都可以访问,则通过
    if (groupUserPolicy.users.some(item => item === 'RegisteredUser' || item === 'LoginUser')) {
        authResult.authCode = authCodeEnum.BasedOnGroup
    }
    //所有节点用户
    else if (groupUserPolicy.users.some(item => item === 'RegisteredNode')) {
        if ((userInfo.userRole & 2) === 2) {
            authResult.authCode = authCodeEnum.BasedOnGroup
        }
        else {
            authResult.authCode = authCodeEnum.UserObjectUngratified
            authResult.authErrCode = authErrorCodeEnum.groupRefuse
            authResult.addError('用户分组策略不满足')
        }
    }
    //用户自定义分组
    else {
        //    /^group_[a-zA-Z0-9-]{4,20}$/.test()
    }

    return authResult
}

