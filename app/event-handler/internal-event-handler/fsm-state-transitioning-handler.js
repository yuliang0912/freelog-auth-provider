'use strict'

const Patrun = require('patrun')
const contractStatusEnum = require('../../enum/contract-status-enum')
const RegisterFsmEventHelper = require('./lib/register-fsm-event-helper')
const {ContractFsmStateTransitionCompletedEvent} = require('../../enum/contract-fsm-event')

module.exports = class ContractFsmStateTransitioningEventHandler {

    constructor(app) {
        this.app = app
        this.patrun = Patrun()
        this.registerFsmEventHelper = new RegisterFsmEventHelper(app)
        this.contractProvider = app.dal.contractProvider
        this.eventRegisterProgressProvider = app.dal.eventRegisterProgressProvider
    }

    /**
     * 合同状态过渡前期处理
     * @param lifecycle
     */
    async handler(lifeCycle) {

        const contractInfo = lifeCycle.fsm.contract
        const {contractId} = contractInfo
        const fsmState = lifeCycle.to, prevFsmState = lifeCycle.from
        const allowedRegisterEvents = this.registerFsmEventHelper.getAllowedRegisterEvents(contractInfo, fsmState)

        //没有可注册的事件,则不需要执行锁与注册等操作 (先不考虑环境变量以及表达式等)
        if (!allowedRegisterEvents.length) {
            this.emitContractFsmStateTransitionCompletedEvent(contractInfo, fsmState, prevFsmState, lifeCycle.fsm.currEvent.eventId)
            //执行取消注册事件
            this.registerFsmEventHelper.registerAndUnregisterContractEvents({
                contractInfo, currentState: fsmState, prevFsmState
            })
            return
        }

        await this.contractProvider.updateOne({_id: contractId, 'contractClause.currentFsmState': prevFsmState}, {
            status: contractStatusEnum.locked, 'contractClause.currentFsmState': fsmState
        }).catch(error => this.errorHandler(error, lifeCycle))

        await this.eventRegisterProgressProvider.create({
            contractId,
            registeredEvents: [],
            allEvents: allowedRegisterEvents.map(x => x.eventId),
            attachInfo: {fsmState, prevFsmState, sourceEventId: lifeCycle.fsm.currEvent.eventId},
        }).catch(error => this.errorHandler(error, lifeCycle))

        this.registerFsmEventHelper.registerAndUnregisterContractEvents({
            contractInfo, currentState: fsmState, prevFsmState
        })

        //TODO: 前期: 1.合同加锁 2.获取环境变量值 3:计算表达式值 4:注册事件到注册中心
        //TODO: 中期: 1.等待事件全部注册成功  2.解锁合同
        //TODO: 后期: 1.修改合同状态  2:记录合同变更历史
    }

    /**
     * 发起合同状态机状态转换完成事件
     */
    emitContractFsmStateTransitionCompletedEvent(contractInfo, fsmState, prevFsmState, eventId) {
        this.app.emit(ContractFsmStateTransitionCompletedEvent, {
            contractInfo, currentState: fsmState, prevState: prevFsmState, eventId
        })
    }

    /**
     * 错误处理
     * @param error
     * @param message
     */
    errorHandler(error) {
        this.app.logger.error('fsm-state-transitioning-handler事件执行异常', error, ...arguments)
    }
}