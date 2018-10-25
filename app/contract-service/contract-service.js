'use strict'

const Patrun = require('patrun')
const lodash = require('lodash')
const ContractFsm = require('./lib/contract-fsm')
const {ApplicationError} = require('egg-freelog-base/error')
const GenerateContract = require('./lib/generate-contract')
const contractStatusEnum = require('../enum/contract-status-enum')
const contractServiceSymbol = Symbol.for('auth#contractServiceSymbol')
const LicenseSignHandler = require('./singleton-event-handler/sign-license')
const ContractPaymentHandler = require('./singleton-event-handler/contract-payment')
const EscrowConfiscatedHandler = require('./singleton-event-handler/escrow-confiscated')
const EscrowRefundedHandler = require('./singleton-event-handler/escrow-refunded-event')

module.exports = class ContractService {

    constructor(app) {
        this.app = app
        this.patrun = Patrun()
        this.contractProvider = app.dal.contractProvider
        this.generateContractService = new GenerateContract(app)
        this.__registerSingletonEventHandler()
        app[contractServiceSymbol] = this
    }

    /**
     * 创建合同
     */
    async createContract(contractBaseInfo, isInitial = true) {

        contractBaseInfo._id = contractBaseInfo.contractId = this.app.mongoose.getNewObjectId()
        const contractInfo = await this.generateContractService.generateContract(contractBaseInfo).then(contractInfo => {
            return this.contractProvider.create(contractInfo)
        })
        if (isInitial) {
            this.initialContractFsm(contractInfo)
        }
        if (contractBaseInfo.isDefault) {
            this.contractProvider.updateOne(lodash.pick(contractInfo, ['targetId', 'partyTwo', 'contractType']), {isDefault: 0})
        }
        return contractInfo
    }

    /**
     * 批量创建合约
     * @returns {Promise<void>}
     */
    async batchCreateContract(contractBaseInfos, isInitial = true) {

        const generateContractTasks = []
        for (var i = 0, j = contractBaseInfos.length; i < j; i++) {
            const contractBaseInfo = contractBaseInfos[i]
            contractBaseInfo._id = contractBaseInfo.contractId = this.app.mongoose.getNewObjectId()
            generateContractTasks.push(this.generateContractService.generateContract(contractBaseInfo))
        }

        const generateContracts = await Promise.all(generateContractTasks)
        return this.contractProvider.insertMany(generateContracts).tap(contracts => {
            isInitial && contracts.forEach(contractInfo => this.initialContractFsm(contractInfo))
        })
    }

    /**
     * 单例事件处理
     */
    async singletonEventHandler({contractInfo, eventInfo, userInfo}) {

        if (!userInfo || contractInfo.partyOneUserId !== userInfo.userId && contractInfo.partyTwoUserId !== userInfo.userId) {
            throw new ApplicationError(`当前用户没有操作权限`)
        }
        if (contractInfo.status === contractStatusEnum.locked) {
            throw new ApplicationError(`系统正在计算合同数据,请稍后再试`)
        }
        if (!eventInfo.code.startsWith('S')) {
            throw new ApplicationError(`非单例事件,错误的调用`)
        }

        const singletonEventHandler = this.patrun.find({eventCode: eventInfo.code})
        if (!singletonEventHandler) {
            throw new ApplicationError(`单例事件处理函数不支持当前事件`)
        }

        return singletonEventHandler.handler(...arguments)
    }

    /**
     * 初始化合同状态机
     * @param contractInfo
     */
    initialContractFsm(contractInfo) {

        if (contractInfo.status !== contractStatusEnum.uninitialized) {
            throw new ApplicationError('合同已经激活,不能重复操作')
        }

        const initialState = Object.keys(contractInfo.contractClause.fsmStates).find(x => /^(init|initial)$/i.test(x))
        contractInfo.isFirst = true
        contractInfo.contractClause.currentFsmState = initialState

        //初始化合同状态机数据,首次自动把合同状态从none变更为initial
        return new ContractFsm(contractInfo)
    }

    /**
     * 合同能否执行指定事件
     * @param contractInfo
     * @param eventId
     */
    isCanExecEvent(contractInfo, eventId) {

        const contractFsm = new ContractFsm(contractInfo)

        if (contractInfo.status === contractStatusEnum.locked) {
            return false
        }

        return contractFsm.can(eventId)
    }


    /**
     * 执行合同状态机事件
     * @param contractInfo
     * @param eventId
     */
    async execContractEvent(contractInfo, eventId) {

        //TODO:后期合同状态考虑使用REDIS分布式锁来实现,然后把分布式状态与合同状态进行对比
        const contractFsm = new ContractFsm(contractInfo)

        if (contractInfo.status === contractStatusEnum.locked) {
            return new ApplicationError('合同已被锁定,暂时无法执行', {contractInfo, eventId})
        }
        if (contractFsm.cannot(eventId)) {
            return new ApplicationError(`合同${contractInfo.contractId}不能执行指定事件${eventId}`, {contractInfo, eventId})
        }

        return contractFsm.execEvent({eventId})
    }

    /**
     * 执行合同事件
     * @param contractId
     * @param eventId
     * @returns {Promise<*>}
     */
    async execContractFsmEvent(contractId, eventId) {

        //TODO:后期合同状态考虑使用REDIS分布式锁来实现
        const contractInfo = await this.contractProvider.findById(contractId)
        const contractFsm = new ContractFsm(contractInfo)

        if (contractInfo.status === contractStatusEnum.locked) {
            return new ApplicationError('合同已被锁定,暂时无法执行', {contractInfo, eventId})
        }

        return contractFsm.execEvent({eventId})
    }

    /**
     * 注册单例事件处理者
     * @private
     */
    __registerSingletonEventHandler() {

        const {app, patrun} = this

        patrun.add({eventCode: "S101"}, new LicenseSignHandler(app))
        patrun.add({eventCode: "S201"}, new ContractPaymentHandler(app))
        patrun.add({eventCode: "S210"}, new ContractPaymentHandler(app))
        patrun.add({eventCode: "S211"}, new EscrowConfiscatedHandler(app))
        patrun.add({eventCode: "S212"}, new EscrowRefundedHandler(app))

    }
}

