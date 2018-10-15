'use strict'

/**
 * 之前注册到事件中的事件触发了
 * @type {module.RegisteredEventTriggerHandler}
 */
module.exports = class RegisteredEventTriggerEventHandler {

    constructor(app) {
        this.app = app
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * 事件中心注册的事件触发了
     */
    async handler({contractId, eventId}) {
        this.app.contractService.execContractFsmEvent(contractId, eventId)
            .catch(error => this.errorHandler(error, contractId, eventId))
    }

    /**
     * 错误处理
     */
    errorHandler(error, ...args) {
        this.app.logger.error('fsm-event-change-history-handler事件执行异常', error, ...args)
    }
}