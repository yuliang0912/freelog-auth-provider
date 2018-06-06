/**
 * 针对用户对象的认证规则
 */

'use strict'
const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth_code')
const authErrorCodeEnum = require('../../enum/auth_err_code')

module.exports = ({authUserObject, contractType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) => {

    const authResult = new AuthResult(authCodeEnum.Default)

    //如果没有分组认证的策略,则默认返回
    if (!authUserObject || authUserObject.userType.toUpperCase() !== 'INDIVIDUAL') {
        return authResult
    }

    //如果有针对乙方的用户认证规则,但是乙方不存在,则失败
    if (!partyTwoUserInfo || !partyTwoUserInfo.userId || !Reflect.has(partyTwoUserInfo, 'email') || !Reflect.has(partyTwoUserInfo, 'mobile')) {
        authResult.authCode = authCodeEnum.UserObjectUngratified
        authResult.authErrCode = authErrorCodeEnum.notFoundUser
        authResult.data.authUserObject = authUserObject
        authResult.data.partyTwoUserInfo = partyTwoUserInfo
        authResult.addError('未找到乙方用户信息')
        return authResult
    }

    //策略中是否存在SELF认证,并且乙方的用户主体与甲方的用户主体一致,则认证通过
    if (partyTwoUserInfo && authUserObject.users.some(item => item.toUpperCase() === 'SELF') && partyOneUserId === partyTwoUserInfo.userId) {
        authResult.authCode = authCodeEnum.BasedOnIndividuals
        return authResult
    }

    //如果匹配到乙方用户的邮件或者手机号,则通过认证
    if (authUserObject.users.some(item => partyTwoUserInfo.email.toLowerCase() === item.toLowerCase() || partyTwoUserInfo.mobile.toString() === item.toString())) {
        authResult.authCode = authCodeEnum.BasedOnIndividuals
        return authResult
    }

    //其他默认不通过
    authResult.authCode = authCodeEnum.UserObjectUngratified
    authResult.authErrCode = authErrorCodeEnum.identityAuthenticationRefuse
    authResult.data.authUserObject = authUserObject
    authResult.data.partyTwoUserInfo = partyTwoUserInfo
    authResult.addError('乙方用户认证不通过')

    return authResult
}