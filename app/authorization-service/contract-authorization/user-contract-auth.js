'use strict'

const authCodeEnum = require('../../enum/auth-code')
const commonAuthResult = require('.././common-auth-result')
const {ArgumentError} = require('egg-freelog-base/error')

module.exports = (ctx, {contract}) => {

    const {contractType} = ctx.app
    const authResult = new commonAuthResult(authCodeEnum.Default, {contract})

    if (!contract || contract.contractType !== contractType.PresentableToUser) {
        throw new ArgumentError(ctx.gettext('params-validate-failed', 'contract'), {contract})
    }

    if (contract.isActivated) {
        authResult.authCode = authCodeEnum.BasedOnUserContract
        return authResult
    }

    authResult.authCode = authCodeEnum.UserContractNotActive
    authResult.addError(ctx.gettext('用户合同未激活'))
    
    return authResult
}