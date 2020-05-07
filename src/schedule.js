import { TAG_ROOT, TAG_TEXT, TAG_HOST, ELEMENT_TEXT, PLACEMENT, DELETION, UPDATE } from "./constant";
import { setProps } from './utils';

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
        workInProgressRoot.props = rootFiber.props; // 让它的props更新成新的props
        workInProgressRoot.alternate = currentRoot; // 让这个树的替身指向当前的currentRoot;

    } else if (currentRoot) { // 说明至少已经渲染过一次了
        rootFiber.alternate = currentRoot;
        workInProgressRoot = rootFiber; // 挂载后不变。
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
    if (currentFiber.tag === TAG_ROOT) {
        updateHostRoot(currentFiber);
    } else if (currentFiber.tag === TAG_TEXT) {
        updateHostText(currentFiber);
    } else if (currentFiber.tag === TAG_HOST) {
        updateHost(currentFiber);
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
    setProps(stateNode, oldProps, newProps);
}

// newChildren是一个虚拟DOM的数组， 把虚拟DOM转成Fiber
function reconcileChildren(currentFiber, newChildren) {
    let newChildIndex = 0; // 新子节点的索引，
    let prevSibling;
    // 如果说currentFiber有alternate并且alternate有child属性；
    let oldFiber = currentFiber.alternate && currentFiber.alternate.child;


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
        }
        if (sameType) { // 说明老fiber和新虚拟DOM类型是一样的， 可以直接复用老的DOM节点，更新即可。
           
            if (oldFiber.alternate) { // 说明至少已经更新一次了，复用，减少对象的创建。
               // 上上棵树的tag,type等属性肯定是一样的， 因为alternate的赋值是在sameType中。
                
                newFiber = oldFiber.alternate;
                newFiber.props = newChild.props;
                newFiber.alternate = oldFiber;
                newFiber.effectTag = UPDATE;
                newFiber.nextEffect = null;
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
    let returnDOM = returnFiber.stateNode;
    if (currentFiber.effectTag === PLACEMENT) { // 新增节点
        returnDOM.appendChild(currentFiber.stateNode);
    } else if (currentFiber.effectTag === DELETION) {// 删除节点
        returnDOM.removeChild(currentFiber.stateNode);
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

requestIdleCallback(workLoop, { timeout: 500 });

