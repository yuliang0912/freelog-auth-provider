/**
 * Created by yuliang on 2017/10/30.
 */

'use strict'

/***
 *  针对node授权,主要检测节点是否有权限使用resource
 */
module.exports = {

    async authorization(contractInfo){

        let result = {
            authCode: 3,
            info: {}
        }

        //TODO
        //需要校验用户分组等信息是否依然符合
        //需要校验合同状态是否是激活状态

        if (contractInfo.status === 3) {
            result.authCode = 1
        }
        else {
            result.info.error = new Error("用户合同未生效")
            result.info.contract = {
                contractId: contractInfo.contractId,
                policySegment: contractInfo.policySegment,
                fsmState: contractInfo.fsmState,
                status: contractInfo.status
            }
        }

        return authCode
    }
}