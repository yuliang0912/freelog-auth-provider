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

    /**
     * 发行方案创建事件
     */
    ReleaseSchemeCreateEvent: Symbol('auth#releaseSchemeCreateEvent'),

    /**
     * 发行方案绑定合同事件
     */
    ReleaseSchemeBindContractEvent: Symbol('auth#releaseSchemeBindContractEvent'),

    /**
     * 发行方案授权状态变更事件
     */
    ReleaseSchemeAuthChangedEvent: Symbol('auth#releaseSchemeAuthChangedEvent'),

    /**
     * 发行方案所关联的合同授权发生变更事件
     */
    ReleaseContractAuthChangedEvent: Symbol('auth#releaseContractAuthChangedEvent'),

    /**
     * 发行方案授权重置事件(重新计算授权状态)
     */
    ReleaseSchemeAuthResetEvent: Symbol('auth#releaseSchemeAuthResetEvent'),

    /**
     * 生成方案授权信息事件
     */
    GenerateSchemeAuthInfoEvent: Symbol('auth#generateSchemeAuthInfoEvent'),

    /**
     * 节点合同授权发生变更事件
     */
    NodeContractAuthChangedEvent: Symbol('auth#nodeContractAuthChangedEvent'),

    /**
     * presentable授权结果重置事件(重新计算授权状态)
     */
    PresentableAuthResultResetEvent: Symbol('auth#presentableAuthResultResetEvent'),

    /**
     * presentable绑定关联合约事件
     */
    PresentableBindContractEvent: Symbol('auth#presentableBindContractEvent'),

    /**
     * presentable创建事件
     */
    PresentableCreatedEvent: Symbol('auth#PresentableCreatedEvent'),

    /**
     * presentable更新版本事件
     */
    PresentableLockedVersionChangedEvent: Symbol('auth#presentableLockedVersionChangedEvent'),

    /**
     * 生成presentable授权信息事件
     */
    GeneratePresentableAuthInfoEvent: Symbol('auth#generatePresentableAuthInfoEvent'),
}