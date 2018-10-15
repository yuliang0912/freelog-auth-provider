'use strict'

module.exports = class ContractEventTriggerHandler {

    constructor(app) {
        this.app = app
    }

    /**
     * 合同状态机事件触发处理
     * @param contractInfo
     * @param eventId
     */
    async handler(contractId, eventId) {
        await this.app.contractService.execContractFsmEvent(contractId, eventId)
            .catch(error => this.errorHandler(error, contractId, eventId))
    }

    /**
     * 错误处理
     */
    errorHandler(error, ...args) {
        this.app.logger.error('contract-event-trigger-handler', error, ...args)
    }
}