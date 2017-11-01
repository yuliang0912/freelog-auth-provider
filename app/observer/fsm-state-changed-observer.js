/**
 * Created by yuliang on 2017/9/20.
 */
'use strict'

const baseObserver = require('./base-observer')

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

        let task1 = eggApp.dataProvider.contractProvider.updateContractFsmState(contractId, lifeCycle.to, 0)

        let task2 = eggApp.dataProvider.contractChangedHistoryProvider.addHistory(contractId, {
            fromState: lifeCycle.from,
            toState: lifeCycle.to,
            eventId: lifeCycle.fsm.currEvent.eventId || 'init',
            triggerDate: eggApp.moment().toDate()
        })

        await Promise.all([task1, task2]).then(() => {
            console.log(`合同状态变更, from:${lifeCycle.from}, to:${lifeCycle.to}, contractId:${lifeCycle.fsm.contract.contractId}`)
        }).catch(console.error)
    }
}