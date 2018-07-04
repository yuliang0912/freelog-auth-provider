'use strict'

const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth-code')

/**
 * 基于资源分享策略授权
 * @param app
 * @returns {{}}
 */
module.exports = ({policySegment}) => {

    const authResult = new AuthResult(authCodeEnum.BasedOnNodePolicy, {policySegment})

    const isInitialTerminatMode = policySegment.status === 1 && policySegment.fsmDescription.length === 1
        && policySegment.activatedStates.some(m => m === policySegment.initialState)

    if (!isInitialTerminatMode) {
        authResult.authCode = authCodeEnum.NotFoundUserPresentableContract
        authResult.addError('presentable策略不满足initial-terminate模式,请签约')
    }

    return authResult
}