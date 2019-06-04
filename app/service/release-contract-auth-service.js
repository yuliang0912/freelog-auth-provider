'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const authCodeEnum = require('../enum/auth-code')
const {ArgumentError, ApplicationError} = require('egg-freelog-base/error')
const authService = require('../authorization-service/process-manager')
const commonAuthResult = require('../authorization-service/common-auth-result')

module.exports = class ReleaseContractAuthService extends Service {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * presentable发行侧授权
     * @param presentableInfo
     * @param presentableAuthTree
     * @returns {Promise<void>}
     */
    async presentableReleaseSideAuth(presentableInfo, presentableAuthTree) {

        const {ctx} = this
        const {authTree} = presentableAuthTree
        const releaseSchemeIds = lodash.chain(authTree).map(x => x.releaseSchemeId).uniq().value()
        const releaseSchemes = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/versions/list?projection=resolveReleases&schemeIds=${releaseSchemeIds.toString()}`)

        const allSchemeContractIds = []
        for (let i = 0, j = releaseSchemes.length; i < j; i++) {
            let {schemeId, resolveReleases} = releaseSchemes[i]
            let dependencies = authTree.filter(x => x.parentReleaseSchemeId === schemeId)
            let practicalAuthReleases = resolveReleases.filter(x => dependencies.some(m => m.releaseId === x.releaseId))
            releaseSchemes[i].resolveReleases = practicalAuthReleases
            practicalAuthReleases.forEach(({releaseId, contracts}) => contracts.forEach(({contractId}) => {
                if (!contractId) {
                    throw new ApplicationError(ctx.gettext('scheme-contract-lose-error'), {schemeId, releaseId})
                }
                allSchemeContractIds.push(contractId)
            }))
        }

        const contracts = await this.contractProvider.find({_id: {$in: allSchemeContractIds}})
        const userIds = lodash.chain(contracts).map(x => x.partyTwoUserId).uniq().value()
        const partyTwoUserInfoMap = await ctx.curlIntranetApi(`${ctx.webApi.userInfo}?userIds=${userIds.toString()}`)
            .then(list => new Map(list.map(x => [x.userId, x])))
        const contractMap = new Map(contracts.map(x => [x.contractId, x]))

        return this.releaseSchemesAuth(releaseSchemes, contractMap, partyTwoUserInfoMap)
    }

    
    async releaseSchemeSideAuth() {

    }

    /**
     * 针对方形的方案进行授权
     * @param releaseSchemes 调用方自动去除实际未依赖的发行
     * @param contractMap
     * @param userInfoMap
     * @returns {Promise<module.CommonAuthResult|*>}
     */
    async releaseSchemesAuth(releaseSchemes, contractMap, userInfoMap) {

        let {ctx} = this, index = 0
        const authorizedReleaseSet = new Set() //授权通过的方案-发行
        const returnAuthResult = new commonAuthResult(authCodeEnum.BasedOnResourceContract)

        while (true) {
            let batchContracts = []
            for (let x = 0, y = releaseSchemes.length; x < y; x++) {
                let {schemeId, resolveReleases} = releaseSchemes[x]
                for (let m = 0, n = resolveReleases.length; m < n; m++) {
                    let {releaseId, contracts} = resolveReleases[m]
                    if (contracts.length - 1 >= index && !authorizedReleaseSet.has(schemeId + releaseId)) {
                        batchContracts.push(contractMap.get(contracts[index].contractId))
                    }
                }
            }
            if (!batchContracts.length) {
                break
            }
            if (batchContracts.some(x => x === undefined)) {
                throw new ArgumentError(ctx.gettext('params-validate-failed', 'contractMap'))
            }
            const nodeContractAuthTasks = batchContracts.map(contract => {
                let partyTwoUserInfo = userInfoMap.get(contract.partyTwoUserId)
                return !Reflect.has(contract, 'isAuth') ? authService.contractAuthorization(ctx, {
                    contract, partyTwoUserInfo
                }).then(authResult => contract.isAuth = authResult.isAuth) : undefined
            })

            await Promise.all(nodeContractAuthTasks)

            for (let x = 0, y = releaseSchemes.length; x < y; x++) {
                let {schemeId, resolveReleases} = releaseSchemes[x]
                for (let m = 0, n = resolveReleases.length; m < n; m++) {
                    let {releaseId, contracts} = resolveReleases[m]
                    if (!authorizedReleaseSet.has(schemeId + releaseId) && contracts.some(m => contractMap.get(m.contractId).isAuth)) {
                        authorizedReleaseSet.add(schemeId + releaseId)
                    }
                }
            }
            index++
        }

        const authFailedReleaseSchemes = releaseSchemes.filter(({schemeId, resolveReleases}) => resolveReleases.some(m => !authorizedReleaseSet.has(schemeId + m.releaseId)))
        if (authFailedReleaseSchemes.length) {
            returnAuthResult.data = authFailedReleaseSchemes
            returnAuthResult.authCode = authCodeEnum.ResourceContractNotActive
        }

        return returnAuthResult
    }
}