/**
 * Created by yuliang on 2017/10/30.
 */

/***
 * 针对presentable授权,主要检测普通用户是否有权限使用presentable
 */
module.exports = {

    /**
     * presentable授权
     * @param presentableInfo presentable信息
     * @param partyTwo  乙方用户
     * @param contractId  合同ID,主要用于选择多份合同
     */
    async authorization(presentableInfo, partyTwo){

        let result = {
            authCode: 3,
            info: {}
        }

        let userContracts = await eggApp.dataProvider.contractProvider.getContractList({
            targetId: presentableInfo.presentableId,
            partyOne: presentableInfo.nodeId,
            partyTwo: partyTwo,
            contractType: eggApp.contractType.PresentableToUer,
        })

        /**
         * 如果存在有效的合同,则按合同执行
         */
        if (userContracts.length) {
            let contractInfo = userContracts[0]  //默认第一个是有效的,后续会让用户设定使用哪个
            if (contractInfo.status === 3) {
                result.authCode = 1
            } else {
                result.authCode = 3
                result.info.error = new Event("用户合同未生效")
                result.info.contract = {
                    contractId: contractInfo.contractId,
                    policySegment: contractInfo.policySegment,
                    fsmState: contractInfo.fsmState,
                    status: contractInfo.status
                }
            }
            return result
        }

        /**
         * 没有合同,则检查presentable是否存在免费授权策略
         * [presentable 暂定为全部免费,后续会分析policy]
         */
        result.authCode = 2
        return result
    }
}