import { TAG_ROOT, TAG_TEXT, TAG_HOST, ELEMENT_TEXT, PLACEMENT, DELETION, UPDATE, TAG_CLASS, TAG_FUNCTION_COMPONENT } from "./constant";
import { setProps } from './utils';
import { UpdateQueue } from "./UpdateQueue";

/**
 * 从根节点开始渲染和调度，
 * 两个阶段：
 *  1. diff阶段(render阶段)：对比新旧的虚拟DOM，进行增量更新或者创建
 *     根据虚拟DOM进行任务拆分。这个阶段可以中断。
 *     render阶段的任务： (1) 生成Fiber   (2) 收集Effect List 
 *  2. commit阶段，进行DOM更新
 */
let nextUnitOfWork = null; // 下一个工作单元，
let workInProgressRoot = null; // RootFiber 应用的根  // 正在渲染的根Root Fiber
let currentRoot = null;

let deletions = []; // 删除的节点，我们并不放在effect list里面， 所以需要单独记录并且执行。

export function scheduleRoot(rootFiber) { // {tag: TAG_ROOT, stateNode:container, props:{children:[element]}}
    if (currentRoot && currentRoot.alternate) { // 第二次之后的更新
        workInProgressRoot = currentRoot.alternate; // 第一次渲染出来的那个fiber tree
        workInProgressRoot.alternate = currentRoot; // 让这个树的替身指向当前的currentRoot;
        if(rootFiber){
            workInProgressRoot.props = rootFiber.props; // 让它的props更新成新的props
        }
    } else if (currentRoot) { // 说明至少已经渲染过一次了
        if(rootFiber){
            rootFiber.alternate = currentRoot;
            workInProgressRoot = rootFiber; // 挂载后不变。
        } else {
            workInProgressRoot = {
                ...currentRoot,
                alternate: currentRoot
            }
        }
    } else { // 如果是第一次渲染
        workInProgressRoot = rootFiber; // 挂载后不变。
    }
    workInProgressRoot.firstEffect = workInProgressRoot.lastEffect = workInProgressRoot.nextEffect = null;
    nextUnitOfWork = workInProgressRoot; // 一直在变。
}

//
function performUnitOfWork(currentFiber) {
    beginWork(currentFiber);
    // 由于经过beginWork的调和，如果currentFiber的props.children有值，就会在currentFiber加上了child，指向第一个Fiber子元素。
    if (currentFiber.child) {
        return currentFiber.child;
    }

    // 如果不存在child， 那么这个任务就已经完成了，需要继续查看sibling,
    while (currentFiber) {
        completeUnitOfWork(currentFiber);
        if (currentFiber.sibling) {
            return currentFiber.sibling;
        } else {
            currentFiber = currentFiber.return; // 先找到父亲，然后让父亲完成。
        }
    }
}

// 在完成的时候需要收集有副作用的Fiber，然后组成effect list
// 每个fiber有两个属性， 
// firstEffect指向第一个有副作用的子Fiber
// lastEffect指向最后一个有副作用的子Fiber
// 中间的用nextEffect做成一个单链表 
function completeUnitOfWork(currentFiber) { // 第一个完成的A1TEXT
    console.log('收集副作用：', currentFiber.tag, currentFiber.stateNode);
    // 准备形成Effect List
    let returnFiber = currentFiber.return; // A1
    if (returnFiber) {
        // 1.把自己儿子的effect链挂到父亲身上
        if (!returnFiber.firstEffect) {
            returnFiber.firstEffect = currentFiber.firstEffect;
        }
        if (currentFiber.lastEffect) {
            if (returnFiber.lastEffect) {
                // TODO: 这边为什么是这样的？？？
                returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
            }
            returnFiber.lastEffect = currentFiber.lastEffect;
        }

        // 2. 把自己挂到父亲身上
        const effectTag = currentFiber.effectTag;
        if (effectTag) {// 自己有副作用
            if (returnFiber.lastEffect) {
                returnFiber.lastEffect.nextEffect = currentFiber;
            } else {
                returnFiber.firstEffect = currentFiber;
            }
            returnFiber.lastEffect = currentFiber;

        }
    }
}

/**
 * beiginWork
 * 1. 创建真实DOM元素
 * 2. 创建子Fiber
 */
