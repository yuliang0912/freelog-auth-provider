/**
 * 针对用户对象的认证规则
 */

'use strict'

const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth-code')
const {ArgumentError} = require('egg-freelog-base/error')

module.exports = (ctx, {authUserObject, partyOneUserId, partyTwoUserInfo}) => {

    const authResult = new AuthResult(authCodeEnum.Default, {authUserObject, partyOneUserId, partyTwoUserInfo})

    //如果没有分组认证的策略,则默认返回
    if (!authUserObject || authUserObject.userType.toUpperCase() !== 'INDIVIDUAL') {
        return authResult
    }

    if (!partyTwoUserInfo || !partyTwoUserInfo.userId) {
        throw new ArgumentError(ctx.gettext('params-validate-failed', 'partyTwoUserInfo'), {partyTwoUserInfo})
    }

    const {users} = authUserObject
    if (partyOneUserId === partyTwoUserInfo.userId && users.some(x => /^SELF$/i.test(x))) {
        authResult.authCode = authCodeEnum.BasedOnIndividuals
        return authResult
    }

    if (!Reflect.has(partyTwoUserInfo, 'email') || !Reflect.has(partyTwoUserInfo, 'mobile')) {
        throw new ArgumentError(ctx.gettext('params-validate-failed', 'partyTwoUserInfo'), {partyTwoUserInfo})
    }
    const matchRegex = new RegExp(`^(${partyTwoUserInfo.email}|${partyTwoUserInfo.mobile})$`, 'i')
    if (users.some(item => matchRegex.test(item))) {
        authResult.authCode = authCodeEnum.BasedOnIndividuals
        return authResult
    }

    //其他默认不通过
    authResult.authCode = authCodeEnum.PolicyIdentityAuthenticationFailed
    authResult.addError(ctx.gettext('乙方用户认证不通过'))

    return authResult
}