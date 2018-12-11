'use strict'

const Service = require('egg').Service;
const authService = require('../authorization-service/process-manager')
const {LogicError, ArgumentError, ApplicationError} = require('egg-freelog-base/error')

class SignAuthService extends Service {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * presentable签约授权校验
     * @param presentableId
     * @returns {Promise<*>}
     */
    async presentableSignAuth(presentableId) {

        const {ctx} = this
        const presentableAuthTree = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/presentableTree/${presentableId}`)
        if (!presentableAuthTree || !presentableAuthTree.authTree.length) {
            throw new ArgumentError('未找到节点资源签署的有效的合约信息')
        }
        const presentableContractIds = presentableAuthTree.authTree.map(x => x.contractId)
        const presentableContracts = await this.contractProvider.find({_id: {$in: presentableContractIds}})
        return this._checkSignAuth(presentableContracts, presentableAuthTree.masterResourceId)
    }

    /**
     * 资源签约授权校验
     * @param authSchemeId
     * @returns {Promise<*>}
     */
    async resourceSignAuth(authSchemeId) {

        const {ctx} = this
        const authSchemeAuthTree = await ctx.curlIntranetApi(`${ctx.webApi.resourceInfo}/authSchemes/schemeAuthTree/${authSchemeId}`)
        if (!authSchemeAuthTree) {
            throw new ArgumentError('未找到资源签署的有效的合约信息')
        }
        if (!authSchemeAuthTree.authTree.length) {
            return []
        }
        const authSchemeContractIds = authSchemeAuthTree.authTree.map(x => x.contractId)
        const authSchemeContracts = await this.contractProvider.find({_id: {$in: authSchemeContractIds}})
        return this._checkSignAuth(authSchemeContracts)
    }


    /**
     * 检查签约授权
     * @param contracts
     * @private
     */
    async _checkSignAuth(contracts, masterResourceId = null) {

        const {app} = this, result = []
        for (let i = 0, j = contracts.length; i < j; i++) {
            let signAuthResult = null
            let contract = contracts[i].toObject()
            if (contract.contractType === app.contractType.ResourceToNode && contract.resourceId === masterResourceId) {
                signAuthResult = await authService.resourcePresentableSignAuth(contract)
            }
            else {
                signAuthResult = await authService.resourceReContractableSignAuth(contract)
            }
            contract.signAuthResult = signAuthResult
            result.push(contract)
        }

        return result
    }
}

module.exports = SignAuthService