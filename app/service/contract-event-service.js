'use strict'

const Service = require('egg').Service;

module.exports = class ContractEventService extends Service {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }
    
}