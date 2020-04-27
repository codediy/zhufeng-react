import { ELEMENT_TEXT } from "./constant";

/**
 * 创建元素（虚拟DOM）
 * @param {} type 元素的类型 div span p
 * @param {*} config 配置对象 属性 key ref
 * @param  {...any} children 放着所有的儿子，做成一个数组。
 */
function createElement(type,config, ...children){
    // 删除不必要的属性，简化代码
    delete config.__self;
    delete config.__source;
    return {
        type,
        props: {
            ...config,
            children:children.map(child => {
                return typeof child === 'object'? child: {
                    type: ELEMENT_TEXT,
                    props: {
                        text: child,
                        children: []
                    }
                }
            })
        }
    }
}

const React = {
    createElement
}

export default React;