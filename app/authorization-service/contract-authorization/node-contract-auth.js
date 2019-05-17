/**
 * Created by yuliang on 2017/10/30.
 * 针对node授权,主要检测节点是否有权限使用resource
 */

'use strict'

const authCodeEnum = require('../../enum/auth-code')
const commonAuthResult = require('.././common-auth-result')
const contractType = require('egg-freelog-base/app/enum/contract_type')

module.exports = (ctx, {contract}) => {

    const result = new commonAuthResult(authCodeEnum.Default, {contract})

    if (!contract || contract.contractType !== contractType.ResourceToNode) {
        result.authCode = authCodeEnum.NotFoundNodeContract
        result.addError(ctx.gettext('节点未签约合同'))
    }
    else if (contract.isActivated) {
        result.authCode = authCodeEnum.BasedOnNodeContract
    }
    else {
        result.authCode = authCodeEnum.NodeContractNotActive
        result.addError(ctx.gettext('节点合同未激活'))
    }

    return result
}