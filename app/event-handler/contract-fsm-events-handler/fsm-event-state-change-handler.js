'use strict'

const contractStatusEnum = require('../../enum/contract-status-enum')

module.exports = class ContractFsmStateChangedEventHandler {

    constructor(app) {
        this.app = app
    }

    /**
     * 合同变更状态处理者
     * @param lifeCycle
     * @returns {Promise<void>}
     */
    async handler(lifeCycle) {
        return this.saveContractStateChangedHistory(lifeCycle)
    }

    /**
     * 保持合同状态变更历史记录
     * @param lifeCycle
     */
    async saveContractStateChangedHistory(lifeCycle) {

        const {app} = this
        const {contract} = lifeCycle.fsm
        const {contractId, contractClause, isFirst} = contract
        const {contractProvider, contractChangedHistoryProvider} = app.dal
        const currentState = contractClause.fsmStates[lifeCycle.to]

        if (currentState.authorization.some(x => x === 'active')) {
            contract.status = contractStatusEnum.active
        }
        else if (!Object.keys(currentState.transition).length) {
            contract.status = contractStatusEnum.terminate
            contract.isTerminate = 1
        } else {
            contract.status = contractStatusEnum.suspended
        }

        const task1 = contractProvider.updateContractFsmState({
            contractId,
            oldFsmState: lifeCycle.from,
            fsmState: lifeCycle.to,
            status: contract.status
        })

        const task2 = contractChangedHistoryProvider.addHistory(contractId, {
            fromState: lifeCycle.from,
            toState: lifeCycle.to,
            eventId: lifeCycle.fsm.currEvent.eventId || 'init',
            triggerDate: new Date()
        })

        await Promise.all([task1, task2]).then(([updateStateResult, addHistoryResult]) => {
            if (lifeCycle.from === 'none' && isFirst) {
                app.emit(`initialContractEvent_${contractId}`)
            }
            lifeCycle.fsm.contract.fsmState = lifeCycle.to
            if (updateStateResult.nModified === 0) {
                this.app.logger.error('fsm-event-change-history-handler事件执行执行更新状态操作异常', {
                    contractId, lifeCycle
                })
            } else {
                console.log(`合同状态变更, from:${lifeCycle.from}, to:${lifeCycle.to}, contractId:${contractId}`)
            }
        }).catch(error => this.errorHandler(error, lifeCycle))
    }

    /**
     * 错误处理
     * @param error
     * @param message
     */
    errorHandler(error, message) {
        this.app.logger.error('fsm-event-state-change-handler事件执行异常', error, message)
    }
}