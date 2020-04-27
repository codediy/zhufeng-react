import { TAG_ROOT } from "./constant";
import { scheduleRoot} from './schedule';

function render(element, container){
    let rootFiber = {
        tag:TAG_ROOT, // 每个Fiber会有一个tag标识此元素的类型
        stateNode: container, // 指向真实的DOM元素
        props: {
            children: [element] // 放置需要渲染的React元素，即虚拟DOM元素。
        }
    }
    scheduleRoot(rootFiber);
}

const ReactDOM = {
    render
}

export default ReactDOM;