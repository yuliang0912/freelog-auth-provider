'use strict'

const authCodeEnum = require('../../enum/auth-code')
const {ArgumentError} = require('egg-freelog-base/error')
const commonAuthResult = require('.././common-auth-result')

module.exports = (ctx, {contract}) => {

    const {contractType} = ctx.app
    const authResult = new commonAuthResult(authCodeEnum.Default, {contract})

    if (!contract || contract.contractType !== contractType.ResourceToResource) {
        throw new ArgumentError(ctx.gettext('params-validate-failed', 'contract'), {contract})
    }

    if (contract.isActivated) {
        authResult.authCode = authCodeEnum.BasedOnResourceContract
        return authResult
    }

    authResult.authCode = authCodeEnum.ResourceContractNotActive
    authResult.addError(ctx.gettext('资源合同未激活'))
    
    return authResult
}