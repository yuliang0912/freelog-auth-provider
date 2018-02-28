/**
 * Created by yuliang on 2017/10/30.
 * 针对node授权,主要检测节点是否有权限使用resource
 */

'use strict'

const authCodeEnum = require('../../enum/auth_code')
const commonAuthResult = require('.././common-auth-result')
const authErrorCodeEnum = require('../../enum/auth_err_code')

module.exports.auth = async ({nodeContract}) => {

    let result = new commonAuthResult(authCodeEnum.UserContractUngratified)

    if (nodeContract.status === 3 || nodeContract.policySegment.activatedStates.some(x => x === nodeContract.fsmState)) {
        result.authCode = authCodeEnum.BasedOnNodeContract
    }
    else {
        result.addError(`用户合同未生效,当前合同状态:${nodeContract.status}`)
        result.authErrCode = authErrorCodeEnum.nodeContractNotActivate
        result.data.nodeContract = nodeContract
    }

    result.data.contract = nodeContract

    return result
}