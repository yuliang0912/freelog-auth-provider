/**
 * 针对用户对象或者节点对象的分组认证规则
 */

'use strict'
const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth_code')
const globalInfo = require('egg-freelog-base/globalInfo')
const authErrorCodeEnum = require('../../enum/auth_err_code')
const commonRegex = require('egg-freelog-base/app/extend/helper/common_regex')

module.exports = async ({authUserObject, contractType, partyTwoInfo, partyTwoUserInfo}) => {

    const app = globalInfo.app
    const authResult = new AuthResult(authCodeEnum.Default)

    //如果没有分组认证的策略,则默认返回
    if (!authUserObject || authUserObject.userType.toUpperCase() !== 'GROUP') {
        return authResult
    }

    //如果存在所有访问者分组,则通过
    if (authUserObject.users.some(item => item.toUpperCase() === 'PUBLIC')) {
        authResult.authCode = authCodeEnum.BasedOnGroup
        return authResult
    }

    if (contractType === app.contractType.ResourceToNode && (!partyTwoInfo || !Reflect.has(partyTwoInfo, 'nodeId'))) {
        throw new Error('user-or-node-group-rule Error:乙方节点信息缺失')
    }

    if (!partyTwoUserInfo) {
        throw new Error('user-or-node-group-rule Error:乙方用户身份信息缺失')
    }

    //如果分组策略中允许所有节点签约,并且存在节点信息
    if (contractType === app.contractType.ResourceToNode && authUserObject.users.some(item => item.toUpperCase() === 'NODES')) {
        authResult.authCode = authCodeEnum.BasedOnGroup
        return authResult
    }

    //所有登录用户都可以访问,则通过
    if (contractType === app.contractType.PresentableToUer && authUserObject.users.some(item => item.toUpperCase() === 'REGISTERED_USERS')) {
        authResult.authCode = authCodeEnum.BasedOnGroup
        return authResult
    }

    /**
     * TODO  A.检查节点是否在用户的自定义节点组中
     * TODO  B.检查节点所属人是否在用户的自定义用户分组中.
     * TODO  满足A或者B任意条件则通过认证
     * @type {T[]}
     */
    const isExistMember = async (groups, memberId) => {
        if (!groups.length) {
            return false
        }
        const existGroups = await app.curl(`${app.webApi.groupInfo}/isExistMember?memberId=${memberId}&groupIds=${groups.toString()}`, {dataType: 'json'}).then(res => {
            return res.data.data
        })
        return Array.isArray(existGroups) && existGroups.length
    }

    //校验乙方是否在自定义的节点分组中
    if (contractType === app.contractType.ResourceToNode) {
        const customNodeGroups = authUserObject.users.filter(item => commonRegex.nodeGroupId.test(item))
        if (await isExistMember(customNodeGroups, partyTwoInfo.nodeId)) {
            authResult.authCode = authCodeEnum.BasedOnGroup
            return authResult
        }
    }

    //校验乙方的用户主体是否在自定义的用户分组中
    const customUserGroups = authUserObject.users.filter(item => commonRegex.userGroupId.test(item))
    if (await isExistMember(customUserGroups, partyTwoUserInfo.userId)) {
        authResult.authCode = authCodeEnum.BasedOnGroup
        return authResult
    }

    //其他分组默认不通过
    authResult.authCode = authCodeEnum.UserObjectUngratified
    authResult.authErrCode = authErrorCodeEnum.identityAuthenticationRefuse
    authResult.data.authUserObject = authUserObject

    return authResult
}