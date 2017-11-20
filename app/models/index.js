/**
 * Created by yuliang on 2017/7/25.
 */

'use strict'

const mongoose = require('mongoose')
const contract = require('./contract.model')
const presentable = require('./presentable.model')
const contractEventGroup = require('./contract.event.group.model')
const contractChangeHistroy = require('./contract.change.history.model')

module.exports = {

    /**
     * 合约model
     */
    contract,

    /**
     * 合同状态变更记录
     */
    contractChangeHistroy,

    /**
     * 合同事件分组
     */
    contractEventGroup,

    /**
     * 展示方案
     */
    presentable,

    /**
     * 自动生成mongose-objectId
     * @returns {*}
     * @constructor
     */
    get ObjectId() {
        return new mongoose.Types.ObjectId
    }
}