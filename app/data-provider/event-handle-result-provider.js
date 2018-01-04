'use strict'

const mongoModels = require('../models/index')

module.exports = app => {

    const {type} = app

    return {
        /**
         * 创建合约
         * @param model
         * @returns {Promise.<TResult>}
         */
        create(model) {

            if (!type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }

            return mongoModels.authEventHandleResult.create(model)
        },

        /**
         * 获取数量
         * @param condition
         * @returns {Promise.<*>|Promise}
         */
        getCount(condition) {

            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return mongoModels.authEventHandleResult.count(condition).exec()
        }
    }
}
