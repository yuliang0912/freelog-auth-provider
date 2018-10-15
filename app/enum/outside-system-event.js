'use strict'

module.exports = {

    /**
     * 支付中心的支付订单状态改变事件
     */
    PaymentOrderStatusChangedEvent: Symbol('auth#paymentOrderStatusChangedEvent'),

    /**
     * 支付中心的支付订单状态改变事件
     */
    TransferRecordTradeStatusChangedEvent: Symbol('auth#transferRecordTradeStatusChangedEvent'),

    /**
     * 已注册的事件触发事件
     */
    RegisteredEventTriggerEvent: Symbol('auth#RegisteredEventTriggerEvent'),

    /**
     * 支付服务询问是否确认支付事件
     */
    InquirePaymentEvent: Symbol('auth#inquirePaymentEvent'),

    /**
     * 支付服务询问是否确认转账事件
     */
    InquireTransferEvent: Symbol('auth#inquireTransferEvent'),

    /**
     * 事件注册完成事件
     */
    RegisterCompletedEvent: Symbol('auth#registerCompletedEvent'),
}