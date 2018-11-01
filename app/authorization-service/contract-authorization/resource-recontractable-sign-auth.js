/**
 * Created by yuliang on 2017/10/30.
 * 针对node授权,主要检测节点是否有权限使用resource
 */

'use strict'

const authCodeEnum = require('../../enum/auth-code')
const commonAuthResult = require('../common-auth-result')
const contractType = require('egg-freelog-base/app/enum/contract_type')

module.exports = ({contract}) => {

    const result = new commonAuthResult(authCodeEnum.Default, {contract})

    if (!contract || contract.contractType === contractType.PresentableToUser) {
        result.authCode = authCodeEnum.NotFoundResourceContract
        result.addError('未找到有效合同')
    }

    const fsmStateDescription = contract.contractClause.fsmStates[contract.contractClause.currentFsmState]
    if (!fsmStateDescription || !fsmStateDescription.authorization.find(x => x.toLowerCase() === 'recontractable')) {
        result.authCode = authCodeEnum.ReContractableAuthFailed
        result.addError('资源未获得转签授权')
    }

    result.authCode = authCodeEnum.BasedOnReContractable

    return result
}