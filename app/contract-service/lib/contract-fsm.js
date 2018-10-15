'use strict'

const StateMachine = require('javascript-state-machine')
const globalInfo = require('egg-freelog-base/globalInfo')
const {ContractFsmStateChangedEvent} = require('../../enum/contract-fsm-event')

module.exports = class ContractFsm {

    constructor(contractInfo) {
        this.contractInfo = contractInfo
        this.stateMachine = new StateMachine(this.fsmConfig)
        this.stateMachine.execEvent = this.execEvent
        return this.stateMachine
    }

    /**
     * 执行事件
     */
    async execEvent(event, ...otherArgs) {
        const {eventId} = event
        if (!Reflect.has(this, eventId)) {
            throw new Error(`无效的事件,${eventId}`)
        }
        if (this.cannot(eventId)) {
            throw new Error(`合同当前状态,不能执行${event.eventId}事件`)
        }
        this.currEvent = event
        this[eventId](...otherArgs)
        return true
    }

    /**
     * 状态机切换状态后的回调函数
     */
    onEnterState(lifeCycle) {

        if (this.contract.isFirst || lifeCycle.from !== 'none') {
            globalInfo.app.emit(ContractFsmStateChangedEvent, lifeCycle)
        }
    }

    /**
     * 根据合同信息生成状态机配置选项
     */
    get fsmConfig() {
        return {
            init: this.contractInfo.contractClause.currentFsmState,
            data: {
                contract: this.contractInfo,
                currEvent: {eventId: 'initial'}
            },
            transitions: this.fsmTransitions,
            methods: {onEnterState: this.onEnterState}
        }
    }

    /**
     * 状态机状态流转数据
     */
    get fsmTransitions() {
        return this.contractInfo.fsmEvents.map(event => new Object({
            name: event.eventId,
            form: event.currentState,
            to: event.nextState
        }))
    }
}