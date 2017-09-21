/**
 * Created by yuliang on 2017/8/30.
 */

'use strict'

module.exports = app => {
    return class HomeController extends app.Controller {

        /**
         * presentable授权检测
         * @returns {Promise.<void>}
         */
        async presentableAuthorization() {
            let contractId = ctx.checkQuery('contractId').exist().isMongoObjectId().value
            let presentableId = ctx.checkQuery('presentableId').exist().isMongoObjectId().value
            ctx.validate()

            let userContract = ctx.service.contractService.getContract({
                _id: contractId,
                targetId: presentableId,
                partyTwo: ctx.request.userId,
                contractType: ctx.app.contractType.PresentableToUer,
            })

            if (!userContract) {
                ctx.error({msg: '未找到有效的合约'})
            }

            if (userContract.status !== 0 || userContract.expireDate < new Date()) {
                ctx.error({msg: '合约已失效'})
            }

            //TODO:exec contract
            // userContract.policySegment
        }
    }
}