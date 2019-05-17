/**
 * 合同支付事件处理
 */

'use strict'

const {ArgumentError, ApplicationError} = require('egg-freelog-base/error')
const ContractPaymentService = require('../lib/contract-payment-service')

module.exports = class ContractPaymentHandler {

    constructor(app) {
        this.app = app
        this.contractPaymentService = new ContractPaymentService(app)
    }

    /**
     * 合同支付事件处理
     */
    async handler(ctx, {contractInfo, eventInfo, userInfo, fromAccountId, amount, password}) {

        this._checkUserIdentity()

        /**
         * TODO:获取事件,根据事件描述,做动态身份,金额校验.然后获取到环境参数,参与后续交易
         */
        const {contractAccountName, currencyUnit} = eventInfo.params
        const contractAccountDeclaration = contractInfo.contractClause.fsmDeclarations[contractAccountName]
        const contractAccountId = contractAccountDeclaration && contractAccountDeclaration.declareType === 'contractAccount'
            ? contractAccountDeclaration.accountId : contractAccountName

        const transactionAmount = this._getMoneyAmount(contractInfo, eventInfo.params.amount, currencyUnit)
        if (amount !== transactionAmount) {
            throw new ArgumentError(`交易金额不正确`, {amount, transactionAmount})
        }

        return this.contractPaymentService.contractPayment({
            contractInfo, password, fromAccountId, amount,
            userId: userInfo.userId,
            eventId: eventInfo.eventId,
            toAccountId: contractAccountId
        })
    }

    /**
     * 计算金额
     * @param amount {type, literal}
     * @param contractInfo
     * @private
     */
    _getMoneyAmount(contractInfo, amount, currencyUnit) {

        var minUnitAmount = 0
        const {type, literal, handle} = amount
        if (type === 'literal') {
            minUnitAmount = parseInt(literal)
        }
        if (type === 'invocation') {
            throw new ApplicationError('暂不支持表达式', {contractInfo, amount})
            //表达式调用
        }
        if (currencyUnit.toLocaleLowerCase() === 'feather') {
            minUnitAmount = minUnitAmount * 1000
        }
        return minUnitAmount
    }

    /**
     * 检查用户身份
     * @returns {boolean}
     * @private
     */
    _checkUserIdentity() {
        return true
    }
}