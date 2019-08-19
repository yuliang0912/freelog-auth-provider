'use strict'

const Controller = require('egg').Controller
const {ArgumentError, AuthorizationError} = require('egg-freelog-base/error')
const {LoginUser} = require('egg-freelog-base/app/enum/identity-type')

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
        const {contractInfo, userInfo, eventInfo} = await this._baseEventParamsValidate(ctx)

        if (contractInfo.partyTwoUserId !== userInfo.userId) {
            throw new AuthorizationError(ctx.gettext('user-authorization-failed'))
        }
        if (contractInfo.contractType === ctx.app.contractType.ResourceToNode) {
            if (!nodeId) {
                throw new ArgumentError(ctx.gettext('params-required-validate-failed', 'nodeId'))
            }
            if (contractInfo.partyTwo !== nodeId.toString()) {
                throw new AuthorizationError(ctx.gettext('user-authorization-failed'))
            }
        }

        await ctx.app.contractService.singletonEventHandler(ctx, {
            contractInfo, eventInfo, userInfo, licenseIds, nodeId
        }).then(ctx.success)
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
        const {contractInfo, userInfo, eventInfo} = await this._baseEventParamsValidate(ctx)

        await ctx.app.contractService.singletonEventHandler(ctx, {
            contractInfo, eventInfo, userInfo, amount, fromAccountId, password
        }).then(ctx.success)
    }

    /**
     * 保证金没收(甲方执行)
     * @param ctx
     * @returns {Promise<void>}
     */
    async escrowConfiscated(ctx) {

        const toAccountId = ctx.checkBody('toAccountId').exist().isTransferAccountId().value
        const {contractInfo, userInfo, eventInfo} = await this._baseEventParamsValidate(ctx)

        await ctx.app.contractService.singletonEventHandler(ctx, {
            contractInfo, eventInfo, userInfo, toAccountId
        }).then(ctx.success)
    }

    /**
     * 保证金赎回(乙方执行)
     * @param ctx
     * @returns {Promise<void>}
     */
    async escrowRefunded(ctx) {

        const toAccountId = ctx.checkBody('toAccountId').exist().isTransferAccountId().value
        const {contractInfo, userInfo, eventInfo} = await this._baseEventParamsValidate(ctx)
        await ctx.app.contractService.singletonEventHandler(ctx, {
            contractInfo, eventInfo, userInfo, toAccountId
        }).then(ctx.success)
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
        }).then(ctx.success)
    }

    /**
     * 合同事件基础参数校验
     * @param ctx
     * @private
     */
    async _baseEventParamsValidate(ctx) {

        const contractId = ctx.checkBody('contractId').exist().isContractId().value
        const eventId = ctx.checkBody('eventId').exist().isEventId().value
        ctx.validateParams().validateVisitorIdentity(LoginUser)

        const userInfo = ctx.request.identityInfo.userInfo
        const contractInfo = await this.contractProvider.findById(contractId).then(model => ctx.entityNullObjectCheck(model))
        if (contractInfo.isTerminate) {
            throw new ArgumentError(ctx.gettext('contract-has-already-terminated'))
        }
        const eventInfo = contractInfo.fsmEvents.find(x => x && x.eventId === eventId && x.currentState === contractInfo.contractClause.currentFsmState)
        if (!eventInfo) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'eventId'), {eventId})
        }

        return {contractInfo, userInfo, eventInfo}
    }
}