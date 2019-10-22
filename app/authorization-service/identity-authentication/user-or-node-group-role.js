'use strict'

const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth-code')
const commonRegex = require('egg-freelog-base/app/extend/helper/common_regex')
const {ArgumentError} = require('egg-freelog-base/error')

module.exports = class UserOrNodeGroupRoleAuthHandler {

    constructor(app) {
        this.app = app
    }

    /**
     * 用户分组或者节点分组授权
     * @param authUserObject
     * @param partyTwoInfo
     * @param partyTwoUserInfo
     * @returns {Promise<module.CommonAuthResult|*>}
     */
    async handle({authUserObject, partyTwoInfo, partyTwoUserInfo}) {

        const authResult = new AuthResult(authCodeEnum.Default, {authUserObject, partyTwoInfo, partyTwoUserInfo})

        if (!authUserObject || authUserObject.userType.toUpperCase() !== 'GROUP') {
            return authResult
        }

        const {users} = authUserObject
        if (users.some(x => /^PUBLIC$/i.test(x))) {
            authResult.authCode = authCodeEnum.BasedOnGroup
            return authResult
        }

        if (partyTwoInfo && !Reflect.has(partyTwoInfo, 'nodeId')) {
            throw new ArgumentError('user-node-group-role-params-validate-failed: partyTwoInfo', {partyTwoInfo})
        }
        if (partyTwoUserInfo && !Reflect.has(partyTwoInfo, 'userId')) {
            throw new ArgumentError('user-node-group-role-params-validate-failed: partyTwoUserInfo')
        }

        if (partyTwoInfo && users.some(x => /^NODES$/i.test(x))) {
            authResult.authCode = authCodeEnum.BasedOnGroup
            return authResult
        }
        if (partyTwoUserInfo && users.some(x => /^REGISTERED_USERS$/i.test(x))) {
            authResult.authCode = authCodeEnum.BasedOnGroup
            return authResult
        }

        //校验乙方是否在自定义的节点分组中
        if (partyTwoInfo) {
            const customNodeGroups = users.filter(item => commonRegex.nodeGroupId.test(item))
            if (await this._isExistMemberInGroup(customNodeGroups, partyTwoInfo.nodeId)) {
                authResult.authCode = authCodeEnum.BasedOnCustomGroup
                return authResult
            }
        }

        //校验乙方的用户主体是否在自定义的用户分组中
        if (partyTwoUserInfo) {
            const customUserGroups = users.filter(item => commonRegex.userGroupId.test(item))
            if (await this._isExistMemberInGroup(customUserGroups, partyTwoUserInfo.userId)) {
                authResult.authCode = authCodeEnum.BasedOnCustomGroup
                return authResult
            }
        }

        //其他分组默认不通过
        authResult.authCode = authCodeEnum.PolicyIdentityAuthenticationFailed

        return authResult
    }

    /**
     * 查询成员是否在指定的分组中
     * @param groups
     * @param memberId
     * @returns {Promise<*>}
     * @private
     */
    async _isExistMemberInGroup(groups, memberId) {
        if (!groups.length) {
            return false
        }
        const existGroups = await this.app.curlIntranetApi(`${this.app.webApi.groupInfo}/isExistMember?memberId=${memberId}&groupIds=${groups.toString()}`)
        return Array.isArray(existGroups) && existGroups.length
    }
}

//
// const isExistMember = async (ctx, groups, memberId) => {
//     if (!groups.length) {
//         return false
//     }
//     const existGroups = await ctx.curlIntranetApi(`${ctx.webApi.groupInfo}/isExistMember?memberId=${memberId}&groupIds=${groups.toString()}`)
//     return Array.isArray(existGroups) && existGroups.length
// }
//
// module.exports = async (ctx, {authUserObject, partyTwoInfo, partyTwoUserInfo}) => {
//
//     const authResult = new AuthResult(authCodeEnum.Default, {
//         authUserObject, partyTwoInfo, partyTwoUserInfo
//     })
//
//     if (!authUserObject || authUserObject.userType.toUpperCase() !== 'GROUP') {
//         return authResult
//     }
//
//     const {users} = authUserObject
//     if (users.some(x => /^PUBLIC$/i.test(x))) {
//         authResult.authCode = authCodeEnum.BasedOnGroup
//         return authResult
//     }
//
//     if (partyTwoInfo && !Reflect.has(partyTwoInfo, 'nodeId')) {
//         throw new ArgumentError(ctx.gettext('params-validate-failed', 'partyTwoInfo'), {partyTwoInfo})
//     }
//     if (partyTwoUserInfo && !Reflect.has(partyTwoInfo, 'userId')) {
//         throw new ArgumentError(ctx.gettext('params-validate-failed', 'partyTwoUserInfo'))
//     }
//
//     if (partyTwoInfo && users.some(x => /^NODES$/i.test(x))) {
//         authResult.authCode = authCodeEnum.BasedOnGroup
//         return authResult
//     }
//     if (partyTwoUserInfo && users.some(x => /^REGISTERED_USERS$/i.test(x))) {
//         authResult.authCode = authCodeEnum.BasedOnGroup
//         return authResult
//     }
//
//     //校验乙方是否在自定义的节点分组中
//     if (partyTwoInfo) {
//         const customNodeGroups = users.filter(item => commonRegex.nodeGroupId.test(item))
//         if (await isExistMember(ctx, customNodeGroups, partyTwoInfo.nodeId)) {
//             authResult.authCode = authCodeEnum.BasedOnCustomGroup
//             return authResult
//         }
//     }
//
//     //校验乙方的用户主体是否在自定义的用户分组中
//     if (partyTwoUserInfo) {
//         const customUserGroups = users.filter(item => commonRegex.userGroupId.test(item))
//         if (await isExistMember(customUserGroups, partyTwoUserInfo.userId)) {
//             authResult.authCode = authCodeEnum.BasedOnCustomGroup
//             return authResult
//         }
//     }
//
//     //其他分组默认不通过
//     authResult.authCode = authCodeEnum.PolicyIdentityAuthenticationFailed
//
//     return authResult
// }