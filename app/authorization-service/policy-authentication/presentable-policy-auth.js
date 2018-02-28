'use strict'

const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth_code')
const authErrorCodeEnum = require('../../enum/auth_err_code')

/**
 * 基于资源分享策略授权
 * @param app
 * @returns {{}}
 */
module.exports.auth = async ({policySegment}) => {

    let isInitialTerminatMode = policySegment.fsmDescription.length === 1
        && policySegment.activatedStates.some(m => m === policySegment.initialState)

    let authResult = new AuthResult(authCodeEnum.BasedOnResourcePolicy)
    if (!isInitialTerminatMode) {
        authResult.authCode = authCodeEnum.PresentablePolicyUngratified
        authResult.authErrCode = authErrorCodeEnum.presentablePolicyRefuse
        authResult.addError('presentable策略不满足initial-terminate模式')
    }

    return authResult
}