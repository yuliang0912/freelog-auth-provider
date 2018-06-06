/**
 * Created by yuliang on 2017/10/30.
 * 针对node授权,主要检测节点是否有权限使用resource
 */

'use strict'

const authCodeEnum = require('../../enum/auth_code')
const commonAuthResult = require('.././common-auth-result')
const authErrorCodeEnum = require('../../enum/auth_err_code')
const contractType = require('egg-freelog-base/app/enum/contract_type')

module.exports = ({contract}) => {

    const result = new commonAuthResult(authCodeEnum.NodeContractUngratified)

    if (!contract || contract.contractType !== contractType.ResourceToNode) {
        result.authErrCode = authErrorCodeEnum.notFoundNodeContract
        result.addError('节点未签约合同')
        return result
    }

    if (contract.status === 3 || contract.policySegment.activatedStates.some(x => x === contract.fsmState)) {
        result.authCode = authCodeEnum.BasedOnNodeContract
    }
    else {
        result.addError(`用户合同未生效,当前合同状态:${contract.status}`)
        result.authErrCode = authErrorCodeEnum.nodeContractNotActivate
    }

    result.data.contract = contract

    return result
}