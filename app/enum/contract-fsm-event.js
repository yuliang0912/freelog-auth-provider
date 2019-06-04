'use strict'

module.exports = {

    /**
     * 设置合同未默认执行合同事件
     */
    ContractSetDefaultEvent: Symbol('contract#contractSetDefaultEvent'),

    /**
     * 合同状态机状态变更事件
     */
    ContractFsmStateChangedEvent: Symbol('contract#fsmStateChangedEvent'),

    /**
     * 合同状态机事件触发事件
     */
    ContractFsmEventTriggerEvent: Symbol('contract#contractFsmEventTriggerEvent'),

    /**
     * 合同状态机状态过度完成事件
     */
    ContractFsmStateTransitionCompletedEvent: Symbol('contract#contractFsmStateTransitionCompletedEvent')
}