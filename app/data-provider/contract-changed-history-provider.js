/**
 * Created by yuliang on 2017/9/26.
 */

'use strict'

const mongoModels = require('../models/index')

module.exports = app => {
    return {

        /**
         * 新增记录
         * @param contractId
         * @param changeModel
         * @returns {Promise.<T>|Promise}
         */
        addHistory(contractId, changeModel)
        {
            return mongoModels.contractChangeHistroy.findOneAndUpdate({contractId: contractId}, {
                $addToSet: {histories: changeModel},
            }).then(changehistory => {
                if (!changehistory) {
                    return mongoModels.contractChangeHistroy.create({
                        contractId,
                        histories: [changeModel]
                    })
                }
                return changehistory
            }).catch(console.error)
        }
    }
}