'use strict'

const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth-code')
const freelogContractType = require('egg-freelog-base/app/enum/contract_type')
/**
 * 基于资源分享策略授权
 * @param app
 * @returns {{}}
 */
module.exports = (ctx, {policySegment, contractType}) => {

    const authResult = new AuthResult(authCodeEnum.BasedOnResourcePolicy, {policySegment, contractType})

    const fsmStates = Object.keys(policySegment.fsmStates)
    const isInitialTerminateMode = policySegment.status === 1 && fsmStates.length === 1 && fsmStates.some(m => /^(initial|init)$/i.test(m))

    if (!isInitialTerminateMode) {
        authResult.authCode = contractType === freelogContractType.ResourceToResource
            ? authCodeEnum.NotFoundResourceContract : contractType === freelogContractType.ResourceToNode
                ? authCodeEnum.NotFoundNodeContract : authCodeEnum.NotFoundUserResourceContract
        authResult.addError(ctx.gettext('非免费策略,请签约'))
    }

    return authResult
}