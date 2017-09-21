/**
 * Created by yuliang on 2017/9/20.
 */

'use strict'

const baseSubject = require('./base-subject')

module.exports = class ContractStateSubject extends baseSubject {

    constructor() {
        super()
    }

    /**
     * 通知观察者
     */
    notifyObservers(fsmLifeCycle) {
        this.observers.forEach(observer => {
            observer.update(fsmLifeCycle)
        })
    }

    /**
     * 合同状态机状态转移
     * @param model
     */
    contractFsmStateChanged(fsmLifeCycle) {
        this.notifyObservers(fsmLifeCycle)
    }
}
