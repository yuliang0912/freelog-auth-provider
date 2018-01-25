/**
 * Created by yuliang on 2017/11/14.
 */

'use strict'

const authCodeSymbol = Symbol('freelog-auth-code')
const authErrCodeSymbol = Symbol('freelog-auth-err-code')
const authCodeEnum = require('../enum/auth_code')
const authErrCodeEnum = require('../enum/auth_err_code')

const allAuthCodeEnumValues = Object.values(authCodeEnum)
const allAuthErrorEnumValues = Object.values(authErrCodeEnum)
module.exports = class CommonAuthResult {

    constructor(authCode) {
        this.authCode = authCode
        this.authErrCode = authErrCodeEnum.success
        this.data = {}
        this.errors = []
    }

    /**
     * 添加错误信息
     * @param error
     */
    addError(error) {
        this.errors.push(error)
    }

    /**
     * 设置授权码
     * @param authCode
     */
    set authCode(authCode) {
        if (!allAuthCodeEnumValues.some(t => t === authCode)) {
            throw new Error(`authCode:${authCode}不在可支持的枚举范围内`)
        }
        this[authCodeSymbol] = authCode
    }

    /**
     * 读取授权码
     * @returns {*}
     */
    get authCode() {
        return this[authCodeSymbol]
    }

    /**
     * 读取授权码
     * @returns {*}
     */
    get authErrCode() {
        return this[authErrCodeSymbol]
    }

    /**
     * 设置授权错误码
     * @param authErrCode
     */
    set authErrCode(authErrCode) {
        if (!allAuthErrorEnumValues.some(t => t === authErrCode)) {
            throw new Error(`authErrCode:${authErrCode}不在可支持的枚举范围内`)
        }
        this[authErrCodeSymbol] = authErrCode
    }

    /**
     * 是否授权通过
     * @returns {boolean}
     */
    get isAuth() {
        return this.authCode === authCodeEnum.BasedOnUserContract
            || this.authCode === authCodeEnum.BasedOnNodeContract
            || this.authCode === authCodeEnum.BasedOnNodePolicy
            || this.authCode === authCodeEnum.BasedOnResourcePolicy
            || this.authCode === authCodeEnum.BasedOnIndividuals
            || this.authCode === authCodeEnum.BasedOnGroup
            || this.authCode === authCodeEnum.BasedOnUserObjectAuth
    }

    toObject() {
        return {
            isAuth: this.isAuth,
            authCode: this.authCode,
            authErrCode: this.authErrCode,
            data: this.data,
            errors: this.errors
        }
    }
}