function beginWork(currentFiber) {
    if (currentFiber.tag === TAG_ROOT) { // 根fiber
        updateHostRoot(currentFiber);
    } else if (currentFiber.tag === TAG_TEXT) { // 文本fiber
        updateHostText(currentFiber);
    } else if (currentFiber.tag === TAG_HOST) { // 原生DOM节点
        updateHost(currentFiber);
    } else if (currentFiber.tag === TAG_CLASS) { // 类组件
        updateClassComponent(currentFiber);
    } else if(currentFiber.tag === TAG_FUNCTION_COMPONENT){
        updateFunctionComponent(currentFiber);
    }
}

/**
 * 因为是根Fiber， 所以本身就存在真实DOM元素   #root；
 * 直接开始遍历children，创建子Fiber;
 */
function updateHostRoot(currentFiber) {
    let newChildren = currentFiber.props.children; // [element]
    reconcileChildren(currentFiber, newChildren);
}

function updateHostText(currentFiber) {
    // 如果此Fiber没有创建DOM节点，那么就需要创建
    if (!currentFiber.stateNode) {
        currentFiber.stateNode = createDOM(currentFiber);
    }
}
function updateHost(currentFiber) {
    if (!currentFiber.stateNode) {
        currentFiber.stateNode = createDOM(currentFiber);
    }
    let newChildren = currentFiber.props.children; // [element]
    reconcileChildren(currentFiber, newChildren);

}
function updateClassComponent(currentFiber) {
    if (!currentFiber.stateNode) { // 类组件 stateNode 是组件的实例
        // new ClassCounter();
        // fiber和类组件实例 双向指向
        currentFiber.stateNode = new currentFiber.type(currentFiber.props);
        currentFiber.stateNode.internalFiber = currentFiber;
        currentFiber.updateQueue = new UpdateQueue();

    }
    // 给组件的实例的state赋值
    currentFiber.stateNode.state = currentFiber.updateQueue.forceUpdate(currentFiber.stateNode.state);
    let newElement = currentFiber.stateNode.render();
    const newChildren = [newElement];
    reconcileChildren(currentFiber, newChildren);
}

function updateFunctionComponent(currentFiber){
    const newChildren = [currentFiber.type(currentFiber.props)]
    reconcileChildren(currentFiber, newChildren);
}

function createDOM(currentFiber) {
    if (currentFiber.tag === TAG_TEXT) {
        return document.createTextNode(currentFiber.props.text);
    } else if (currentFiber.tag === TAG_HOST) {
        let stateNode = document.createElement(currentFiber.type);
        updateDOM(stateNode, {}, currentFiber.props);
        return stateNode;
    }
}

function updateDOM(stateNode, oldProps, newProps) {
    if(stateNode.setAttribute){
        setProps(stateNode, oldProps, newProps);
    }   
}

// newChildren是一个虚拟DOM的数组， 把虚拟DOM转成Fiber
function reconcileChildren(currentFiber, newChildren) {
    let newChildIndex = 0; // 新子节点的索引，
    let prevSibling;
    // 如果说currentFiber有alternate并且alternate有child属性；
    let oldFiber = currentFiber.alternate && currentFiber.alternate.child;
    if(oldFiber){
        oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null;
    }


    while (newChildIndex < newChildren.length || oldFiber) {
        let newChild = newChildren[newChildIndex]; // 取出虚拟DOM节点。
        let tag;
        let newFiber; // 新的Fiber；
        const sameType = oldFiber && newChild && oldFiber.type === newChild.type;

        if (newChild && newChild.type === ELEMENT_TEXT) {
            // 文本节点
            tag = TAG_TEXT;
        } else if (newChild && typeof newChild.type === 'string') {
            //原生dom节点   div p span
            tag = TAG_HOST;
        } else if (newChild && typeof newChild.type === 'function' && newChild.type.prototype.isReactComponent) {
            tag = TAG_CLASS;
        } else if (newChild && typeof newChild.type === 'function') {
            tag = TAG_FUNCTION_COMPONENT;
        }
        if (sameType) { // 说明老fiber和新虚拟DOM类型是一样的， 可以直接复用老的DOM节点，更新即可。

            if (oldFiber.alternate) { // 说明至少已经更新一次了，复用，减少对象的创建。
                // 上上棵树的tag,type等属性肯定是一样的， 因为alternate的赋值是在sameType中。

                newFiber = oldFiber.alternate;
                newFiber.props = newChild.props;
                newFiber.alternate = oldFiber;
                newFiber.effectTag = UPDATE;
                newFiber.nextEffect = null;
                newFiber.updateQueue = oldFiber.updateQueue || new UpdateQueue();
                // 
                // newFiber.stateNode = oldFiber.stateNode; // 
                // newFiber.return = currentFiber; // 父Fiber, 
            } else {
                newFiber = {
                    tag: oldFiber.tag,
                    type: oldFiber.type,
                    props: newChild.props,
                    stateNode: oldFiber.stateNode, // 
                    return: currentFiber, // 父Fiber, 
                    effectTag: UPDATE, // 副作用标识， render我们要收集副作用，
                    alternate: oldFiber,
                    nextEffect: null,
                    updateQueue: oldFiber.updateQueue || new UpdateQueue()
                }
            }

        } else {
            // 如果两两比较时候不一样，那就删除老的，添加新的。

            if (newChild) {
                newFiber = {
                    tag,
                    type: newChild.type,
                    props: newChild.props,
                    stateNode: null,
                    return: currentFiber, // 父Fiber, 
                    effectTag: PLACEMENT, // 副作用标识， render我们要收集副作用，
                    nextEffect: null,
                    updateQueue: new UpdateQueue()
                }
            }
            if (oldFiber) {
                oldFiber.effectTag = DELETION;
                deletions.push(oldFiber);
            }
        }
        if (oldFiber) {
            oldFiber = oldFiber.sibling;
        }
        if (newFiber) {
            if (newChildIndex === 0) {
                currentFiber.child = newFiber;
            } else {
                prevSibling.sibling = newFiber;
            }
            prevSibling = newFiber;
        }
        newChildIndex++;
    }

}

