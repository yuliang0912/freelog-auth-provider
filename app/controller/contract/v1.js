/**
 * Created by yuliang on 2017/8/16.
 */

'use strict'

const lodash = require('lodash')
const Controller = require('egg').Controller

module.exports = class ContractController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * 当前登录用户的合约列表(作为甲方和作为乙方)
     * @param ctx
     * @returns {Promise.<void>}
     */
    async index(ctx) {

        const page = ctx.checkQuery("page").default(1).toInt().gt(0).value
        const pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
        const contractType = ctx.checkQuery('contractType').default(0).in([0, 1, 2, 3]).value
        const partyOne = ctx.checkQuery('partyOne').optional().value
        const partyTwo = ctx.checkQuery('partyTwo').optional().value
        const resourceIds = ctx.checkQuery('resourceIds').optional().isSplitResourceId().value
        const isDefault = ctx.checkQuery('isDefault').optional().toInt().in([0, 1]).value
        ctx.validate()

        const condition = {}
        if (contractType) {
            condition.contractType = contractType
        }
        if (partyOne !== undefined) {
            condition.partyOne = partyOne
        }
        if (partyTwo !== undefined) {
            condition.partyTwo = partyTwo
        }
        if (resourceIds) {
            condition.resourceId = {$in: resourceIds.split(',')}
        }
        if (isDefault !== undefined) {
            condition.isDefault = isDefault
        }
        if (!Object.keys(condition).length) {
            ctx.error({msg: '最少需要一个查询条件'})
        }

        var dataList = []
        const totalItem = await this.contractProvider.count(condition)

        //const projection = "_id contractName segmentId contractType targetId resourceId policySegment partyOne partyTwo status createDate"
        if (totalItem > (page - 1) * pageSize) {
            dataList = await this.contractProvider.findPageList(condition, page, pageSize, null, {createDate: 1})
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

        await this.contractProvider.find(condition).then(ctx.success).catch(ctx.error)
    }

    /**
     * 展示合约信息
     * @param ctx
     * @returns {Promise.<void>}
     */
    async show(ctx) {

        const contractId = ctx.checkParams("id").notEmpty().isMongoObjectId().value
        ctx.validate()

        await this.contractProvider.findById(contractId).then(ctx.success).catch(ctx.error)
    }

    /**
     * 查询历史合同
     * @returns {Promise<void>}
     */
    async terminateContracts(ctx) {

        const targetId = ctx.checkQuery('targetId').exist().notEmpty().value
        const partyTwo = ctx.checkQuery('partyTwo').exist().notEmpty().value
        const segmentId = ctx.checkQuery('segmentId').optional().exist().isMd5().value

        const condition = {isTerminate: 1, targetId, partyTwo}
        if (segmentId) {
            condition.segmentId = segmentId
        }

        await this.contractProvider.find(condition).then(ctx.success).catch(ctx.error)
    }

    /**
     * 初始化合同
     * @returns {Promise<void>}
     */
    async initial(ctx) {

        const contractIds = ctx.checkQuery("contractIds").isSplitMongoObjectId('合同ID格式错误').toSplitArray().len(1, 100).value
        ctx.validate()

        const {app} = ctx
        const contractInfos = await this.contractProvider.find({
            _id: {$in: contractIds},
            partyTwoUserId: ctx.request.userId, status: 1
        })

        contractInfos.forEach(contractInfo => app.contractService.initialContractFsm(contractInfo))

        ctx.success(contractInfos.map(x => new Object({contractId: x.contractId})))
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
        const isDefault = ctx.checkBody('isDefault').default(0).optional().toInt().in([0, 1]).value
        ctx.validate()

        await ctx.service.contractService.createUserContract({
            presentableId: targetId,
            segmentId,
            isDefault
        }).then(ctx.success)
    }


    /**
     * 更新合同信息
     * @param ctx
     */
    async update(ctx) {

        const contractId = ctx.checkParams("id").notEmpty().isMongoObjectId().value
        const remark = ctx.checkBody('remark').exist().type('string').len(0, 500).value

        ctx.validate()

        const contractInfo = await this.contractProvider.findById(contractId)
        if (!contractInfo || contractInfo.partyTwoUserId !== ctx.request.userId) {
            ctx.error({msg: '合同信息错误或者没有操作权限', data: {contractInfo}})
        }

        await contractInfo.updateOne({remark}).then(x => ctx.success(x.nModified > 0)).catch(ctx.error)
    }

    /**
     * 创建C端用户合同
     * @param ctx
     * @returns {Promise<void>}
     */
    async createUserPresentableContract(ctx) {

        const segmentId = ctx.checkBody('segmentId').exist().isMd5().value
        const presentableId = ctx.checkBody('presentableId').exist().isMongoObjectId().value
        const isDefault = ctx.checkBody('isDefault').default(0).optional().toInt().in([0, 1]).value
        ctx.validate()

        await ctx.service.contractService.createUserContract({presentableId, segmentId, isDefault})
            .then(ctx.success).catch(ctx.error)
    }

    /**
     * 设置合同未默认执行合同
     * @param ctx
     * @returns {Promise<void>}
     */
    async setDefault(ctx) {

        const contractId = ctx.checkQuery('contractId').exist().notEmpty().isMongoObjectId().value
        ctx.validate()

        const contractInfo = await this.contractProvider.findById(contractId)
        if (!contractInfo || contractInfo.partyTwoUserId !== ctx.request.userId || contractInfo.contractType !== ctx.app.contractType.PresentableToUser) {
            ctx.error({msg: '合同信息错误或者没有操作权限', data: {contractInfo}})
        }

        await this.contractProvider.updateMany(lodash.pick(contractInfo, ['targetId', 'partyTwo', 'contractType']), {isDefault: 0}).then((ret) => {
            return contractInfo.updateOne({isDefault: 1})
        }).then(x => ctx.success(x.nModified > 0)).catch(ctx.error)
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

        await ctx.app.contractService.execContractFsmEvent(contractId, eventId).then(ctx.success).catch(ctx.error)
    }

    /**
     * 合同记录
     * @param ctx
     * @returns {Promise.<void>}
     */
    async contractRecords(ctx) {

        const resourceIds = ctx.checkQuery('resourceIds').optional().isSplitResourceId().toSplitArray().value
        const contractIds = ctx.checkQuery('contractIds').optional().isSplitMongoObjectId().toSplitArray().value
        const targetIds = ctx.checkQuery('targetIds').optional().isSplitMongoObjectId().toSplitArray().value
        const partyTwo = ctx.checkQuery('partyTwo').optional().value
        const contractType = ctx.checkQuery('contractType').default(0).in([0, 1, 2, 3]).value

        ctx.validate()

        const condition = {}
        if (resourceIds) {
            condition.resourceId = {$in: resourceIds}
        }
        if (resourceIds && partyTwo === undefined) {
            ctx.error({msg: '参数resourceIds必须与partyTwo组合使用'})
        }
        if (contractIds) {
            condition._id = {$in: contractIds}
        }
        if (partyTwo !== undefined) {
            condition.partyTwo = partyTwo
        }
        if (contractType) {
            condition.contractType = contractType
        }
        if (targetIds) {
            condition.targetId = {$in: targetIds}
        }
        if (targetIds && partyTwo === undefined) {
            ctx.error({msg: '参数targetIds必须与partyTwo组合使用'})
        }
        if (!Object.keys(condition).length) {
            ctx.error({msg: '最少需要一个可选查询条件'})
        }

        //const projection = "_id segmentId contractType targetId resourceId partyOne partyOneUserId partyTwo partyTwoUserId status createDate"

        await this.contractProvider.find(condition).then(ctx.success)
    }

    /**
     * 是否能执行指定事件
     * @returns {Promise<void>}
     */
    async isCanExecEvent(ctx) {

        const contractId = ctx.checkQuery('contractId').exist().isContractId().value
        const eventId = ctx.checkQuery('eventId').exist().value

        ctx.validate()

        const contractInfo = await this.contractProvider.findById(contractId)
        if (!contractInfo) {
            ctx.error({msg: '未找到合同'})
        }

        const result = ctx.app.contractService.isCanExecEvent(contractInfo, eventId)

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

    /**
     * 合同交易账户授权 (已弃用,修改为签名认证)
     * @param ctx
     * @returns {Promise<void>}
     */
    async contractAccountAuthorization(ctx) {

        const amount = ctx.checkBody('amount').exist().isInt().gt(0).value
        const accountId = ctx.checkBody('accountId').exist().isTransferAccountId().value
        const contractId = ctx.checkBody('contractId').exist().isContractId().value
        const operationUserId = ctx.checkBody('operationUserId').exist().toInt().value
        const tradeRecordId = ctx.checkBody('outsideTradeNo').exist().isMd5().value
        ctx.allowContentType({type: 'json'}).validate(false)

        const tradeRecord = await ctx.dal.contractTradeRecordProvider.findOne({tradeRecordId, contractId})
        if (!tradeRecord || tradeRecord.status !== 1) {
            ctx.error({msg: '未找到合同交易记录或者交易已经处理完毕', data: {tradeRecord}})
        }

        const isAuthorization = tradeRecord.amount === amount && tradeRecord.fromAccountId === accountId && operationUserId === tradeRecord.userId

        ctx.success(isAuthorization)
    }


    async fixContactData(ctx) {

        const contracts = await this.contractProvider.find({}, 'contractClause')

        contracts.forEach(contract => {
            const fsmStates = contract.contractClause.fsmStates
            Object.keys(fsmStates).forEach(key => {
                if (!fsmStates[key].authorization.some(x => x.toLowerCase() === 'recontractable')) {
                    fsmStates[key].authorization.push('recontractable')
                    contract.updateOne({contractClause: contract.contractClause}).exec()
                }
            })
        })

        ctx.success(contracts)
    }
}

