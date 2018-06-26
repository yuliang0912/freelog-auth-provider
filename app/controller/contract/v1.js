/**
 * Created by yuliang on 2017/8/16.
 */

'use strict'

const lodash = require('lodash')
const Controller = require('egg').Controller
const contractFsmEventHandler = require('../../contract-service/contract-fsm-event-handler')

module.exports = class ContractController extends Controller {

    /**
     * 当前登录用户的合约列表(作为甲方和作为乙方)
     * @param ctx
     * @returns {Promise.<void>}
     */
    async index(ctx) {

        const page = ctx.checkQuery("page").default(1).gt(0).toInt().value
        const pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
        const contractType = ctx.checkQuery('contractType').default(0).in([0, 1, 2, 3]).value
        const partyOne = ctx.checkQuery('partyOne').default(0).toInt().value
        const partyTwo = ctx.checkQuery('partyTwo').default(0).toInt().value
        const resourceIds = ctx.checkQuery('resourceIds').optional().isSplitResourceId().value
        ctx.validate()

        const condition = {}
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

        var dataList = []
        const totalItem = await ctx.dal.contractProvider.getCount(condition)

        const projection = "_id segmentId contractType targetId resourceId policySegment partyOne partyTwo status createDate"
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

        const contractIds = ctx.checkQuery('contractIds').isSplitMongoObjectId('contractIds格式错误').toSplitArray().len(1, 100).value

        ctx.validate()

        const condition = {_id: {$in: contractIds}}

        const projection = "_id segmentId contractType targetId resourceId partyOne partyTwo status createDate"

        await ctx.dal.contractProvider.getContracts(condition, projection).then(ctx.success).catch(ctx.error)
    }

    /**
     * 展示合约信息
     * @param ctx
     * @returns {Promise.<void>}
     */
    async show(ctx) {

        const contractId = ctx.checkParams("id").notEmpty().isMongoObjectId().value
        ctx.validate()

        await ctx.dal.contractProvider.getContractById(contractId).then(ctx.success).catch(ctx.error)
    }

    /**
     * 初始化合同
     * @returns {Promise<void>}
     */
    async initial(ctx) {

        const contractIds = ctx.checkQuery("contractIds").isSplitMongoObjectId('合同ID格式错误').toSplitArray().len(1, 100).value
        ctx.validate()

        const contractInfos = await ctx.dal.contractProvider.find({
            _id: {$in: contractIds},
            partyTwoUserId: ctx.request.userId,
            fsmState: 'none'
        })

        const tasks = contractInfos.map(contractInfo => {
            contractInfo = contractInfo.toObject()
            return new Promise((resolve, reject) => {
                ctx.app.once(`${ctx.app.event.contractEvent.initialContractEvent}_${contractInfo.contractId}`, function () {
                    resolve(contractInfo)
                })
                contractFsmEventHandler.initContractFsm(contractInfo).catch(reject)
            })
        })

        await Promise.all(tasks).then(contracts => {
            return contracts.map(x => new Object({contractId: x.contractId}))
        }).then(ctx.success).catch(ctx.error)
    }

    /**
     * 创建资源合约
     * @param ctx
     * @returns {Promise.<void>}
     */
    async create(ctx) {

        //仅支持用户与presentable签约,(节点与资源 资源与资源通过批量结果实现)
        const contractType = ctx.checkBody('contractType').toInt().in([3]).value
        const segmentId = ctx.checkBody('segmentId').exist().isMd5().value
        const targetId = ctx.checkBody('targetId').exist().notEmpty().value
        ctx.validate()

        await ctx.service.contractService.createUserContract({presentableId: targetId, segmentId}).then(ctx.success)
    }

    /**
     * 测试状态机事件驱动
     * @param ctx
     * @returns {Promise.<void>}
     */
    async testContractFsm(ctx) {

        const contractId = ctx.checkBody('contractId').exist().notEmpty().isMongoObjectId().value
        const eventId = ctx.checkBody('eventId').exist().notEmpty().value

        ctx.allowContentType({type: 'json'}).validate()

        await contractFsmEventHandler.contractEventTriggerHandler(eventId, contractId).then(ctx.success).catch(ctx.error)
    }

    /**
     * 合同记录
     * @param ctx
     * @returns {Promise.<void>}
     */
    async contractRecords(ctx) {

        const resourceIds = ctx.checkQuery('resourceIds').optional().isSplitResourceId().toSplitArray().value
        const contractIds = ctx.checkQuery('contractIds').optional().isSplitMongoObjectId().toSplitArray().value
        const partyTwo = ctx.checkQuery('partyTwo').optional().toInt().gt(0).value
        const contractType = ctx.checkQuery('contractType').default(0).in([0, 1, 2, 3]).value

        ctx.validate()

        const condition = {}
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

        const projection = "_id segmentId contractType targetId resourceId partyOne partyTwo status fsmState createDate"

        await ctx.dal.contractProvider.getContracts(condition, projection).then(ctx.success)
    }

    /**
     * 给合同签协议
     * @param ctx
     * @returns {Promise.<void>}
     */
    async signingLicenses(ctx) {

        const contractId = ctx.checkBody('contractId').exist().isContractId().value
        const eventId = ctx.checkBody('eventId').exist().isEventId().value
        const licenseIds = ctx.checkBody('licenseIds').exist().isArray().len(1).value
        const nodeId = ctx.checkBody('nodeId').optional().toInt().gt(0).value
        const userId = ctx.request.userId

        ctx.allowContentType({type: 'json'}).validate()

        const contractInfo = await ctx.dal.contractProvider.getContract({_id: contractId}).then(app.toObject)

        if (!contractInfo) {
            ctx.error({msg: '未找到有效的合同', data: {contractInfo, userId}})
        }
        if (contractInfo.status === 4 || contractInfo.status === 5) {
            ctx.error({msg: '合同已经终止', data: {contractStatus: contractInfo.status}})
        }

        //如果是资源-节点合同
        if (contractInfo.contractType === ctx.app.contractType.ResourceToNode) {
            const nodeInfo = nodeId ? await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`) : null
            if (!nodeInfo || nodeInfo.ownerUserId !== userId) {
                ctx.error({msg: '参数nodeId错误', data: {nodeId, userId}})
            }
            if (nodeId !== contractInfo.partyTwo) {
                ctx.error({msg: '没有执行合同的权限', data: {nodeId, userId}})
            }
        } else if (contractInfo.partyTwo !== userId) {
            ctx.error({msg: '没有执行合同的权限', data: {userId}})
        }

        const eventModel = contractInfo.policySegment.fsmDescription.find(item => {
            return item.event.eventId === eventId && item.event.type === 'signing' ||
                item.currentState === contractInfo.fsmState && item.event.type === 'compoundEvents' &&
                item.event.params.some(subEvent => subEvent.eventId === eventId && subEvent.type === 'signing')
        })

        if (!eventModel) {
            ctx.error({msg: '未找到事件'})
        }

        if (eventModel.event.type === 'compoundEvents') {
            const eventParams = eventModel.event.params.find(subEvent => subEvent.eventId === eventId).params
            const diffLicenseIds = lodash.difference(eventParams, licenseIds)
            if (diffLicenseIds.length || eventParams.length !== licenseIds.length) {
                ctx.error({
                    msg: '参数licenseIds与事件中的协议参数不匹配', data: {contractLicenseIds: eventParams, licenseIds}
                })
            }
        }

        await contractFsmEventHandler.contractEventExecute(contractInfo, eventModel.event, eventId).then(ctx.success).catch(ctx.error)
    }

    /**
     * 是否能执行指定事件
     * @returns {Promise<void>}
     */
    async isCanExecEvent(ctx) {

        const contractId = ctx.checkQuery('contractId').exist().isContractId().value
        const eventId = ctx.checkQuery('eventId').exist().value

        ctx.validate()

        const contractInfo = await ctx.dal.contractProvider.getContractById(contractId)
        if (!contractInfo) {
            ctx.error({msg: '未找到合同'})
        }

        const result = await contractFsmEventHandler.isCanExecEvent(eventId, contractInfo)

        ctx.success({contractInfo, eventId, isCanExec: result})
    }

    /**
     * 批量创建授权方案的合同
     * @param ctx
     * @returns {Promise<void>}
     */
    async batchCreateAuthSchemeContracts(ctx) {

        const partyTwo = ctx.checkBody("partyTwo").exist().notEmpty().value
        const signObjects = ctx.checkBody("signObjects").isArray().len(1, 200).value
        const contractType = ctx.checkBody("contractType").toInt().in([1, 2]).value
        ctx.allowContentType({type: 'json'}).validate()

        var nodeInfo = null;
        if (contractType === ctx.app.contractType.ResourceToNode) {
            nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${partyTwo}`)
            if (!nodeInfo || nodeInfo.ownerUserId != ctx.request.userId) {
                ctx.error({msg: '参数partyTwo校验失败', data: nodeInfo})
            }
        }

        await ctx.service.contractService.batchCreateContracts({
            policies: signObjects, contractType, nodeInfo, partyTwo
        }).then(ctx.success).catch(ctx.error)
    }
}