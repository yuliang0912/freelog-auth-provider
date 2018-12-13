/**
 * Created by yuliang on 2017/10/30.
 * 资源作为供应链的签约授权.
 */

'use strict'

const authCodeEnum = require('../../enum/auth-code')
const commonAuthResult = require('../common-auth-result')
const contractType = require('egg-freelog-base/app/enum/contract_type')

module.exports = ({contract}) => {

    const result = new commonAuthResult(authCodeEnum.Default, {contract})

    if (!contract) {
        result.authCode = authCodeEnum.NotFoundResourceContract
        result.addError('未找到有效合同')
        return result
    }

    const {contractClause} = contract
    const fsmStateDescription = contractClause.currentFsmState ? contractClause.fsmStates[contractClause.currentFsmState] : null
    if (!fsmStateDescription || !fsmStateDescription.authorization.find(x => x.toLowerCase() === 'recontractable')) {
        result.authCode = authCodeEnum.ReContractableSignAuthFailed
        result.addError('资源未获得转签授权')
        return result
    }

    result.authCode = authCodeEnum.BasedOnReContractableSign

    return result
}