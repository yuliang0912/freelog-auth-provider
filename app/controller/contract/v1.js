'use strict'

const lodash = require('lodash')
const Controller = require('egg').Controller
const {ArgumentError, AuthorizationError} = require('egg-freelog-base/error')
const {mongoObjectId} = require('egg-freelog-base/app/extend/helper/common_regex')
const SignReleaseValidator = require('../../extend/json-schema/batch-sign-release-validator')
const {LoginUser, InternalClient} = require('egg-freelog-base/app/enum/identity-type')

module.exports = class ContractController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * 当前登录用户的合约列表
     * @param ctx
     * @returns {Promise.<void>}
     */
    async index(ctx) {

        const page = ctx.checkQuery("page").optional().default(1).toInt().gt(0).value
        const pageSize = ctx.checkQuery("pageSize").optional().default(10).gt(0).lt(101).toInt().value
        const contractType = ctx.checkQuery('contractType').optional().in([0, 1, 2, 3]).value
        const identityType = ctx.checkQuery('identityType').exist().toInt().in([1, 2]).value //甲or乙
        const partyOne = ctx.checkQuery('partyOne').optional().notEmpty().value
        const partyTwo = ctx.checkQuery('partyTwo').optional().notEmpty().value
        const targetIds = ctx.checkQuery('targetIds').optional().isSplitMongoObjectId().toSplitArray().default([]).value
        const isDefault = ctx.checkQuery('isDefault').optional().toInt().in([0, 1]).value
        const keywords = ctx.checkQuery("keywords").optional().decodeURIComponent().value
        const status = ctx.checkQuery('status').optional().in([2, 3, 4, 6]).value
        const order = ctx.checkQuery('order').optional().in(['asc', 'desc']).default('desc').value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value

        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const condition = {}
        if (contractType) {
            condition.contractType = contractType
        }
        if (identityType === 1) {
            condition.partyOneUserId = ctx.request.userId
        }
        if (identityType === 2) {
            condition.partyTwoUserId = ctx.request.userId
        }
        if (lodash.isString(partyOne)) {
            condition.partyOne = partyOne
        }
        if (lodash.isString(partyTwo)) {
            condition.partyTwo = partyTwo
        }
        if (targetIds.length) {
            condition.targetIds = {$in: targetIds}
        }
        if (isDefault !== undefined) {
            condition.isDefault = isDefault
        }
        if (status) {
            condition.status = status
        }
        if (lodash.isString(keywords)) {
            let searchRegExp = new RegExp(keywords, "i")
            if (mongoObjectId.test(keywords.toLowerCase())) {
                condition.targetId = keywords.toLowerCase()
            } else {
                condition.contractName = searchRegExp
            }
        }

        var dataList = []
        const totalItem = await this.contractProvider.count(condition)
        if (totalItem > (page - 1) * pageSize) {
            dataList = await this.contractProvider.findPageList(condition, page, pageSize, projection.join(' '), {createDate: order === 'asc' ? 1 : -1})
        }
        ctx.success({page, pageSize, totalItem, dataList})
    }

    /**
     * 批量获取合同
     * @param ctx
     * @returns {Promise<void>}
     */
    async list(ctx) {

        const contractIds = ctx.checkQuery('contractIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 200).value
        const targetIds = ctx.checkQuery('targetIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 200).value
        const partyOne = ctx.checkQuery('partyOne').optional().notEmpty().value
        const partyTwo = ctx.checkQuery('partyTwo').optional().notEmpty().value
        const contractType = ctx.checkQuery('contractType').optional().toInt().in([0, 1, 2, 3]).value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value
        ctx.validateParams().validateVisitorIdentity(LoginUser | InternalClient)

        const condition = {}
        if ([contractIds, targetIds, partyOne, partyTwo].every(x => x === undefined)) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed'))
        }
        //contractIds和targetIds最少需要一个
        if (!contractIds && !targetIds) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed', 'contractIds,targetIds'))
        }
        if (contractIds) {
            condition._id = {$in: contractIds}
        }
        if (targetIds) {
            condition.targetId = {$in: targetIds}
        }
        if (lodash.isString(partyOne)) {
            condition.partyOne = partyOne
        }
        if (lodash.isString(partyTwo)) {
            condition.partyTwo = partyTwo
        }
        if (contractType) {
            condition.contractType = contractType
        }

        await this.contractProvider.find(condition, projection.join(' ')).then(ctx.success)
    }

    /**
     * 展示合约信息
     * @param ctx
     * @returns {Promise.<void>}
     */
    async show(ctx) {

        const contractId = ctx.checkParams("id").notEmpty().isContractId().value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value
        ctx.validateParams().validateVisitorIdentity(LoginUser | InternalClient)

        await this.contractProvider.findById(contractId, projection.join(' ')).then(ctx.success)
    }

    /**
     * 查询历史合同
     * @returns {Promise<void>}
     */
    async terminatedContracts(ctx) {

        const targetId = ctx.checkQuery('targetId').exist().notEmpty().value
        const partyTwo = ctx.checkQuery('partyTwo').exist().notEmpty().value
        const identityType = ctx.checkQuery('identityType').exist().toInt().in([1, 2]).value //甲or乙
        const policyId = ctx.checkQuery('policyId').optional().exist().isMd5().value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const condition = {isTerminate: 1, targetId, partyTwo}
        if (policyId) {
            condition.policyId = policyId
        }
        if (identityType === 1) {
            condition.partyOneUserId = ctx.request.userId
        }
        if (identityType === 2) {
            condition.partyTwoUserId = ctx.request.userId
        }

        await this.contractProvider.find(condition, projection.join(' ')).then(ctx.success)
    }

    /**
     * 创建资源合约(仅支持用户与presentable签约,节点与资源 资源与资源通过批量结果实现)
     * @param ctx
     * @returns {Promise.<void>}
     */
    async create(ctx) {

        const policyId = ctx.checkBody('policyId').exist().isMd5().value
        const presentableId = ctx.checkBody('presentableId').exist().isPresentableId().value
        const isDefault = ctx.checkBody('isDefault').exist().toInt().in([0, 1]).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const presentableInfo = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}`)
        if (!presentableInfo || presentableInfo.isOnline !== 1) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'presentableId'), {presentableInfo})
        }
        if (!presentableInfo.policies.some(x => x.policyId === policyId && x.status === 1)) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'policyId'), {policyId})
        }

        await ctx.service.contractService.createUserContract({presentableInfo, policyId, isDefault}).then(ctx.success)
    }

    /**
     * 批量创建发行合同(节点或资源商签约使用)
     * @param ctx
     * @returns {Promise<void>}
     */
    async batchCreateReleaseContracts(ctx) {

        const partyTwoId = ctx.checkBody("partyTwoId").exist().notEmpty().value
        const signReleases = ctx.checkBody("signReleases").exist().isArray().len(1, 200).value
        const contractType = ctx.checkBody("contractType").exist().toInt().in([1, 2]).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const validateResult = new SignReleaseValidator().signReleaseValidate(signReleases)
        if (validateResult.errors.length) {
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'signReleases'), {
                errors: validateResult.errors
            })
        }

        let nodeInfo = null
        if (contractType === ctx.app.contractType.ResourceToNode) {
            nodeInfo = await ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${partyTwoId}`)
            ctx.entityNullValueAndUserAuthorizationCheck(nodeInfo, {
                msg: ctx.gettext('params-validate-failed', 'partyTwoId'),
                property: 'ownerUserId'
            })
        }

        await ctx.service.contractService.batchCreateReleaseContracts({
            signReleases, contractType, partyTwoId, nodeInfo
        }).then(ctx.success)
    }

    /**
     * 更新合同信息
     * @param ctx
     */
    async update(ctx) {

        const contractId = ctx.checkParams("id").notEmpty().isMongoObjectId().value
        const remark = ctx.checkBody('remark').exist().type('string').len(0, 500).value
        const isDefault = ctx.checkBody('isDefault').optional().toInt().in([1]).value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        if (remark === undefined && isDefault === undefined) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed'))
        }

        const contractInfo = await this.contractProvider.findById(contractId).tap(model => ctx.entityNullValueAndUserAuthorizationCheck(model, {
            msg: ctx.gettext('params-validate-failed', 'contractId'),
            property: 'partyTwoUserId'
        }))

        await ctx.service.contractService.updateContractInfo(contractInfo, remark, isDefault).then(ctx.success)
    }

    /**
     * 测试状态机事件驱动
     * @param ctx
     * @returns {Promise.<void>}
     */
    async testContractFsm(ctx) {

        const contractId = ctx.checkBody('contractId').exist().notEmpty().isMongoObjectId().value
        const eventId = ctx.checkBody('eventId').exist().notEmpty().value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        await ctx.app.contractService.execContractFsmEvent(contractId, eventId).then(ctx.success)
    }

    /**
     * 是否能执行指定事件
     * @returns {Promise<void>}
     */
    async isCanExecEvent(ctx) {

        const contractId = ctx.checkQuery('contractId').exist().isContractId().value
        const eventId = ctx.checkQuery('eventId').exist().value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const contractInfo = await this.contractProvider.findById(contractId).then(model => ctx.entityNullObjectCheck(model))
        const result = ctx.app.contractService.isCanExecEvent(contractInfo, eventId)

        ctx.success({contractInfo, eventId, isCanExec: result})
    }
}

