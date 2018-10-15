'use strict'

const tradeStatus = require('../../enum/trade-status')

module.exports = class TradeStatusChangedEventHandler {

    constructor(app) {
        this.app = app
        this.contractProvider = app.dal.contractProvider
        this.contractTradeRecordProvider = app.dal.contractTradeRecordProvider
    }

    /**
     * 合同支付成功事件(来自支付系统主动推送的)
     * @param paymentOrderInfo
     */
    async handler(tradeInfo) {

        const {paymentOrderId, transferId} = tradeInfo

        const contractTradeRecordInfo = await this.contractTradeRecordProvider.findOne({paymentOrderId: paymentOrderId || transferId})

        //已经得到过终极结果,则忽略其他状态
        if (!contractTradeRecordInfo || contractTradeRecordInfo.status === tradeStatus.Successful
            || contractTradeRecordInfo.status === tradeStatus.Failed || contractTradeRecordInfo.status === tradeStatus.InitiatorAbandon) {
            return
        }

        await contractTradeRecordInfo.updateOne({status: tradeInfo.tradeStatus}).catch(error => this.errorHandler(error, ...arguments))
    }

    /**
     * 错误处理
     */
    errorHandler(error, ...args) {
        this.app.logger.error('fsm-event-change-history-handler事件执行异常', error, ...args)
    }
}