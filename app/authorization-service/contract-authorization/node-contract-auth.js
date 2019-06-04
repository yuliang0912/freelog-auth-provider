/**
 * Created by yuliang on 2017/10/30.
 * 针对node授权,主要检测节点是否有权限使用resource
 */

'use strict'

const authCodeEnum = require('../../enum/auth-code')
const {ArgumentError} = require('egg-freelog-base/error')
const commonAuthResult = require('.././common-auth-result')

module.exports = (ctx, {contract}) => {

    const {contractType} = ctx.app
    const authResult = new commonAuthResult(authCodeEnum.Default, {contract})

    if (!contract || contract.contractType !== contractType.ResourceToNode) {
        throw new ArgumentError(ctx.gettext('params-validate-failed', 'contract'), {contract})
    }

    if (contract.isActivated) {
        authResult.authCode = authCodeEnum.BasedOnNodeContract
        return authResult
    }

    authResult.authCode = authCodeEnum.NodeContractNotActive
    authResult.addError(ctx.gettext('节点合同未激活'))
    
    return authResult
}