// 循环执行工作 
function workLoop(deadline) {
    let shouldYield = false;
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
        shouldYield = deadline.timeRemaining() < 1; // 没有时间的话就要让出控制权。
    }
    if (!nextUnitOfWork && workInProgressRoot) {
        console.log('render阶段结束');
        console.log("最终形成的Fiber链：", workInProgressRoot);
        commitRoot();
    } else {

    }
    // 如果时间片到期后还有任务没有完成， 就需要请求浏览器再次调度。
    requestIdleCallback(workLoop, { timeout: 500 });

}

function commitRoot() {
    console.log('commitRoot', workInProgressRoot);
    deletions.forEach(commitWork); // 执行effect list之前，先把该删除的元素删除

    let currentFiber = workInProgressRoot.firstEffect;
    while (currentFiber) {
        commitWork(currentFiber);
        currentFiber = currentFiber.nextEffect;
    }
    deletions.length = 0; // 提交之后要清空deletion数组

    currentRoot = workInProgressRoot; // 把当前渲染成功的根Fiber赋给currentRoot;

    workInProgressRoot = null;
}

function commitWork(currentFiber) {
    if (!currentFiber) return;
    let returnFiber = currentFiber.return;
    while (
        returnFiber.tag !== TAG_HOST && 
        returnFiber.tag !== TAG_ROOT && 
        returnFiber.tag !== TAG_TEXT
        ){
            returnFiber = returnFiber.return;
        }
    let returnDOM = returnFiber.stateNode;
    if (currentFiber.effectTag === PLACEMENT) { // 新增节点
        let nextFiber = currentFiber;
        // 优化： 如果是类组件，其实可以直接return
        if(nextFiber.tag === TAG_CLASS){ 
            return;
        }
        // 如果要挂载的节点不是DOM节点，比如说是类组件Fiber，一直找第一个儿子，直到找到一个真实DOM节点为止。
        while (
            nextFiber.tag !== TAG_HOST &&
            nextFiber.tag !== TAG_ROOT &&
            nextFiber.tag !== TAG_TEXT
        ) {
            nextFiber = nextFiber.child;
        }
        returnDOM.appendChild(nextFiber.stateNode);
    } else if (currentFiber.effectTag === DELETION) {// 删除节点
        return commitDeletion(currentFiber, returnDOM);
        // returnDOM.removeChild(currentFiber.stateNode);
    } else if (currentFiber.effectTag === UPDATE) {
        if (currentFiber.type === ELEMENT_TEXT) {
            if (currentFiber.alternate.props.text != currentFiber.props.text) {
                currentFiber.stateNode.textContent = currentFiber.props.text;
            } else {
                
                updateDOM(currentFiber.stateNode, currentFiber.alternate.props, currentFiber.props);
            }
        }
    }
    currentFiber.effectTag = null;

}

function commitDeletion(currentFiber, domReturn){
    if(currentFiber.tag == TAG_HOST || currentFiber.tag == TAG_TEXT){
        domReturn.removeChild(currentFiber.stateNode);
    } else {
        commitDeletion(currentFiber.child, domReturn);
    }
}

requestIdleCallback(workLoop, { timeout: 500 });

