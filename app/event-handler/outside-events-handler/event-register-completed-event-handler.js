'use strict'

const {ContractFsmStateTransitionCompletedEvent} = require('../../enum/contract-fsm-event')

/**
 * 之前注册到事件完成注册
 */
module.exports = class EventRegisterCompletedEventHandler {

    constructor(app) {
        this.app = app
        this.contractProvider = app.dal.contractProvider
        this.eventRegisterProgressProvider = app.dal.eventRegisterProgressProvider
    }

    /**
     * 事件注册完成
     */
    async handler({contractId, eventId}) {

        const contractInfo = await this.contractProvider.findById(contractId)
        if (!contractInfo.isLocked) {
            return
        }

        await this.eventRegisterProgressProvider.addRegisterCompletedEvent(contractId, contractInfo.contractClause.currentFsmState, eventId).then((registerProgress) => {
            return this.registerProgressHandler(registerProgress, contractInfo)
        })
    }

    /**
     * 注册进度信息处理
     * @param registerProgress
     */
    async registerProgressHandler(registerProgress, contractInfo, refreshCount = 0) {
        if (registerProgress.progress === 1) {
            this.app.emit(ContractFsmStateTransitionCompletedEvent, {
                contractInfo,
                prevState: registerProgress.attachInfo.prevState,
                currentState: registerProgress.attachInfo.fsmState,
                eventId: registerProgress.attachInfo.sourceEventId,
            })
            return
        }
        if (registerProgress.progress < 1 && refreshCount < 1) {
            this.refreshRegisterProgress(contractInfo, refreshCount)
        }
    }

    /**
     * 刷新事件注册进度
     * @param contractId
     * @param fsmState
     */
    refreshRegisterProgress(contractInfo, refreshCount) {
        setTimeout(() => {
            this.eventRegisterProgressProvider.findOne({contractId: contractInfo.contractId})
                .then(registerProgress => this.registerProgressHandler(registerProgress, contractInfo, refreshCount++))
        }, 2000)
    }

    /**
     * 错误处理
     */
    errorHandler(error, ...args) {
        this.app.logger.error('fsm-event-change-history-handler事件执行异常', error, ...args)
    }
}