/**
 * Created by yuliang on 2017/8/17.
 */

'use strict'

module.exports = app => {
    return class ContractController extends app.Controller {

        /**
         * 查询指定目标[resourceId|presentableId]的所有合约
         * @param ctx
         * @returns {Promise.<void>}
         */
        async show(ctx) {

            let targetId = ctx.checkParams("id").notEmpty().value
            let userId = ctx.request.userId

            await ctx.service.contractService.getContractList({
                $or: [{partyOne: userId}, {partyTwo: userId}], targetId
            }).then().bind(ctx).map(item => {
                return {
                    contractId: item._id,
                    targetId: item.targetId,
                    partyOne: item.partyOne,
                    partyTwo: item.partyTwo,
                    policySegment: item.policySegment,
                    contractType: item.contractType,
                    createDate: item.createDate,
                    expireDate: item.expireDate
                }
            }).then(ctx.success).catch(ctx.error)
        }
    }
}



