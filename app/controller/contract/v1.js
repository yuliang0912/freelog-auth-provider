/**
 * Created by yuliang on 2017/8/16.
 */


'use strict'

module.exports = app => {
    return class ContractController extends app.Controller {

        /**
         * 当前登录用户的合约列表(作为甲方和作为乙方)
         * @param ctx
         * @returns {Promise.<void>}
         */
        async index(ctx) {
            let page = ctx.checkQuery("page").default(1).gt(0).toInt().value
            let pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
            let contractType = ctx.checkQuery('contractType').default(0).in([0, 1, 2, 3]).value

            let condition = {
                $or: [{partyOne: ctx.request.userId}, {partyTwo: ctx.request.userId}]
            }

            if (contractType) {
                condition.contractType = contractType
            }

            await ctx.validate().service.contractService.getContractList(condition).then().map(item => {
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
            }).bind(ctx).then(ctx.success).catch(ctx.error)
        }

        /**
         * 展示合约信息
         * @param ctx
         * @returns {Promise.<void>}
         */
        async show(ctx) {
            let contractId = ctx.checkParams("id").notEmpty().value

            await ctx.validate().service.contractService.getContractById(contractId).then(data => {
                ctx.success(data ? {
                    contractId: data._id,
                    targetId: data.targetId,
                    partyOne: data.partyOne,
                    partyTwo: data.partyTwo,
                    policySegment: data.policySegment,
                    contractType: data.contractType,
                    createDate: data.createDate,
                    expireDate: data.expireDate
                } : null)
            }).bind(ctx).catch(ctx.error)
        }

        /**
         * 创建资源合约
         * @param ctx
         * @returns {Promise.<void>}
         */
        async create(ctx) {
            let partyTwo = ctx.checkBody('partyTwo').isInt().value
            let contractType = ctx.checkBody('contractType').in([1, 2, 3]).value
            let policySegment = ctx.checkBody('policySegment').exist().notEmpty().type("object").value
            let expireDate = ctx.checkBody('expireDate').isDate().value
            //合约签订的目标对象ID(resourceId/presentableId)
            let targetId = ctx.checkBody('targetId').exist().notEmpty().value

            //乙方提供的授权策略ID/presentableId,此处考虑暂时不要.由应用层面的服务端去做检查
            //let policyId = ctx.checkBody('policyId').isUUID().value
            // let resourcePolicy = await ctx.service.resourcePolicyService.getResourcePolicy({policyId, resourceId})
            // if (!resourcePolicy) {
            //     ctx.error("资源授权策略已发生变更")
            // }

            ctx.allowContentType({type: 'json'}).validate()

            let contractModel = {
                targetId: targetId,
                partyOne: ctx.request.userId,  //甲方为申请方
                partyTwo: partyTwo,
                contractType: contractType,
                policySegment: policySegment,
                policySegmentDescription: '333',
                expireDate: expireDate,
            }

            await ctx.service.contractService.createContract(contractModel).bind(ctx).then(data => {
                ctx.success(data ? {contractId: data._id, targetId: data.target} : null)
            }).catch(ctx.error)
        }
    }
}