'use strict'

const lodash = require('lodash')
const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth-code')

/**
 * 基于资源分享策略授权
 * @param app
 * @returns {{}}
 */
module.exports = ({policySegment}) => {

    const authResult = new AuthResult(authCodeEnum.BasedOnNodePolicy, {policySegment})

    const fsmStates = Object.keys(policySegment.fsmStates)
    const isInitialTerminateMode = policySegment.status === 1 && fsmStates.length === 1
        && fsmStates.some(m => m.toLocaleLowerCase() === 'initial' || m.toLocaleLowerCase() === 'init')

    if (!isInitialTerminateMode) {
        authResult.authCode = authCodeEnum.NotFoundUserPresentableContract
        authResult.addError('presentable策略不满足initial-terminate模式,请签约')
    }

    return authResult
}