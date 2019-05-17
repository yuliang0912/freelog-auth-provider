/**
 * Created by yuliang on 2017/10/30.
 * 资源作为供应链的签约授权.
 */

'use strict'

const authCodeEnum = require('../../enum/auth-code')
const commonAuthResult = require('../common-auth-result')
const contractType = require('egg-freelog-base/app/enum/contract_type')

module.exports = (ctx, {contract}) => {

    const result = new commonAuthResult(authCodeEnum.Default, {contract})

    if (!contract || (contract.contractType !== contractType.ResourceToNode && contract.contractType !== contractType.ResourceToResource)) {
        result.authCode = authCodeEnum.NotFoundResourceContract
        result.addError(ctx.gettext('合同信息校验失败'))
        return result
    }

    const {contractClause} = contract
    const fsmStateDescription = contractClause.currentFsmState ? contractClause.fsmStates[contractClause.currentFsmState] : null
    if (!fsmStateDescription || !fsmStateDescription.authorization.find(x => /^recontractable/i.test(x))) {
        result.authCode = authCodeEnum.ReContractableSignAuthFailed
        result.addError(ctx.gettext('资源未获得转签授权'))
        return result
    }

    result.authCode = authCodeEnum.BasedOnReContractableSign

    return result
}