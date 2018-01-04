/**
 * Created by yuliang on 2017/10/30.
 */

'use strict'

const authCodeEnum = require('../enum/auth_code')
const commonAuthResult = require('./common-auth-result')
const authErrorCodeEnum = require('../enum/auth_err_code')

/***
 * 针对presentable授权,主要检测普通用户是否有权限使用presentable
 */
module.exports = app => {

    const dataProvider = app.dataProvider

    return {

        /**
         * presentable授权
         * @param presentableId
         * @param userId
         * @returns {Promise.<{authCode: number, info: {}}>}
         */
        async authorization(presentableId, nodeId, userId, userContractId){

            //前期presentable对用户默认全部授权
            //return new commonAuthResult(authCodeEnum.BasedOnUserContract)

            let result = new commonAuthResult(authCodeEnum.UserContractUngratified)

            let allUserContracts = await dataProvider.contractProvider.getContracts({
                targetId: presentableId,
                partyOne: nodeId,
                partyTwo: userId,
                contractType: app.contractType.PresentableToUer,
                status: {$in: [1, 2, 3]}
            }).catch(err => {
                result.addError(err.toString())
                result.authErrCode = authErrorCodeEnum.userContractAuthException
                return result
            })

            if (result.errors.length) {
                return result
            }
            if (!allUserContracts.length) {
                result.addError('未找到有效的用户合同')
                result.addError(presentableId)
                result.addError(nodeId)
                result.addError(userId)
                result.authErrCode = authErrorCodeEnum.notFoundUserContract
                result.data = {presentableId, contracts: allUserContracts}
                return result
            }
            if (allUserContracts.length > 1 && !userContractId) {
                result.addError('请选择需要执行的合同')
                result.authErrCode = authErrorCodeEnum.chooseUserContract
                result.data = {presentableId, contracts: allUserContracts}
                return result
            }

            let contractInfo = userContractId ? allUserContracts.find(x => x.contractId === userContractId) : allUserContracts[0]
            if (!contractInfo) {
                result.addError('参数userContractId错误,未能找到有效的用户合同')
                result.authErrCode = authErrorCodeEnum.userContractIdError
                result.data = {userContractId, contracts: allUserContracts}
                return result
            }

            result.data.contract = contractInfo

            if (contractInfo.status !== 3) {
                result.addError(`用户合同未生效,当前合同状态:${contractInfo.status}`)
                result.authErrCode = authErrorCodeEnum.userContractNotActivate
                return result
            }

            /**
             * TODO:后期需要校验用户分组等合同规定的用户属性是否依然满足
             */

            //授权通过[基于用户合同授权]
            result.authCode = authCodeEnum.BasedOnUserContract

            return result
        }
    }
}