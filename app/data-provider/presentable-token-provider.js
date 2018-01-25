/**
 * Created by yuliang on 2017/11/15.
 */

'use strict'

const mongoModels = require('../models/index')

module.exports = app => {

    const {type} = app

    return {

        /**
         * 创建token
         * @param model
         * @returns {*}
         */
        createResourceToken(model) {

            if (!type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }

            return mongoModels.presentableToken.create(model)
        },

        /**
         * 获取最新的token
         * @param presentable
         * @param userId
         */
        getLatestResourceToken(presentableId, userId) {

            let expire = Math.round(new Date().getTime() / 1000) + 5

            return mongoModels.presentableToken.findOne({
                presentableId,
                userId,
                expire: {$gt: expire}
            }).sort({exprie: 'desc'}).exec()
        }
    }
}