/**
 * Created by yuliang on 2017/10/30.
 */

'use strict'

const authCodeEnum = require('../../enum/auth_code')
const commonAuthResult = require('../common-auth-result')
const authErrorCodeEnum = require('../../enum/auth_err_code')

/***
 * 针对presentable授权,主要检测普通用户是否有权限使用presentable
 */
module.exports.auth = async ({userContract}) => {

    let result = new commonAuthResult(authCodeEnum.UserContractUngratified)

    if (!userContract) {
        result.authErrCode = authErrorCodeEnum.notFoundUserContract
        result.data.contract = userContract
        result.addError('用户未签约合同')
        return result
    }

    if (userContract.status === 3 || userContract.policySegment.activatedStates.some(x => x === userContract.fsmState)) {
        result.authCode = authCodeEnum.BasedOnUserContract
    }
    else {
        result.addError(`用户合同未生效,当前合同状态:${userContract.status}`)
        result.authErrCode = authErrorCodeEnum.userContractNotActivate
        result.data.contract = userContract
    }
    result.data.contract = userContract

    return result
}