'use strict'

const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth-code')

/**
 * 基于资源分享策略授权
 * @param app
 * @returns {{}}
 */
module.exports = (ctx, {policySegment}) => {

    const authResult = new AuthResult(authCodeEnum.BasedOnNodePolicy, {policySegment})

    const fsmStates = Object.keys(policySegment.fsmStates)
    const isInitialTerminateMode = policySegment.status === 1 && fsmStates.length === 1 && fsmStates.some(m => /^(initial|init)$/i.test(m))

    if (!isInitialTerminateMode) {
        authResult.authCode = authCodeEnum.PolicyAuthFailed
        authResult.addError(ctx.gettext('非免费策略,请签约'))
    }

    return authResult
}