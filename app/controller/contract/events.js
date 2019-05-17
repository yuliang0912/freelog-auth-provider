'use strict'

const Controller = require('egg').Controller

module.exports = class ContractEventsController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * 签约license
     * @param ctx
     * @returns {Promise<void>}
     */
    async signingLicenses(ctx) {
        const licenseIds = ctx.checkBody('licenseIds').exist().isArray().len(1).value
        const nodeId = ctx.checkBody('nodeId').optional().toInt().gt(0).value
        ctx.validate()

        const {contractInfo, userInfo, eventInfo} = await this._baseEventParamsValidate(ctx)
        if (contractInfo.partyTwoUserId !== userInfo.userId) {
            ctx.error({msg: ctx.gettext('授权失败,没有操作权限')})
        }
        if (contractInfo.contractType === ctx.app.contractType.ResourceToNode) {
            if (!nodeId) {
                ctx.error({msg: ctx.gettext('参数%s缺失', 'nodeId')})
            }
            if (contractInfo.partyTwo !== nodeId.toString() || contractInfo.partyTwoUserId !== userInfo.userId) {
                ctx.error({msg: ctx.gettext('授权失败,没有操作权限')})
            }
        }

        await ctx.app.contractService.singletonEventHandler(ctx, {
            contractInfo, eventInfo, userInfo, licenseIds, nodeId
        }).then(ctx.success).catch(ctx.error)
    }

    /**
     * 合同付款事件
     * @param ctx
     * @returns {Promise<void>}
     */
    async payment(ctx) {
        const amount = ctx.checkBody('amount').exist().toInt().gt(0).value
        const fromAccountId = ctx.checkBody('fromAccountId').exist().isTransferAccountId().value
        const password = ctx.checkBody('password').exist().isNumeric().len(6, 6).value
        ctx.validate()

        const {contractInfo, userInfo, eventInfo} = await this._baseEventParamsValidate(ctx)
        await ctx.app.contractService.singletonEventHandler(ctx, {
            contractInfo, eventInfo, userInfo, amount, fromAccountId, password
        }).then(ctx.success).catch(ctx.error)
    }

    /**
     * 保证金没收(甲方执行)
     * @param ctx
     * @returns {Promise<void>}
     */
    async escrowConfiscated(ctx) {
        const toAccountId = ctx.checkBody('toAccountId').exist().isTransferAccountId().value
        ctx.validate()

        const {contractInfo, userInfo, eventInfo} = await this._baseEventParamsValidate(ctx)
        await ctx.app.contractService.singletonEventHandler(ctx, {
            contractInfo, eventInfo, userInfo, toAccountId
        }).then(ctx.success).catch(ctx.error)
    }

    /**
     * 保证金赎回(乙方执行)
     * @param ctx
     * @returns {Promise<void>}
     */
    async escrowRefunded(ctx) {
        const toAccountId = ctx.checkBody('toAccountId').exist().isTransferAccountId().value
        ctx.validate()

        const {contractInfo, userInfo, eventInfo} = await this._baseEventParamsValidate(ctx)
        await ctx.app.contractService.singletonEventHandler(ctx, {
            contractInfo, eventInfo, userInfo, toAccountId
        }).then(ctx.success).catch(ctx.error)
    }

    /**
     * 自定义事件调用
     * @param ctx
     * @returns {Promise<void>}
     */
    async customEventInvoking(ctx) {
        const {contractInfo, userInfo, eventInfo} = await this._baseEventParamsValidate(ctx)
        await ctx.app.contractService.singletonEventHandler(ctx, {
            contractInfo, eventInfo, userInfo
        }).then(ctx.success).catch(ctx.error)
    }

    /**
     * 合同事件基础参数校验
     * @param ctx
     * @private
     */
    async _baseEventParamsValidate(ctx) {

        const contractId = ctx.checkBody('contractId').exist().isContractId().value
        const eventId = ctx.checkBody('eventId').exist().isEventId().value
        ctx.validate()

        const userInfo = ctx.request.identityInfo.userInfo
        const contractInfo = await this.contractProvider.findById(contractId)
        if (!contractInfo || contractInfo.isTerminate) {
            ctx.error({msg: ctx.gettext('合同信息校验失败')})
        }
        const eventInfo = contractInfo.fsmEvents.find(x => x && x.eventId === eventId && x.currentState === contractInfo.contractClause.currentFsmState)
        if (!eventInfo) {
            ctx.error({msg: ctx.gettext('参数%s错误,合同状态机不能触发当前事件', 'eventId')})
        }

        return {contractInfo, userInfo, eventInfo}
    }
}