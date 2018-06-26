/**
 * Created by yuliang on 2017/9/26.
 */

'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class ContractChangeHistoryProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.ContractChangeHistory)
    }

    /**
     * 新增记录
     * @param contractId
     * @param changeModel
     * @returns {Promise.<T>|Promise}
     */
    addHistory(contractId, changeModel) {

        return super.findOneAndUpdate({contractId: contractId}, {
            $addToSet: {histories: changeModel},
        }).then(changeHistory => {
            if (!changeHistory) {
                return super.create({contractId, histories: [changeModel]})
            }
            changeHistory.histories.push(changeModel)
            return changeHistory
        })
    }
}