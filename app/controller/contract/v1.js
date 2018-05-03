/**
 * Created by yuliang on 2017/8/16.
 */

'use strict'

const _ = require('lodash')
const Controller = require('egg').Controller
const contractFsmEventHandler = require('../../contract-service/contract-fsm-event-handler')

module.exports = class ContractController extends Controller {

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
        let resourceIds = ctx.checkQuery('resourceIds').optional().isSplitResourceId().value
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
        let totalItem = await ctx.dal.contractProvider.getCount(condition)

        let projection = "_id segmentId contractType targetId resourceId policySegment partyOne partyTwo status createDate"
        if (totalItem > (page - 1) * pageSize) {
            dataList = await ctx.dal.contractProvider.getContractList(condition, projection, page, pageSize)
        }

        ctx.success({page, pageSize, totalItem, dataList})
    }

    /**
     * 批量获取合同
     * @param ctx
     * @returns {Promise<void>}
     */
    async list(ctx) {
        let contractIds = ctx.checkQuery('contractIds').isSplitMongoObjectId('contractIds格式错误').toSplitArray().len(1, 100).value

        ctx.validate()

        let condition = {
            _id: {$in: contractIds}
        }

        let projection = "_id segmentId contractType targetId resourceId partyOne partyTwo status createDate"

        await ctx.dal.contractProvider.getContracts(condition, projection)
            .bind(ctx).then(ctx.success).catch(ctx.error)
    }

    /**
     * 展示合约信息
     * @param ctx
     * @returns {Promise.<void>}
     */
    async show(ctx) {
        let contractId = ctx.checkParams("id").notEmpty().isMongoObjectId().value
        ctx.validate()

        await ctx.dal.contractProvider.getContractById(contractId).bind(ctx).then(buildReturnContract)
            .then(ctx.success).catch(ctx.error)
    }

    /**
     * 创建资源合约
     * @param ctx
     * @returns {Promise.<void>}
     */
    async create(ctx) {
        //目前暂不支持资源商对资源商的合同
        let contractType = ctx.checkBody('contractType').toInt().in([2, 3]).value
        let segmentId = ctx.checkBody('segmentId').exist().isMd5().value
        let serialNumber = ctx.checkBody('serialNumber').exist().isMongoObjectId().value
        // 此处为资源ID或者presentableId
        let targetId = ctx.checkBody('targetId').exist().notEmpty().value
        let partyTwo = ctx.checkBody('partyTwo').toInt().gt(0).value

        ctx.validate()

        if (contractType === ctx.app.contractType.PresentableToUer && partyTwo !== ctx.request.userId) {
            ctx.error({msg: '参数partyTwo与当前登录用户身份不符合'})
        }

        let contractInfo = await ctx.service.contractService.createContract({
            targetId,
            contractType,
            segmentId,
            serialNumber,
            partyTwo
        })

        ctx.app.deleteProperties(contractInfo, 'languageType', 'policyCounterpart')
        ctx.success(contractInfo)
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

        ctx.validate()

        await ctx.dal.contractProvider.getContractList({
            partyTwo: userId,
            targetId: presentableId,
            contractType: ctx.app.contractType.PresentableToUer,
            expireDate: {$gt: new Date()},
            status: 0
        }, null, page, pageSize).bind(ctx).map(buildReturnContract).then(ctx.success).catch(ctx.error)
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

        ctx.validate()

        await ctx.dal.contractProvider.getContractList({
            partyTwo: nodeId,
            targetId: resourceId,
            contractType: ctx.app.contractType.ResourceToNode,
            expireDate: {$gt: new Date()},
            status: 0
        }, null, page, pageSize).bind(ctx).map(buildReturnContract).then(ctx.success).catch(ctx.error)
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

        ctx.validate()

        await ctx.dal.contractProvider.getContractList({
            partyTwo: authorId,
            targetId: resourceId,
            contractType: ctx.app.contractType.ResourceToResource
        }, null, page, pageSize).bind(ctx).map(buildReturnContract).then(ctx.success).catch(ctx.error)
    }

    /**
     * 测试状态机事件驱动
     * @param ctx
     * @returns {Promise.<void>}
     */
    async testContractFsm(ctx) {

        let contractId = ctx.checkBody('contractId').exist().notEmpty().isMongoObjectId().value
        let eventId = ctx.checkBody('eventId').exist().notEmpty().value

        ctx.allowContentType({type: 'json'}).validate()

        await contractFsmEventHandler.contractEventTriggerHandler(eventId, contractId).then(data => {
            ctx.success(data)
        }).catch(error => {
            ctx.error(error)
        })
    }

    /**
     * 合同记录
     * @param ctx
     * @returns {Promise.<void>}
     */
    async contractRecords(ctx) {

        let resourceIds = ctx.checkQuery('resourceIds').optional().isSplitResourceId().toSplitArray().value
        let contractIds = ctx.checkQuery('contractIds').optional().isSplitMongoObjectId().toSplitArray().value
        let partyTwo = ctx.checkQuery('partyTwo').optional().toInt().gt(0).value
        let contractType = ctx.checkQuery('contractType').default(0).in([0, 1, 2, 3]).value

        ctx.validate()

        let condition = {}
        if (resourceIds) {
            if (!partyTwo) {
                ctx.error({msg: '参数resourceIds必须与partyTwo组合使用'})
            }
            condition.resourceId = {$in: resourceIds}
        }
        if (contractIds) {
            condition._id = {$in: contractIds}
        }
        if (partyTwo) {
            condition.partyTwo = partyTwo
        }
        if (contractType) {
            condition.contractType = contractType
        }
        if (!Object.keys(condition).length) {
            ctx.error({msg: '最少需要一个可选查询条件'})
        }

        let projection = "_id segmentId contractType targetId resourceId partyOne partyTwo status fsmState createDate"

        await ctx.dal.contractProvider.getContracts(condition, projection)
            .bind(ctx).then(ctx.success)
    }

    /**
     * 给合同签协议
     * @param ctx
     * @returns {Promise.<void>}
     */
    async signingLicenses(ctx) {
        let contractId = ctx.checkBody('contractId').exist().isContractId().value
        let eventId = ctx.checkBody('eventId').exist().isEventId().value
        let licenseIds = ctx.checkBody('licenseIds').exist().isArray().len(1).value
        let nodeId = ctx.checkBody('nodeId').optional().toInt().gt(0).value
        let userId = ctx.request.userId

        ctx.allowContentType({type: 'json'}).validate()

        let contractInfo = await ctx.dal.contractProvider.getContract({_id: contractId}).then(app.toObject)

        if (!contractInfo) {
            ctx.error({msg: '未找到有效的合同', data: {contractInfo, userId}})
        }

        if (contractInfo.status === 4 || contractInfo.status === 5) {
            ctx.error({msg: '合同已经终止', data: {contractStatus: contractInfo.status}})
        }

        //如果是资源-节点合同
        if (contractInfo.contractType === ctx.app.contractType.ResourceToNode) {
            let nodeInfo = nodeId ? await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/nodes/${nodeId}`) : null
            if (!nodeInfo || nodeInfo.ownerUserId !== userId) {
                ctx.error({msg: '参数nodeId错误', data: {nodeId, userId}})
            }
            if (nodeId !== contractInfo.partyTwo) {
                ctx.error({msg: '没有执行合同的权限', data: {nodeId, userId}})
            }
        } else if (contractInfo.partyTwo !== userId) {
            ctx.error({msg: '没有执行合同的权限', data: {userId}})
        }

        let eventModel = contractInfo.policySegment.fsmDescription.find(item => {
            return item.event.eventId === eventId && item.event.type === 'signing' ||
                item.currentState === contractInfo.fsmState && item.event.type === 'compoundEvents' &&
                item.event.params.some(subEvent => subEvent.eventId === eventId && subEvent.type === 'signing')
        })

        if (!eventModel) {
            ctx.error({msg: '未找到事件'})
        }

        eventModel = eventModel.event

        if (eventModel.type === 'compoundEvents') {
            let eventParams = eventModel.params.find(subEvent => subEvent.eventId === eventId).params
            let diffLicenseIds = _.difference(eventParams, licenseIds)
            if (diffLicenseIds.length || eventParams.length !== licenseIds.length) {
                ctx.error({
                    msg: '参数licenseIds与事件中的协议参数不匹配', data: {
                        contractLicenseIds: eventParams, licenseIds
                    }
                })
            }
        }

        await contractFsmEventHandler.contractEventExecute(contractInfo, eventModel, eventId).then(data => {
            ctx.success(data)
        }).catch(err => ctx.error(err))
    }

    /**
     * 是否能执行指定事件
     * @returns {Promise<void>}
     */
    async isCanExecEvent(ctx) {

        let contractId = ctx.checkQuery('contractId').exist().isContractId().value
        let eventId = ctx.checkQuery('eventId').exist().value

        ctx.validate()

        let contractInfo = await ctx.dal.contractProvider.getContractById(contractId)

        if (!contractInfo) {
            ctx.error({msg: '未找到合同'})
        }

        let result = await contractFsmEventHandler.isCanExecEvent(eventId, contractInfo)

        ctx.success({contractInfo, eventId, isCanExec: result})
    }

    /**
     * 批量创建授权方案的合同
     * @param ctx
     * @returns {Promise<void>}
     */
    async batchCreateAuthSchemeContracts(ctx) {

        let partyTwo = ctx.checkBody("partyTwo").exist().notEmpty().value
        let signObjects = ctx.checkBody("signObjects").isArray().len(1, 200).value
        ctx.validate()

        signObjects.forEach(x => x.partyTwo = partyTwo)
        await ctx.service.contractService.batchCreateAuthSchemeContracts({policies: signObjects}).then(data => {
            ctx.success(data)
        }).catch(err => {
            ctx.error(err)
        })
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