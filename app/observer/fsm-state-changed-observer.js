/**
 * Created by yuliang on 2017/9/20.
 */
'use strict'

const baseObserver = require('./base-observer')
const globalInfo = require('egg-freelog-base/globalInfo')
/**
 * 合约状态变更观察者
 * @type {FsmStateChangedObserver}
 */

module.exports = class FsmStateChangedObserver extends baseObserver {

    constructor(subject) {
        super(subject)
    }


    async update(lifeCycle) {

        lifeCycle.fsm.contract.fsmState = lifeCycle.to

        let contractId = lifeCycle.fsm.contract.contractId

        //如果状态是激活状态,则合同未生效状态,否则为执行中状态
        let contractStatus =
            lifeCycle.fsm.contract.policySegment.activatedStates.some(t => t === lifeCycle.to) ? 3  //激活状态,则生效中
                : lifeCycle.fsm.contract.policySegment.terminateState === lifeCycle.to ? 6 : 2   //终止状态,则合同终止.否则执行中

        let task1 = globalInfo.app.dataProvider.contractProvider.updateContractFsmState(contractId, lifeCycle.to, contractStatus)
        let task2 = globalInfo.app.dataProvider.contractChangedHistoryProvider.addHistory(contractId, {
            fromState: lifeCycle.from,
            toState: lifeCycle.to,
            eventId: lifeCycle.fsm.currEvent.eventId || 'init',
            triggerDate: globalInfo.app.moment().toDate()
        })

        await Promise.all([task1, task2]).then(() => {
            console.log(`合同状态变更, from:${lifeCycle.from}, to:${lifeCycle.to}, contractId:${lifeCycle.fsm.contract.contractId}`)
            if (lifeCycle.from === 'none' && lifeCycle.fsm.contract.isFirst) {
                let eventName = `${globalInfo.app.event.contractEvent.initialContractEvent}_${contractId}`
                globalInfo.app.emit(eventName)
            }
        }).catch(console.error)
    }
}