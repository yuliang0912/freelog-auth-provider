/**
 * Created by yuliang on 2017/9/20.
 */

'use strict'

module.exports = class freelogFetch {

    constructor() {
        this.requestMiddleware = []
        this.responseMiddleware = []
    }

    use(middleware) {
        middleware.req && this.requestMiddleware.push(middleware.req)
        middleware.res && this.responseMiddleware.unshift(middleware.res)
        return this;
    }

    fetch(req) {
        return compose(this.requestMiddleware)(req).then(req => {
            console.log('此处是middleware-reqs执行完之后的结果', req.array)
            //实际调用是retutn window.fetch(req)
            return Promise.resolve({data: '假设此处是fetch返回的数据'})
        }).then(response => {
            return compose(this.responseMiddleware)(response)
        }).then(response => {
            console.log('此处是middleware-res执行完之后的结果', response.array)
            return response
        })
    }
}

function compose(middleware) {
    return function (ctx) {
        let index = -1
        return dispatch(0)
        function dispatch(i) {
            index = i
            let fn = middleware[i]
            if (!fn)
                return Promise.resolve(ctx)
            try {
                return Promise.resolve(((func) => {
                    func(ctx)
                    return dispatch(i + 1)
                })(fn))
            } catch (err) {
                return Promise.reject(err)
            }
        }
    }
}





