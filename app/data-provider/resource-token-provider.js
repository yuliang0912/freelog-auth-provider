/**
 * Created by yuliang on 2017/11/1.
 */
'use strict'

const mongoModels = require('../models/index')

module.exports = app => {

    const {type} = app

    return  {

        /**
         * 创建token
         * @param model
         * @returns {*}
         */
        createToken(model) {

            if (!type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }

            return mongoModels.resorceToken.create(model)
        }
    }
}