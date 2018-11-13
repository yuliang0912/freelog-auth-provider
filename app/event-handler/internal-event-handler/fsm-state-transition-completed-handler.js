'use strict'

const contractStatusEnum = require('../../enum/contract-status-enum')
const {PresentableConsumptionEvent} = require('../../enum/rabbit-mq-event')

/**
 * 状态机状态过渡完成事件处理
 */
module.exports = class ContractFsmTransitionCompletedHandler {

    constructor(app) {
        this.app = app
        this.contractProvider = app.dal.contractProvider
        this.contractChangedHistoryProvider = app.dal.contractChangedHistoryProvider
    }

    /**
     * 合同变更状态处理者
     * @param lifeCycle
     * @returns {Promise<void>}
     */
    async handler({contractInfo, prevState, currentState, eventId}) {

        const currentStateInfo = contractInfo.contractClause.fsmStates[currentState]

        if (currentStateInfo.authorization.some(x => x.toLocaleLowerCase() === 'active')) {
            contractInfo.status = contractStatusEnum.active
        }
        else if (Object.keys(currentStateInfo.transition).length === 1 && Object.keys(currentStateInfo.transition).some(x => x.toLowerCase() === 'terminate')) {
            contractInfo.status = contractStatusEnum.terminate
            contractInfo.isTerminate = 1
        } else {
            contractInfo.status = contractStatusEnum.suspended
        }

        if (contractInfo.status === contractStatusEnum.active && !contractInfo.isConsumptive) {
            contractInfo.isConsumptive = 1
            this.sendConsumptionEvent(contractInfo)
        }

        await this.saveContractStatusData({contractInfo, prevState, currentState, eventId})
    }

    /**
     * 同步合同状态变更数据
     */
    async saveContractStatusData({contractInfo, prevState, currentState, eventId}) {

        const {contractId, status, isConsumptive} = contractInfo

        const task1 = this.contractProvider.updateOne({_id: contractId,}, {status, isConsumptive})
        const task2 = this.contractChangedHistoryProvider.addHistory(contractId, {
            fromState: prevState, toState: currentState, eventId, triggerDate: new Date()
        })

        await Promise.all([task1, task2]).then(([updateStateResult, addHistoryResult]) => {
            if (updateStateResult.nModified === 0) {
                this.app.logger.error('fsm-event-change-history-handler事件执行执行更新状态操作异常', ...arguments)
            } else {
                console.log(`合同状态变更, from:${prevState}, to:${currentState}, contractId:${contractId}`)
            }
        }).catch(error => this.errorHandler(error))
    }

    /**
     * 发送消费事件
     */
    sendConsumptionEvent(contractInfo) {
        if (contractInfo.contractType === this.app.contractType.PresentableToUser) {
            this.app.rabbitClient.publish(Object.assign({}, PresentableConsumptionEvent, {
                body: {
                    presentableId: contractInfo.targetId,
                    consumptionDate: new Date(),
                    userContractId: contractInfo.contractId,
                    userId: contractInfo.partyTwoUserId,
                    nodeId: parseInt(contractInfo.partyOne)
                },
                options: {mandatory: true}
            }))
        }
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