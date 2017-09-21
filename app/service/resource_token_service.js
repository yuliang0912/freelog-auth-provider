/**
 * Created by yuliang on 2017/8/31.
 */

'use strict'

const mongoModels = require('../models/index')

module.exports = app => {
    return class ResourceTokenService extends app.Service {

        createToken(model) {

            if (!this.app.type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }

            return mongoModels.resorceToken.create(model)

        }
    }
}