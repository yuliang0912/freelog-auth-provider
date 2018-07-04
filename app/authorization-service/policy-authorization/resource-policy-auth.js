'use strict'

const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth-code')
const freelogContractType = require('egg-freelog-base/app/enum/contract_type')
/**
 * 基于资源分享策略授权
 * @param app
 * @returns {{}}
 */
module.exports = ({policySegment, contractType}) => {

    const authResult = new AuthResult(authCodeEnum.BasedOnResourcePolicy, {policySegment, contractType})

    const isInitialTerminatMode = policySegment.status === 1 && policySegment.fsmDescription.length === 1
        && policySegment.activatedStates.some(m => m === policySegment.initialState)


    if (!isInitialTerminatMode) {
        authResult.authCode = contractType === freelogContractType.ResourceToResource
            ? authCodeEnum.NotFoundResourceContract : contractType === freelogContractType.ResourceToNode
                ? authCodeEnum.NotFoundNodeContract : authCodeEnum.NotFoundUserResourceContract
        authResult.addError('资源策略不满足initial-terminate模式')
    }

    return authResult
}