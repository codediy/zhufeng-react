import { ELEMENT_TEXT } from "./constant";
import { UpdateQueue, Update} from './UpdateQueue';
import { scheduleRoot, useReducer, useState } from "./schedule";

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
class Component {
    constructor(props){
        this.props = props;
        this.updateQueue = new UpdateQueue();
    }
    setState(payload){ //可能是对象，也可能是一个函数
        let update = new Update(payload);
        // updateQueue其实是放在此类组件对应的fiber节点的internalFiber;
        this.internalFiber.updateQueue.enqueueUpdate(update);
        // this.updateQueue.enqueueUpdate(update);
        scheduleRoot(); // 从根节点开始调度；
    }
}
Component.prototype.isReactComponent = {}; // 类组件


const React = {
    createElement,
    Component,
    useReducer,
    useState
}

export default React;