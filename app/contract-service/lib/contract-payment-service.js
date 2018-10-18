'use strict'

const uuid = require('uuid')
const lodash = require('lodash')
const cryptoHelper = require('egg-freelog-base/app/extend/helper/crypto_helper')
const {ApiInvokingError} = require('egg-freelog-base/error')

module.exports = class contractPaymentService {

    constructor(app) {
        this.app = app
        this.contractTradeRecordProvider = app.dal.contractTradeRecordProvider
    }

    /**
     * 为合同支付
     * @param contractInfo
     * @param eventId
     * @param amount
     * @param fromAccountId
     * @param toAccountId
     * @param userId
     */
    async contractPayment({contractInfo, eventId, amount, fromAccountId, toAccountId, userId, password}) {

        const PayTradeRecordParams = lodash.pick(...arguments, ['contractInfo', 'eventId', 'amount', 'fromAccountId', 'toAccountId', 'userId'])

        const contractPayTradeRecord = await this._createPayTradeRecord(PayTradeRecordParams)

        const {tradeRecordId, status} = contractPayTradeRecord
        const paymentOrderInfoParams = Object.assign({}, ...arguments, {tradeRecordId})
        const {paymentOrderId, tradeStatus} = await this._payment(paymentOrderInfoParams)

        await this.contractTradeRecordProvider.updateOne({tradeRecordId, status}, {paymentOrderId, status: tradeStatus})

        return Object.assign(contractPayTradeRecord, {paymentOrderId, status: tradeStatus})
    }

    /**
     * 创建支付交易记录
     * @private
     */
    _createPayTradeRecord({contractInfo, eventId, amount, fromAccountId, toAccountId, userId}) {

        const {contractId, contractName, contractType} = contractInfo
        const fsmState = contractInfo.contractClause.currentFsmState

        const model = {
            tradeRecordId: uuid.v4().replace(/-/g, ''), tradeType: 3,
            contractId, contractName, contractType, fsmState, fromAccountId, toAccountId, userId, amount, eventId
        }

        return this.contractTradeRecordProvider.create(model)
    }

    /**
     * 调用支付接口
     */
    async _payment({contractInfo, tradeRecordId, fromAccountId, toAccountId, amount, password, userId}) {

        const {app} = this
        const identityInfo = {tokenType: 'token-client', userInfo: {userId}}
        const postData = {
            fromAccountId, toAccountId, amount, password,
            outsideTradeNo: tradeRecordId,
            outsideTradeDesc: contractInfo.contractName
        }
        return app.curlFromClient(`${app.webApi.pay}/inquirePayment`, {
            type: 'post',
            contentType: 'json',
            data: postData,
            headers: {authentication: cryptoHelper.base64Encode(JSON.stringify(identityInfo))}
        }).catch(error => {
            throw new ApiInvokingError('支付接口(inquirePayment)调用失败', {message: error.toString(), postData, userId})
        })
    }
}