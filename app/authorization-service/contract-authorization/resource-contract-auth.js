/**
 * Created by yuliang on 2017/10/30.
 * 针对资源作者授权,主要检测资源作者是否有权限使用resource
 */

'use strict'

const authCodeEnum = require('../../enum/auth-code')
const commonAuthResult = require('.././common-auth-result')
const contractType = require('egg-freelog-base/app/enum/contract_type')

module.exports = (ctx, {contract}) => {

    const result = new commonAuthResult(authCodeEnum.Default, {contract})

    if (!contract || contract.contractType !== contractType.ResourceToResource) {
        result.authCode = authCodeEnum.NotFoundResourceContract
        result.addError(ctx.gettext('资源作者未签约合同'))
    }
    else if (contract.isActivated) {
        result.authCode = authCodeEnum.BasedOnResourceContract
    }
    else {
        result.authCode = authCodeEnum.ResourceContractNotActive
        result.addError(ctx.gettext('资源合同未激活'))
    }

    return result
}