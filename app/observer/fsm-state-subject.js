/**
 * Created by yuliang on 2017/9/20.
 */

'use strict'

const baseSubject = require('./base-subject')

module.exports = class ContractStateSubject extends baseSubject {

    /**
     * 合同状态机状态转移
     * @param model
     */
    contractFsmStateChanged(fsmLifeCycle) {
        this.notifyObservers(fsmLifeCycle)
    }
}
