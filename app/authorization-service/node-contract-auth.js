/**
 * Created by yuliang on 2017/10/30.
 * 针对node授权,主要检测节点是否有权限使用resource
 */

'use strict'

const authCodeEnum = require('../enum/auth_code')
const commonAuthResult = require('./common-auth-result')
const authErrorCodeEnum = require('../enum/auth_err_code')

module.exports = app => {

    const dataProvider = app.dataProvider

    return {

        /**
         * 节点to资源授权检查
         * @param contractId 节点与资源的合同ID
         * @param nodeId 节点ID
         * @returns {Promise.<{authCode: number, info: {}}>}
         */
        async authorization(contractId, nodeId){

            let result = new commonAuthResult(authCodeEnum.NodeContractUngratified)

            let contractInfo = await dataProvider.contractProvider.getContract({
                _id: contractId,
                partyTwo: nodeId,
                contractType: app.contractType.ResourceToNode,
            }).catch(err => {
                result.authErrCode = authErrorCodeEnum.nodeContractAuthException
                result.addError(err.toString())
                return result
            })

            if (result.errors.length) {
                return result
            }
            if (!contractInfo) {
                result.authErrCode = authErrorCodeEnum.notFoundNodeContract
                result.addError('未找到节点的合同数据')
            }
            else if (contractInfo.status === 3) {
                result.authCode = authCodeEnum.BasedOnNodeContract
            }
            else {
                result.authErrCode = authErrorCodeEnum.nodeContractNotActivate
                result.addError(`资源与节点的合同未生效,当前合同状态:${contractInfo.status}`)
            }

            result.data.contract = contractInfo

            return result
        }
    }
}