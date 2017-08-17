/**
 * Created by yuliang on 2017/7/25.
 */

'use strict'

const contract = require('./contract.model')
const mongoose = require('mongoose')

module.exports = {
    contract,
    get ObjectId() {
        return new mongoose.Types.ObjectId
    }
}