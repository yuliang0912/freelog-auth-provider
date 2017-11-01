/**
 * Created by yuliang on 2017/10/9.
 */

'use strict'

const mongoModels = require('../models/index')

module.exports = app => {

    return {
        /**
         * 注册分组事件
         */
        registerEventGroup(eventGroup){
            return mongoModels.contractEventGroup.findOneAndUpdate({
                contractId: eventGroup.contractId,
                groupEventId: eventGroup.groupEventId
            }, {
                taskEvents: eventGroup.taskEvents,
                executedEvents: []
            }).then(model => {
                if (!model) {
                    return mongoModels.contractEventGroup.create(eventGroup)
                }
                return model
            }).catch(console.error)
        },

        /**
         * 执行子事件
         * @param contractId
         * @param groupEventId
         * @param subEventId
         */
        executeSubEvent(contractId, groupEventId, subEventId){
            return mongoModels.contractEventGroup.update({contractId: contractId, groupEventId: groupEventId}, {
                $addToSet: {executedEvents: subEventId},
            })
        },

        /**
         * 删除事件分组
         */
        deletEventGroup(contractId, groupEventId){
            return mongoModels.contractEventGroup.deleteOne({contractId: contractId, groupEventId: groupEventId}).exec()
        },

        /**
         * 更新事件分组
         * @param condition
         * @param model
         */
        updateEventGroup(condition, model){
            return mongoModels.contractEventGroup.update(condition, model)
        },

        /**
         * 查询单个事件分组
         * @param condition
         * @returns {Promise}
         */
        getEventGroup(condition){
            return mongoModels.contractEventGroup.findOne(condition).exec()
        }
    }
}