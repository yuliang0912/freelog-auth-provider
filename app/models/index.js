/**
 * Created by yuliang on 2017/7/25.
 */

'use strict'

const mongoose = require('mongoose')
const contract = require('./contract.model')
const resorceToken = require('./resource.token')

module.exports = {

    /**
     * 合约model
     */
    contract,

    /**
     * 资源授权toeken
     */
    resorceToken,

    /**
     * 自动生成mongose-objectId
     * @returns {*}
     * @constructor
     */
    get ObjectId() {
        return new mongoose.Types.ObjectId
    }
}