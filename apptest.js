/**
 * Created by yuliang on 2017/11/15.
 */

'use strict'

let GlobalApp = undefined

module.exports = {

    get app() {
        return GlobalApp
    },

    set app(app) {
        GlobalApp = app
    }
}