/**
 * Created by yuliang on 2017/10/30.
 * 针对presentable授权,主要检测普通用户是否有权限使用presentable
 */

'use strict'

const authCodeEnum = require('../../enum/auth-code')
const commonAuthResult = require('.././common-auth-result')
const contractType = require('egg-freelog-base/app/enum/contract_type')

module.exports = ({contract}) => {

    const result = new commonAuthResult(authCodeEnum.Default, {contract})

    if (!contract || contract.contractType !== contractType.PresentableToUser) {
        result.authCode = authCodeEnum.NotFoundUserPresentableContract
        result.addError('用户未签约合同')
    }
    else if (contract.isActivated) {
        result.authCode = authCodeEnum.BasedOnUserContract
    }
    else {
        result.authCode = authCodeEnum.UserContractNotActive
        result.addError(`用户合同未生效,当前合同状态:${contract.status}`)
    }

    return result
}