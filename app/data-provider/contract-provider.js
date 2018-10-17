/**
 * Created by yuliang on 2017/9/26.
 */

'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class ContractProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.Contract)
    }

    /**
     * 更新合约状态
     */
    updateContractFsmState({contractId, oldFsmState, fsmState, status}) {
        return super.updateOne({_id: contractId, fsmState: oldFsmState}, {fsmState, status})
    }
}