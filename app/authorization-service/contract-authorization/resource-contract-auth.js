/**
 * Created by yuliang on 2017/10/30.
 * 针对资源作者授权,主要检测资源作者是否有权限使用resource
 */

'use strict'

const authCodeEnum = require('../../enum/auth_code')
const commonAuthResult = require('.././common-auth-result')
const authErrorCodeEnum = require('../../enum/auth_err_code')
const contractType = require('egg-freelog-base/app/enum/contract_type')

module.exports = ({contract}) => {

    const result = new commonAuthResult(authCodeEnum.ResourceContractUngratified)

    if (!contract || contract.contractType !== contractType.ResourceToNode) {
        result.authErrCode = authErrorCodeEnum.notFoundResourceContract
        result.addError('资源作者未签约合同')
        return result
    }


    if (contract.status === 3 || contract.policySegment.activatedStates.some(x => x === contract.fsmState)) {
        result.authCode = authCodeEnum.BasedOnResourceContract
    }
    else {
        result.addError(`资源合同未生效,当前合同状态:${contract.status}`)
        result.authErrCode = authErrorCodeEnum.resourceContractNotActivate
    }

    result.data.contract = contract

    return result
}