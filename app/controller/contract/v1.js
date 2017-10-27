/**
 * Created by yuliang on 2017/8/16.
 */

'use strict'

const contractFsmEventHandler = require('../../contract-service/contract-fsm-event-handler')

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
            let partyOne = ctx.checkQuery('partyOne').default(0).toInt().value
            let partyTwo = ctx.checkQuery('partyTwo').default(0).toInt().value
            let resourceIds = ctx.checkQuery('resourceIds').value

            if (resourceIds !== undefined && !/^[0-9a-zA-Z]{40}(,[0-9a-zA-Z]{40})*$/.test(resourceIds)) {
                ctx.errors.push({resourceIds: 'resourceIds格式错误'})
            }

            ctx.validate()

            let condition = {}
            if (contractType) {
                condition.contractType = contractType
            }
            if (partyOne) {
                condition.partyOne = partyOne
            }
            if (partyTwo) {
                condition.partyTwo = partyTwo
            }
            if (resourceIds) {
                condition.resourceId = {$in: resourceIds.split(',')}
            }
            if (!Object.keys(condition).length) {
                ctx.error({msg: '最少需要一个查询条件'})
            }

            let dataList = []
            let totalItem = await ctx.service.contractService.getCount(condition)

            let projection = "_id segmentId contractType targetId resourceId partyOne partyTwo status createDate"
            if (totalItem > (page - 1) * pageSize) {
                dataList = await ctx.service.contractService.getContractList(condition, projection, page, pageSize).bind(ctx)
                    .catch(ctx.error)
            }

            ctx.success({page, pageSize, totalItem, dataList})
        }

        /**
         * 展示合约信息
         * @param ctx
         * @returns {Promise.<void>}
         */
        async show(ctx) {
            let contractId = ctx.checkParams("id").notEmpty().isMongoObjectId().value

            await ctx.validate().service.contractService.getContractById(contractId).bind(ctx).then(buildReturnContract)
                .then(ctx.success).catch(ctx.error)
        }

        /**
         * 创建资源合约
         * @param ctx
         * @returns {Promise.<void>}
         */
        async create(ctx) {
            let contractType = ctx.checkBody('contractType').in([1, 2, 3]).value
            let segmentId = ctx.checkBody('segmentId').exist().isMd5().value
            let serialNumber = ctx.checkBody('serialNumber').exist().isMongoObjectId().value
            // 此处为资源ID或者presentableId
            let targetId = ctx.checkBody('targetId').exist().notEmpty().value
            let partyTwo = ctx.checkBody('partyTwo').toInt().gt(0).value

            ctx.validate()

            await ctx.service.contractService.getContract({
                targetId: targetId,
                partyTwo: partyTwo,
                segmentId: segmentId,
                status: 0
            }).then(oldContract => {
                oldContract && ctx.error({msg: "已经存在一份同样的合约,不能重复签订", errCode: 105})
            })

            if (contractType === ctx.app.contractType.ResourceToNode) {
                let nodeInfo = await ctx.curlIntranetApi(`${ctx.app.config.gatewayUrl}/api/v1/nodes/${partyTwo}`)
                if (!nodeInfo || nodeInfo.ownerUserId !== ctx.request.userId) {
                    ctx.errors.push({partyTwo: '未找到节点或者用户与节点信息不匹配'})
                }
                ctx.validate()
            }

            let policyInfo = await ctx.curlIntranetApi(contractType === ctx.app.contractType.PresentableToUer
                ? `${ctx.app.config.gatewayUrl}/api/v1/presentables/${targetId}`
                : `${ctx.app.config.gatewayUrl}/api/v1/resources/policies/${targetId}`)

            if (!policyInfo) {
                ctx.error({msg: 'targetId错误'})
            }
            if (policyInfo.serialNumber !== serialNumber) {
                ctx.error({msg: 'serialNumber不匹配,policy已变更,变更时间' + new Date(policyInfo.updateDate).toLocaleString()})
            }

            let policySegment = policyInfo.policy.find(t => t.segmentId === segmentId)
            if (!policySegment) {
                ctx.error({msg: 'segmentId错误,未找到策略段'})
            }

            let contractModel = {
                segmentId, policySegment, contractType,
                targetId: targetId,
                resourceId: policyInfo.resourceId,
                partyTwo: partyTwo,
                languageType: policyInfo.languageType,
                partyOne: contractType === ctx.app.contractType.PresentableToUer
                    ? policyInfo.nodeId
                    : policyInfo.userId
            }

            let policyTextBuffer = new Buffer(policyInfo.policyText, 'utf8')

            /**
             * 保持策略原文副本,以备以后核查
             */
            await ctx.app.upload.putBuffer(`contracts/${serialNumber}.txt`, policyTextBuffer).then(url => {
                contractModel.policyCounterpart = url
            })

            await ctx.service.contractService.createContract(contractModel).then(contractInfo => {
                contractFsmEventHandler.initContractFsm(contractInfo.toObject())
                return contractInfo
            }).bind(ctx).then(buildReturnContract).then(ctx.success).catch(ctx.error)
        }

        /**
         * 用户签订的presentable合约
         * @param ctx
         * @returns {Promise.<void>}
         */
        async userContracts(ctx) {
            let page = ctx.checkQuery("page").default(1).gt(0).toInt().value
            let pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
            let userId = ctx.checkParams("userId").exist().isInt().value
            let presentableId = ctx.checkQuery("presentableId").isMongoObjectId().value

            await ctx.validate().service.contractService.getContractList({
                partyTwo: userId,
                targetId: presentableId,
                contractType: ctx.app.contractType.PresentableToUer,
                expireDate: {$gt: new Date()},
                status: 0
            }, page, pageSize).bind(ctx).map(buildReturnContract).then(ctx.success).catch(ctx.error)
        }

        /**
         * 节点商与资源商签订的合约
         * @param ctx
         * @returns {Promise.<void>}
         */
        async nodeContracts(ctx) {
            let page = ctx.checkQuery("page").default(1).gt(0).toInt().value
            let pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
            let nodeId = ctx.checkParams("nodeId").exist().isInt().value
            let resourceId = ctx.checkQuery("resourceId").exist().isResourceId().value

            await ctx.validate().service.contractService.getContractList({
                partyTwo: nodeId,
                targetId: resourceId,
                contractType: ctx.app.contractType.ResourceToNode,
                expireDate: {$gt: new Date()},
                status: 0
            }, page, pageSize).bind(ctx).map(buildReturnContract).then(ctx.success).catch(ctx.error)
        }

        /**
         * 资源商与资源商签订的合约
         * @param ctx
         * @returns {Promise.<void>}
         */
        async authorContracts(ctx) {
            let page = ctx.checkQuery("page").default(1).gt(0).toInt().value
            let pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
            let authorId = ctx.checkParams("authorId").exist().isInt().value
            let resourceId = ctx.checkQuery("resourceId").exist().isResourceId().value

            await ctx.validate().service.contractService.getContractList({
                partyTwo: authorId,
                targetId: resourceId,
                contractType: ctx.app.contractType.ResourceToResource
            }, page, pageSize).bind(ctx).map(buildReturnContract).then(ctx.success).catch(ctx.error)
        }

        /**
         * 测试状态机事件驱动
         * @param ctx
         * @returns {Promise.<void>}
         */
        async testContractFsm(ctx) {
            let contractId = ctx.checkBody('contractId').exist().notEmpty().isMongoObjectId().value
            let events = ctx.checkBody('events').notEmpty().value

            ctx.allowContentType({type: 'json'}).validate()

            await contractFsmEventHandler.contractTest(contractId, events).then(data => {
                ctx.success(data)
            })
        }

        /**
         * 合同记录
         * @param ctx
         * @returns {Promise.<void>}
         */
        async contractRecords(ctx) {

            let resourceIds = ctx.checkQuery('resourceIds').value

            if (resourceIds && !ctx.helper.commonRegex.splitResourceId.test(resourceIds)) {
                ctx.errors.push({resourceIds: 'resourceIds格式错误'})
            }
            ctx.validate()

            let condition = {}
            if (resourceIds) {
                condition.resourceId = {
                    $in: resourceIds.split(',')
                }
            }
            if (!Object.keys(condition).length) {
                ctx.error({msg: '最少需要一个可选查询条件'})
            }

            let projection = "_id segmentId contractType targetId resourceId partyOne partyTwo status fsmState createDate"

            await ctx.service.contractService.getContracts(condition, projection)
                .bind(ctx).then(ctx.success)
        }
    }
}

const buildReturnContract = (data) => {
    if (data) {
        data = data.toObject()
        Reflect.deleteProperty(data, 'languageType')
        Reflect.deleteProperty(data, 'policyCounterpart')
    }
    return data
}